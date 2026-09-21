from __future__ import annotations

from datetime import date
from typing import Any, Optional

import pandas as pd
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

from .convert import annotate_temporal_metadata


WEATHER_MAP = {
    "temperature": "temperature_2m",
    "air temperature": "temperature_2m",
    "relative humidity": "relative_humidity_2m",
    "humidity": "relative_humidity_2m",
    "precipitation": "precipitation",
    "rainfall": "precipitation",
    "rain": "rain",
    "pressure": "surface_pressure",
    "wind speed": "wind_speed_10m",
    "wind": "wind_speed_10m",
    "soil moisture": "soil_moisture_0_to_7cm",
    "soil temperature": "soil_temperature_0_to_7cm",
    "evapotranspiration": "et0_fao_evapotranspiration",
}

AIR_MAP = {
    "pm2.5": "pm2_5",
    "pm25": "pm2_5",
    "pm10": "pm10",
    "nitrogen dioxide": "nitrogen_dioxide",
    "no2": "nitrogen_dioxide",
    "sulfur dioxide": "sulphur_dioxide",
    "sulphur dioxide": "sulphur_dioxide",
    "so2": "sulphur_dioxide",
    "carbon monoxide": "carbon_monoxide",
    "co": "carbon_monoxide",
    "ozone": "ozone",
    "o3": "ozone",
    "aerosol optical depth": "aerosol_optical_depth",
    "aod": "aerosol_optical_depth",
    "dust": "dust",
}

OSM_MAP = {
    "road": 'way["highway"]',
    "roads": 'way["highway"]',
    "road density": 'way["highway"]',
    "hospital": 'nwr["amenity"="hospital"]',
    "hospital accessibility": 'nwr["amenity"="hospital"]',
    "public transport": 'nwr["public_transport"]',
    "transport accessibility": 'nwr["public_transport"]',
    "green space": 'nwr["leisure"="park"]',
    "park": 'nwr["leisure"="park"]',
    "water": 'nwr["natural"="water"]',
    "surface water": 'nwr["natural"="water"]',
    "critical infrastructure": 'nwr["amenity"~"hospital|fire_station|police|school|university"]',
}


OPENAQ_MAP = {
    "pm2.5": "pm25", "pm25": "pm25", "pm10": "pm10",
    "nitrogen dioxide": "no2", "no2": "no2",
    "sulfur dioxide": "so2", "sulphur dioxide": "so2", "so2": "so2",
    "carbon monoxide": "co", "co": "co",
    "ozone": "o3", "o3": "o3",
}

NOAA_DAILY_MAP = {
    "air temperature": ("TAVG", "degC"),
    "temperature": ("TAVG", "degC"),
    "precipitation": ("PRCP", "mm"),
    "rainfall": ("PRCP", "mm"),
    "rain": ("PRCP", "mm"),
    "extreme rainfall": ("PRCP", "mm"),
    "wind speed": ("AWND", "m/s"),
    "wind": ("AWND", "m/s"),
    "minimum temperature": ("TMIN", "degC"),
    "maximum temperature": ("TMAX", "degC"),
}


def _key(component: str) -> str:
    return " ".join(component.lower().replace("_", " ").split())


def resolve(component: str) -> list[dict[str, str]]:
    key = _key(component)
    items: list[dict[str, str]] = []

    for phrase, variable in WEATHER_MAP.items():
        if phrase in key or key in phrase:
            items.append({
                "id": "open_meteo_weather",
                "provider": "Open-Meteo Historical Weather",
                "variable": variable,
                "description": "Hourly historical meteorology sampled across the selected bounding box.",
            })
            break

    for phrase, variable in AIR_MAP.items():
        if phrase in key or key in phrase:
            items.append({
                "id": "open_meteo_air",
                "provider": "Open-Meteo / CAMS Air Quality",
                "variable": variable,
                "description": "Hourly atmospheric composition data sampled across the selected bounding box.",
            })
            break

    for phrase, query in OSM_MAP.items():
        if phrase in key or key in phrase:
            items.append({
                "id": "openstreetmap",
                "provider": "OpenStreetMap / Overpass",
                "variable": phrase,
                "description": "Open geospatial infrastructure features intersecting the selected bounding box.",
            })
            break

    return items


def _grid(bbox: dict[str, float], points: int) -> list[tuple[float, float]]:
    points = max(1, min(points, 8))
    if points == 1:
        return [(
            (bbox["south"] + bbox["north"]) / 2,
            (bbox["west"] + bbox["east"]) / 2,
        )]
    lats = [
        bbox["south"] + i * (bbox["north"] - bbox["south"]) / (points - 1)
        for i in range(points)
    ]
    lons = [
        bbox["west"] + i * (bbox["east"] - bbox["west"]) / (points - 1)
        for i in range(points)
    ]
    return [(lat, lon) for lat in lats for lon in lons]


def _pick(mapping: dict[str, str], component: str) -> str:
    key = _key(component)
    for phrase, variable in mapping.items():
        if phrase in key or key in phrase:
            return variable
    raise ValueError(f"No external variable mapping exists for {component!r}.")


def _weather(
    component: str,
    bbox: dict[str, float],
    start: date,
    end: date,
    points: int,
) -> pd.DataFrame:
    variable = _pick(WEATHER_MAP, component)
    frames: list[pd.DataFrame] = []
    for lat, lon in _grid(bbox, points):
        r = requests.get(
            "https://archive-api.open-meteo.com/v1/archive",
            params={
                "latitude": lat,
                "longitude": lon,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "hourly": variable,
                "timezone": "UTC",
            },
            timeout=90,
        )
        r.raise_for_status()
        payload = r.json()
        hourly = payload.get("hourly") or {}
        times = hourly.get("time") or []
        vals = hourly.get(variable) or []
        if times and vals:
            frames.append(pd.DataFrame({
                "source": "Open-Meteo Historical Weather",
                "component_query": component,
                "latitude": lat,
                "longitude": lon,
                "observation_time": times[:len(vals)],
                "variable": variable,
                "value": vals[:len(times)],
                "unit": (payload.get("hourly_units") or {}).get(variable, ""),
            }))
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def _air(
    component: str,
    bbox: dict[str, float],
    start: date,
    end: date,
    points: int,
) -> pd.DataFrame:
    variable = _pick(AIR_MAP, component)
    frames: list[pd.DataFrame] = []
    for lat, lon in _grid(bbox, points):
        r = requests.get(
            "https://air-quality-api.open-meteo.com/v1/air-quality",
            params={
                "latitude": lat,
                "longitude": lon,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "hourly": variable,
                "timezone": "UTC",
            },
            timeout=90,
        )
        r.raise_for_status()
        payload = r.json()
        hourly = payload.get("hourly") or {}
        times = hourly.get("time") or []
        vals = hourly.get(variable) or []
        if times and vals:
            frames.append(pd.DataFrame({
                "source": "Open-Meteo / CAMS Air Quality",
                "component_query": component,
                "latitude": lat,
                "longitude": lon,
                "observation_time": times[:len(vals)],
                "variable": variable,
                "value": vals[:len(times)],
                "unit": (payload.get("hourly_units") or {}).get(variable, ""),
            }))
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def _osm(component: str, bbox: dict[str, float]) -> pd.DataFrame:
    key = _key(component)
    selector = None
    for phrase, query in OSM_MAP.items():
        if phrase in key or key in phrase:
            selector = query
            break
    if not selector:
        raise ValueError("No OpenStreetMap mapping exists for this component.")

    south, west, north, east = bbox["south"], bbox["west"], bbox["north"], bbox["east"]
    q = f"[out:json][timeout:50];({selector}({south},{west},{north},{east}););out center tags;"
    r = requests.post(
        "https://overpass-api.de/api/interpreter",
        data={"data": q},
        timeout=75,
        headers={"User-Agent": "EarthdataCSVDownloader/1.1"},
    )
    r.raise_for_status()
    rows: list[dict[str, Any]] = []
    for e in (r.json().get("elements") or []):
        center = e.get("center") or {}
        tags = e.get("tags") or {}
        row: dict[str, Any] = {
            "source": "OpenStreetMap / Overpass",
            "component_query": component,
            "osm_type": e.get("type"),
            "osm_id": e.get("id"),
            "latitude": e.get("lat", center.get("lat")),
            "longitude": e.get("lon", center.get("lon")),
            "name": tags.get("name", ""),
        }
        for k, v in tags.items():
            row[f"tag_{k}"] = v
        rows.append(row)
    return pd.DataFrame(rows)


def fetch(
    component: str,
    provider_id: str,
    bbox: dict[str, float],
    start: date,
    end: date,
    grid_points_per_axis: int = 3,
) -> pd.DataFrame:
    if provider_id == "open_meteo_weather":
        df = _weather(component, bbox, start, end, grid_points_per_axis)
        return annotate_temporal_metadata(
            df,
            explicit_cycle="Hourly",
            explicit_cycle_detail="Every 1 hour (UTC)",
            timestamp_source_override="provider_observation_time",
        )
    if provider_id == "open_meteo_air":
        df = _air(component, bbox, start, end, grid_points_per_axis)
        return annotate_temporal_metadata(
            df,
            explicit_cycle="Hourly",
            explicit_cycle_detail="Every 1 hour (UTC)",
            timestamp_source_override="provider_observation_time",
        )
    if provider_id == "openstreetmap":
        df = _osm(component, bbox)
        return annotate_temporal_metadata(
            df,
            explicit_cycle="Static/snapshot",
            explicit_cycle_detail="Static geospatial snapshot; no observation cycle supplied by source",
        )
    raise ValueError(f"Unknown external provider: {provider_id}")

def _ground_match(mapping: dict[str, Any], component: str) -> Any | None:
    key = _key(component)
    for phrase, value in mapping.items():
        if phrase in key or key in phrase:
            return value
    return None


def resolve_ground(component: str) -> dict[str, Any]:
    openaq = _ground_match(OPENAQ_MAP, component)
    if openaq:
        return {"available_kind":"ground_observation","provider":"OpenAQ","provider_id":"openaq","variable":openaq,"requires_api_key":True}
    noaa = _ground_match(NOAA_DAILY_MAP, component)
    if noaa:
        return {"available_kind":"ground_observation","provider":"NOAA/NCEI Daily Summaries","provider_id":"noaa_ncei_daily","variable":noaa[0],"requires_api_key":False}
    key = _key(component)
    for phrase in OSM_MAP:
        if phrase in key or key in phrase:
            return {"available_kind":"ground_reference","provider":"OpenStreetMap / Overpass","provider_id":"openstreetmap_ground","variable":phrase,"requires_api_key":False}
    return {"available_kind":"none","provider":"","provider_id":"none","variable":"","requires_api_key":False}


def _ground_base(component: str, provider: str, collection_id: str, collection_title: str) -> dict[str, Any]:
    return {
        "source": provider,
        "source_type": "ground_observation",
        "source_agency": provider,
        "ground_provider": provider,
        "ground_data_available": True,
        "ground_status": "observed",
        "component_primary": component,
        "component_names": component,
        "component_count": 1,
        "component_query": component,
        "collection_id": collection_id,
        "collection_short_name": collection_id.split(":")[-1],
        "collection_title": collection_title,
        "collection_version": "",
        "collection_provider": provider,
        "collection_processing_level": "ground_observation",
        "conversion_status": "converted",
        "conversion_error": "",
        "source_satellite": "",
        "satellite_platform": "",
        "instrument": "",
    }


def _ground_status_frame(component: str, provider: str, status: str, detail: str) -> pd.DataFrame:
    base = _ground_base(
        component,
        provider or "Ground-data resolver",
        f"ground:{provider or 'none'}",
        f"Ground observation status for {component}",
    )
    base.update({
        "source_type": "ground_status",
        "ground_data_available": False,
        "ground_status": status,
        "conversion_status": "ground_unavailable",
        "conversion_error": detail,
        "variable": "__ground_status__",
        "value": "",
        "unit": "",
        "training_row_usable": False,
        "training_exclude_reason": "ground_data_unavailable",
    })
    return pd.DataFrame([base])


def _openaq_ground(component: str, bbox: dict[str, float], start: date, end: date, api_key: str) -> pd.DataFrame:
    parameter_name = str(_ground_match(OPENAQ_MAP, component) or "")
    if not parameter_name:
        return _ground_status_frame(component, "OpenAQ", "unsupported_component", "No OpenAQ parameter mapping exists.")
    if not api_key.strip():
        return _ground_status_frame(component, "OpenAQ", "api_key_required", "OpenAQ v3 requires an API key for ground air-monitor observations.")

    headers = {"X-API-Key": api_key.strip(), "Accept": "application/json", "User-Agent": "LupusCortexGroundData/1.0"}
    params_resp = requests.get(
        "https://api.openaq.org/v3/parameters",
        params={"limit":100,"page":1},
        headers=headers,
        timeout=(3,12),
    )
    params_resp.raise_for_status()
    parameter_id = next(
        (item.get("id") for item in (params_resp.json().get("results") or [])
         if str(item.get("name") or "").lower() == parameter_name.lower()),
        None,
    )
    if parameter_id is None:
        return _ground_status_frame(component, "OpenAQ", "parameter_not_found", f"OpenAQ parameter {parameter_name!r} was not found.")

    locations_resp = requests.get(
        "https://api.openaq.org/v3/locations",
        params={
            "bbox": f'{bbox["west"]},{bbox["south"]},{bbox["east"]},{bbox["north"]}',
            "parameters_id": parameter_id,
            "limit": 1000,
            "page": 1,
        },
        headers=headers,
        timeout=(3,15),
    )
    locations_resp.raise_for_status()
    locations = locations_resp.json().get("results") or []
    if not locations:
        return _ground_status_frame(component, "OpenAQ", "no_station_in_bbox", "No OpenAQ ground station for this pollutant was found inside the selected bbox.")

    sensors: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for location in locations:
        location_sensors = location.get("sensors") or []
        if not location_sensors and location.get("id") is not None:
            try:
                sensor_resp = requests.get(
                    f'https://api.openaq.org/v3/locations/{location["id"]}/sensors',
                    headers=headers,
                    timeout=(3,10),
                )
                if sensor_resp.ok:
                    location_sensors = sensor_resp.json().get("results") or []
            except Exception:
                location_sensors = []
        for sensor in location_sensors:
            parameter = sensor.get("parameter") or {}
            if str(parameter.get("name") or "").lower() == parameter_name.lower():
                sensors.append((location, sensor))

    if not sensors:
        return _ground_status_frame(component, "OpenAQ", "no_matching_sensor", "OpenAQ locations existed, but no matching pollutant sensor was available.")

    span_days = max(1, (end - start).days + 1)
    endpoint = "days" if span_days > 45 else "hours"
    explicit_cycle = "Daily" if endpoint == "days" else "Hourly"

    def fetch_sensor(pair: tuple[dict[str, Any], dict[str, Any]]) -> list[dict[str, Any]]:
        location, sensor = pair
        sensor_id = sensor.get("id")
        if sensor_id is None:
            return []
        location_coords = location.get("coordinates") or {}
        result_rows: list[dict[str, Any]] = []
        page = 1
        while page <= 20:
            r = requests.get(
                f"https://api.openaq.org/v3/sensors/{sensor_id}/{endpoint}",
                params={
                    "datetime_from": f"{start.isoformat()}T00:00:00Z",
                    "datetime_to": f"{end.isoformat()}T23:59:59Z",
                    "limit": 1000,
                    "page": page,
                },
                headers=headers,
                timeout=(3,15),
            )
            r.raise_for_status()
            payload = r.json()
            results = payload.get("results") or []
            for obs in results:
                period = obs.get("period") or {}
                dt_from = period.get("datetimeFrom") or {}
                coords = obs.get("coordinates") or location_coords
                parameter = obs.get("parameter") or sensor.get("parameter") or {}
                coverage = obs.get("coverage") or {}
                summary = obs.get("summary") or {}
                base = _ground_base(
                    component,
                    "OpenAQ",
                    f"ground:openaq:{parameter_name}",
                    f"OpenAQ ground sensors · {parameter.get('displayName') or parameter_name}",
                )
                base.update({
                    "provider_location_id": location.get("id"),
                    "provider_sensor_id": sensor_id,
                    "station_id": location.get("id"),
                    "station_name": location.get("name") or location.get("locality") or "",
                    "latitude": coords.get("latitude"),
                    "longitude": coords.get("longitude"),
                    "observation_time": dt_from.get("utc"),
                    "variable": parameter.get("name") or parameter_name,
                    "value": obs.get("value"),
                    "unit": parameter.get("units") or "",
                    "coverage_percent": coverage.get("percentCoverage"),
                    "measurement_quality": "flagged" if (obs.get("flagInfo") or {}).get("hasFlags") else "reported",
                    "ground_summary_min": summary.get("min"),
                    "ground_summary_max": summary.get("max"),
                    "ground_summary_median": summary.get("median"),
                    "ground_summary_sd": summary.get("sd"),
                })
                result_rows.append(base)
            found = payload.get("meta", {}).get("found")
            try:
                if len(results) < 1000 or (found is not None and page * 1000 >= int(found)):
                    break
            except Exception:
                if len(results) < 1000:
                    break
            page += 1
        return result_rows

    rows: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=min(6, max(1, len(sensors)))) as pool:
        futures = [pool.submit(fetch_sensor, pair) for pair in sensors[:50]]
        for future in as_completed(futures):
            try:
                rows.extend(future.result())
            except Exception:
                continue

    if not rows:
        return _ground_status_frame(component, "OpenAQ", "no_measurements_in_range", "Ground stations were found, but no measurements were returned for the selected date range.")

    return annotate_temporal_metadata(
        pd.DataFrame(rows),
        explicit_cycle=explicit_cycle,
        explicit_cycle_detail=f"OpenAQ {explicit_cycle.lower()} ground-station observations",
        timestamp_source_override="provider_observation_time",
    )


def _noaa_ground(component: str, bbox: dict[str, float], start: date, end: date) -> pd.DataFrame:
    mapping = _ground_match(NOAA_DAILY_MAP, component)
    if not mapping:
        return _ground_status_frame(component, "NOAA/NCEI", "unsupported_component", "No NOAA Daily Summaries mapping exists.")
    datatype, unit = mapping
    r = requests.get(
        "https://www.ncei.noaa.gov/access/services/data/v1",
        params={
            "dataset":"daily-summaries",
            "dataTypes":datatype,
            "startDate":start.isoformat(),
            "endDate":end.isoformat(),
            "bbox":f'{bbox["north"]},{bbox["west"]},{bbox["south"]},{bbox["east"]}',
            "format":"json",
            "units":"metric",
            "includeAttributes":"false",
            "includeStationName":"true",
            "includeStationLocation":"true",
        },
        timeout=(3,20),
    )
    r.raise_for_status()
    payload = r.json()
    records = payload if isinstance(payload, list) else (payload.get("results") or [])
    rows: list[dict[str, Any]] = []
    for record in records:
        raw_value = record.get(datatype)
        if raw_value in (None, ""):
            continue
        try:
            value = float(str(raw_value).split(",")[0])
        except Exception:
            continue
        base = _ground_base(component, "NOAA/NCEI", f"ground:noaa:daily-summaries:{datatype}", f"NOAA/NCEI Daily Summaries · {datatype}")
        base.update({
            "station_id": record.get("STATION") or record.get("station"),
            "station_name": record.get("NAME") or record.get("name") or "",
            "latitude": record.get("LATITUDE") or record.get("latitude"),
            "longitude": record.get("LONGITUDE") or record.get("longitude"),
            "observation_time": record.get("DATE") or record.get("date"),
            "variable": datatype,
            "value": value,
            "unit": unit,
            "measurement_quality": "NCEI quality-controlled archive",
        })
        rows.append(base)
    if not rows:
        return _ground_status_frame(component, "NOAA/NCEI", "no_station_measurements_in_range", "NOAA/NCEI returned no mapped station observations inside the selected bbox/date range.")
    return annotate_temporal_metadata(
        pd.DataFrame(rows),
        explicit_cycle="Daily",
        explicit_cycle_detail="NOAA/NCEI daily ground-station observations",
        timestamp_source_override="provider_observation_time",
    )


def _osm_ground(component: str, bbox: dict[str, float]) -> pd.DataFrame:
    df = _osm(component, bbox)
    if df.empty:
        return _ground_status_frame(component, "OpenStreetMap / Overpass", "no_reference_features", "No matching ground/reference features were found in the selected bbox.")
    df["source_type"] = "ground_reference"
    df["ground_provider"] = "OpenStreetMap / Overpass"
    df["ground_data_available"] = True
    df["ground_status"] = "reference_features"
    df["component_primary"] = component
    df["component_names"] = component
    df["component_count"] = 1
    df["collection_id"] = "ground:openstreetmap"
    df["collection_short_name"] = "OpenStreetMap"
    df["collection_title"] = "OpenStreetMap ground/reference features"
    df["collection_provider"] = "OpenStreetMap / Overpass"
    df["collection_processing_level"] = "ground_reference"
    df["conversion_status"] = "converted"
    df["variable"] = _key(component)
    df["value"] = 1
    df["unit"] = "feature"
    return annotate_temporal_metadata(
        df,
        explicit_cycle="Static/snapshot",
        explicit_cycle_detail="Ground/reference infrastructure snapshot",
    )


def fetch_ground(
    component: str,
    bbox: dict[str, float],
    start: date,
    end: date,
    openaq_api_key: Optional[str] = None,
) -> pd.DataFrame:
    capability = resolve_ground(component)
    provider_id = capability.get("provider_id")
    try:
        if provider_id == "openaq":
            return _openaq_ground(component, bbox, start, end, openaq_api_key or "")
        if provider_id == "noaa_ncei_daily":
            return _noaa_ground(component, bbox, start, end)
        if provider_id == "openstreetmap_ground":
            return _osm_ground(component, bbox)
        return _ground_status_frame(
            component,
            "",
            "no_ground_equivalent",
            "No scientifically defensible public ground-observation equivalent is configured for this component.",
        )
    except Exception as exc:
        return _ground_status_frame(
            component,
            str(capability.get("provider") or "Ground-data provider"),
            "provider_error",
            str(exc),
        )

