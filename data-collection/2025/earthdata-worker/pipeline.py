#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import gzip
import json
import math
import os
import shutil
import sys
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import numpy as np
import pandas as pd
import requests

from adapters_extra import (
    process_modis_lst, process_modis_ndvi, process_maiac_aod, process_black_marble,
    process_smap, process_omi_grid, process_airs_l3, process_opera_dswx,
    process_nasadem, process_sedac_raster, process_hls_files, process_grace_mascon,
)

try:
    import earthaccess
except Exception:
    earthaccess = None

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
BBOX = CONFIG["bbox"]
WEST, SOUTH, EAST, NORTH = BBOX["west"], BBOX["south"], BBOX["east"], BBOX["north"]
START = CONFIG["temporal"]["start"]
END = CONFIG["temporal"]["end"]
BBOX_ID = "LC_2025_2280_2480_8924_9131"

MASTER_COLUMNS = [
    "timestamp_start_utc", "timestamp_end_utc", "lat", "lon", "grid_cell_id",
    "component_id", "component", "subvariable", "value", "unit", "quality_flag",
    "source_product", "source_version", "source_granule", "native_temporal_resolution",
    "native_spatial_resolution", "processing_level", "reference_year", "bbox_id",
    "provenance_note"
]

@dataclass
class Product:
    component_id: int
    component: str
    short_name: str | None
    version: str
    cadence: str
    adapter: str
    subvariables: list[str]

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Product":
        return cls(**d)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def products() -> list[Product]:
    return [Product.from_dict(x) for x in CONFIG["products"]]


def nasa_products() -> list[Product]:
    return [p for p in products() if p.short_name]


def ensure_dirs(outdir: Path) -> dict[str, Path]:
    paths = {
        "root": outdir,
        "raw": outdir / "raw",
        "parts": outdir / "parts",
        "logs": outdir / "logs",
        "derived": outdir / "derived",
    }
    for p in paths.values():
        p.mkdir(parents=True, exist_ok=True)
    return paths


def grid_id(lat: float, lon: float, step: float | None = None) -> str:
    step = step or float(CONFIG["model_grid_deg"])
    iy = math.floor((lat - SOUTH) / step + 1e-9)
    ix = math.floor((lon - WEST) / step + 1e-9)
    return f"g{iy:04d}_{ix:04d}"


def in_bbox(lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    return (lat >= SOUTH) & (lat <= NORTH) & (lon >= WEST) & (lon <= EAST)


def infer_time_from_xarray(ds, fallback: str = "") -> list[str]:
    for name in ["time", "Time", "datetime", "date"]:
        if name in ds.coords:
            vals = np.atleast_1d(ds[name].values)
            out = []
            for x in vals:
                try:
                    out.append(pd.Timestamp(x).tz_localize("UTC").isoformat().replace("+00:00", "Z"))
                except Exception:
                    try:
                        out.append(pd.Timestamp(x).tz_convert("UTC").isoformat().replace("+00:00", "Z"))
                    except Exception:
                        out.append(str(x))
            return out
    return [fallback]


def emit_regular_grid(da, lat_name: str, lon_name: str, *, p: Product, subvariable: str,
                      unit: str, source_file: Path, time_value: str, spatial_resolution: str,
                      note: str = "", quality_flag: str = "") -> list[dict[str, Any]]:
    arr = np.asarray(da.values)
    arr = np.squeeze(arr)
    if arr.ndim != 2:
        raise ValueError(f"Expected 2D array for {subvariable}, got shape {arr.shape}")
    lats = np.asarray(da[lat_name].values if lat_name in da.coords else da.parent[lat_name].values)
    lons = np.asarray(da[lon_name].values if lon_name in da.coords else da.parent[lon_name].values)
    rows = []
    for iy, la in enumerate(lats):
        if la < SOUTH or la > NORTH:
            continue
        for ix, lo in enumerate(lons):
            if lo < WEST or lo > EAST:
                continue
            val = arr[iy, ix]
            if not np.isfinite(val):
                continue
            rows.append({
                "timestamp_start_utc": time_value,
                "timestamp_end_utc": time_value,
                "lat": float(la), "lon": float(lo),
                "component_id": p.component_id, "component": p.component,
                "subvariable": subvariable, "value": float(val), "unit": unit,
                "quality_flag": quality_flag,
                "source_product": p.short_name or p.adapter,
                "source_version": p.version, "source_granule": source_file.name,
                "native_temporal_resolution": p.cadence,
                "native_spatial_resolution": spatial_resolution,
                "processing_level": "QA-screened" if quality_flag else "source/derived",
                "reference_year": "", "provenance_note": note,
            })
    return rows


def _open_xr(path: Path):
    import xarray as xr
    errors = []
    for engine in [None, "h5netcdf", "netcdf4"]:
        try:
            kw = {} if engine is None else {"engine": engine}
            return xr.open_dataset(path, mask_and_scale=True, decode_times=True, **kw)
        except Exception as e:
            errors.append(repr(e))
    raise RuntimeError(f"Could not open {path}: {errors[-2:]}")


def process_merra2_surface(path: Path, p: Product) -> list[dict[str, Any]]:
    import xarray as xr
    ds = _open_xr(path)
    lat_name = "lat" if "lat" in ds.coords else "latitude"
    lon_name = "lon" if "lon" in ds.coords else "longitude"
    # Subset before loading arrays.
    lats = ds[lat_name]
    lat_slice = slice(NORTH, SOUTH) if float(lats[0]) > float(lats[-1]) else slice(SOUTH, NORTH)
    ds = ds.sel({lat_name: lat_slice, lon_name: slice(WEST, EAST)})
    times = infer_time_from_xarray(ds)
    out = []
    if p.component_id == 9:
        var = "T2M"
        if var not in ds:
            return []
        for ti, t in enumerate(times):
            da = ds[var].isel(time=ti) if "time" in ds[var].dims else ds[var]
            da = da - 273.15
            out += emit_regular_grid(da, lat_name, lon_name, p=p, subvariable="T2M",
                                     unit="°C", source_file=path, time_value=t,
                                     spatial_resolution="0.5° x 0.625°",
                                     note="MERRA-2 T2M converted K→°C")
    else:
        # Derive RH from 2-m specific humidity, temperature and surface pressure.
        required = ["QV2M", "T2M", "PS"]
        if not all(v in ds for v in required):
            return []
        for ti, t in enumerate(times):
            q = ds["QV2M"].isel(time=ti)
            T = ds["T2M"].isel(time=ti)
            P = ds["PS"].isel(time=ti)
            e = q * P / (0.622 + 0.378 * q)
            Tc = T - 273.15
            es = 611.2 * np.exp((17.67 * Tc) / (Tc + 243.5))
            rh = (100.0 * e / es).clip(min=0, max=100)
            out += emit_regular_grid(rh, lat_name, lon_name, p=p, subvariable="RH2M_DERIVED",
                                     unit="%", source_file=path, time_value=t,
                                     spatial_resolution="0.5° x 0.625°",
                                     note="RH derived from MERRA-2 QV2M,T2M,PS using vapor-pressure relation")
    ds.close()
    return out


def process_merra2_aerosol(path: Path, p: Product) -> list[dict[str, Any]]:
    ds = _open_xr(path)
    lat_name = "lat" if "lat" in ds.coords else "latitude"
    lon_name = "lon" if "lon" in ds.coords else "longitude"
    lats = ds[lat_name]
    lat_slice = slice(NORTH, SOUTH) if float(lats[0]) > float(lats[-1]) else slice(SOUTH, NORTH)
    ds = ds.sel({lat_name: lat_slice, lon_name: slice(WEST, EAST)})
    times = infer_time_from_xarray(ds)
    out = []
    # NASA/GMAO-style surface mass concentration fields, kg/m3. 1.375 approximates ammonium sulfate mass.
    pm25_fields = ["DUSMASS25", "SSSMASS25", "BCSMASS", "OCSMASS", "SO4SMASS"]
    if not all(v in ds for v in pm25_fields):
        return []
    for ti, t in enumerate(times):
        du25 = ds["DUSMASS25"].isel(time=ti)
        ss25 = ds["SSSMASS25"].isel(time=ti)
        bc = ds["BCSMASS"].isel(time=ti)
        oc = ds["OCSMASS"].isel(time=ti)
        so4 = ds["SO4SMASS"].isel(time=ti)
        pm25 = (du25 + ss25 + bc + 1.8 * oc + 1.375 * so4) * 1e9
        if p.component_id == 1:
            out += emit_regular_grid(pm25, lat_name, lon_name, p=p, subvariable="PM25",
                                     unit="µg/m³", source_file=path, time_value=t,
                                     spatial_resolution="0.5° x 0.625°",
                                     note="MERRA-2 derived PM2.5=(DUSMASS25+SSSMASS25+BCSMASS+1.8*OCSMASS+1.375*SO4SMASS)*1e9")
        else:
            raise RuntimeError("M2T1NXAER total dust/sea-salt mass is not a size-cut PM10 measurement. Supply a documented PM10 source; component 2 stays missing.")
    ds.close()
    return out


def process_imerg(path: Path, p: Product) -> list[dict[str, Any]]:
    import h5py
    out = []
    with h5py.File(path, "r") as f:
        g = f["Grid"] if "Grid" in f else f
        lon = np.asarray(g["lon"][:])
        lat = np.asarray(g["lat"][:])
        var = "precipitation" if "precipitation" in g else ("precipitationCal" if "precipitationCal" in g else None)
        if var is None:
            return []
        data = np.asarray(g[var][:])
        data = np.squeeze(data)
        # Typical IMERG layout is lon x lat after squeeze; normalize to lat x lon.
        if data.shape == (len(lon), len(lat)):
            data = data.T
        if "time" not in g or "units" not in g["time"].attrs:
            raise ValueError("IMERG time requires CF units")
        from netCDF4 import num2date
        units = g["time"].attrs["units"]
        if isinstance(units, bytes): units = units.decode()
        tv = np.atleast_1d(g["time"][:])[0]
        t = num2date(tv, units=str(units), only_use_cftime_datetimes=False).strftime("%Y-%m-%dT%H:%M:%SZ")
        for iy, la in enumerate(lat):
            if not SOUTH <= la <= NORTH: continue
            for ix, lo in enumerate(lon):
                if not WEST <= lo <= EAST: continue
                v = float(data[iy, ix])
                if not np.isfinite(v) or v < 0: continue
                if p.component_id == 15:
                    sv, val, unit, note = "precipitation", v, "mm/hr", "IMERG Final half-hourly precipitation rate"
                else:
                    # Raw half-hour contribution; event/daily thresholds are calculated in postprocessing.
                    sv, val, unit, note = "EXTREME_RAIN_INPUT", v, "mm/hr", "Half-hourly IMERG input retained for 24h accumulation and 95th/99th percentile derivation"
                out.append({
                    "timestamp_start_utc": t, "timestamp_end_utc": t, "lat": float(la), "lon": float(lo),
                    "component_id": p.component_id, "component": p.component, "subvariable": sv,
                    "value": val, "unit": unit, "quality_flag": "",
                    "source_product": p.short_name, "source_version": p.version, "source_granule": path.name,
                    "native_temporal_resolution": "30 minutes", "native_spatial_resolution": "0.1° x 0.1°",
                    "processing_level": "source" if p.component_id == 15 else "derived-input",
                    "reference_year": "", "provenance_note": note
                })
    return out


def _raster_points(path: Path, p: Product, subvariable: str, scale: float = 1.0, offset: float = 0.0,
                   valid_min: float | None = None, valid_max: float | None = None, unit: str = "",
                   note: str = "", qa_fn=None) -> list[dict[str, Any]]:
    import rasterio
    from rasterio.warp import transform_bounds, transform
    rows = []
    with rasterio.open(path) as src:
        # Compute pixel window in source CRS from WGS84 bbox.
        b = transform_bounds("EPSG:4326", src.crs, WEST, SOUTH, EAST, NORTH, densify_pts=21)
        win = rasterio.windows.from_bounds(*b, transform=src.transform).round_offsets().round_lengths()
        arr = src.read(1, window=win, masked=True)
        tr = src.window_transform(win)
        rr, cc = np.where(~arr.mask if hasattr(arr, "mask") and np.ndim(arr.mask) else np.isfinite(arr))
        if len(rr) == 0:
            return []
        xs, ys = rasterio.transform.xy(tr, rr, cc, offset="center")
        lons, lats = transform(src.crs, "EPSG:4326", xs, ys)
        vals = np.asarray(arr)[rr, cc].astype(float) * scale + offset
        t = ""
        for la, lo, v in zip(lats, lons, vals):
            if not (SOUTH <= la <= NORTH and WEST <= lo <= EAST): continue
            if not np.isfinite(v): continue
            if valid_min is not None and v < valid_min: continue
            if valid_max is not None and v > valid_max: continue
            rows.append({
                "timestamp_start_utc": t, "timestamp_end_utc": t, "lat": float(la), "lon": float(lo),
                "component_id": p.component_id, "component": p.component, "subvariable": subvariable,
                "value": float(v), "unit": unit, "quality_flag": "",
                "source_product": p.short_name, "source_version": p.version, "source_granule": path.name,
                "native_temporal_resolution": p.cadence,
                "native_spatial_resolution": f"{abs(src.res[0]):g} x {abs(src.res[1]):g} {src.crs}",
                "processing_level": "QA-screened", "reference_year": "", "provenance_note": note
            })
    return rows


def process_generic(path: Path, p: Product) -> list[dict[str, Any]]:
    # Conservative fallback. It intentionally does not guess scientific variables.
    return []


from atmosphere import process_omi, process_airs

PROCESSORS = {
    "merra2_surface": process_merra2_surface,
    "merra2_aerosol": process_merra2_aerosol,
    "imerg": process_imerg,
    "modis_lst": process_modis_lst,
    "modis_ndvi": process_modis_ndvi,
    "maiac_aod": process_maiac_aod,
    "black_marble": process_black_marble,
    "smap": process_smap,
    "omi_grid": process_omi,
    "airs_l3": process_airs,
    "opera_dswx": process_opera_dswx,
    "nasadem": process_nasadem,
    "sedac_population": process_sedac_raster,

    "grace_smap_drought": process_grace_mascon,
}



def main():
    from collector import main as collect_main
    collect_main()

if __name__ == "__main__":
    # Adapters import this module by its canonical name.
    sys.modules["pipeline"] = sys.modules[__name__]
    main()
