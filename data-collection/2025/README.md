# Lupus Cortex: local 2025 collection repair

## Current status

The original pipeline has been repaired for local execution, resumable collection, metadata discovery, timestamps and honest coverage reporting. **This is not a completed 30-component training dataset.** No NASA science observations were downloaded during preparation: a real download request returned HTTP 401 without Earthdata credentials. Historical OSM geometry requests returned HTTP 403 from this environment. The public NASA catalog was queried successfully.

The selected sources also have scientific/coverage gaps that credentials alone cannot fix. See `SOURCE_AUDIT.md`. PM10, vulnerable-age percentage and disaster readiness require additional verified definitions/data. Full-year IMERG data are not currently present in the selected collection. A successful container start does not establish scientific completeness.

## Start on Windows 11

1. Extract this folder to `C:\LupusCortex2025` or another writable folder. Start Docker Desktop in Linux-container mode.
2. Open PowerShell in the extracted folder and run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\Start-Local.ps1
   ```

3. On first launch, the script creates a local `.env` and opens it in Notepad. Enter a valid NASA Earthdata token after `EARTHDATA_TOKEN=`. Save and close. Keep your token local. Alternatively leave the token empty and set the Earthdata username/password pair.
4. The launcher starts collection automatically after the worker becomes healthy and credentials are configured. Progress opens in your browser. Open **http://localhost:5679** to create the n8n owner account. The workflow is imported automatically when possible. If it is absent, import `n8n/workflow.json` using the editor's Import from File command.
5. For troubleshooting instead of automatic full collection, start services with `docker compose up -d --build` and run a one-granule-per-source smoke test:

   ```powershell
   Invoke-RestMethod -Method Post http://localhost:8089/smoke
   Invoke-RestMethod http://localhost:8089/status | ConvertTo-Json -Depth 10
   ```

6. Inspect failed sources and coverage. You can also execute **Lupus Cortex 2025 - Resume local collection** in n8n. It starts the full collection and polls the worker. Closing your browser does not cancel the worker. Keep Docker and the computer awake.

Ports 5679/8089 and a separate Compose project avoid replacing your existing n8n installation. This package does not operate your laptop through GitHub. It must be started on that laptop.

### Token failure

The original `Token does not exist` exception came from an authenticated catalog request. Public discovery now runs without the token. Download authentication remains mandatory. Refresh a revoked/expired token in your local `.env`, then run:

```powershell
docker compose up -d --force-recreate earthdata-worker
```

Execute the workflow again to resume. Credentials are never stored inside the workflow JSON. Some NASA providers require Earthdata application/EULA authorization in the browser before downloads succeed.

## One continually updated output

**`local-files/lupus_cortex_2025_actual.csv`** is the only published observation file. It appears only after actual source values are committed, and is replaced atomically at checkpoints and at the end of each product. Do not leave it open in Excel while collecting. It may be much larger than Excel's row limit; load it in chunks in Python.

Each row is one native observation or explicitly labeled derivation. Columns include:

- Date, start/end UTC timestamps, original source timestamp, and the basis used to construct each period.
- Latitude, longitude, grid cell, component ID/name, subvariable, value and source unit.
- Native cadence plus `temporal_type` (time_cycle, daily, monthly, yearly, composite, scene, static_reference) and nominal seconds when applicable.
- Source product, actual selected version, granule, native spatial resolution, reference year, QA and derivation notes.
- `data_kind` distinguishes source observations, derivations, proxies, derivation inputs and static references.
- `feature_id` keeps distinct products, units, pressure/pass variables and versions separate.

This is a **long observation table**, not a dense 30-column feature matrix. It preserves the different source time scales without inventing minute/second observations. Monthly values are not duplicated as independent daily observations. Older demographic/topographic layers keep their original acquisition/reference epoch. Static OSM reference uses **January 1, 2025**, avoiding the original December snapshot being applied retrospectively to January.

`local-files/work/` holds internal SQLite checkpoints, catalog responses, coverage status and logs. It is not an additional published training dataset. Retain it to resume. A failed job keeps all previously committed values. Changing the study area or processing configuration requires a new work directory to prevent mixing incompatible data.

## Data readiness and model use

A `partial` result is intentional when source/definition gaps remain. **Do not treat presence of all component IDs as proof of complete annual coverage.** Inspect `coverage`, dates, QA, gaps and proxies in `/status`. The current configuration does not certify `training_ready=true`.

Before fitting Random Forest/LSTM models:

1. Resolve the blocked components and validate the scientific adapters against representative downloaded granules.
2. Choose a common analysis grid appropriate to the coarsest relevant data, or explicitly model multi-resolution inputs. Assigning a coarse observation to a 0.01-degree cell does not downscale it.
3. Choose approved feature IDs and units; separate atmospheric columns from surface concentrations. Exclude `derivation_input` rows and unapproved proxies.
4. Aggregate observations using their period semantics. Rainfall accumulation requires all 48 distinct half-hour slots; a missing period is not zero rain. Observation times and publication times are different, and real-time forecasting requires release-lag handling.
5. Define the target and forecast horizon. Split chronologically before fitting scalers, imputers, thresholds or models. Keep a missingness mask. Do not interpolate through a held-out future period.

The supplied CSV is the input to this preparation; it cannot truthfully be called ready for immediate full 30-component training until these gaps are resolved.

## Monitoring and recovery

```powershell
Invoke-RestMethod http://localhost:8089/status | ConvertTo-Json -Depth 10
Invoke-RestMethod http://localhost:8089/preflight
# Public catalog inventory only, without science downloads:
Invoke-RestMethod -Method Post http://localhost:8089/inventory
# Follow container logs:
docker compose logs -f earthdata-worker
# Stop while keeping checkpoints and n8n data:
docker compose down
# Resume services, then execute the workflow again:
docker compose up -d
```

`/result` downloads the latest available CSV checkpoint, which can be partial. `/logs` returns recent redacted log text. Actual worker logs remain at `local-files/work/pipeline.log`. Smoke-test observations stay in their own directory and do not contaminate the full run.

## Validation performed

- 20 regression tests passed for CMR pagination without credentials, exact versions, static-layer searches, UTC time windows, invalid values, transaction rollback/replay, rainfall coverage, past-only thresholds, raster QA/geolocation, worker endpoints/restarts, collector resume and workflow graph integrity.
- Live CMR catalog checks completed; corrected AIRS/VIIRS/OPERA searches returned granules.
- Real NASA download attempt returned 401. Public OSM geometry attempt returned 403.
- Docker is unavailable in the execution environment, so the images and the n8n import were **not** run end-to-end. The Docker build checks that HDF4 support exists rather than failing silently on MODIS.
- Scientific adapters still require real-granule verification across products. MAIAC keeps all raster bands separate at the daily product window; exact per-orbit timestamps are not inferred. Source QA and units must be confirmed against collection documentation.

To rerun tests in an environment with dependencies: `python -m pytest -q tests` (install pytest separately). Synthetic fixtures exist only inside tests and are never copied into the observation file.
