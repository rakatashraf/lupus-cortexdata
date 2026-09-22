from __future__ import annotations

import argparse
import asyncio
import io
import json
import os
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import HTTPException

from app.cmr import CMRClient
from app.main import (
    BBox,
    DateRange,
    GroundRequest,
    SingleGranuleDownloadRequest,
    _component_variable_filters,
    _harmony_capabilities,
    download_ground,
    download_nasa_granule,
)


JOB_START = "<!-- EARTHDATA_JOB_JSON_START -->"
JOB_END = "<!-- EARTHDATA_JOB_JSON_END -->"


@dataclass
class Result:
    status: str
    collection_id: str
    granule_id: str
    rows: int = 0
    access_path: str = ""
    error: str = ""
    part_path: str = ""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--event", required=True)
    parser.add_argument("--output-dir", default="out")
    return parser.parse_args()


def load_config(event_path: str) -> dict[str, Any]:
    event = json.loads(Path(event_path).read_text(encoding="utf-8"))
    body = str((event.get("issue") or {}).get("body") or "")
    if JOB_START not in body or JOB_END not in body:
        raise RuntimeError("Earthdata job JSON markers were not found in the issue body.")
    payload = body.split(JOB_START, 1)[1].split(JOB_END, 1)[0]
    payload = re.sub(r"^\s*\`\`\`(?:json)?\s*", "", payload, flags=re.I)
    payload = re.sub(r"\s*\`\`\`\s*$", "", payload)
    config = json.loads(payload.strip())
    return config


def clean_list(value: Any) -> list[str]:
    if isinstance(value, list):
        source = value
    else:
        source = re.split(r"[,;\n]+", str(value or ""))
    out: list[str] = []
    seen: set[str] = set()
    for item in source:
        text = str(item or "").strip()
        key = text.casefold()
        if text and key not in seen:
            seen.add(key)
            out.append(text)
    return out


def bool_value(config: dict[str, Any], key: str, default: bool) -> bool:
    value = config.get(key, default)
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


async def build_jobs(config: dict[str, Any], token: str) -> tuple[list[SingleGranuleDownloadRequest], list[dict[str, Any]]]:
    components = clean_list(config.get("components"))
    collections = clean_list(config.get("collection_ids"))
    if not components:
        raise RuntimeError("At least one component is required.")
    if not collections:
        raise RuntimeError("At least one NASA collection concept ID is required.")

    bbox = BBox(**config["bbox"])
    start = date.fromisoformat(str(config["start_date"]))
    end = date.fromisoformat(str(config["end_date"]))
    if start > end:
        raise RuntimeError("start_date must be on or before end_date.")

    jobs: list[SingleGranuleDownloadRequest] = []
    collection_reports: list[dict[str, Any]] = []

    for collection_id in collections:
        client = CMRClient(token)
        granule_task = client.granules(
            collection_id=collection_id,
            bbox=bbox.cmr(),
            start_date=start.isoformat(),
            end_date=end.isoformat(),
            platform=(clean_list(config.get("platforms")) or [None])[0],
            instrument=(clean_list(config.get("instruments")) or [None])[0],
            fallback_latest=bool_value(config, "fallback_latest", True),
        )
        variable_task = client.variables_for_collection(collection_id)
        harmony_task = asyncio.to_thread(_harmony_capabilities, token, collection_id)

        result, variable_records, harmony = await asyncio.gather(
            granule_task,
            variable_task,
            harmony_task,
        )

        filters = _component_variable_filters(variable_records, components)
        collection_reports.append(
            {
                "collection_id": collection_id,
                "granules": len(result.get("items") or []),
                "fallback_used": bool(result.get("fallback_used")),
                "fallback_date": result.get("fallback_date"),
                "fallback_relation": result.get("fallback_relation"),
                "variable_filters": filters,
                "harmony": harmony,
            }
        )

        effective_start = date.fromisoformat(
            str(result.get("effective_start_date") or start.isoformat())
        )
        effective_end = date.fromisoformat(
            str(result.get("effective_end_date") or end.isoformat())
        )
        fallback_date = (
            date.fromisoformat(str(result["fallback_date"]))
            if result.get("fallback_date")
            else None
        )
        fallback_target = (
            date.fromisoformat(str(result["fallback_target_date"]))
            if result.get("fallback_target_date")
            else end
        )

        for granule in result.get("items") or []:
            jobs.append(
                SingleGranuleDownloadRequest(
                    token=token,
                    collection_id=collection_id,
                    bbox=bbox,
                    date_range=DateRange(start=start, end=end),
                    fallback_latest=bool_value(config, "fallback_latest", True),
                    strict_scope_mode=bool_value(config, "strict_component", True),
                    components=components,
                    component="; ".join(components),
                    variable_filters=filters,
                    output_name=str(config.get("output_name") or "earthdata.csv"),
                    max_rows_per_variable=max(0, int(config.get("max_rows_per_variable") or 0)),
                    low_bandwidth_training_mode=bool_value(config, "low_bandwidth_training_mode", False),
                    training_grid_degrees=float(config.get("training_grid_degrees") or 0.05),
                    effective_start_date=effective_start,
                    effective_end_date=effective_end,
                    date_fallback_used=bool(result.get("fallback_used")),
                    date_fallback_date=fallback_date,
                    date_fallback_relation=result.get("fallback_relation"),
                    date_fallback_distance_days=result.get("fallback_distance_days"),
                    date_fallback_target_date=fallback_target,
                    granule_id=str(granule.get("concept_id") or ""),
                    granule_ur=granule.get("granule_ur"),
                    begin=granule.get("begin"),
                    end=granule.get("end"),
                    production_date=granule.get("production_date"),
                    size_mb=granule.get("size_mb"),
                    platforms=granule.get("platforms") or [],
                    instruments=granule.get("instruments") or [],
                    download_urls=granule.get("download_urls") or [],
                    primary_url=granule.get("primary_url"),
                    harmony_available=bool(harmony.get("available")),
                    harmony_bbox_subset=bool(harmony.get("bbox_subset")),
                    harmony_variable_subset=bool(harmony.get("variable_subset")),
                    harmony_concatenate=bool(harmony.get("concatenate")),
                    harmony_output_formats=harmony.get("output_formats") or [],
                    harmony_services=harmony.get("services") or [],
                    recovery_mode=False,
                )
            )

    return jobs, collection_reports


async def run_one(
    req: SingleGranuleDownloadRequest,
    semaphore: asyncio.Semaphore,
    parts_dir: Path,
    index: int,
) -> Result:
    async with semaphore:
        label = req.granule_ur or req.granule_id
        last_error = ""
        for recovery in (False, True):
            req.recovery_mode = recovery
            try:
                response = await download_nasa_granule(req)
                headers = response.headers
                irrelevant = str(headers.get("X-Earthdata-Irrelevant-Granule", "false")).lower() == "true"
                conversion_errors = int(headers.get("X-Earthdata-Conversion-Errors", "0") or 0)
                successful = int(headers.get("X-Earthdata-Successful-Granules", "0") or 0)
                rows = int(headers.get("X-Earthdata-Rows", "0") or 0)
                access_path = str(headers.get("X-Earthdata-Access-Path", ""))

                if irrelevant:
                    return Result("irrelevant", req.collection_id, label, access_path=access_path)

                if conversion_errors == 0 and successful > 0 and rows > 0:
                    part = parts_dir / f"{index:07d}.csv"
                    part.write_bytes(response.body)
                    return Result(
                        "converted",
                        req.collection_id,
                        label,
                        rows=rows,
                        access_path=access_path,
                        part_path=str(part),
                    )

                last_error = str(headers.get("X-Earthdata-Failure-Class") or "conversion failed")
            except HTTPException as exc:
                last_error = str(exc.detail)
            except Exception as exc:
                last_error = f"{type(exc).__name__}: {exc}"

        return Result("failed", req.collection_id, label, error=last_error)


def merge_parts(parts: list[Path], output_path: Path) -> int:
    wrote_header = False
    total_rows = 0
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    for part in sorted(parts):
        if not part.exists() or part.stat().st_size == 0:
            continue
        try:
            frame = pd.read_csv(part)
        except Exception:
            continue
        if frame.empty:
            continue
        frame.to_csv(
            output_path,
            mode="a",
            index=False,
            header=not wrote_header,
        )
        wrote_header = True
        total_rows += len(frame)

    return total_rows


async def add_ground(config: dict[str, Any], token: str, parts_dir: Path, start_index: int) -> Result | None:
    if not bool_value(config, "include_ground", True):
        return None

    components = clean_list(config.get("components"))
    bbox = BBox(**config["bbox"])
    start = date.fromisoformat(str(config["start_date"]))
    end = date.fromisoformat(str(config["end_date"]))

    try:
        response = await download_ground(
            GroundRequest(
                components=components,
                bbox=bbox,
                date_range=DateRange(start=start, end=end),
                openaq_api_key=os.getenv("OPENAQ_API_KEY") or None,
                low_bandwidth_training_mode=bool_value(config, "low_bandwidth_training_mode", False),
                training_grid_degrees=float(config.get("training_grid_degrees") or 0.05),
            )
        )
        part = parts_dir / f"{start_index:07d}_ground.csv"
        part.write_bytes(response.body)
        return Result(
            "ground",
            "ground",
            "ground_observations",
            rows=int(response.headers.get("X-Earthdata-Rows", "0") or 0),
            access_path="ground",
            part_path=str(part),
        )
    except Exception as exc:
        return Result("ground_failed", "ground", "ground_observations", error=str(exc))


async def main() -> None:
    args = parse_args()
    token = str(os.getenv("EARTHDATA_TOKEN") or "").strip()
    if not token:
        raise RuntimeError(
            "Repository secret EARTHDATA_TOKEN is not configured. "
            "Add it under Settings > Secrets and variables > Actions."
        )

    config = load_config(args.event)
    output_dir = Path(args.output_dir)
    parts_dir = output_dir / "parts"
    parts_dir.mkdir(parents=True, exist_ok=True)

    jobs, collection_reports = await build_jobs(config, token)
    workers = max(1, min(int(config.get("workers") or 8), 16))
    semaphore = asyncio.Semaphore(workers)

    results = await asyncio.gather(
        *(
            run_one(req, semaphore, parts_dir, index)
            for index, req in enumerate(jobs)
        )
    )

    ground_result = await add_ground(config, token, parts_dir, len(jobs) + 1)
    if ground_result:
        results.append(ground_result)

    output_name = re.sub(
        r"[^A-Za-z0-9._-]+",
        "_",
        str(config.get("output_name") or "earthdata_training.csv"),
    )
    if not output_name.lower().endswith(".csv"):
        output_name += ".csv"

    part_paths = [
        Path(result.part_path)
        for result in results
        if result.part_path
    ]
    output_path = output_dir / output_name
    total_rows = merge_parts(part_paths, output_path)

    counts: dict[str, int] = {}
    failures = []
    for result in results:
        counts[result.status] = counts.get(result.status, 0) + 1
        if result.status in {"failed", "ground_failed"}:
            failures.append(
                {
                    "collection_id": result.collection_id,
                    "granule_id": result.granule_id,
                    "error": result.error,
                }
            )

    report = {
        "requested_components": clean_list(config.get("components")),
        "requested_collections": clean_list(config.get("collection_ids")),
        "selected_granules": len(jobs),
        "workers": workers,
        "rows_written": total_rows,
        "result_counts": counts,
        "collection_reports": collection_reports,
        "failures": failures,
        "output_file": str(output_path),
    }
    (output_dir / "job_report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    if not output_path.exists():
        output_path.write_text("", encoding="utf-8")

    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
