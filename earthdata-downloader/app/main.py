from __future__ import annotations

import asyncio
import gzip
import os
import re
import time
from datetime import date
from pathlib import Path
from typing import Optional
from urllib.parse import quote, unquote, urlparse

import pandas as pd
import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .cmr import CMRClient
from .convert import combine_frames, compact_training_frame, component_filter_terms, convert_bytes, strict_scope_filter, _component_match_score
from .external import fetch as fetch_external
from .external import fetch_ground as fetch_ground_external
from .external import resolve as resolve_external


ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static"

app = FastAPI(
    title="NASA Earthdata CSV Downloader",
    version="3.2.0",
    description="Search NASA Earthdata, download matching granules, convert supported science formats to CSV, and fall back to selected public internet sources when NASA has no matching collection.",
)

_cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "EARTHDATA_CORS_ORIGINS",
        "https://lupus-cortex-git-earthdata-do-e998ce-rakat-bin-ashrafs-projects.vercel.app",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["X-Earthdata-Rows","X-Earthdata-Granules","X-Earthdata-Timezone","X-Earthdata-Granule-Id","X-Earthdata-Conversion-Errors","X-Earthdata-Successful-Granules","X-Earthdata-Conversion-Status","X-Earthdata-Processing-Ms","X-Earthdata-Access-Path","X-Earthdata-Recovery-Metadata","X-Earthdata-Strict-Scope","X-Earthdata-Date-Fallback-Used","X-Earthdata-Date-Fallback-Date","X-Earthdata-Date-Fallback-Relation","X-Earthdata-Date-Fallback-Distance-Days","X-Earthdata-Scope-Dropped-Rows","X-Earthdata-Failure-Class","X-Earthdata-Irrelevant-Granule"],
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
    components: list[str] = []
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
    strict_scope_mode: bool = True
    components: list[str] = []


class DownloadRequest(GranuleRequest):
    component: str = ""
    collection_search_name: Optional[str] = None
    collection_short_name: Optional[str] = None
    collection_title: Optional[str] = None
    collection_version: Optional[str] = None
    collection_provider: Optional[str] = None
    collection_processing_level: Optional[str] = None
    variable_filters: list[str] = []
    output_name: Optional[str] = None
    max_rows_per_variable: int = 0
    low_bandwidth_training_mode: bool = True
    training_grid_degrees: float = Field(default=0.05, ge=0.005, le=1.0)
    effective_start_date: Optional[date] = None
    effective_end_date: Optional[date] = None
    date_fallback_used: bool = False
    date_fallback_date: Optional[date] = None
    date_fallback_relation: Optional[str] = None
    date_fallback_distance_days: Optional[float] = None
    date_fallback_target_date: Optional[date] = None


class SingleGranuleDownloadRequest(DownloadRequest):
    granule_id: str
    granule_ur: Optional[str] = None
    begin: Optional[str] = None
    end: Optional[str] = None
    production_date: Optional[str] = None
    size_mb: Optional[float] = None
    platforms: list[str] = []
    instruments: list[str] = []
    download_urls: list[str] = []
    primary_url: Optional[str] = None
    cycle_label: Optional[str] = None
    cycle_interval_seconds: Optional[float] = None
    cycle_detail: Optional[str] = None
    cycle_basis: Optional[str] = None
    harmony_available: bool = False
    harmony_bbox_subset: bool = False
    harmony_variable_subset: bool = False
    harmony_concatenate: bool = False
    harmony_output_formats: list[str] = []
    harmony_services: list[str] = []
    recovery_mode: bool = False


class ExternalRequest(BaseModel):
    component: str
    bbox: BBox
    date_range: DateRange
    grid_points_per_axis: int = 3
    output_name: Optional[str] = None


class GroundRequest(BaseModel):
    components: list[str]
    bbox: BBox
    date_range: DateRange
    openaq_api_key: Optional[str] = None
    low_bandwidth_training_mode: bool = True
    training_grid_degrees: float = Field(default=0.05, ge=0.005, le=1.0)


def _safe_csv(name: Optional[str], fallback: str) -> str:
    raw = re.sub(r"[^A-Za-z0-9._-]+", "_", name or fallback).strip("._")
    if not raw.lower().endswith(".csv"):
        raw += ".csv"
    return raw[:180] or "earthdata.csv"


def _session(token: str) -> requests.Session:
    session = requests.Session()
    # Keep retries shallow here. Granule recovery already rotates alternate
    # CMR URLs and performs a fresh metadata lookup; stacking transport retries
    # underneath that causes pathological multi-minute stalls.
    retry = Retry(
        total=1,
        connect=1,
        read=1,
        status=1,
        backoff_factor=0.25,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET"]),
        respect_retry_after_header=False,
    )
    session.mount(
        "https://",
        HTTPAdapter(
            max_retries=retry,
            pool_connections=64,
            pool_maxsize=64,
            pool_block=False,
        ),
    )
    session.headers.update({
        "Authorization": f"Bearer {token.strip()}",
        "User-Agent": "EarthdataCSVDownloader/3.2",
        "Accept": "application/octet-stream, application/x-netcdf, application/x-hdf, image/tiff, text/csv, application/json, */*",
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


HARMONY = "https://harmony.earthdata.nasa.gov"


def _finalize_science_scope(
    combined: pd.DataFrame,
    req: DownloadRequest,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    if combined.empty:
        return combined, {}

    effective_start = req.effective_start_date or req.date_range.start
    effective_end = req.effective_end_date or req.date_range.end

    return strict_scope_filter(
        combined,
        _component_terms(req.component, []),
        effective_start.isoformat(),
        effective_end.isoformat(),
        keep_audit_rows=not req.strict_scope_mode,
        component_strict=req.strict_scope_mode,
        requested_start_date=req.date_range.start.isoformat(),
        requested_end_date=req.date_range.end.isoformat(),
        date_fallback_used=req.date_fallback_used,
        date_fallback_date=(
            req.date_fallback_date.isoformat()
            if req.date_fallback_date else None
        ),
        date_fallback_relation=req.date_fallback_relation,
        date_fallback_distance_days=req.date_fallback_distance_days,
        date_fallback_target_date=(
            req.date_fallback_target_date or req.date_range.end
        ).isoformat(),
    )



def _harmony_capabilities(token: str, collection_id: str) -> dict:
    result = {
        "available": False,
        "bbox_subset": False,
        "variable_subset": False,
        "temporal_subset": False,
        "concatenate": False,
        "output_formats": [],
        "services": [],
    }
    if not collection_id:
        return result

    headers = {
        "Authorization": f"Bearer {token.strip()}",
        "Accept": "application/json",
        "User-Agent": "EarthdataCSVDownloader/3.2",
    }

    # Version 1 intentionally exposes bboxSubset/variableSubset/etc. at the
    # root, matching the fields this downloader needs. Versions 2/3 structure
    # capabilities under service/summary objects.
    try:
        response = requests.get(
            f"{HARMONY}/capabilities",
            params={"collectionId": collection_id, "version": "1"},
            headers=headers,
            timeout=(2.5, 6.0),
            allow_redirects=True,
        )
        if not response.ok:
            return result

        data = response.json()
        services = []
        for service in data.get("services") or []:
            name = service.get("name")
            if name and name not in services:
                services.append(str(name))

        formats = [str(v) for v in (data.get("outputFormats") or [])]
        available = bool(
            data.get("bboxSubset")
            or data.get("variableSubset")
            or data.get("temporalSubset")
            or data.get("concatenate")
            or formats
            or services
        )

        return {
            "available": available,
            "bbox_subset": bool(data.get("bboxSubset")),
            "variable_subset": bool(data.get("variableSubset")),
            "temporal_subset": bool(data.get("temporalSubset")),
            "concatenate": bool(data.get("concatenate")),
            "output_formats": formats,
            "services": services,
        }
    except Exception:
        return result


def _harmony_output_format(formats: list[str]) -> str | None:
    normalized = {str(value).lower(): str(value) for value in formats or []}
    for preferred in (
        "text/csv",
        "application/netcdf",
        "application/x-netcdf4",
        "application/x-netcdf",
        "application/x-hdf",
        "application/x-hdf5",
        "image/tiff",
    ):
        if preferred in normalized:
            return normalized[preferred]
    return None


def _harmony_subset_request(
    session: requests.Session,
    req: SingleGranuleDownloadRequest,
    granule: dict,
) -> tuple[bytes, str, str, str | None] | tuple[None, None, None, str | None]:
    if not req.harmony_available or not req.harmony_bbox_subset or not req.collection_id:
        return None, None, None, None

    variable_path = "all"
    if req.harmony_variable_subset and req.variable_filters:
        clean = [str(v).strip() for v in req.variable_filters if str(v).strip()]
        if clean:
            variable_path = ",".join(clean)

    url = (
        f"{HARMONY}/{quote(req.collection_id, safe='')}"
        f"/ogc-api-coverages/1.0.0/collections/{quote(variable_path, safe=',')}"
        "/coverage/rangeset"
    )
    params: list[tuple[str, str]] = [
        ("granuleId", str(granule.get("concept_id") or req.granule_id)),
        ("subset", f"lat({req.bbox.south}:{req.bbox.north})"),
        ("subset", f"lon({req.bbox.west}:{req.bbox.east})"),
        ("maxResults", "1"),
        ("ignoreErrors", "true"),
        ("skipPreview", "true"),
    ]
    output_format = _harmony_output_format(req.harmony_output_formats)
    if output_format:
        params.append(("format", output_format))

    fast_timeout = max(
        1.0,
        float(
            os.getenv(
                "EARTHDATA_HARMONY_RECOVERY_TIMEOUT_SECONDS" if req.recovery_mode
                else "EARTHDATA_HARMONY_FAST_TIMEOUT_SECONDS",
                "12.0" if req.recovery_mode else "4.0",
            )
        ),
    )

    try:
        response = session.get(
            url,
            params=params,
            timeout=(2.0, fast_timeout),
            allow_redirects=True,
        )
    except requests.RequestException:
        return None, None, None, None

    if not response.ok:
        return None, None, None, None

    content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
    body = response.content or b""

    if content_type == "application/json" or body.lstrip().startswith(b"{"):
        try:
            payload = response.json()
        except Exception:
            return None, None, None, None

        # Harmony returns job metadata when processing is asynchronous. Keep the
        # job id so callers can use it as a reliability fallback after the
        # direct route fails.
        job_id = payload.get("jobID")
        for link in payload.get("links") or []:
            if link.get("rel") == "data" and link.get("href"):
                data_url = str(link["href"])
                try:
                    data_response = session.get(
                        data_url,
                        timeout=(2.0, fast_timeout),
                        allow_redirects=True,
                    )
                    if data_response.ok and data_response.content:
                        name = _filename(data_url, data_response, 1)
                        return data_response.content, name, str(data_response.url or data_url), str(job_id or "")
                except Exception:
                    pass
        return None, None, None, str(job_id) if job_id else None

    if not body:
        return None, None, None, None

    name = _filename(str(response.url or url), response, 1)
    return body, name, str(response.url or url), None


def _harmony_poll_job(
    session: requests.Session,
    job_id: str | None,
    max_wait_seconds: float = 18.0,
) -> tuple[bytes, str, str] | None:
    if not job_id:
        return None

    deadline = time.monotonic() + max(1.0, max_wait_seconds)
    job_url = f"{HARMONY}/jobs/{quote(job_id, safe='')}"

    while time.monotonic() < deadline:
        try:
            response = session.get(
                job_url,
                headers={"Accept": "application/json"},
                timeout=(2.0, 4.0),
                allow_redirects=True,
            )
            if not response.ok:
                return None
            payload = response.json()
        except Exception:
            return None

        status = str(payload.get("status") or "").lower()
        links = payload.get("links") or []
        data_links = [
            str(link.get("href"))
            for link in links
            if link.get("rel") == "data" and link.get("href")
        ]
        if data_links:
            for data_url in data_links:
                try:
                    data_response = session.get(
                        data_url,
                        timeout=(2.0, 8.0),
                        allow_redirects=True,
                    )
                    if data_response.ok and data_response.content:
                        return (
                            data_response.content,
                            _filename(data_url, data_response, 1),
                            str(data_response.url or data_url),
                        )
                except Exception:
                    continue

        if status in {"failed", "canceled", "cancelled", "successful", "complete", "completed"}:
            return None
        time.sleep(0.5)

    return None


def _prefer_harmony_for_granule(req: SingleGranuleDownloadRequest, granule: dict) -> bool:
    if not req.harmony_available or not req.harmony_bbox_subset:
        return False
    if req.recovery_mode:
        return True
    name = str(granule.get("granule_ur") or "").lower()
    urls = " ".join(granule.get("download_urls") or []).lower()
    size_mb = float(granule.get("size_mb") or 0.0)
    risky_extension = any(
        token in name or token in urls
        for token in (".hdf", ".he5", ".h5", ".nc4", ".nc")
    )
    risky_collection = str(req.collection_short_name or "").upper().startswith(
        ("AIRIBRAD", "OMNO2", "OMNO2D")
    )
    return risky_collection or risky_extension or size_mb >= 8.0


def _download_granule_bytes(
    session: requests.Session,
    url: str,
    idx: int,
    recovery_mode: bool = False,
) -> tuple[bytes, str, str]:
    persistent = os.getenv("EARTHDATA_RUNTIME_PROFILE", "").lower() == "persistent"
    max_mb_default = "4096" if persistent else "256"
    max_mb = max(1, int(os.getenv("EARTHDATA_MAX_GRANULE_MB", max_mb_default)))
    max_bytes = max_mb * 1024 * 1024

    connect_timeout = max(
        1.0,
        float(os.getenv("EARTHDATA_CONNECT_TIMEOUT_SECONDS", "3.0")),
    )
    read_timeout = max(
        2.0,
        float(
            os.getenv(
                "EARTHDATA_RECOVERY_READ_TIMEOUT_SECONDS" if recovery_mode
                else "EARTHDATA_PRIMARY_READ_TIMEOUT_SECONDS",
                ("180.0" if persistent else "30.0") if recovery_mode
                else ("90.0" if persistent else "15.0"),
            )
        ),
    )
    total_budget = max(
        read_timeout,
        float(
            os.getenv(
                "EARTHDATA_RECOVERY_GRANULE_BUDGET_SECONDS" if recovery_mode
                else "EARTHDATA_PRIMARY_GRANULE_BUDGET_SECONDS",
                ("300.0" if persistent else "45.0") if recovery_mode
                else ("150.0" if persistent else "22.0"),
            )
        ),
    )
    started = time.monotonic()

    with session.get(
        url,
        stream=True,
        timeout=(connect_timeout, read_timeout),
        allow_redirects=True,
    ) as response:
        if response.status_code in (401, 403):
            raise PermissionError(
                "NASA denied access to this granule. Validate the Earthdata token and make sure "
                "your Earthdata account is authorized for the collection's DAAC/provider."
            )
        if response.status_code == 404:
            raise FileNotFoundError(
                "NASA returned 404 for this granule URL. The CMR link may be stale; another "
                "download URL will be tried automatically when available."
            )
        if response.status_code == 429:
            retry_after = response.headers.get("retry-after")
            suffix = f" Retry after {retry_after} second(s)." if retry_after else ""
            raise RuntimeError("NASA temporarily rate-limited the download request." + suffix)
        if 500 <= response.status_code <= 599:
            raise RuntimeError(
                f"NASA data provider returned HTTP {response.status_code}. "
                "This is usually temporary; retry the granule shortly."
            )
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
            if time.monotonic() - started > total_budget:
                raise TimeoutError(
                    f"Granule download exceeded the {total_budget:.0f}s fast-path budget."
                )
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


def _granule_meta(
    req: DownloadRequest,
    granule: dict,
    filename: str = "",
    url: str = "",
) -> dict:
    component_names = [
        value.strip()
        for value in re.split(r"[;,\n\r]+", req.component or "")
        if value.strip()
    ]
    satellite_names = granule.get("platforms") or []
    instrument_names = granule.get("instruments") or []

    return {
        "source": "NASA Earthdata",
        "source_agency": "NASA",
        "source_provider": req.collection_provider or "",
        "source_satellite": ";".join(satellite_names),
        "source_instrument": ";".join(instrument_names),
        "component_primary": component_names[0] if component_names else "",
        "component_names": ";".join(component_names),
        "component_count": len(component_names),
        "component_query": req.component,
        "requested_start_date": req.date_range.start.isoformat(),
        "requested_end_date": req.date_range.end.isoformat(),
        "effective_start_date": (
            req.effective_start_date or req.date_range.start
        ).isoformat(),
        "effective_end_date": (
            req.effective_end_date or req.date_range.end
        ).isoformat(),
        "date_fallback_used": bool(req.date_fallback_used),
        "date_fallback_date": (
            req.date_fallback_date.isoformat() if req.date_fallback_date else ""
        ),
        "date_fallback_relation": req.date_fallback_relation or "",
        "date_fallback_distance_days": (
            req.date_fallback_distance_days
            if req.date_fallback_distance_days is not None else ""
        ),
        "date_fallback_target_date": (
            req.date_fallback_target_date or req.date_range.end
        ).isoformat(),
        "strict_scope_mode": bool(req.strict_scope_mode),
        "collection_search_name": req.collection_search_name or "",
        "collection_id": req.collection_id,
        "collection_short_name": req.collection_short_name or "",
        "collection_title": req.collection_title or "",
        "collection_version": req.collection_version or "",
        "collection_provider": req.collection_provider or "",
        "collection_processing_level": req.collection_processing_level or "",
        "collection_segment_key": "|".join(
            value for value in [
                req.collection_short_name or "",
                req.collection_version or "",
                req.collection_id or "",
            ] if value
        ),
        "granule_id": granule.get("concept_id") or "",
        "granule_ur": granule.get("granule_ur") or "",
        "granule_production_date_utc": granule.get("production_date") or "",
        "granule_size_mb": granule.get("size_mb") or "",
        "satellite_platform": ";".join(satellite_names),
        "instrument": ";".join(instrument_names),
        "granule_begin": granule.get("begin") or "",
        "granule_end": granule.get("end") or "",
        "original_file": filename,
        "download_url": url,
        "raw_download_url": url,
    }


def _classify_granule_failure(error_text: str) -> str:
    text = str(error_text or "").lower()
    if not text:
        return "unknown"
    if "401" in text or "403" in text or "denied access" in text or "authorized" in text:
        return "authorization"
    if "404" in text or "stale" in text or "not found" in text:
        return "stale_or_missing_url"
    if "429" in text or "rate-limit" in text or "rate limit" in text:
        return "rate_limited"
    if any(token in text for token in ("http 500", "http 502", "http 503", "http 504", "provider returned http 5", "server error")):
        return "provider_server_error"
    if any(token in text for token in ("timeout", "timed out", "function_invocation_timeout")):
        return "timeout"
    if any(token in text for token in ("larger than", "memory limit", "exceeded the configured", "response limit", "too large")):
        return "oversized"
    if "html page instead of science data" in text:
        return "non_data_url"
    if any(token in text for token in ("no matching data rows", "no rows", "bounding-box filtering", "bbox", "no bbox")):
        return "no_rows_after_filter"
    if any(token in text for token in ("netcdf", "hdf", "he5", "geotiff", "reader failed", "unsupported", "decode", "conversion failed")):
        return "format_or_decode"
    return "unknown"


def _url_recovery_rank(url: str) -> tuple[int, int, str]:
    lower = str(url or "").lower()
    clean = lower.split("?")[0]
    direct_exts = (
        ".nc", ".nc4", ".cdf", ".h5", ".hdf5", ".he5", ".hdf",
        ".tif", ".tiff", ".csv", ".tsv", ".txt", ".json", ".geojson",
        ".zip", ".gz",
    )
    if clean.endswith(direct_exts):
        score = 0
    elif "download" in lower or "data" in lower:
        score = 1
    elif any(token in lower for token in ("opendap", "dods", "thredds")):
        score = 4
    else:
        score = 2
    return (score, len(url), url)


def _merge_refreshed_granule(original: dict, fresh: dict | None) -> dict:
    if not fresh:
        return dict(original)

    merged = dict(original)
    for key in (
        "concept_id", "granule_ur", "begin", "end", "production_date",
        "size_mb", "platforms", "instruments",
    ):
        value = fresh.get(key)
        if value not in (None, "", []):
            merged[key] = value

    urls: list[str] = []
    seen: set[str] = set()
    for value in (fresh.get("download_urls") or []) + (original.get("download_urls") or []):
        url = str(value or "").strip()
        if not url or url in seen:
            continue
        seen.add(url)
        urls.append(url)

    for value in (fresh.get("primary_url"), original.get("primary_url")):
        url = str(value or "").strip()
        if url and url not in seen:
            seen.add(url)
            urls.append(url)

    urls.sort(key=_url_recovery_rank)
    merged["download_urls"] = urls
    merged["primary_url"] = urls[0] if urls else None
    return merged


async def _refresh_granule_for_recovery(
    req: SingleGranuleDownloadRequest,
    granule: dict,
) -> tuple[dict, str]:
    client = CMRClient(req.token)
    fresh = None
    strategy = "reuse_original_metadata"

    try:
        fresh = await client.granule_by_id(
            str(granule.get("concept_id") or req.granule_id),
            collection_id=req.collection_id,
        )
        if fresh:
            strategy = "fresh_cmr_concept_id"
    except Exception:
        fresh = None

    if not fresh:
        granule_ur = str(granule.get("granule_ur") or req.granule_ur or "")
        if granule_ur:
            try:
                fresh = await client.granule_by_ur(
                    granule_ur,
                    collection_id=req.collection_id,
                )
                if fresh:
                    strategy = "fresh_cmr_granule_ur"
            except Exception:
                fresh = None

    return _merge_refreshed_granule(granule, fresh), strategy


def _conversion_failure_frame(
    req: DownloadRequest,
    granule: dict,
    error_text: str,
    raw_url: str = "",
    recovery_strategy: str = "",
) -> pd.DataFrame:
    meta = _granule_meta(req, granule, filename="", url=raw_url)
    row = dict(meta)
    row.update(
        {
            "conversion_status": "conversion_failed",
            "conversion_error": error_text,
            "failure_class": _classify_granule_failure(error_text),
            "recovery_strategy": recovery_strategy,
            "variable": "__conversion_status__",
            "value": "",
            "unit": "",
        }
    )
    return pd.DataFrame([row])


def _download_convert(
    req: DownloadRequest,
    granules: list[dict],
    cycle_override: Optional[dict] = None,
) -> tuple[bytes, dict]:
    frames: list[pd.DataFrame] = []
    errors: list[dict[str, str]] = []
    failure_classes: dict[str, int] = {}
    session = _session(req.token)
    requested_components = _component_terms(req.component, [])
    automatic_filters = component_filter_terms(requested_components)
    effective_filters = req.variable_filters or automatic_filters
    successful_granules = 0

    for idx, granule in enumerate(granules, 1):
        urls = granule.get("download_urls") or []
        if not urls and granule.get("primary_url"):
            urls = [granule["primary_url"]]

        if not urls:
            error_text = "No downloadable URL is present in NASA CMR metadata."
            errors.append(
                {
                    "granule": str(granule.get("granule_ur") or granule.get("concept_id") or idx),
                    "error": error_text,
                }
            )
            failure_class = _classify_granule_failure(error_text)
            failure_classes[failure_class] = failure_classes.get(failure_class, 0) + 1
            frames.append(
                _conversion_failure_frame(
                    req,
                    granule,
                    error_text,
                    recovery_strategy="fresh_cmr_lookup" if req.recovery_mode else "",
                )
            )
            continue

        success = False
        url_errors: list[str] = []

        candidate_urls = urls[:6] if req.recovery_mode else urls[:2]
        persistent = os.getenv("EARTHDATA_RUNTIME_PROFILE", "").lower() == "persistent"
        granule_deadline = time.monotonic() + (
            (360.0 if persistent else 55.0)
            if req.recovery_mode
            else (180.0 if persistent else 28.0)
        )

        for url in candidate_urls:
            if time.monotonic() >= granule_deadline:
                url_errors.append("Granule fast-path time budget exhausted.")
                break
            try:
                data, filename, final_url = _download_granule_bytes(
                    session,
                    url,
                    idx,
                    recovery_mode=req.recovery_mode,
                )
                meta = _granule_meta(req, granule, filename=filename, url=final_url)
                meta["conversion_status"] = "converted"
                meta["conversion_error"] = ""

                converted = convert_bytes(
                    data,
                    filename=filename,
                    meta=meta,
                    filters=effective_filters,
                    bbox=req.bbox.dict4(),
                    max_rows=max(0, int(req.max_rows_per_variable)),
                )

                # Human component labels and NASA internal variable names often
                # differ. On recovery, retry the same scientifically valid file
                # without the variable-name filter before declaring failure.
                if not converted and req.recovery_mode and effective_filters:
                    relaxed_meta = dict(meta)
                    relaxed_meta["recovery_strategy"] = "relaxed_variable_filter"
                    converted = convert_bytes(
                        data,
                        filename=filename,
                        meta=relaxed_meta,
                        filters=[],
                        bbox=req.bbox.dict4(),
                        max_rows=max(0, int(req.max_rows_per_variable)),
                    )

                if not converted:
                    raise ValueError(
                        "The file was readable, but no matching data rows remained after "
                        "variable/bounding-box filtering."
                    )

                frames.extend(converted)
                successful_granules += 1
                success = True
                break
            except Exception as exc:
                url_errors.append(str(exc))

        if not success:
            error_text = " | ".join(url_errors[:3]) or "Download/conversion failed."
            failure_class = _classify_granule_failure(error_text)
            failure_classes[failure_class] = failure_classes.get(failure_class, 0) + 1
            errors.append(
                {
                    "granule": str(granule.get("granule_ur") or granule.get("concept_id") or idx),
                    "error": error_text,
                    "failure_class": failure_class,
                }
            )
            frames.append(
                _conversion_failure_frame(
                    req,
                    granule,
                    error_text,
                    raw_url=urls[0] if urls else "",
                    recovery_strategy="alternate_urls_exhausted",
                )
            )

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

    scope_report: dict[str, Any] = {}
    if successful_granules > 0 and not combined.empty:
        combined, scope_report = _finalize_science_scope(combined, req)
        if combined.empty:
            # This is not a broken granule. It belongs to the selected
            # collection/date search but contains no science rows for the
            # selected component after the final purity gate.
            successful_granules = 0
            scope_report["irrelevant_granules"] = 1
            scope_report["irrelevant_reason"] = "no_selected_component_rows"


    if req.low_bandwidth_training_mode and not combined.empty and successful_granules > 0:
        combined = compact_training_frame(combined, req.training_grid_degrees)

    irrelevant_granules = int(scope_report.get("irrelevant_granules", 0))
    if combined.empty and not irrelevant_granules:
        raise ValueError("NASA returned no rows that could be represented in the export.")

    csv_bytes = combined.to_csv(index=False).encode("utf-8")
    return csv_bytes, {
        "rows": len(combined),
        "converted_frames": len(frames),
        "successful_granules": successful_granules,
        "irrelevant_granules": irrelevant_granules,
        "errors": errors,
        "failure_classes": failure_classes,
        "scope_report": scope_report,
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
    response_headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response_headers["Pragma"] = "no-cache"
    response_headers["X-Content-Type-Options"] = "nosniff"
    response_headers["X-Earthdata-Uncompressed-Bytes"] = str(len(content))

    if len(content) > 65_536:
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
    return {"ok": True, "service": "earthdata-csv-downloader", "version": "3.2.0"}


@app.post("/api/token/validate")
async def token_validate(req: TokenRequest):
    if not req.token.strip():
        raise HTTPException(400, "Earthdata token is required.")
    try:
        return await CMRClient(req.token).validate()
    except Exception as exc:
        raise HTTPException(502, f"Could not reach NASA CMR: {exc}")


def _component_terms(primary: str, extras: list[str]) -> list[str]:
    values: list[str] = []
    seen: set[str] = set()
    for raw in [primary, *(extras or [])]:
        for part in re.split(r"[,;\n\r]+", str(raw or "")):
            value = part.strip()
            if not value:
                continue
            key = value.casefold()
            if key in seen:
                continue
            seen.add(key)
            values.append(value)
    return values


@app.post("/api/collections/search")
async def collections_search(req: CollectionRequest):
    components = _component_terms(req.component, req.components)
    collection_name = req.collection_name.strip()

    if not components and not collection_name:
        raise HTTPException(400, "Enter at least one component/variable or a collection name.")

    try:
        semaphore = asyncio.Semaphore(12)

        async def search_component(component: Optional[str]):
            async with semaphore:
                result = await CMRClient(req.token).collections(
                    component=component,
                    collection_name=collection_name or None,
                    bbox=req.bbox.cmr() if req.bbox else None,
                    platforms=req.platforms,
                    instruments=req.instruments,
                )
                return component, result

        search_terms: list[Optional[str]] = components or [None]
        results = await asyncio.gather(
            *(search_component(component) for component in search_terms)
        )

        merged: dict[str, dict] = {}
        total_reported_hits = 0
        for component, nasa in results:
            try:
                total_reported_hits += int(nasa.get("reported_hits_before_deduplication") or nasa.get("hits") or 0)
            except Exception:
                pass

            for raw_item in nasa.get("items") or []:
                item = dict(raw_item)
                concept_id = str(item.get("concept_id") or "")
                key = concept_id or f"{item.get('short_name')}::{item.get('version')}::{item.get('title')}"

                if key not in merged:
                    item["matched_components"] = []
                    merged[key] = item

                matched = merged[key].setdefault("matched_components", [])
                if component and component not in matched:
                    matched.append(component)

        items = list(merged.values())
        items.sort(
            key=lambda item: (
                str(item.get("short_name") or "").casefold(),
                str(item.get("title") or "").casefold(),
            )
        )

        satellite_groups: dict[str, int] = {}
        for item in items:
            for platform in item.get("platforms") or ["Unspecified platform"]:
                satellite_groups[platform] = satellite_groups.get(platform, 0) + 1

        nasa = {
            "hits": len(items),
            "retrieved": len(items),
            "reported_hits_before_deduplication": total_reported_hits,
            "items": items,
            "satellite_groups": dict(
                sorted(satellite_groups.items(), key=lambda pair: pair[0].lower())
            ),
            "search_mode": "multi_component" if len(components) > 1 else "component",
            "component_queries": components,
        }

        external_by_id: dict[str, dict] = {}
        for component in components:
            for candidate in resolve_external(component):
                key = str(candidate.get("id") or f"{candidate.get('provider')}::{candidate.get('variable')}")
                if key not in external_by_id:
                    enriched = dict(candidate)
                    enriched["matched_components"] = [component]
                    external_by_id[key] = enriched
                elif component not in external_by_id[key].setdefault("matched_components", []):
                    external_by_id[key]["matched_components"].append(component)

        external = list(external_by_id.values())

        return {
            "component": ", ".join(components) if components else None,
            "components": components,
            "collection_name": collection_name or None,
            "nasa": nasa,
            "external_candidates": external if components and not items else [],
            "external_candidates_always": external,
        }
    except Exception as exc:
        raise HTTPException(502, f"NASA collection search failed: {exc}")


def _component_variable_filters(
    records: list[dict[str, Any]],
    components: list[str],
) -> list[str]:
    """Resolve real source-variable names from CMR UMM-Var metadata."""
    requested = [str(value).strip() for value in components if str(value).strip()]
    if not records or not requested:
        return []

    candidates: list[str] = []
    seen: set[str] = set()

    for record in records:
        searchable_fields: list[str] = [
            str(record.get("name") or ""),
            str(record.get("long_name") or ""),
            str(record.get("standard_name") or ""),
            str(record.get("definition") or ""),
        ]
        searchable_fields.extend(
            str(value)
            for value in (record.get("additional_identifiers") or [])
            if str(value).strip()
        )
        searchable_fields.extend(
            str(value)
            for value in (record.get("science_keywords") or [])
            if str(value).strip()
        )

        matched = False
        for component in requested:
            if any(
                _component_match_score(field, component)[0] > 0
                for field in searchable_fields
                if field
            ):
                matched = True
                break

        if not matched:
            continue

        for value in [
            record.get("name"),
            *(record.get("additional_identifiers") or []),
        ]:
            text = str(value or "").strip()
            if not text:
                continue
            for candidate in (
                text,
                text.replace("\\", "/").split("/")[-1],
            ):
                key = candidate.casefold()
                if candidate and key not in seen:
                    seen.add(key)
                    candidates.append(candidate)

    return candidates


@app.post("/api/granules/search")
async def granules_search(req: GranuleRequest):
    if req.date_range.start > req.date_range.end:
        raise HTTPException(400, "Start date must be on or before end date.")
    try:
        client = CMRClient(req.token)
        granule_task = client.granules(
            collection_id=req.collection_id,
            bbox=req.bbox.cmr(),
            start_date=req.date_range.start.isoformat(),
            end_date=req.date_range.end.isoformat(),
            platform=req.platform,
            instrument=req.instrument,
            fallback_latest=req.fallback_latest,
        )
        harmony_task = asyncio.to_thread(
            _harmony_capabilities,
            req.token,
            req.collection_id,
        )
        variables_task = client.variables_for_collection(req.collection_id)
        result, harmony, variable_records = await asyncio.gather(
            granule_task,
            harmony_task,
            variables_task,
        )
        result["harmony"] = harmony
        result["component_variable_filters"] = _component_variable_filters(
            variable_records,
            req.components,
        )
        result["collection_variable_count"] = len(variable_records)
        return result
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

        req.effective_start_date = date.fromisoformat(
            str(result.get("effective_start_date") or req.date_range.start.isoformat())
        )
        req.effective_end_date = date.fromisoformat(
            str(result.get("effective_end_date") or req.date_range.end.isoformat())
        )
        req.date_fallback_used = bool(result.get("fallback_used"))
        req.date_fallback_date = (
            date.fromisoformat(str(result["fallback_date"]))
            if result.get("fallback_date") else None
        )
        req.date_fallback_relation = result.get("fallback_relation")
        req.date_fallback_distance_days = result.get("fallback_distance_days")
        req.date_fallback_target_date = (
            date.fromisoformat(str(result["fallback_target_date"]))
            if result.get("fallback_target_date") else req.date_range.end
        )

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
                "X-Earthdata-Successful-Granules": str(report.get("successful_granules", 0)),
                "X-Earthdata-Irrelevant-Granule": str(bool(report.get("irrelevant_granules", 0))).lower(),
                "X-Earthdata-Conversion-Status": "converted" if not report["errors"] else ("partial" if report.get("successful_granules", 0) else "failed"),
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Download/conversion failed: {exc}")


@app.post("/api/download/nasa/granule")
async def download_nasa_granule(req: SingleGranuleDownloadRequest):
    started = time.perf_counter()
    try:
        granule = {
            "concept_id": req.granule_id,
            "granule_ur": req.granule_ur,
            "begin": req.begin,
            "end": req.end,
            "production_date": req.production_date,
            "size_mb": req.size_mb,
            "platforms": req.platforms,
            "instruments": req.instruments,
            "download_urls": req.download_urls,
            "primary_url": req.primary_url,
        }

        # The browser already received this metadata from the CMR granule search.
        # Avoid a second CMR round-trip for every selected granule. Fall back to
        # CMR only when a legacy client does not send usable download URLs.
        if not granule["download_urls"] and not granule["primary_url"]:
            looked_up = await CMRClient(req.token).granule_by_id(
                req.granule_id,
                collection_id=req.collection_id,
            )
            if not looked_up:
                raise HTTPException(
                    404,
                    "The selected granule could not be found in NASA CMR or is not marked downloadable.",
                )
            granule = looked_up

        requested_components = _component_terms(req.component, [])
        automatic_filters = component_filter_terms(requested_components)
        effective_filters = req.variable_filters or automatic_filters

        recovery_metadata_strategy = ""
        if req.recovery_mode:
            granule, recovery_metadata_strategy = await _refresh_granule_for_recovery(
                req,
                granule,
            )

        cycle_override = {
            "label": req.cycle_label,
            "interval_seconds": req.cycle_interval_seconds,
            "detail": req.cycle_detail,
            "basis": req.cycle_basis,
        }

        access_path = "direct"
        harmony_job_id: str | None = None
        content = None
        report = None

        if _prefer_harmony_for_granule(req, granule):
            try:
                harmony_result = await asyncio.to_thread(
                    _harmony_subset_request,
                    _session(req.token),
                    req,
                    granule,
                )
                subset_data, subset_name, subset_url, harmony_job_id = harmony_result
                if subset_data:
                    meta = _granule_meta(
                        req,
                        granule,
                        filename=subset_name or "",
                        url=subset_url or "",
                    )
                    meta["conversion_status"] = "converted"
                    meta["conversion_error"] = ""
                    meta["source_access_method"] = "NASA Harmony bbox subset"
                    frames = convert_bytes(
                        subset_data,
                        filename=subset_name or "harmony_subset",
                        meta=meta,
                        filters=effective_filters,
                        bbox=req.bbox.dict4(),
                        max_rows=max(0, int(req.max_rows_per_variable)),
                    )
                    combined = combine_frames(frames)
                    combined, harmony_scope_report = _finalize_science_scope(combined, req)
                    if req.low_bandwidth_training_mode and not combined.empty:
                        combined = compact_training_frame(combined, req.training_grid_degrees)
                    if combined.empty and harmony_scope_report.get("input_rows", 0):
                        content = combined.to_csv(index=False).encode("utf-8")
                        report = {
                            "rows": 0,
                            "converted_frames": len(frames),
                            "successful_granules": 0,
                            "irrelevant_granules": 1,
                            "errors": [],
                            "failure_classes": {},
                            "scope_report": {
                                **harmony_scope_report,
                                "irrelevant_granules": 1,
                                "irrelevant_reason": "no_selected_component_rows",
                            },
                            "csv_bytes": len(content),
                        }
                        access_path = "harmony-irrelevant"
                    elif not combined.empty:
                        content = combined.to_csv(index=False).encode("utf-8")
                        report = {
                            "rows": len(combined),
                            "converted_frames": len(frames),
                            "successful_granules": 1,
                            "irrelevant_granules": 0,
                            "errors": [],
                            "failure_classes": {},
                            "scope_report": harmony_scope_report,
                            "csv_bytes": len(content),
                        }
                        access_path = "harmony"
            except Exception:
                content = None
                report = None

        if content is None and req.recovery_mode and harmony_job_id:
            try:
                completed = await asyncio.to_thread(
                    _harmony_poll_job,
                    _session(req.token),
                    harmony_job_id,
                    45.0,
                )
                if completed:
                    subset_data, subset_name, subset_url = completed
                    meta = _granule_meta(
                        req,
                        granule,
                        filename=subset_name,
                        url=subset_url,
                    )
                    meta["conversion_status"] = "converted"
                    meta["conversion_error"] = ""
                    meta["source_access_method"] = "NASA Harmony recovery subset"
                    frames = convert_bytes(
                        subset_data,
                        filename=subset_name,
                        meta=meta,
                        filters=effective_filters,
                        bbox=req.bbox.dict4(),
                        max_rows=max(0, int(req.max_rows_per_variable)),
                    )
                    combined = combine_frames(frames)
                    combined, harmony_scope_report = _finalize_science_scope(combined, req)
                    if req.low_bandwidth_training_mode and not combined.empty:
                        combined = compact_training_frame(combined, req.training_grid_degrees)
                    if combined.empty and harmony_scope_report.get("input_rows", 0):
                        content = combined.to_csv(index=False).encode("utf-8")
                        report = {
                            "rows": 0,
                            "converted_frames": len(frames),
                            "successful_granules": 0,
                            "irrelevant_granules": 1,
                            "errors": [],
                            "failure_classes": {},
                            "scope_report": {
                                **harmony_scope_report,
                                "irrelevant_granules": 1,
                                "irrelevant_reason": "no_selected_component_rows",
                            },
                            "csv_bytes": len(content),
                        }
                        access_path = "harmony-irrelevant"
                    elif not combined.empty:
                        content = combined.to_csv(index=False).encode("utf-8")
                        report = {
                            "rows": len(combined),
                            "converted_frames": len(frames),
                            "successful_granules": 1,
                            "irrelevant_granules": 0,
                            "errors": [],
                            "failure_classes": {},
                            "scope_report": harmony_scope_report,
                            "csv_bytes": len(content),
                        }
                        access_path = "harmony-recovery"
            except Exception:
                pass

        if content is None or report is None:
            content, report = await asyncio.to_thread(
                _download_convert,
                req,
                [granule],
                cycle_override,
            )

            # If direct conversion only produced a failure manifest and Harmony
            # already accepted an asynchronous subset job, give NASA a short
            # reliability window to finish the reduced product and replace the
            # failure row with real science data.
            if report.get("successful_granules", 0) == 0 and harmony_job_id:
                try:
                    completed = await asyncio.to_thread(
                        _harmony_poll_job,
                        _session(req.token),
                        harmony_job_id,
                        45.0 if req.recovery_mode else 18.0,
                    )
                    if completed:
                        subset_data, subset_name, subset_url = completed
                        meta = _granule_meta(
                            req,
                            granule,
                            filename=subset_name,
                            url=subset_url,
                        )
                        meta["conversion_status"] = "converted"
                        meta["conversion_error"] = ""
                        meta["source_access_method"] = "NASA Harmony async bbox subset"
                        frames = convert_bytes(
                            subset_data,
                            filename=subset_name,
                            meta=meta,
                            filters=effective_filters,
                            bbox=req.bbox.dict4(),
                            max_rows=max(0, int(req.max_rows_per_variable)),
                        )
                        combined = combine_frames(frames)
                        combined, harmony_scope_report = _finalize_science_scope(combined, req)
                        if req.low_bandwidth_training_mode and not combined.empty:
                            combined = compact_training_frame(combined, req.training_grid_degrees)
                        if not combined.empty:
                            content = combined.to_csv(index=False).encode("utf-8")
                            report = {
                                "rows": len(combined),
                                "converted_frames": len(frames),
                                "successful_granules": 1,
                                "errors": [],
                                "csv_bytes": len(content),
                            }
                            access_path = "harmony-async"
                except Exception:
                    pass

        granule_label = granule.get("granule_ur") or req.granule_id
        name = _safe_csv(
            None,
            f"{req.component or 'earthdata'}_{granule_label}.csv",
        )
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        return _csv_http_response(
            content,
            name,
            {
                "X-Earthdata-Rows": str(report["rows"]),
                "X-Earthdata-Granules": "1",
                "X-Earthdata-Timezone": "UTC",
                "X-Earthdata-Granule-Id": req.granule_id,
                "X-Earthdata-Conversion-Errors": str(len(report["errors"])),
                "X-Earthdata-Successful-Granules": str(report.get("successful_granules", 0)),
                "X-Earthdata-Conversion-Status": "converted" if not report["errors"] else ("partial" if report.get("successful_granules", 0) else "failed"),
                "X-Earthdata-Processing-Ms": str(elapsed_ms),
                "X-Earthdata-Access-Path": access_path,
                "X-Earthdata-Recovery-Metadata": recovery_metadata_strategy,
                "X-Earthdata-Strict-Scope": str(bool(req.strict_scope_mode)).lower(),
                "X-Earthdata-Date-Fallback-Used": str(bool(req.date_fallback_used)).lower(),
                "X-Earthdata-Date-Fallback-Date": (
                    req.date_fallback_date.isoformat() if req.date_fallback_date else ""
                ),
                "X-Earthdata-Date-Fallback-Relation": req.date_fallback_relation or "",
                "X-Earthdata-Date-Fallback-Distance-Days": (
                    str(req.date_fallback_distance_days)
                    if req.date_fallback_distance_days is not None else ""
                ),
                "X-Earthdata-Scope-Dropped-Rows": str(
                    int(report.get("scope_report", {}).get("dropped_component_rows", 0))
                    + int(report.get("scope_report", {}).get("dropped_date_rows", 0))
                ),
                "X-Earthdata-Failure-Class": (
                    next(iter(report.get("failure_classes", {}).keys()), "")
                    if report.get("errors") else ""
                ),
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Granule download/conversion failed: {exc}")


@app.post("/api/download/ground")
async def download_ground(req: GroundRequest):
    components = _component_terms("", req.components)
    if not components:
        raise HTTPException(400, "At least one component is required for ground-data lookup.")

    semaphore = asyncio.Semaphore(6)

    async def one(component: str) -> pd.DataFrame:
        async with semaphore:
            return await asyncio.to_thread(
                fetch_ground_external,
                component,
                req.bbox.dict4(),
                req.date_range.start,
                req.date_range.end,
                req.openaq_api_key,
            )

    frames = await asyncio.gather(*(one(component) for component in components))
    frames = [frame for frame in frames if frame is not None and not frame.empty]
    if not frames:
        raise HTTPException(404, "No ground/reference data or status rows were produced.")

    combined = combine_frames(frames)
    if req.low_bandwidth_training_mode and not combined.empty:
        combined = compact_training_frame(combined, req.training_grid_degrees)

    content = combined.to_csv(index=False).encode("utf-8")
    return _csv_http_response(
        content,
        "ground_observations.csv",
        {
            "X-Earthdata-Rows": str(len(combined)),
            "X-Earthdata-Timezone": "UTC",
            "X-Earthdata-Source-Type": "ground",
        },
    )


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
