from __future__ import annotations

import gzip
import io
import json
import math
import os
import tempfile
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import numpy as np
import pandas as pd


LAT_NAMES = {"lat", "latitude", "y_lat", "nav_lat"}
LON_NAMES = {"lon", "longitude", "long", "x_lon", "nav_lon"}
TIME_NAMES = {"time", "datetime", "date", "timestamp", "observation_time"}


def _match_column(columns: Iterable[str], candidates: set[str]) -> str | None:
    lookup = {str(c).lower(): str(c) for c in columns}
    for candidate in candidates:
        if candidate in lookup:
            return lookup[candidate]
    for c in columns:
        low = str(c).lower()
        if any(candidate in low for candidate in candidates):
            return str(c)
    return None


def _filter_bbox(df: pd.DataFrame, bbox: dict[str, float]) -> pd.DataFrame:
    lat = _match_column(df.columns, LAT_NAMES)
    lon = _match_column(df.columns, LON_NAMES)
    if not lat or not lon:
        return df
    latv = pd.to_numeric(df[lat], errors="coerce")
    lonv = pd.to_numeric(df[lon], errors="coerce")
    mask = (
        latv.between(bbox["south"], bbox["north"])
        & lonv.between(bbox["west"], bbox["east"])
    )
    out = df.loc[mask].copy()
    rename: dict[str, str] = {}
    if lat != "latitude":
        rename[lat] = "latitude"
    if lon != "longitude":
        rename[lon] = "longitude"
    if rename:
        out.rename(columns=rename, inplace=True)
    return out


def _normalize_time(df: pd.DataFrame) -> pd.DataFrame:
    time_col = _match_column(df.columns, TIME_NAMES)
    if time_col and time_col != "observation_time":
        df = df.rename(columns={time_col: "observation_time"})
    return df


def _utc_series(values: pd.Series) -> pd.Series:
    return pd.to_datetime(values, errors="coerce", utc=True)


def _iso_utc(series: pd.Series) -> pd.Series:
    parsed = _utc_series(series)
    return parsed.dt.strftime("%Y-%m-%dT%H:%M:%SZ").where(parsed.notna(), "")


def _cycle_from_seconds(seconds: float | None) -> tuple[str, str]:
    if seconds is None or not np.isfinite(seconds) or seconds <= 0:
        return "Single/unknown", "Cadence cannot be inferred from a single usable timestamp."

    s = float(seconds)
    if s < 60:
        rounded = max(1, int(round(s)))
        return "Sub-minute", f"Every {rounded} second(s)"
    if s < 45 * 60:
        minutes = max(1, int(round(s / 60)))
        return f"{minutes}-minute", f"Every {minutes} minute(s)"
    if 45 * 60 <= s <= 90 * 60:
        return "Hourly", "Every 1 hour"
    if s < 18 * 3600:
        hours = max(2, int(round(s / 3600)))
        return f"{hours}-hourly", f"Every {hours} hours"
    if 18 * 3600 <= s <= 36 * 3600:
        return "Daily", "Every 1 day"
    if s < 25 * 86400:
        days = max(2, int(round(s / 86400)))
        return f"{days}-day", f"Every {days} days"
    if 25 * 86400 <= s <= 35 * 86400:
        return "Monthly", "Approximately every 1 month"
    if 35 * 86400 < s < 330 * 86400:
        days = max(1, int(round(s / 86400)))
        return f"{days}-day", f"Approximately every {days} days"
    if 330 * 86400 <= s <= 400 * 86400:
        return "Yearly", "Approximately every 1 year"

    days = max(1, int(round(s / 86400)))
    return "Irregular/long-cycle", f"Median interval is about {days} days"


def _infer_cycle_for_group(timestamps: pd.Series) -> tuple[str, float | None, str]:
    parsed = _utc_series(timestamps).dropna().drop_duplicates().sort_values()
    if len(parsed) < 2:
        return "Single/unknown", None, "Single usable timestamp; cadence unavailable"

    diffs = parsed.diff().dropna().dt.total_seconds()
    diffs = diffs[diffs > 0]
    if diffs.empty:
        return "Single/unknown", None, "No positive timestamp interval available"

    median_seconds = float(diffs.median())
    label, description = _cycle_from_seconds(median_seconds)

    if len(diffs) >= 3:
        spread = float((diffs.max() - diffs.min()) / median_seconds) if median_seconds else 0.0
        if spread > 0.35 and label not in ("Monthly", "Yearly"):
            return "Irregular", median_seconds, f"Irregular cadence; median interval {description.lower()}"

    return label, median_seconds, description


def _row_cycle_detail(timestamp: pd.Timestamp | None, cycle: str, base_detail: str) -> str:
    if timestamp is None or pd.isna(timestamp):
        return base_detail
    ts = timestamp.tz_convert("UTC") if timestamp.tzinfo else timestamp.tz_localize("UTC")
    time_text = ts.strftime("%H:%M:%S UTC")

    if cycle == "Hourly" or cycle.endswith("-hourly"):
        return f"{base_detail} · this row: {time_text}"
    if cycle == "Daily" or cycle.endswith("-day"):
        return f"{base_detail} · observation time: {time_text}"
    if cycle == "Monthly":
        return f"{base_detail} · observation position: day {ts.day}, {time_text}"
    if cycle == "Yearly":
        return f"{base_detail} · observation position: {ts.strftime('%m-%d')} {time_text}"
    if cycle.endswith("-minute") or cycle == "Sub-minute":
        return f"{base_detail} · this row: {time_text}"
    return base_detail


def annotate_temporal_metadata(
    df: pd.DataFrame,
    explicit_cycle: str | None = None,
    explicit_cycle_detail: str | None = None,
    timestamp_source_override: str | None = None,
) -> pd.DataFrame:
    if df.empty:
        return df

    out = df.copy()
    retrieved_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if "granule_begin" in out.columns:
        out["granule_start_utc"] = _iso_utc(out["granule_begin"])
    elif "granule_start_utc" not in out.columns:
        out["granule_start_utc"] = ""

    if "granule_end" in out.columns:
        out["granule_end_utc"] = _iso_utc(out["granule_end"])
    elif "granule_end_utc" not in out.columns:
        out["granule_end_utc"] = ""

    observation = _utc_series(out["observation_time"]) if "observation_time" in out.columns else pd.Series(pd.NaT, index=out.index, dtype="datetime64[ns, UTC]")
    granule_start = _utc_series(out["granule_start_utc"]) if "granule_start_utc" in out.columns else pd.Series(pd.NaT, index=out.index, dtype="datetime64[ns, UTC]")
    granule_end = _utc_series(out["granule_end_utc"]) if "granule_end_utc" in out.columns else pd.Series(pd.NaT, index=out.index, dtype="datetime64[ns, UTC]")

    chosen = observation.copy()
    source = pd.Series("observation_time", index=out.index, dtype="object")

    missing = chosen.isna()
    chosen.loc[missing] = granule_start.loc[missing]
    source.loc[missing & granule_start.notna()] = "granule_begin"

    still_missing = chosen.isna()
    chosen.loc[still_missing] = granule_end.loc[still_missing]
    source.loc[still_missing & granule_end.notna()] = "granule_end"

    source.loc[chosen.isna()] = "unavailable"
    if timestamp_source_override:
        source.loc[chosen.notna()] = timestamp_source_override

    out["data_timestamp_utc"] = chosen.dt.strftime("%Y-%m-%dT%H:%M:%SZ").where(chosen.notna(), "")
    out["data_date_utc"] = chosen.dt.strftime("%Y-%m-%d").where(chosen.notna(), "")
    out["data_time_utc"] = chosen.dt.strftime("%H:%M:%S").where(chosen.notna(), "")
    out["timestamp_source"] = source
    out["timestamp_timezone"] = "UTC"
    out["retrieved_at_utc"] = retrieved_at

    group_cols = [col for col in ("collection_id", "source", "variable") if col in out.columns]
    if not group_cols:
        group_cols = ["variable"] if "variable" in out.columns else []

    out["data_cycle"] = ""
    out["data_cycle_interval_seconds"] = np.nan
    out["data_cycle_detail"] = ""
    out["data_cycle_basis"] = ""

    if explicit_cycle:
        cycle_label = explicit_cycle
        detail = explicit_cycle_detail or explicit_cycle
        interval_seconds = None
        if explicit_cycle.lower() == "hourly":
            interval_seconds = 3600.0
        elif explicit_cycle.lower() == "daily":
            interval_seconds = 86400.0
        elif explicit_cycle.lower() == "monthly":
            interval_seconds = 30 * 86400.0
        elif explicit_cycle.lower() == "yearly":
            interval_seconds = 365 * 86400.0

        out["data_cycle"] = cycle_label
        if interval_seconds is not None:
            out["data_cycle_interval_seconds"] = interval_seconds
        out["data_cycle_basis"] = "Explicit provider/product cadence"
        out["data_cycle_detail"] = [
            _row_cycle_detail(ts, cycle_label, detail)
            for ts in chosen
        ]
        return out

    if group_cols:
        grouped = out.groupby(group_cols, dropna=False, sort=False)
        for _, index_values in grouped.groups.items():
            indexes = list(index_values)
            cycle, seconds, detail = _infer_cycle_for_group(out.loc[indexes, "data_timestamp_utc"])
            out.loc[indexes, "data_cycle"] = cycle
            if seconds is not None:
                out.loc[indexes, "data_cycle_interval_seconds"] = seconds
            out.loc[indexes, "data_cycle_basis"] = "Inferred from unique data timestamps"
            parsed = _utc_series(out.loc[indexes, "data_timestamp_utc"])
            out.loc[indexes, "data_cycle_detail"] = [
                _row_cycle_detail(ts, cycle, detail)
                for ts in parsed
            ]
    else:
        cycle, seconds, detail = _infer_cycle_for_group(out["data_timestamp_utc"])
        out["data_cycle"] = cycle
        if seconds is not None:
            out["data_cycle_interval_seconds"] = seconds
        out["data_cycle_basis"] = "Inferred from unique data timestamps"
        out["data_cycle_detail"] = [
            _row_cycle_detail(ts, cycle, detail)
            for ts in chosen
        ]

    unavailable = out["data_timestamp_utc"].eq("")
    out.loc[unavailable, "data_cycle"] = out.loc[unavailable, "data_cycle"].replace("", "Static/untimed")
    out.loc[unavailable, "data_cycle_detail"] = out.loc[unavailable, "data_cycle_detail"].replace("", "No observation timestamp supplied by source")
    out.loc[unavailable, "data_cycle_basis"] = out.loc[unavailable, "data_cycle_basis"].replace("", "Source contains no usable observation/granule timestamp")

    return out


def _apply_meta(df: pd.DataFrame, meta: dict[str, Any]) -> pd.DataFrame:
    if df.empty:
        return df
    for key, value in reversed(list(meta.items())):
        if key not in df.columns:
            df.insert(0, key, value if value is not None else "")
    return df


def _limit(df: pd.DataFrame, max_rows: int) -> pd.DataFrame:
    if max_rows and max_rows > 0 and len(df) > max_rows:
        return df.iloc[:max_rows].copy()
    return df


def _wanted(name: str, filters: list[str]) -> bool:
    if not filters:
        return True
    low = name.lower()
    return any(f.lower() in low for f in filters if f.strip())


def _xarray_file(
    path: Path,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    import xarray as xr

    frames: list[pd.DataFrame] = []
    ds = xr.open_dataset(path, decode_times=True, mask_and_scale=True)
    try:
        for name, arr in ds.data_vars.items():
            if not _wanted(name, filters):
                continue
            if not np.issubdtype(arr.dtype, np.number):
                continue
            try:
                df = arr.to_dataframe(name="value").reset_index()
            except Exception:
                values = np.asarray(arr.values).reshape(-1)
                df = pd.DataFrame({"value": values})
            df.insert(0, "variable", name)
            unit = str(arr.attrs.get("units") or arr.attrs.get("Units") or "")
            df.insert(1, "unit", unit)
            df = _normalize_time(df)
            df = _filter_bbox(df, bbox)
            df = _limit(df, max_rows)
            if not df.empty:
                frames.append(_apply_meta(df, meta))
    finally:
        ds.close()
    return frames


def _h5_datasets(handle: Any) -> list[tuple[str, Any]]:
    out: list[tuple[str, Any]] = []

    def visitor(name: str, obj: Any) -> None:
        try:
            import h5py
            if isinstance(obj, h5py.Dataset):
                out.append((name, obj))
        except Exception:
            pass

    handle.visititems(visitor)
    return out


def _hdf5_file(
    path: Path,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    import h5py

    frames: list[pd.DataFrame] = []
    with h5py.File(path, "r") as h:
        datasets = _h5_datasets(h)
        lat_ds = next((obj for name, obj in datasets if name.split("/")[-1].lower() in LAT_NAMES), None)
        lon_ds = next((obj for name, obj in datasets if name.split("/")[-1].lower() in LON_NAMES), None)
        lat_arr = np.asarray(lat_ds) if lat_ds is not None else None
        lon_arr = np.asarray(lon_ds) if lon_ds is not None else None

        for name, ds in datasets:
            base = name.split("/")[-1]
            if base.lower() in LAT_NAMES | LON_NAMES | TIME_NAMES:
                continue
            if not _wanted(name, filters):
                continue
            if not np.issubdtype(ds.dtype, np.number):
                continue
            try:
                arr = np.asarray(ds)
            except Exception:
                continue
            if arr.size == 0:
                continue

            values = arr.reshape(-1)
            df = pd.DataFrame({"variable": name, "value": values})
            unit_raw = ds.attrs.get("units", "")
            if isinstance(unit_raw, bytes):
                unit_raw = unit_raw.decode(errors="ignore")
            df.insert(1, "unit", str(unit_raw))

            if lat_arr is not None and lon_arr is not None and lat_arr.shape == arr.shape and lon_arr.shape == arr.shape:
                df["latitude"] = lat_arr.reshape(-1)
                df["longitude"] = lon_arr.reshape(-1)
                df = _filter_bbox(df, bbox)
            else:
                if arr.ndim:
                    inds = np.unravel_index(np.arange(arr.size), arr.shape)
                    for i, ind in enumerate(inds):
                        df[f"index_{i}"] = ind
            df = _limit(df, max_rows)
            if not df.empty:
                frames.append(_apply_meta(df, meta))
    return frames


def _hdf4_file(
    path: Path,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    from pyhdf.SD import SD, SDC

    h = SD(str(path), SDC.READ)
    try:
        names = list(h.datasets().keys())
        lat_name = next((n for n in names if n.lower() in LAT_NAMES), None)
        lon_name = next((n for n in names if n.lower() in LON_NAMES), None)
        lat_arr = np.asarray(h.select(lat_name).get()) if lat_name else None
        lon_arr = np.asarray(h.select(lon_name).get()) if lon_name else None
        frames: list[pd.DataFrame] = []
        for name in names:
            if name in (lat_name, lon_name) or not _wanted(name, filters):
                continue
            ds = h.select(name)
            arr = np.asarray(ds.get())
            if not np.issubdtype(arr.dtype, np.number) or arr.size == 0:
                continue
            df = pd.DataFrame({"variable": name, "value": arr.reshape(-1)})
            attrs = ds.attributes()
            df.insert(1, "unit", str(attrs.get("units") or attrs.get("Units") or ""))
            if lat_arr is not None and lon_arr is not None and lat_arr.shape == arr.shape and lon_arr.shape == arr.shape:
                df["latitude"] = lat_arr.reshape(-1)
                df["longitude"] = lon_arr.reshape(-1)
                df = _filter_bbox(df, bbox)
            else:
                inds = np.unravel_index(np.arange(arr.size), arr.shape)
                for i, ind in enumerate(inds):
                    df[f"index_{i}"] = ind
            df = _limit(df, max_rows)
            if not df.empty:
                frames.append(_apply_meta(df, meta))
        return frames
    finally:
        h.end()


def _geotiff_file(
    path: Path,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    import rasterio
    from rasterio.windows import from_bounds
    from rasterio.warp import transform_bounds, transform

    frames: list[pd.DataFrame] = []
    with rasterio.open(path) as src:
        if src.crs:
            left, bottom, right, top = transform_bounds(
                "EPSG:4326",
                src.crs,
                bbox["west"],
                bbox["south"],
                bbox["east"],
                bbox["north"],
                densify_pts=21,
            )
            window = from_bounds(left, bottom, right, top, src.transform)
            window = window.round_offsets().round_lengths()
            full = rasterio.windows.Window(0, 0, src.width, src.height)
            window = window.intersection(full)
        else:
            window = rasterio.windows.Window(0, 0, src.width, src.height)

        transform_window = src.window_transform(window)
        data = src.read(window=window, masked=True)
        for band in range(data.shape[0]):
            name = (src.descriptions or [None] * src.count)[band] or f"band_{band + 1}"
            if not _wanted(name, filters):
                continue
            arr = data[band]
            rows, cols = np.where(~np.ma.getmaskarray(arr))
            if len(rows) == 0:
                continue
            values = np.asarray(arr[rows, cols], dtype=float)
            xs, ys = rasterio.transform.xy(transform_window, rows, cols, offset="center")
            xs = np.asarray(xs, dtype=float)
            ys = np.asarray(ys, dtype=float)
            if src.crs and str(src.crs).upper() not in ("EPSG:4326", "OGC:CRS84"):
                lons, lats = transform(src.crs, "EPSG:4326", xs.tolist(), ys.tolist())
            else:
                lons, lats = xs.tolist(), ys.tolist()

            df = pd.DataFrame(
                {
                    "variable": name,
                    "unit": "",
                    "latitude": lats,
                    "longitude": lons,
                    "value": values,
                }
            )
            df = _filter_bbox(df, bbox)
            df = _limit(df, max_rows)
            if not df.empty:
                frames.append(_apply_meta(df, meta))
    return frames


def _table_file(
    path: Path,
    meta: dict[str, Any],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    sep = "\t" if path.suffix.lower() in (".tsv", ".tab") else None
    if sep:
        df = pd.read_csv(path, sep=sep)
    else:
        try:
            df = pd.read_csv(path)
        except Exception:
            df = pd.read_csv(path, sep=None, engine="python")
    df = _normalize_time(_filter_bbox(df, bbox))
    df = _limit(df, max_rows)
    return [_apply_meta(df, meta)] if not df.empty else []


def _json_file(
    path: Path,
    meta: dict[str, Any],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    data = json.loads(path.read_text(errors="ignore"))
    if isinstance(data, dict) and isinstance(data.get("features"), list):
        rows: list[dict[str, Any]] = []
        for feat in data["features"]:
            props = dict(feat.get("properties") or {})
            geom = feat.get("geometry") or {}
            coords = geom.get("coordinates")
            if geom.get("type") == "Point" and isinstance(coords, list) and len(coords) >= 2:
                props["longitude"] = coords[0]
                props["latitude"] = coords[1]
            rows.append(props)
        df = pd.DataFrame(rows)
    elif isinstance(data, list):
        df = pd.json_normalize(data)
    elif isinstance(data, dict):
        try:
            df = pd.json_normalize(data)
        except Exception:
            df = pd.DataFrame([data])
    else:
        return []
    df = _normalize_time(_filter_bbox(df, bbox))
    df = _limit(df, max_rows)
    return [_apply_meta(df, meta)] if not df.empty else []



def _xarray_bytes(
    data: bytes,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    import xarray as xr

    last_error: Exception | None = None
    for engine in ("h5netcdf", "scipy", None):
        stream = io.BytesIO(data)
        try:
            kwargs = {"decode_times": True, "mask_and_scale": True}
            if engine:
                kwargs["engine"] = engine
            ds = xr.open_dataset(stream, **kwargs)
            try:
                frames: list[pd.DataFrame] = []
                for name, arr in ds.data_vars.items():
                    if not _wanted(name, filters):
                        continue
                    if not np.issubdtype(arr.dtype, np.number):
                        continue
                    try:
                        df = arr.to_dataframe(name="value").reset_index()
                    except Exception:
                        values = np.asarray(arr.values).reshape(-1)
                        df = pd.DataFrame({"value": values})
                    df.insert(0, "variable", name)
                    unit = str(arr.attrs.get("units") or arr.attrs.get("Units") or "")
                    df.insert(1, "unit", unit)
                    df = _normalize_time(df)
                    df = _filter_bbox(df, bbox)
                    df = _limit(df, max_rows)
                    if not df.empty:
                        frames.append(_apply_meta(df, meta))
                return frames
            finally:
                ds.close()
        except Exception as exc:
            last_error = exc

    raise ValueError(f"NetCDF/xarray in-memory reader failed: {last_error}")


def _hdf5_bytes(
    data: bytes,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    import h5py

    frames: list[pd.DataFrame] = []
    with h5py.File(io.BytesIO(data), "r") as h:
        datasets = _h5_datasets(h)
        lat_ds = next((obj for name, obj in datasets if name.split("/")[-1].lower() in LAT_NAMES), None)
        lon_ds = next((obj for name, obj in datasets if name.split("/")[-1].lower() in LON_NAMES), None)
        time_ds = next((obj for name, obj in datasets if name.split("/")[-1].lower() in TIME_NAMES), None)

        lat_arr = np.asarray(lat_ds) if lat_ds is not None else None
        lon_arr = np.asarray(lon_ds) if lon_ds is not None else None
        time_arr = np.asarray(time_ds) if time_ds is not None else None

        for name, ds in datasets:
            base = name.split("/")[-1]
            if base.lower() in LAT_NAMES | LON_NAMES | TIME_NAMES:
                continue
            if not _wanted(name, filters):
                continue
            if not np.issubdtype(ds.dtype, np.number):
                continue
            try:
                arr = np.asarray(ds)
            except Exception:
                continue
            if arr.size == 0:
                continue

            values = arr.reshape(-1)
            df = pd.DataFrame({"variable": name, "value": values})
            unit_raw = ds.attrs.get("units", "")
            if isinstance(unit_raw, bytes):
                unit_raw = unit_raw.decode(errors="ignore")
            df.insert(1, "unit", str(unit_raw))

            if lat_arr is not None and lon_arr is not None and lat_arr.shape == arr.shape and lon_arr.shape == arr.shape:
                df["latitude"] = lat_arr.reshape(-1)
                df["longitude"] = lon_arr.reshape(-1)
                df = _filter_bbox(df, bbox)
            elif arr.ndim:
                inds = np.unravel_index(np.arange(arr.size), arr.shape)
                for i, ind in enumerate(inds):
                    df[f"index_{i}"] = ind

            if time_arr is not None and time_arr.shape == arr.shape:
                try:
                    df["observation_time"] = time_arr.reshape(-1)
                except Exception:
                    pass

            df = _limit(df, max_rows)
            if not df.empty:
                frames.append(_apply_meta(df, meta))

    return frames


def _raster_source_frames(
    src: Any,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
    variable_prefix: str = "",
) -> list[pd.DataFrame]:
    import rasterio
    from rasterio.windows import from_bounds
    from rasterio.warp import transform_bounds, transform

    frames: list[pd.DataFrame] = []
    try:
        if src.crs:
            left, bottom, right, top = transform_bounds(
                "EPSG:4326",
                src.crs,
                bbox["west"],
                bbox["south"],
                bbox["east"],
                bbox["north"],
                densify_pts=21,
            )
            window = from_bounds(left, bottom, right, top, src.transform)
            window = window.round_offsets().round_lengths()
            full = rasterio.windows.Window(0, 0, src.width, src.height)
            window = window.intersection(full)
        else:
            window = rasterio.windows.Window(0, 0, src.width, src.height)
    except Exception:
        window = rasterio.windows.Window(0, 0, src.width, src.height)

    if int(window.width) <= 0 or int(window.height) <= 0:
        return frames

    transform_window = src.window_transform(window)
    data = src.read(window=window, masked=True)

    for band in range(data.shape[0]):
        description = (src.descriptions or [None] * src.count)[band]
        base_name = description or f"band_{band + 1}"
        name = f"{variable_prefix}:{base_name}" if variable_prefix else base_name
        if not _wanted(name, filters):
            continue

        arr = data[band]
        rows, cols = np.where(~np.ma.getmaskarray(arr))
        if len(rows) == 0:
            continue

        values = np.asarray(arr[rows, cols], dtype=float)
        out: dict[str, Any] = {
            "variable": name,
            "unit": "",
            "value": values,
        }

        if src.crs:
            xs, ys = rasterio.transform.xy(transform_window, rows, cols, offset="center")
            xs = np.asarray(xs, dtype=float)
            ys = np.asarray(ys, dtype=float)
            if str(src.crs).upper() not in ("EPSG:4326", "OGC:CRS84"):
                lons, lats = transform(src.crs, "EPSG:4326", xs.tolist(), ys.tolist())
            else:
                lons, lats = xs.tolist(), ys.tolist()
            out["latitude"] = lats
            out["longitude"] = lons
        else:
            out["row"] = rows
            out["column"] = cols

        df = pd.DataFrame(out)
        if "latitude" in df.columns and "longitude" in df.columns:
            df = _filter_bbox(df, bbox)
        df = _limit(df, max_rows)
        if not df.empty:
            frames.append(_apply_meta(df, meta))

    return frames


def _raster_bytes(
    data: bytes,
    filename: str,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    import rasterio
    from rasterio.io import MemoryFile

    suffix = Path(filename).suffix or ".bin"
    frames: list[pd.DataFrame] = []
    with MemoryFile(data, ext=suffix) as mem:
        try:
            with mem.open() as src:
                subdatasets = list(src.subdatasets or [])
                if not subdatasets:
                    return _raster_source_frames(src, meta, filters, bbox, max_rows)
        except Exception:
            subdatasets = []

        for subdataset in subdatasets:
            try:
                with rasterio.open(subdataset) as src:
                    label = subdataset.rsplit(":", 1)[-1].strip('"') or "subdataset"
                    frames.extend(
                        _raster_source_frames(
                            src,
                            meta,
                            filters,
                            bbox,
                            max_rows,
                            variable_prefix=label,
                        )
                    )
            except Exception:
                continue

    if frames:
        return frames
    raise ValueError("Raster/GDAL in-memory reader could not open this dataset.")


def _table_bytes(
    data: bytes,
    filename: str,
    meta: dict[str, Any],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    suffix = Path(filename).suffix.lower()
    stream = io.BytesIO(data)
    if suffix in (".tsv", ".tab"):
        df = pd.read_csv(stream, sep="\t")
    else:
        try:
            df = pd.read_csv(stream)
        except Exception:
            stream.seek(0)
            df = pd.read_csv(stream, sep=None, engine="python")
    df = _normalize_time(_filter_bbox(df, bbox))
    df = _limit(df, max_rows)
    return [_apply_meta(df, meta)] if not df.empty else []


def _json_bytes(
    data: bytes,
    meta: dict[str, Any],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    obj = json.loads(data.decode("utf-8", errors="replace"))
    if isinstance(obj, dict) and isinstance(obj.get("features"), list):
        rows: list[dict[str, Any]] = []
        for feat in obj["features"]:
            props = dict(feat.get("properties") or {})
            geom = feat.get("geometry") or {}
            coords = geom.get("coordinates")
            if geom.get("type") == "Point" and isinstance(coords, list) and len(coords) >= 2:
                props["longitude"] = coords[0]
                props["latitude"] = coords[1]
            rows.append(props)
        df = pd.DataFrame(rows)
    elif isinstance(obj, list):
        df = pd.json_normalize(obj)
    elif isinstance(obj, dict):
        df = pd.json_normalize(obj)
    else:
        return []

    df = _normalize_time(_filter_bbox(df, bbox))
    df = _limit(df, max_rows)
    return [_apply_meta(df, meta)] if not df.empty else []


def _scratch_file(
    data: bytes,
    filename: str,
) -> Path | None:
    candidates = [
        os.getenv("EARTHDATA_SCRATCH_DIR", "").strip(),
        "/dev/shm",
        "/tmp",
    ]
    safe_name = "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in filename) or "earthdata.bin"

    for directory in candidates:
        if not directory:
            continue
        try:
            base = Path(directory)
            base.mkdir(parents=True, exist_ok=True)
            path = base / f"earthdata_{uuid.uuid4().hex}_{safe_name}"
            path.write_bytes(data)
            return path
        except Exception:
            continue
    return None


def _hdf4_bytes(
    data: bytes,
    filename: str,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    # First try GDAL/rasterio's in-memory HDF driver. This needs no writable filesystem.
    try:
        frames = _raster_bytes(data, filename, meta, filters, bbox, max_rows)
        if frames:
            return frames
    except Exception:
        pass

    # pyhdf requires a real path. Use shared memory or /tmp only when the runtime actually allows it.
    path = _scratch_file(data, filename)
    if path is None:
        raise ValueError(
            "This HDF4 granule requires pyhdf, but the host provides no writable scratch filesystem. "
            "The downloader already attempted the in-memory GDAL reader."
        )
    try:
        return _hdf4_file(path, meta, filters, bbox, max_rows)
    finally:
        path.unlink(missing_ok=True)


def _read_gzip_limited(data: bytes) -> bytes:
    max_mb = max(1, int(os.getenv("EARTHDATA_MAX_EXPANDED_MB", "384")))
    limit = max_mb * 1024 * 1024
    with gzip.GzipFile(fileobj=io.BytesIO(data), mode="rb") as gz:
        expanded = gz.read(limit + 1)
    if len(expanded) > limit:
        raise ValueError(f"Expanded GZIP exceeds the configured {max_mb} MB safety limit.")
    return expanded


def _detect_suffix(filename: str, data: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix:
        return suffix

    head = data[:16]
    if head.startswith(b"PK\x03\x04"):
        return ".zip"
    if head.startswith(b"\x1f\x8b"):
        return ".gz"
    if head.startswith(b"\x89HDF\r\n\x1a\n"):
        return ".h5"
    if head.startswith((b"CDF\x01", b"CDF\x02", b"CDF\x05")):
        return ".nc"
    if head.startswith((b"II*\x00", b"MM\x00*")):
        return ".tif"
    if head.startswith(b"\x0e\x03\x13\x01"):
        return ".hdf"
    return ""


def convert_bytes(
    data: bytes,
    filename: str,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    if not data:
        raise ValueError("Downloaded granule is empty.")

    suffix = _detect_suffix(filename, data)

    if suffix == ".zip":
        frames: list[pd.DataFrame] = []
        max_member_mb = max(1, int(os.getenv("EARTHDATA_MAX_ARCHIVE_MEMBER_MB", "384")))
        max_member = max_member_mb * 1024 * 1024
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            for info in archive.infolist():
                if info.is_dir():
                    continue
                if info.file_size > max_member:
                    continue
                try:
                    child = archive.read(info)
                    child_meta = dict(meta)
                    child_meta["original_file"] = info.filename
                    frames.extend(
                        convert_bytes(
                            child,
                            info.filename,
                            child_meta,
                            filters,
                            bbox,
                            max_rows,
                        )
                    )
                except Exception:
                    continue
        if not frames:
            raise ValueError("ZIP archive contained no supported convertible dataset.")
        return frames

    if suffix == ".gz":
        expanded = _read_gzip_limited(data)
        inner_name = Path(filename).stem or "earthdata.bin"
        inner_meta = dict(meta)
        inner_meta["original_file"] = inner_name
        return convert_bytes(expanded, inner_name, inner_meta, filters, bbox, max_rows)

    if suffix in (".nc", ".nc4", ".cdf"):
        return _xarray_bytes(data, meta, filters, bbox, max_rows)

    if suffix in (".h5", ".hdf5", ".he5"):
        try:
            frames = _xarray_bytes(data, meta, filters, bbox, max_rows)
            if frames:
                return frames
        except Exception:
            pass
        return _hdf5_bytes(data, meta, filters, bbox, max_rows)

    if suffix in (".hdf", ".h4"):
        return _hdf4_bytes(data, filename, meta, filters, bbox, max_rows)

    if suffix in (".tif", ".tiff"):
        return _raster_bytes(data, filename, meta, filters, bbox, max_rows)

    if suffix in (".csv", ".tsv", ".tab", ".txt"):
        return _table_bytes(data, filename, meta, bbox, max_rows)

    if suffix in (".json", ".geojson"):
        return _json_bytes(data, meta, bbox, max_rows)

    # Extensionless or mislabeled files are common in data services. Probe readers safely.
    errors: list[str] = []
    for label, reader in (
        ("xarray", lambda: _xarray_bytes(data, meta, filters, bbox, max_rows)),
        ("HDF5", lambda: _hdf5_bytes(data, meta, filters, bbox, max_rows)),
        ("raster/GDAL", lambda: _raster_bytes(data, filename, meta, filters, bbox, max_rows)),
        ("JSON", lambda: _json_bytes(data, meta, bbox, max_rows)),
        ("table", lambda: _table_bytes(data, filename, meta, bbox, max_rows)),
    ):
        try:
            frames = reader()
            if frames:
                return frames
        except Exception as exc:
            errors.append(f"{label}: {exc}")

    raise ValueError(
        "Unsupported or unreadable Earthdata format. Reader attempts: "
        + " | ".join(errors[:3])
    )


def convert_file(
    path: Path,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    suffix = path.suffix.lower()

    if suffix == ".zip":
        frames: list[pd.DataFrame] = []
        with tempfile.TemporaryDirectory(prefix="earthdata_zip_") as td:
            with zipfile.ZipFile(path) as z:
                z.extractall(td)
            for child in Path(td).rglob("*"):
                if child.is_file():
                    try:
                        frames.extend(convert_file(child, meta, filters, bbox, max_rows))
                    except Exception:
                        continue
        return frames

    if suffix == ".gz":
        target = Path(tempfile.mktemp(prefix="earthdata_gz_", suffix=Path(path.stem).suffix or ".bin"))
        try:
            with gzip.open(path, "rb") as src, target.open("wb") as dst:
                shutil.copyfileobj(src, dst)
            return convert_file(target, meta, filters, bbox, max_rows)
        finally:
            target.unlink(missing_ok=True)

    if suffix in (".nc", ".nc4", ".cdf"):
        return _xarray_file(path, meta, filters, bbox, max_rows)
    if suffix in (".h5", ".hdf5", ".he5"):
        try:
            return _xarray_file(path, meta, filters, bbox, max_rows)
        except Exception:
            return _hdf5_file(path, meta, filters, bbox, max_rows)
    if suffix in (".hdf", ".h4"):
        try:
            return _hdf4_file(path, meta, filters, bbox, max_rows)
        except Exception:
            return _hdf5_file(path, meta, filters, bbox, max_rows)
    if suffix in (".tif", ".tiff"):
        return _geotiff_file(path, meta, filters, bbox, max_rows)
    if suffix in (".csv", ".tsv", ".tab", ".txt"):
        return _table_file(path, meta, bbox, max_rows)
    if suffix in (".json", ".geojson"):
        return _json_file(path, meta, bbox, max_rows)

    # Some providers omit useful extensions. Try the scientific readers in order.
    for reader in (_xarray_file, _hdf5_file):
        try:
            return reader(path, meta, filters, bbox, max_rows)
        except Exception:
            pass
    raise ValueError(f"Unsupported or unreadable Earthdata format: {path.name}")


def combine_frames(frames: list[pd.DataFrame]) -> pd.DataFrame:
    if not frames:
        return pd.DataFrame()

    df = pd.concat(frames, ignore_index=True, sort=False)
    df = annotate_temporal_metadata(df)

    preferred = [
        "source",
        "component_query",
        "collection_id",
        "collection_title",
        "granule_id",
        "granule_ur",
        "satellite_platform",
        "instrument",
        "data_timestamp_utc",
        "data_date_utc",
        "data_time_utc",
        "timestamp_source",
        "timestamp_timezone",
        "granule_start_utc",
        "granule_end_utc",
        "retrieved_at_utc",
        "data_cycle",
        "data_cycle_interval_seconds",
        "data_cycle_detail",
        "data_cycle_basis",
        "observation_time",
        "granule_begin",
        "granule_end",
        "latitude",
        "longitude",
        "variable",
        "value",
        "unit",
        "original_file",
        "download_url",
    ]
    cols = [c for c in preferred if c in df.columns] + [c for c in df.columns if c not in preferred]
    return df[cols]
