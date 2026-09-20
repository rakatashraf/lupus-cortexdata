# Source audit and remaining gaps

Audit performed during this repair. Counts are live CMR metadata hits intersecting the configured extent, not downloaded observations and not guarantees of valid pixels.

**Study extent retained from the uploaded file:** west 89.24, south 22.80, east 91.31, north 24.80. This is a broad Bangladesh rectangle, not a Dhaka administrative boundary. Target observation year: 2025. Model cell identifier step: 0.01 degree, without claiming native downscaling.

| ID | Component | Source / corrected version | Source cadence | Catalog hits | Qualification |
|---|---|---|---|---:|---|
| 1 | PM2.5 | M2T1NXAER 5.12.4 | hourly | 365 | Derived aerosol mass estimate, not a ground monitor. |
| 2 | PM10 | M2T1NXAER 5.12.4 | hourly | 365 | BLOCKED: total dust/sea salt is not a PM10 size cut. |
| 3 | NO2 | OMNO2d 004 | daily | 365 | Tropospheric NO2 column, not surface ppb. |
| 4 | O3 | OMTO3e 004 | daily | 365 | Ozone column, not ground-level ozone. |
| 5 | SO2 | OMSO2e 004 | daily | 365 | SO2 column; confirm exact source science field/units. |
| 6 | CO | AIRS3STD 7.0 | daily | 366 | Changed discontinued AIRX3STD to AIRS3STD. CO total columns; ascending/descending separate. |
| 7 | AOD | MCD19A2 061 | daily | 365 | All raster bands retained; daily product window, not guessed exact orbit timestamps. |
| 8 | Land Surface Temperature | MOD11A1 061; MYD11A1 061 | daily | 365; 365 | Day/night and Terra/Aqua kept separate; QA screening. |
| 9 | Air Temperature | M2T1NXSLV 5.12.4 | hourly | 365 | Hourly mean temperature; K converted to Celsius. |
| 10 | Relative Humidity | M2T1NXSLV 5.12.4 | hourly | 365 | Derived from specific humidity, pressure and temperature. |
| 11 | NDVI | MOD13A2 061; MYD13A2 061 | 16-day | 24; 24 | 16-day composite; no interpolation into daily observations. |
| 12 | Green-space percentage | HLSL30 2.0; HLSS30 2.0 | scene | 977; 1124 | NDVI threshold heuristic, explicitly a proxy. |
| 13 | Built-up percentage | HLSL30 2.0; HLSS30 2.0 | scene | 977; 1124 | NDBI/NDVI threshold heuristic, explicitly a proxy. |
| 14 | Impervious surface | HLSL30 2.0; HLSS30 2.0 | annual-derived | 977; 1124 | Spectral imperviousness proxy, not measured sealed surface. |
| 15 | Precipitation | GPM_3IMERGHH 07 | 30-min | 13104 | Selected archive stops 2025-09-30. 13,104 slots instead of 17,520 for a full year. |
| 16 | Extreme rainfall | GPM_3IMERGHH 07 | 30-min-derived | 13104 | Only complete 48-slot days; past-only 90-day empirical threshold, minimum 30 days. |
| 17 | Soil moisture | SPL3SMP_E 006 | daily | 364 | 364 overlapping daily granules; do not infer complete coverage. |
| 18 | Surface-water extent | OPERA_L3_DSWX-HLS_V1 1.0 | scene | 1991 | Open-water classification; partial-water class excluded instead of assuming 50% water. |
| 19 | Flood extent | OPERA_L3_DSWX-HLS_V1 1.0 | event-derived | 1991 | Excess open water relative to prior scenes; not validated flood ground truth. |
| 20 | Drought anomaly | TELLUS_GRAC-GRFO_MASCON_GRID_RL06.3_V4 RL06.3Mv04 | monthly+daily-derived | 1 | Monthly GRACE TWS anomaly only; no invented drought-normal z-score. |
| 21 | Population density | CIESIN_SEDAC_GPWv4_POPDENS_R11 4.11 | static-reference | 54 | 2020 GPW reference density, not a 2025 population observation. Many returned granules are other years/resolutions. |
| 22 | Vulnerable-age population | CIESIN_SEDAC_GPWv4_BDC_R11 4.11 | static-reference | 284 | BLOCKED: requires verified nonoverlapping age/sex bins and denominator; filename guesses removed. |
| 23 | Road density | osm OSM-2025-snapshot | static-reference | public API | Jan 1 OSM snapshot; road length assigned by midpoint is explicitly a proxy. |
| 24 | Public-transport accessibility | osm OSM/GTFS-2025 | static/schedule | public API | Jan 1 OSM stops; distance/score proxies. No actual GTFS schedule was supplied. |
| 25 | Hospital accessibility | osm OSM+road-network | static | public API | Jan 1 OSM straight-line distance; fixed-speed minutes explicitly a proxy, not routed travel time. |
| 26 | Green-space accessibility | derived_access HLS+OSM+population | annual-derived | public API | Same-day observed green-cell proximity proxy; no population-weighted accessibility claim. |
| 27 | Critical-infrastructure density | osm OSM-2025-snapshot | static-reference | public API | Jan 1 mapped OSM infrastructure density, limited by mapping completeness. |
| 28 | Night-time lights | VNP46A2 2 | daily | 719 | Actual non-gap-filled NTL used; collection version corrected to 2. |
| 29 | Elevation / slope | NASADEM_HGT 001 | static | 9 | SRTM/NASADEM 2000-era reference; terrain slope uses geographic spacing. |
| 30 | Disaster exposure / readiness | composite Lupus-Cortex-v1 | derived | public API | BLOCKED: no validated preparedness observations/target definition. Neutral defaults removed. |

## Authentication and runtime evidence

- Public CMR collection/granule discovery succeeded without an Earthdata token.
- A real MERRA-2 science download returned HTTP 401 at Earthdata Login.
- OSM metadata endpoint succeeded, but geometry requests returned HTTP 403 in this environment. No OSM geometry values were inserted.
- No final observation CSV was manufactured from catalog entries or test fixtures.
- Docker Desktop and the user's n8n process are not reachable through the GitHub connector. The local setup must be run on the user's machine.

## Source corrections

- AIRX3STD 7.0 ended in 2016. AIRS3STD 7.0 returned 366 overlapping granules, including potential boundary-overlap granules that row-level filtering excludes.
- VNP46A2 uses CMR version `2`, not `002`.
- OPERA_L3_DSWX-HLS_V1 uses CMR version `1.0`, not `1`.
- Metadata queries for static GPW/NASADEM omit the 2025 filter. Actual reference epochs remain explicit.
- The selected GPM Final collection has metadata coverage only through September 2025. No early/late product is silently substituted.

## Official references

- [NASA CMR API](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html)
- [Earthaccess authentication](https://earthaccess.readthedocs.io/en/stable/user/howto/authenticate/)
- [Earthdata token management](https://urs.earthdata.nasa.gov/documentation/for_users/user_token)
- [Historical OSM API documentation](https://docs.ohsome.org/ohsome-api/v1/)
