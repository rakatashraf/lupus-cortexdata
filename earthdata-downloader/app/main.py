from __future__ import annotations

import asyncio
import gzip
import os
import re
from datetime import date
from pathlib import Path
from typing import Optional
from urllib.parse import unquote, urlparse

import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .cmr import CMRClient
from .convert import combine_frames, convert_bytes
from .external import fetch as fetch_external
from .external import resolve as resolve_external


ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static"

app = FastAPI(
    title="NASA Earthdata CSV Downloader",
    version="1.5.0",
    description="Search NASA Earthdata, download matching granules, convert supported science formats to CSV, and fall back to selected public internet sources when NASA has no matching collection.",
)


class BBox(BaseModel):
    south: float = Field(ge=-90, le=90)
    west: float = Field(ge=-180, le=180)
    north: float = Field(ge=-90, le=90)
    east: float = Field(ge=-180, le=180)

    def cmr(self) -> str:
        if self.south >= self.north:
            raise ValueError("South must be lower than north.")
        if self.west >= self.east:
            raise ValueError("West must be lower than east.")
        return f"{self.west},{self.south},{self.east},{self.north}"

    def dict4(self) -> dict[str, float]:
        return {
            "south": self.south,
            "west": self.west,
            "north": self.north,
            "east": self.east,
        }


class DateRange(BaseModel):
    start: date
    end: date


class TokenRequest(BaseModel):
    token: str


class CollectionRequest(BaseModel):
    token: str
    component: str = ""
    collection_name: str = ""
    bbox: Optional[BBox] = None
    platforms: list[str] = []
    instruments: list[str] = []


class GranuleRequest(BaseModel):
    token: str
    collection_id: str
    bbox: BBox
    date_range: DateRange
    platform: Optional[str] = None
    instrument: Optional[str] = None
    fallback_latest: bool = True


class DownloadRequest(GranuleRequest):
    component: str = ""
    collection_search_name: Optional[str] = None
    collection_title: Optional[str] = None
    variable_filters: list[str] = []
    output_name: Optional[str] = None
    max_rows_per_variable: int = 0


class SingleGranuleDownloadRequest(DownloadRequest):
    granule_id: str
    cycle_label: Optional[str] = None
    cycle_interval_seconds: Optional[float] = None
    cycle_detail: Optional[str] = None
    cycle_basis: Optional[str] = None


class ExternalRequest(BaseModel):
    component: str
    bbox: BBox
    date_range: DateRange
    grid_points_per_axis: int = 3
    output_name: Optional[str] = None


def _safe_csv(name: Optional[str], fallback: str) -> str:
    raw = re.sub(r"[^A-Za-z0-9._-]+", "_", name or fallback).strip("._")
    if not raw.lower().endswith(".csv"):
        raw += ".csv"
    return raw[:180] or "earthdata.csv"


def _session(token: str) -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=3,
        connect=3,
        read=3,
        status=3,
        backoff_factor=1.0,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET"]),
        respect_retry_after_header=True,
    )
    session.mount("https://", HTTPAdapter(max_retries=retry))
    session.headers.update({
        "Authorization": f"Bearer {token.strip()}",
        "User-Agent": "EarthdataCSVDownloader/1.1",
    })
    return session


def _filename(url: str, response: requests.Response, idx: int) -> str:
    cd = response.headers.get("content-disposition", "")
    match = re.search(r"filename\*?=(?:UTF-8''|\")?([^\";]+)", cd, flags=re.I)
    if match:
        name = unquote(match.group(1).strip().strip('"'))
    else:
        name = unquote(Path(urlparse(response.url or url).path).name or Path(urlparse(url).path).name)
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._") or f"granule_{idx}"
    if "." not in Path(name).name:
        ctype = response.headers.get("content-type", "").split(";")[0].strip().lower()
        ext = {
            "application/x-netcdf": ".nc",
            "application/netcdf": ".nc",
            "application/x-hdf": ".hdf",
            "application/x-hdf5": ".h5",
            "image/tiff": ".tif",
            "text/csv": ".csv",
            "application/json": ".json",
            "application/zip": ".zip",
            "application/gzip": ".gz",
        }.get(ctype, "")
        name += ext
    return name[:180]


def _download_granule_bytes(
    session: requests.Session,
    url: str,
    idx: int,
) -> tuple[bytes, str, str]:
    max_mb = max(1, int(os.getenv("EARTHDATA_MAX_GRANULE_MB", "384")))
    max_bytes = max_mb * 1024 * 1024

    with session.get(url, stream=True, timeout=(25, 300), allow_redirects=True) as response:
        response.raise_for_status()

        final_url = response.url or url
        filename = _filename(url, response, idx)
        content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()

        length = response.headers.get("content-length")
        if length:
            try:
                if int(length) > max_bytes:
                    raise ValueError(
                        f"Granule {filename} is larger than the configured {max_mb} MB "
                        "per-granule serverless memory limit."
                    )
            except ValueError as exc:
                if "larger than" in str(exc):
                    raise

        body = bytearray()
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            if not chunk:
                continue
            body.extend(chunk)
            if len(body) > max_bytes:
                raise ValueError(
                    f"Granule {filename} exceeded the configured {max_mb} MB "
                    "per-granule serverless memory limit while downloading."
                )

    data = bytes(body)
    if not data:
        raise ValueError(f"NASA returned an empty file for {filename}.")

    sample = data[:2048].lstrip().lower()
    if content_type in ("text/html", "application/xhtml+xml") or sample.startswith((b"<!doctype html", b"<html")):
        raise ValueError(
            "NASA download URL returned an HTML page instead of science data. "
            "The Earthdata token may not be authorized for this DAAC/product, "
            "or this URL is not a direct data link."
        )

    return data, filename, str(final_url)


def _download_convert(
    req: DownloadRequest,
    granules: list[dict],
    cycle_override: Optional[dict] = None,
) -> tuple[bytes, dict]:
    frames = []
    errors: list[dict[str, str]] = []
    session = _session(req.token)

    for idx, granule in enumerate(granules, 1):
        urls = granule.get("download_urls") or []
        if not urls and granule.get("primary_url"):
            urls = [granule["primary_url"]]

        if not urls:
            errors.append({
                "granule": str(granule.get("granule_ur") or granule.get("concept_id") or idx),
                "error": "No downloadable URL is present in NASA CMR metadata.",
            })
            continue

        success = False
        url_errors: list[str] = []

        for url in urls:
            try:
                data, filename, final_url = _download_granule_bytes(session, url, idx)

                meta = {
                    "source": "NASA Earthdata",
                    "component_query": req.component,
                    "collection_search_name": req.collection_search_name or "",
                    "collection_id": req.collection_id,
                    "collection_title": req.collection_title or "",
                    "granule_id": granule.get("concept_id") or "",
                    "granule_ur": granule.get("granule_ur") or "",
                    "satellite_platform": ";".join(granule.get("platforms") or []),
                    "instrument": ";".join(granule.get("instruments") or []),
                    "granule_begin": granule.get("begin") or "",
                    "granule_end": granule.get("end") or "",
                    "original_file": filename,
                    "download_url": final_url,
                }

                converted = convert_bytes(
                    data,
                    filename=filename,
                    meta=meta,
                    filters=req.variable_filters,
                    bbox=req.bbox.dict4(),
                    max_rows=max(0, int(req.max_rows_per_variable)),
                )

                if not converted:
                    raise ValueError(
                        "The file was readable, but no matching data rows remained after "
                        "variable/bounding-box filtering."
                    )

                frames.extend(converted)
                success = True
                break
            except Exception as exc:
                url_errors.append(str(exc))

        if not success:
            errors.append({
                "granule": str(granule.get("granule_ur") or granule.get("concept_id") or idx),
                "error": " | ".join(url_errors[:3]) or "Download/conversion failed.",
            })

    combined = combine_frames(frames)

    if cycle_override and not combined.empty:
        label = str(cycle_override.get("label") or "").strip()
        detail = str(cycle_override.get("detail") or "").strip()
        basis = str(cycle_override.get("basis") or "Granule start timestamps").strip()
        interval = cycle_override.get("interval_seconds")

        if label:
            combined["data_cycle"] = label
        if interval is not None:
            try:
                combined["data_cycle_interval_seconds"] = float(interval)
            except Exception:
                pass
        if basis:
            combined["data_cycle_basis"] = basis
        if detail:
            if "data_time_utc" in combined.columns and (
                label == "Hourly"
                or label.endswith("-hourly")
                or label.endswith("-minute")
                or label == "Sub-minute"
            ):
                combined["data_cycle_detail"] = [
                    f"{detail} · this row: {value} UTC" if value else detail
                    for value in combined["data_time_utc"].astype(str)
                ]
            else:
                combined["data_cycle_detail"] = detail

    if combined.empty:
        details = "; ".join(
            f"{item['granule']}: {item['error']}" for item in errors[:3]
        )
        if len(errors) > 3:
            details += f"; plus {len(errors) - 3} more failed granule(s)"
        raise ValueError(
            "NASA returned granules, but none could be converted to CSV. " + details
        )

    csv_bytes = combined.to_csv(index=False).encode("utf-8")
    return csv_bytes, {
        "rows": len(combined),
        "converted_frames": len(frames),
        "errors": errors,
        "csv_bytes": len(csv_bytes),
    }


def _csv_http_response(
    content: bytes,
    filename: str,
    headers: dict[str, str],
) -> Response:
    safe_limit = 4_200_000
    response_content = content
    response_headers = dict(headers)
    response_headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    response_headers["X-Earthdata-Uncompressed-Bytes"] = str(len(content))

    if len(content) > 3_000_000:
        compressed = gzip.compress(content, compresslevel=6)
        if len(compressed) <= safe_limit:
            response_content = compressed
            response_headers["Content-Encoding"] = "gzip"
            response_headers["X-Earthdata-Transport"] = "gzip"
            response_headers["X-Earthdata-Compressed-Bytes"] = str(len(compressed))
        else:
            raise HTTPException(
                413,
                "This single converted granule is still too large for the current Vercel response limit "
                "even after compression. Narrow the variable filter, boundary box, or use a row limit "
                "for this granule.",
            )
    elif len(content) > safe_limit:
        raise HTTPException(
            413,
            "Converted CSV is too large for the current Vercel response limit. "
            "Narrow the variable filter, boundary box, or use a row limit.",
        )

    return Response(
        content=response_content,
        media_type="text/csv",
        headers=response_headers,
    )


@app.get("/api/health")
async def health():
    return {"ok": True, "service": "earthdata-csv-downloader", "version": "1.5.0"}


@app.post("/api/token/validate")
async def token_validate(req: TokenRequest):
    if not req.token.strip():
        raise HTTPException(400, "Earthdata token is required.")
    try:
        return await CMRClient(req.token).validate()
    except Exception as exc:
        raise HTTPException(502, f"Could not reach NASA CMR: {exc}")


@app.post("/api/collections/search")
async def collections_search(req: CollectionRequest):
    component = req.component.strip()
    collection_name = req.collection_name.strip()

    if not component and not collection_name:
        raise HTTPException(400, "Enter a component/variable or a collection name.")

    try:
        nasa = await CMRClient(req.token).collections(
            component=component or None,
            collection_name=collection_name or None,
            bbox=req.bbox.cmr() if req.bbox else None,
            platforms=req.platforms,
            instruments=req.instruments,
        )
        external = resolve_external(component) if component else []
        return {
            "component": component or None,
            "collection_name": collection_name or None,
            "nasa": nasa,
            "external_candidates": external if component and not nasa.get("items") else [],
            "external_candidates_always": external,
        }
    except Exception as exc:
        raise HTTPException(502, f"NASA collection search failed: {exc}")


@app.post("/api/granules/search")
async def granules_search(req: GranuleRequest):
    if req.date_range.start > req.date_range.end:
        raise HTTPException(400, "Start date must be on or before end date.")
    try:
        return await CMRClient(req.token).granules(
            collection_id=req.collection_id,
            bbox=req.bbox.cmr(),
            start_date=req.date_range.start.isoformat(),
            end_date=req.date_range.end.isoformat(),
            platform=req.platform,
            instrument=req.instrument,
            fallback_latest=req.fallback_latest,
        )
    except Exception as exc:
        raise HTTPException(502, f"NASA granule search failed: {exc}")


@app.post("/api/download/nasa")
async def download_nasa(req: DownloadRequest):
    try:
        result = await CMRClient(req.token).granules(
            collection_id=req.collection_id,
            bbox=req.bbox.cmr(),
            start_date=req.date_range.start.isoformat(),
            end_date=req.date_range.end.isoformat(),
            platform=req.platform,
            instrument=req.instrument,
            fallback_latest=req.fallback_latest,
        )
        granules = result.get("items") or []
        if not granules:
            raise HTTPException(404, "No downloadable granules were found for this collection and area.")

        content, report = await asyncio.to_thread(_download_convert, req, granules)
        search_label = req.component.strip() or (req.collection_search_name or "").strip() or req.collection_id
        name = _safe_csv(req.output_name, f"{search_label}_{req.collection_id}.csv")
        return _csv_http_response(
            content,
            name,
            {
                "X-Earthdata-Fallback-Used": str(bool(result.get("fallback_used"))).lower(),
                "X-Earthdata-Rows": str(report["rows"]),
                "X-Earthdata-Granules": str(len(granules)),
                "X-Earthdata-Timezone": "UTC",
                "X-Earthdata-Conversion-Errors": str(len(report["errors"])),
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Download/conversion failed: {exc}")


@app.post("/api/download/nasa/granule")
async def download_nasa_granule(req: SingleGranuleDownloadRequest):
    try:
        granule = await CMRClient(req.token).granule_by_id(
            req.granule_id,
            collection_id=req.collection_id,
        )
        if not granule:
            raise HTTPException(
                404,
                "The selected granule could not be found in NASA CMR or is not marked downloadable.",
            )

        cycle_override = {
            "label": req.cycle_label,
            "interval_seconds": req.cycle_interval_seconds,
            "detail": req.cycle_detail,
            "basis": req.cycle_basis,
        }
        content, report = await asyncio.to_thread(
            _download_convert,
            req,
            [granule],
            cycle_override,
        )
        granule_label = granule.get("granule_ur") or req.granule_id
        name = _safe_csv(
            None,
            f"{req.component or 'earthdata'}_{granule_label}.csv",
        )
        return _csv_http_response(
            content,
            name,
            {
                "X-Earthdata-Rows": str(report["rows"]),
                "X-Earthdata-Granules": "1",
                "X-Earthdata-Timezone": "UTC",
                "X-Earthdata-Granule-Id": req.granule_id,
                "X-Earthdata-Conversion-Errors": str(len(report["errors"])),
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Granule download/conversion failed: {exc}")


@app.post("/api/download/external/{provider_id}")
async def download_external(provider_id: str, req: ExternalRequest):
    try:
        df = await asyncio.to_thread(
            fetch_external,
            req.component,
            provider_id,
            req.bbox.dict4(),
            req.date_range.start,
            req.date_range.end,
            req.grid_points_per_axis,
        )
        if df.empty:
            raise HTTPException(404, "The external provider returned no records.")
        name = _safe_csv(req.output_name, f"{req.component}_{provider_id}.csv")
        return Response(
            content=df.to_csv(index=False).encode("utf-8"),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{name}"',
                "X-Earthdata-Rows": str(len(df)),
                "X-Earthdata-Timezone": "UTC",
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"External data fetch failed: {exc}")


app.mount("/", StaticFiles(directory=STATIC, html=True), name="ui")
