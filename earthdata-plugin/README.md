# NASA Earthdata plugin for Lupus Cortex

This branch adds an isolated NASA Earthdata acquisition plugin for the 2025 Lupus Cortex training dataset. It does not alter the current frontend.

**Fixed scope:** 2025-01-01 through 2025-12-31 UTC; bbox W 89.24, S 22.80, E 91.31, N 24.80. The supplied `24.80, 91.31` corner is northeast, not northwest.

The connector uses NASA CMR to resolve collections and enumerate every granule intersecting the bbox and time range, then downloads authenticated assets using an `EARTHDATA_TOKEN` secret. It never accepts an Earthdata password in source code or chat.

The manifest contains 20 unique NASA collection jobs supporting the 30 indicators. Components 21-27 and part of 30 require SEDAC/OSM/GTFS/official GIS or derived features, so the plugin explicitly marks them instead of inventing NASA granules for variables NASA does not measure.

## Files

- `earthdata_plugin.py`: CMR resolver, 2025 granule inventory, resumable authenticated downloader and job reporting.
- `mcp_server.py`: streamable-HTTP MCP interface for ChatGPT/custom MCP clients.
- `.env.example`: required secret name only.
- `requirements.txt`: minimal dependencies.
- `.github/workflows/earthdata-2025-raw-download.yml`: manual worker fallback using a GitHub Actions secret named `EARTHDATA_TOKEN`.

## Run locally

```bash
pip install -r earthdata-plugin/requirements.txt
python earthdata-plugin/earthdata_plugin.py --inventory-only --source gpm_imerg
EARTHDATA_TOKEN='stored-securely' python earthdata-plugin/earthdata_plugin.py --source gpm_imerg
python earthdata-plugin/mcp_server.py
```

The raw-granule downloader is intentionally separate from scientific conversion to the final training CSV. MODIS/HLS/SMAP/OPERA/Black Marble products require product-specific QA flags, scale factors and projections; those should be validated before their values enter model training rather than silently mis-parsed for the sake of producing a very confident-looking bad CSV.
