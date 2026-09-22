# Lupus Cortex Earthdata MCP

Remote MCP connector for the Lupus Cortex 2025 NASA data acquisition workflow.

## Fixed scope
- West: 89.24
- South: 22.80
- East: 91.31
- North: 24.80
- Time: 2025-01-01T00:00:00Z through 2025-12-31T23:59:59Z

## Security
Set `EARTHDATA_TOKEN` as a deployment secret. Never commit an Earthdata password or token.

## Tools
- `earthdata_status`
- `search_2025_granules`
- `download_2025_granule_urls`
- `list_downloaded_files`

CMR metadata search does not require authentication. Data downloads do.

## ChatGPT
Deploy the service, then add `https://<host>/mcp` as a custom MCP connector in ChatGPT developer mode.

## Important
This connector handles authenticated discovery/download. Product-specific HDF5/NetCDF/GeoTIFF QA filtering, scale factors,
spatial aggregation, temporal harmonization, derived indicators and final model CSV generation belong in the downstream
Lupus Cortex ETL worker and should not be faked inside generic download code.
