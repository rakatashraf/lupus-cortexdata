from __future__ import annotations

import csv
import gzip
import io
import json
import math
import os
import re
import uuid
import zipfile
from collections import Counter
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


def _axis_overlap_indices(values: np.ndarray, low: float, high: float) -> np.ndarray:
    """Return coordinate cells whose inferred cell extents intersect [low, high].

    This matters for coarse products such as 10-degree zonal means: a bbox at
    23.8° should select the 20–30° latitude cell centered at 25°, rather than
    incorrectly returning no data because the center itself lies outside the
    narrow bbox.
    """
    arr = np.asarray(values, dtype=np.float64).reshape(-1)
    finite = np.isfinite(arr)
    if not finite.any():
        return np.array([], dtype=int)

    if arr.size == 1:
        return np.array([0], dtype=int) if low <= arr[0] <= high else np.array([], dtype=int)

    mids = (arr[:-1] + arr[1:]) / 2.0
    edges = np.empty(arr.size + 1, dtype=np.float64)
    edges[1:-1] = mids
    edges[0] = arr[0] - (arr[1] - arr[0]) / 2.0
    edges[-1] = arr[-1] + (arr[-1] - arr[-2]) / 2.0

    left = np.minimum(edges[:-1], edges[1:])
    right = np.maximum(edges[:-1], edges[1:])
    overlap = finite & (right >= low) & (left <= high)
    return np.flatnonzero(overlap)


def _filter_bbox(df: pd.DataFrame, bbox: dict[str, float]) -> pd.DataFrame:
    lat = _match_column(df.columns, LAT_NAMES)
    lon = _match_column(df.columns, LON_NAMES)

    if not lat and not lon:
        return df

    out = df.copy()
    rename: dict[str, str] = {}
    if lat and lat != "latitude":
        rename[lat] = "latitude"
    if lon and lon != "longitude":
        rename[lon] = "longitude"
    if rename:
        out.rename(columns=rename, inplace=True)

    # Only apply strict point-in-bbox filtering when the source exposes both
    # spatial axes. Zonal means and other reduced products may legitimately
    # contain latitude without longitude (or vice versa); dropping them because
    # the missing axis cannot be tested would turn valid science data into an
    # artificial "no rows" error.
    if lat and lon:
        latv = pd.to_numeric(out["latitude"], errors="coerce")
        lonv = pd.to_numeric(out["longitude"], errors="coerce")
        mask = (
            latv.between(bbox["south"], bbox["north"])
            & lonv.between(bbox["west"], bbox["east"])
        )
        out = out.loc[mask].copy()

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
            if ds.size == 0:
                continue

            # If there is no matching geolocation array, do not flatten an
            # arbitrarily huge scientific field into pandas. HDF-EOS grids are
            # handled above; this cap protects other malformed/non-CF products.
            has_matching_geo = (
                lat_arr is not None and lon_arr is not None
                and lat_arr.shape == ds.shape and lon_arr.shape == ds.shape
            )
            max_unlocated_cells = max(
                1000,
                int(os.getenv("EARTHDATA_MAX_UNLOCATED_CELLS", "2000000"))
            )
            if not has_matching_geo and int(ds.size) > max_unlocated_cells:
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


def _nc4_variables(group: Any, prefix: str = "") -> list[tuple[str, Any, Any]]:
    out: list[tuple[str, Any, Any]] = []
    try:
        for name, variable in group.variables.items():
            path = f"{prefix}/{name}" if prefix else str(name)
            out.append((path, variable, group))
        for name, child in group.groups.items():
            child_prefix = f"{prefix}/{name}" if prefix else str(name)
            out.extend(_nc4_variables(child, child_prefix))
    except Exception:
        pass
    return out


def _nc4_coord_lookup(root: Any) -> dict[str, list[tuple[str, Any, Any]]]:
    lookup: dict[str, list[tuple[str, Any, Any]]] = {}
    for path, variable, group in _nc4_variables(root):
        base = path.split("/")[-1].lower()
        lookup.setdefault(base, []).append((path, variable, group))
    return lookup


def _nc4_pick_coord(
    lookup: dict[str, list[tuple[str, Any, Any]]],
    dimensions: tuple[str, ...],
    candidates: set[str],
) -> tuple[str, Any, Any] | None:
    dims = {str(dim) for dim in dimensions}

    # Prefer coordinate variables whose own single dimension belongs to the
    # science variable's dimensions.
    for candidate in candidates:
        for item in lookup.get(candidate, []):
            _, variable, _ = item
            try:
                if variable.ndim == 1 and variable.dimensions and str(variable.dimensions[0]) in dims:
                    return item
            except Exception:
                continue

    # Then accept an exact dimension-name coordinate.
    for dim in dimensions:
        for item in lookup.get(str(dim).lower(), []):
            _, variable, _ = item
            try:
                if variable.ndim == 1 and variable.dimensions and str(variable.dimensions[0]) == str(dim):
                    return item
            except Exception:
                continue
    return None


def _nc4_decode_time_values(values: np.ndarray, variable: Any) -> tuple[list[str] | None, dict[str, str]]:
    units = str(getattr(variable, "units", "") or "")
    calendar = str(getattr(variable, "calendar", "standard") or "standard")
    meta = {
        "source_temporal_units": units,
        "source_temporal_calendar": calendar,
    }
    if not units:
        return None, meta

    try:
        import netCDF4
        decoded = netCDF4.num2date(
            values,
            units=units,
            calendar=calendar,
            only_use_cftime_datetimes=False,
            only_use_python_datetimes=False,
        )
        flat = np.asarray(decoded, dtype=object).reshape(-1)
        text: list[str] = []
        for value in flat:
            if value is None:
                text.append("")
                continue
            try:
                text.append(value.isoformat())
            except Exception:
                text.append(str(value))
        return text, meta
    except Exception:
        meta["source_temporal_decode_status"] = "raw_preserved_decode_failed"
        return None, meta


def _netcdf4_bytes(
    data: bytes,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    """Read NetCDF3/NetCDF4 directly from bytes using libnetcdf.

    This avoids depending on xarray's optional scipy backend and works for
    classic NetCDF as well as most NetCDF4/HDF5 files.
    """
    import netCDF4

    root = netCDF4.Dataset("earthdata_inmemory.nc", mode="r", memory=data)
    try:
        all_vars = _nc4_variables(root)
        lookup = _nc4_coord_lookup(root)
        frames: list[pd.DataFrame] = []

        coordinate_bases = LAT_NAMES | LON_NAMES | TIME_NAMES | {"times"}
        max_cells = max(
            10000,
            int(os.getenv("EARTHDATA_MAX_NETCDF_CELLS", "5000000")),
        )

        for path, variable, group in all_vars:
            base = path.split("/")[-1]
            base_lower = base.lower()
            if base_lower in coordinate_bases:
                continue
            if not _wanted(path, filters):
                continue

            try:
                dtype = np.dtype(variable.dtype)
                if not np.issubdtype(dtype, np.number):
                    continue
            except Exception:
                continue

            dimensions = tuple(str(dim) for dim in getattr(variable, "dimensions", ()))
            shape = tuple(int(v) for v in getattr(variable, "shape", ()))
            if not shape:
                try:
                    scalar = variable[...]
                    df = pd.DataFrame(
                        {
                            "variable": [path],
                            "unit": [str(getattr(variable, "units", "") or "")],
                            "value": [scalar.item() if hasattr(scalar, "item") else scalar],
                        }
                    )
                    frames.append(_apply_meta(df, meta))
                except Exception:
                    pass
                continue

            slicer: list[Any] = [slice(None)] * len(shape)
            coord_vectors: dict[int, tuple[str, np.ndarray, Any]] = {}
            spatial_slice_used = False
            empty = False

            lat_item = _nc4_pick_coord(lookup, dimensions, LAT_NAMES)
            lon_item = _nc4_pick_coord(lookup, dimensions, LON_NAMES)
            time_item = _nc4_pick_coord(lookup, dimensions, TIME_NAMES | {"times"})

            for kind, item, low, high in (
                ("latitude", lat_item, bbox["south"], bbox["north"]),
                ("longitude", lon_item, bbox["west"], bbox["east"]),
            ):
                if item is None:
                    continue
                _, coord_var, _ = item
                try:
                    dim = str(coord_var.dimensions[0])
                    if dim not in dimensions:
                        continue
                    axis = dimensions.index(dim)
                    values = np.asarray(coord_var[:], dtype=np.float64).reshape(-1)
                    selected = _axis_overlap_indices(values, low, high)
                    if not len(selected):
                        empty = True
                        break
                    start, stop = int(selected[0]), int(selected[-1]) + 1
                    slicer[axis] = slice(start, stop)
                    coord_vectors[axis] = (kind, values[start:stop], coord_var)
                    spatial_slice_used = True
                except Exception:
                    continue

            if empty:
                continue

            # Add remaining one-dimensional dimension coordinates.
            for axis, dim in enumerate(dimensions):
                if axis in coord_vectors:
                    continue
                candidates = lookup.get(dim.lower(), [])
                coord_item = None
                for item in candidates:
                    _, candidate, _ = item
                    try:
                        if candidate.ndim == 1 and candidate.dimensions and str(candidate.dimensions[0]) == dim:
                            coord_item = item
                            break
                    except Exception:
                        continue
                if coord_item is None and time_item is not None:
                    _, candidate, _ = time_item
                    try:
                        if candidate.ndim == 1 and candidate.dimensions and str(candidate.dimensions[0]) == dim:
                            coord_item = time_item
                    except Exception:
                        pass
                if coord_item is None:
                    continue
                _, coord_var, _ = coord_item
                try:
                    dim_slice = slicer[axis]
                    values = np.asarray(coord_var[dim_slice]).reshape(-1)
                    coord_vectors[axis] = (path.split("/")[-1] if False else str(coord_var.name).split("/")[-1], values, coord_var)
                except Exception:
                    continue

            projected_shape: list[int] = []
            for axis, size in enumerate(shape):
                sl = slicer[axis]
                if isinstance(sl, slice):
                    start = 0 if sl.start is None else int(sl.start)
                    stop = int(size) if sl.stop is None else int(sl.stop)
                    step = 1 if sl.step is None else int(sl.step)
                    projected_shape.append(max(0, math.ceil((stop - start) / step)))
                else:
                    projected_shape.append(1)
            projected_cells = int(np.prod(projected_shape)) if projected_shape else 1

            if projected_cells > max_cells and not spatial_slice_used:
                # Avoid serverless OOM on unlocated giant variables. A product-
                # specific reader can still handle the file before this fallback.
                continue

            try:
                values_raw = variable[tuple(slicer)]
                if np.ma.isMaskedArray(values_raw):
                    values = np.ma.filled(values_raw, np.nan)
                else:
                    values = np.asarray(values_raw)
                values = np.asarray(values)
            except Exception:
                continue

            if values.size == 0:
                continue

            flat_values = values.reshape(-1)
            df = pd.DataFrame(
                {
                    "variable": path,
                    "unit": str(getattr(variable, "units", "") or ""),
                    "value": flat_values,
                }
            )

            for axis, dim_size in enumerate(values.shape):
                coord_info = coord_vectors.get(axis)
                if coord_info is None:
                    continue
                coord_name, vector, coord_var = coord_info
                vector = np.asarray(vector)
                if vector.size != dim_size:
                    continue
                reshape = [1] * values.ndim
                reshape[axis] = dim_size
                broadcast = np.broadcast_to(vector.reshape(reshape), values.shape).reshape(-1)

                low_name = str(coord_name).lower()
                base_coord = str(getattr(coord_var, "name", coord_name)).split("/")[-1].lower()
                if low_name in LAT_NAMES or base_coord in LAT_NAMES:
                    df["latitude"] = pd.to_numeric(pd.Series(broadcast), errors="coerce")
                elif low_name in LON_NAMES or base_coord in LON_NAMES:
                    df["longitude"] = pd.to_numeric(pd.Series(broadcast), errors="coerce")
                elif low_name in TIME_NAMES or low_name == "times" or base_coord in TIME_NAMES or base_coord == "times":
                    decoded, time_meta = _nc4_decode_time_values(vector, coord_var)
                    if decoded is not None:
                        decoded_array = np.asarray(decoded, dtype=object)
                        decoded_broadcast = np.broadcast_to(decoded_array.reshape(reshape), values.shape).reshape(-1)
                        df["observation_time"] = decoded_broadcast
                    else:
                        df["source_temporal_raw_value"] = broadcast
                        for key, value in time_meta.items():
                            df[key] = value
                else:
                    safe = re.sub(r"[^A-Za-z0-9_]+", "_", str(coord_name)).strip("_") or f"dim_{axis}"
                    df[safe] = broadcast

            if spatial_slice_used:
                df["spatial_selection_method"] = "coordinate_cell_extent_overlap"
            elif "latitude" in df.columns or "longitude" in df.columns:
                df = _filter_bbox(df, bbox)

            numeric_values = pd.to_numeric(df["value"], errors="coerce")
            if numeric_values.notna().any():
                df["value"] = numeric_values
                df = df.loc[numeric_values.notna() | df["value"].notna()].copy()

            df = _limit(df, max_rows)
            if not df.empty:
                frames.append(_apply_meta(df, meta))

        return frames
    finally:
        root.close()


def _xarray_bytes(
    data: bytes,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    import xarray as xr

    try:
        available = set(xr.backends.list_engines().keys())
    except Exception:
        available = set()

    engines: list[str | None] = []
    for engine in ("h5netcdf", "scipy"):
        if engine in available:
            engines.append(engine)
    engines.append(None)

    errors: list[str] = []

    for engine in engines:
        for decode_times in (True, False):
            stream = io.BytesIO(data)
            try:
                kwargs: dict[str, Any] = {
                    "decode_times": decode_times,
                    "mask_and_scale": True,
                }
                if engine:
                    kwargs["engine"] = engine

                ds = xr.open_dataset(stream, **kwargs)
                try:
                    temporal_coord: str | None = None
                    temporal_units = ""
                    temporal_calendar = ""

                    if not decode_times:
                        for coord_name in list(ds.coords) + list(ds.variables):
                            low = str(coord_name).lower()
                            if low in TIME_NAMES or low in ("time", "times"):
                                temporal_coord = str(coord_name)
                                try:
                                    temporal_units = str(ds[coord_name].attrs.get("units") or "")
                                    temporal_calendar = str(ds[coord_name].attrs.get("calendar") or "")
                                except Exception:
                                    pass
                                break

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

                        if decode_times:
                            df = _normalize_time(df)
                        elif temporal_coord and temporal_coord in df.columns:
                            df = df.rename(columns={temporal_coord: "source_temporal_raw_value"})
                            df["source_temporal_units"] = temporal_units
                            df["source_temporal_calendar"] = temporal_calendar
                            df["source_temporal_decode_status"] = "raw_preserved_decode_failed"

                        df = _filter_bbox(df, bbox)
                        df = _limit(df, max_rows)
                        if not df.empty:
                            frames.append(_apply_meta(df, meta))

                    if frames:
                        return frames
                finally:
                    ds.close()
            except Exception as exc:
                label = engine or "auto"
                errors.append(f"{label}/decode_times={decode_times}: {exc}")

    raise ValueError(
        "NetCDF/xarray fallback failed. "
        + " | ".join(errors[-4:])
    )




def _hdf4_dataset_name(names: list[str], candidates: tuple[str, ...]) -> str | None:
    normalized = [(name, str(name).split("/")[-1].lower()) for name in names]
    for candidate in candidates:
        target = candidate.lower()
        for name, base in normalized:
            if base == target:
                return name
    for candidate in candidates:
        target = candidate.lower()
        for name, base in normalized:
            if target in base:
                return name
    return None


def _hdf4_safe_attrs(ds: Any) -> dict[str, Any]:
    try:
        return dict(ds.attributes())
    except Exception:
        return {}


def _hdf4_airs_file(
    path: Path,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    """Spatially subset AIRS L1B HDF4 radiances before expanding channels."""
    from pyhdf.SD import SD, SDC

    h = SD(str(path), SDC.READ)
    try:
        names = list(h.datasets().keys())
        lat_name = _hdf4_dataset_name(names, ("Latitude",))
        lon_name = _hdf4_dataset_name(names, ("Longitude",))
        rad_name = _hdf4_dataset_name(names, ("radiances", "radiance"))
        freq_name = _hdf4_dataset_name(names, ("spectral_freq", "nominal_freq", "frequency"))

        if not lat_name or not lon_name or not rad_name:
            return []

        lat = np.asarray(h.select(lat_name).get(), dtype=np.float64)
        lon = np.asarray(h.select(lon_name).get(), dtype=np.float64)
        if lat.shape != lon.shape or lat.ndim != 2:
            return []

        mask = (
            np.isfinite(lat)
            & np.isfinite(lon)
            & (lat >= bbox["south"])
            & (lat <= bbox["north"])
            & (lon >= bbox["west"])
            & (lon <= bbox["east"])
        )
        if not mask.any():
            return []

        selected_rows = np.flatnonzero(mask.any(axis=1))
        if not len(selected_rows):
            return []

        rad_ds = h.select(rad_name)
        info = rad_ds.info()
        dims = tuple(int(v) for v in info[2])
        if len(dims) != 3 or dims[0] != lat.shape[0] or dims[1] != lat.shape[1]:
            return []

        if filters and not _wanted(rad_name, filters):
            return []

        channel_count = dims[2]
        spectral = None
        spectral_unit = "cm-1"
        if freq_name:
            try:
                spectral_ds = h.select(freq_name)
                spectral = np.asarray(spectral_ds.get(), dtype=np.float64).reshape(-1)
                attrs = _hdf4_safe_attrs(spectral_ds)
                spectral_unit = str(attrs.get("units") or attrs.get("Units") or spectral_unit)
                if spectral.size != channel_count:
                    spectral = None
            except Exception:
                spectral = None

        rad_attrs = _hdf4_safe_attrs(rad_ds)
        rad_unit = str(rad_attrs.get("units") or rad_attrs.get("Units") or "")
        frames: list[pd.DataFrame] = []
        skipped_scanlines: list[int] = []

        # AIRS HDF4 files may contain an isolated corrupted compressed scanline.
        # Reading scan-by-scan allows the other scanlines to remain usable.
        for scan in selected_rows.tolist():
            scan_mask = mask[scan, :]
            if not scan_mask.any():
                continue

            try:
                scan_cube = np.asarray(
                    rad_ds.get(
                        start=(int(scan), 0, 0),
                        count=(1, int(dims[1]), int(dims[2])),
                    )
                )
            except Exception:
                skipped_scanlines.append(int(scan))
                continue

            # pyhdf may squeeze the requested singleton scan dimension.
            if scan_cube.ndim == 3 and scan_cube.shape[0] == 1:
                scan_plane = scan_cube[0]
            elif scan_cube.ndim == 2 and scan_cube.shape == (dims[1], dims[2]):
                scan_plane = scan_cube
            else:
                skipped_scanlines.append(int(scan))
                continue

            scan_plane = _calibrate_hdf_values(scan_plane, rad_attrs)
            selected_values = scan_plane[scan_mask, :]
            selected_lat = lat[scan, scan_mask]
            selected_lon = lon[scan, scan_mask]
            if selected_values.size == 0:
                continue

            pixel_count = selected_values.shape[0]
            total_rows = pixel_count * channel_count
            safe_rows = max(
                10000,
                int(os.getenv("EARTHDATA_MAX_AIRS_ROWS_PER_GRANULE", "350000")),
            )
            if max_rows <= 0 and total_rows > safe_rows:
                raise ValueError(
                    f"AIRS bbox produces {total_rows:,} radiance rows for this granule, "
                    f"above the safe single-response limit of {safe_rows:,}. "
                    "Use a smaller bbox or a variable/row filter."
                )

            values = selected_values.reshape(-1)
            lats = np.repeat(selected_lat, channel_count)
            lons = np.repeat(selected_lon, channel_count)
            channels = np.tile(np.arange(channel_count, dtype=int), pixel_count)

            usable = np.isfinite(values)
            if not usable.any():
                continue

            df = pd.DataFrame(
                {
                    "variable": "radiances",
                    "unit": rad_unit,
                    "latitude": lats[usable],
                    "longitude": lons[usable],
                    "value": values[usable],
                    "spectral_channel_index": channels[usable],
                    "airs_scanline": int(scan),
                }
            )
            if spectral is not None:
                df["spectral_frequency"] = np.tile(spectral, pixel_count)[usable]
                df["spectral_frequency_unit"] = spectral_unit
            if skipped_scanlines:
                df["source_skipped_scanlines"] = ",".join(map(str, skipped_scanlines))
            df["hdf4_reader"] = "airs_l1b_spatial_subset"
            df = _limit(df, max_rows)
            if not df.empty:
                frames.append(_apply_meta(df, meta))

        return frames
    finally:
        h.end()


def _hdf4_file(
    path: Path,
    meta: dict[str, Any],
    filters: list[str],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    """Bounded generic HDF4 reader; avoids materializing huge unrelated SDS arrays."""
    from pyhdf.SD import SD, SDC

    h = SD(str(path), SDC.READ)
    try:
        names = list(h.datasets().keys())
        lat_name = _hdf4_dataset_name(names, ("Latitude", "lat"))
        lon_name = _hdf4_dataset_name(names, ("Longitude", "lon"))
        lat_arr = np.asarray(h.select(lat_name).get()) if lat_name else None
        lon_arr = np.asarray(h.select(lon_name).get()) if lon_name else None

        frames: list[pd.DataFrame] = []
        max_cells = max(
            10000,
            int(os.getenv("EARTHDATA_MAX_GENERIC_HDF4_CELLS", "2000000")),
        )

        for name in names:
            if name in (lat_name, lon_name) or not _wanted(name, filters):
                continue

            ds = h.select(name)
            try:
                info = ds.info()
                dims = tuple(int(v) for v in info[2])
                total_cells = int(np.prod(dims)) if dims else 1
                if total_cells > max_cells:
                    continue
                arr = np.asarray(ds.get())
            except Exception:
                continue

            if not np.issubdtype(arr.dtype, np.number) or arr.size == 0:
                continue

            df = pd.DataFrame({"variable": name, "value": arr.reshape(-1)})
            attrs = _hdf4_safe_attrs(ds)
            df.insert(1, "unit", str(attrs.get("units") or attrs.get("Units") or ""))

            if (
                lat_arr is not None
                and lon_arr is not None
                and lat_arr.shape == arr.shape
                and lon_arr.shape == arr.shape
            ):
                df["latitude"] = lat_arr.reshape(-1)
                df["longitude"] = lon_arr.reshape(-1)
                df = _filter_bbox(df, bbox)
            else:
                inds = np.unravel_index(np.arange(arr.size), arr.shape)
                for i, ind in enumerate(inds):
                    df[f"index_{i}"] = ind

            df["hdf4_reader"] = "bounded_generic"
            df = _limit(df, max_rows)
            if not df.empty:
                frames.append(_apply_meta(df, meta))

        return frames
    finally:
        h.end()


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
    path = _scratch_file(data, filename)
    errors: list[str] = []

    if path is not None:
        try:
            collection = str(meta.get("collection_short_name") or "").upper()
            filename_upper = filename.upper()
            is_airs_ir = (
                collection.startswith("AIRIBRAD")
                or "AIRS_RAD" in filename_upper
            )

            if is_airs_ir:
                try:
                    frames = _hdf4_airs_file(path, meta, filters, bbox, max_rows)
                    if frames:
                        return frames
                except Exception as exc:
                    errors.append(f"AIRS HDF4 subset reader: {exc}")

            try:
                frames = _hdf4_file(path, meta, filters, bbox, max_rows)
                if frames:
                    return frames
            except Exception as exc:
                errors.append(f"bounded pyhdf reader: {exc}")
        finally:
            path.unlink(missing_ok=True)

    # Last resort: GDAL's in-memory reader. It is intentionally attempted after
    # bounded pyhdf readers so huge multidimensional HDF4 products do not
    # accidentally trigger full-cube materialization first.
    try:
        frames = _raster_bytes(data, filename, meta, filters, bbox, max_rows)
        if frames:
            return frames
    except Exception as exc:
        errors.append(f"GDAL/raster reader: {exc}")

    raise ValueError(
        "HDF4 conversion failed. " + " | ".join(errors[:4])
        if errors
        else "HDF4 conversion failed: no writable scratch path and no compatible in-memory GDAL reader."
    )


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


def _text_is_number(value: str) -> bool:
    text = str(value).strip()
    if not text:
        return False
    try:
        float(text.replace("D", "E").replace("d", "e"))
        return True
    except Exception:
        return False


def _text_tokens(line: str) -> list[str]:
    stripped = line.strip()
    if not stripped:
        return []
    if "\t" in stripped:
        return [part.strip() for part in stripped.split("\t")]
    if "," in stripped:
        try:
            return [part.strip() for part in next(csv.reader([stripped]))]
        except Exception:
            pass
    return [part for part in re.split(r"\s+", stripped) if part]


def _unique_text_headers(tokens: list[str]) -> list[str]:
    out: list[str] = []
    used: dict[str, int] = {}
    for index, token in enumerate(tokens, 1):
        name = re.sub(r"[^A-Za-z0-9_]+", "_", str(token)).strip("_")
        if not name or name[0].isdigit():
            name = f"field_{index}" if not name else f"field_{index}_{name}"
        count = used.get(name, 0) + 1
        used[name] = count
        out.append(name if count == 1 else f"{name}_{count}")
    return out


def _semi_structured_text_bytes(
    data: bytes,
    filename: str,
    meta: dict[str, Any],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = data.decode("latin-1", errors="replace")

    raw_lines = text.splitlines()
    parsed: list[tuple[int, str, list[str], float]] = []
    metadata_lines: list[str] = []

    for line_number, raw in enumerate(raw_lines, 1):
        stripped = raw.strip()
        if not stripped:
            continue
        if stripped.startswith(("#", "!", "%", "//")):
            if len(metadata_lines) < 40:
                metadata_lines.append(stripped)
            continue

        tokens = _text_tokens(stripped)
        if len(tokens) < 2:
            if len(metadata_lines) < 40:
                metadata_lines.append(stripped)
            continue

        numeric_ratio = sum(_text_is_number(token) for token in tokens) / max(1, len(tokens))
        parsed.append((line_number, stripped, tokens, numeric_ratio))

    if not parsed:
        frame = pd.DataFrame(
            {
                "variable": ["raw_text_record"],
                "unit": [""],
                "value": [text[:100000]],
                "text_record_type": ["raw_document"],
                "text_source_line": [1],
                "text_field_count": [1],
            }
        )
        return [_apply_meta(frame, meta)]

    numeric_candidates = [entry for entry in parsed if entry[3] >= 0.25]
    count_source = numeric_candidates or parsed
    counts = Counter(len(entry[2]) for entry in count_source)
    modal_count = counts.most_common(1)[0][0]

    modal_numeric = [entry for entry in numeric_candidates if len(entry[2]) == modal_count]
    modal_any = [entry for entry in parsed if len(entry[2]) == modal_count]
    data_entries = modal_numeric or modal_any

    # Detect a same-width textual header immediately preceding the data block.
    header_tokens: list[str] | None = None
    if data_entries:
        first_line = data_entries[0][0]
        for entry in reversed(parsed):
            if entry[0] >= first_line:
                continue
            if len(entry[2]) == modal_count and entry[3] < 0.25:
                header_tokens = entry[2]
                break

    columns = (
        _unique_text_headers(header_tokens)
        if header_tokens
        else [f"field_{index}" for index in range(1, modal_count + 1)]
    )

    records: list[dict[str, Any]] = []
    data_line_numbers: list[int] = []
    for line_number, raw, tokens, numeric_ratio in data_entries:
        if header_tokens and tokens == header_tokens:
            continue
        if len(tokens) != modal_count:
            continue
        record = {columns[i]: tokens[i] for i in range(modal_count)}
        records.append(record)
        data_line_numbers.append(line_number)

    frames: list[pd.DataFrame] = []
    metadata_excerpt = "\n".join(metadata_lines[:20])

    if records:
        wide = pd.DataFrame(records)
        wide["text_source_line"] = data_line_numbers

        for column in list(wide.columns):
            if column == "text_source_line":
                continue
            converted = pd.to_numeric(
                wide[column].astype(str).str.replace("D", "E").str.replace("d", "e"),
                errors="coerce",
            )
            if converted.notna().mean() >= 0.8:
                wide[column] = converted

        wide = _normalize_time(wide)
        wide = _filter_bbox(wide, bbox)

        id_cols: list[str] = ["text_source_line"]
        for column in wide.columns:
            low = str(column).lower()
            if low in LAT_NAMES | LON_NAMES | TIME_NAMES or column == "observation_time":
                if column not in id_cols:
                    id_cols.append(column)

        value_cols = [column for column in wide.columns if column not in id_cols]
        if value_cols:
            melted = wide.melt(
                id_vars=id_cols,
                value_vars=value_cols,
                var_name="variable",
                value_name="value",
            )
            melted["unit"] = ""
            melted["text_record_type"] = "parsed_table"
            melted["text_field_count"] = modal_count
            if metadata_excerpt:
                melted["text_metadata_excerpt"] = metadata_excerpt
            melted = _limit(melted, max_rows)
            if not melted.empty:
                frames.append(_apply_meta(melted, meta))

    # Preserve non-modal/ragged records rather than throwing a parser error.
    data_line_set = {entry[0] for entry in data_entries}
    ragged_rows: list[dict[str, Any]] = []
    for line_number, raw, tokens, numeric_ratio in parsed:
        if line_number in data_line_set:
            continue
        ragged_rows.append(
            {
                "variable": "raw_text_record",
                "unit": "",
                "value": raw,
                "text_record_type": "ragged_or_header",
                "text_source_line": line_number,
                "text_field_count": len(tokens),
                "raw_fields_json": json.dumps(tokens, ensure_ascii=False),
                "text_metadata_excerpt": metadata_excerpt,
            }
        )

    if ragged_rows:
        ragged = pd.DataFrame(ragged_rows)
        ragged = _limit(ragged, max_rows)
        if not ragged.empty:
            frames.append(_apply_meta(ragged, meta))

    if frames:
        return frames

    fallback = pd.DataFrame(
        {
            "variable": ["raw_text_record"],
            "unit": [""],
            "value": [text[:100000]],
            "text_record_type": ["raw_document"],
            "text_source_line": [1],
            "text_field_count": [modal_count],
            "text_metadata_excerpt": [metadata_excerpt],
        }
    )
    return [_apply_meta(fallback, meta)]


def _table_bytes(
    data: bytes,
    filename: str,
    meta: dict[str, Any],
    bbox: dict[str, float],
    max_rows: int,
) -> list[pd.DataFrame]:
    suffix = Path(filename).suffix.lower()

    # Plain .txt science products are frequently semi-structured rather than
    # RFC-style CSV. Parse them tolerantly from the beginning.
    if suffix == ".txt":
        return _semi_structured_text_bytes(data, filename, meta, bbox, max_rows)

    stream = io.BytesIO(data)
    try:
        if suffix in (".tsv", ".tab"):
            df = pd.read_csv(stream, sep="\t", on_bad_lines="skip")
        else:
            df = pd.read_csv(stream, on_bad_lines="skip")
        if df.empty or len(df.columns) <= 1:
            raise ValueError("No rectangular delimited table detected.")
        df = _normalize_time(_filter_bbox(df, bbox))
        df = _limit(df, max_rows)
        return [_apply_meta(df, meta)] if not df.empty else []
    except Exception:
        return _semi_structured_text_bytes(data, filename, meta, bbox, max_rows)


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
        errors: list[str] = []
        try:
            frames = _netcdf4_bytes(data, meta, filters, bbox, max_rows)
            if frames:
                return frames
        except Exception as exc:
            errors.append(f"netCDF4: {exc}")

        try:
            frames = _xarray_bytes(data, meta, filters, bbox, max_rows)
            if frames:
                return frames
        except Exception as exc:
            errors.append(f"xarray: {exc}")

        raise ValueError("NetCDF readers failed. " + " | ".join(errors))

    if suffix in (".h5", ".hdf5", ".he5"):
        specialized_errors: list[str] = []

        try:
            frames = _hdf_eos5_grid_bytes(data, filename, meta, filters, bbox, max_rows)
            if frames:
                return frames
        except Exception as exc:
            specialized_errors.append(f"HDF-EOS5 grid: {exc}")

        try:
            frames = _hdf_eos5_swath_bytes(data, filename, meta, filters, bbox, max_rows)
            if frames:
                return frames
        except Exception as exc:
            specialized_errors.append(f"HDF-EOS5 swath: {exc}")

        if suffix == ".he5":
            try:
                frames = _hdf5_bytes(data, meta, filters, bbox, max_rows)
                if frames:
                    return frames
            except Exception as exc:
                specialized_errors.append(f"generic HDF5: {exc}")
            raise ValueError(
                " | ".join(specialized_errors)
                or "No readable HDF-EOS5 data fields matched the selected bbox."
            )

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


def _attach_weight_columns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["weight"] = np.nan
    out["weight_unit"] = ""
    out["weight_variable"] = ""

    if "variable" not in out.columns or "value" not in out.columns:
        return out

    variable_text = out["variable"].astype(str)
    normalized = (
        variable_text.str.lower()
        .str.replace("\\", "/", regex=False)
        .str.replace(":", "/", regex=False)
    )
    base = normalized.str.split("/").str[-1].str.strip()

    exact = base.isin({"weight", "weights"})
    broad = base.str.contains("weight", na=False)
    weight_mask = exact | broad
    if not weight_mask.any():
        return out

    out.loc[weight_mask, "weight"] = pd.to_numeric(
        out.loc[weight_mask, "value"], errors="coerce"
    )
    if "unit" in out.columns:
        out.loc[weight_mask, "weight_unit"] = out.loc[weight_mask, "unit"].astype(str)
    out.loc[weight_mask, "weight_variable"] = variable_text.loc[weight_mask]

    keys = [
        key for key in (
            "collection_id",
            "granule_id",
            "data_timestamp_utc",
            "latitude",
            "longitude",
        )
        if key in out.columns
    ]

    if "latitude" in keys and "longitude" in keys:
        weights = out.loc[
            weight_mask,
            keys + ["weight", "weight_unit", "weight_variable"],
        ].copy()
        weights["_priority"] = np.where(
            base.loc[weight_mask].isin({"weight", "weights"}), 0, 1
        )
        weights = (
            weights.sort_values("_priority")
            .drop_duplicates(keys, keep="first")
            .drop(columns=["_priority"])
        )

        non_weight = out.loc[~weight_mask].copy()
        if not non_weight.empty:
            non_weight = non_weight.drop(
                columns=["weight", "weight_unit", "weight_variable"],
                errors="ignore",
            ).merge(weights, on=keys, how="left")
            weight_rows = out.loc[weight_mask].copy()
            out = pd.concat([non_weight, weight_rows], ignore_index=True, sort=False)

    return out


def combine_frames(frames: list[pd.DataFrame]) -> pd.DataFrame:
    if not frames:
        return pd.DataFrame()

    df = pd.concat(frames, ignore_index=True, sort=False)
    df = annotate_temporal_metadata(df)
    df = _attach_weight_columns(df)

    component_names = (
        df["component_names"].astype(str)
        if "component_names" in df.columns
        else df.get("component_query", pd.Series("", index=df.index)).astype(str)
    )
    if "component_primary" not in df.columns:
        df["component_primary"] = component_names.str.split(";").str[0].str.strip()
    if "component_names" not in df.columns:
        df["component_names"] = component_names

    df["component_segment"] = df["component_primary"].fillna("").astype(str)
    if "collection_segment_key" not in df.columns:
        short_name = df.get("collection_short_name", pd.Series("", index=df.index)).fillna("").astype(str)
        version = df.get("collection_version", pd.Series("", index=df.index)).fillna("").astype(str)
        concept = df.get("collection_id", pd.Series("", index=df.index)).fillna("").astype(str)
        df["collection_segment_key"] = (
            short_name + "|" + version + "|" + concept
        ).str.strip("|")

    lat = pd.to_numeric(df.get("latitude", pd.Series(np.nan, index=df.index)), errors="coerce")
    lon = pd.to_numeric(df.get("longitude", pd.Series(np.nan, index=df.index)), errors="coerce")
    geolocated = lat.notna() & lon.notna()
    df["coordinate_status"] = np.where(geolocated, "geolocated", "not_available_in_source_row")
    df["coordinate_crs"] = np.where(geolocated, "EPSG:4326", "")

    timestamp = df.get("data_timestamp_utc", pd.Series("", index=df.index)).fillna("").astype(str)
    df["timestamp_status"] = np.where(timestamp.str.len() > 0, "available", "not_available_in_source_row")

    preferred = [
        "component_segment",
        "component_primary",
        "component_names",
        "component_count",
        "collection_segment_key",
        "collection_id",
        "collection_short_name",
        "collection_title",
        "collection_version",
        "collection_provider",
        "collection_processing_level",
        "granule_id",
        "granule_ur",
        "granule_production_date_utc",
        "granule_size_mb",
        "conversion_status",
        "conversion_error",
        "raw_download_url",
        "source",
        "source_agency",
        "source_provider",
        "source_satellite",
        "source_instrument",
        "satellite_platform",
        "instrument",
        "data_timestamp_utc",
        "data_date_utc",
        "data_time_utc",
        "timestamp_status",
        "timestamp_source",
        "timestamp_timezone",
        "granule_start_utc",
        "granule_end_utc",
        "retrieved_at_utc",
        "data_cycle",
        "data_cycle_interval_seconds",
        "data_cycle_detail",
        "data_cycle_basis",
        "latitude",
        "longitude",
        "coordinate_status",
        "coordinate_crs",
        "variable",
        "value",
        "unit",
        "weight",
        "weight_unit",
        "weight_variable",
        "hdf_grid",
        "spatial_resolution_degrees",
        "observation_time",
        "granule_begin",
        "granule_end",
        "component_query",
        "collection_search_name",
        "original_file",
        "download_url",
    ]

    extra_cols = [column for column in df.columns if column not in preferred]
    if extra_cols:
        records = df[extra_cols].to_dict(orient="records")
        df["extra_attributes_json"] = [
            json.dumps(
                {
                    key: value
                    for key, value in record.items()
                    if value is not None and not (
                        isinstance(value, float) and math.isnan(value)
                    )
                },
                default=str,
                ensure_ascii=False,
                separators=(",", ":"),
            )
            for record in records
        ]
    else:
        df["extra_attributes_json"] = ""

    for column in preferred:
        if column not in df.columns:
            df[column] = ""

    # Stable segmentation makes the file directly usable for grouping/model work.
    sort_cols = [
        column for column in (
            "component_segment",
            "collection_segment_key",
            "data_timestamp_utc",
            "latitude",
            "longitude",
            "variable",
        )
        if column in df.columns
    ]
    if sort_cols:
        try:
            df = df.sort_values(sort_cols, kind="stable", na_position="last")
        except Exception:
            pass

    return df[preferred + ["extra_attributes_json"]].reset_index(drop=True)
