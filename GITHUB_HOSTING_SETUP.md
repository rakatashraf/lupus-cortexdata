# GitHub-hosted Earthdata downloader

This branch is the GitHub-native replacement for the previous Vercel deployment.

## Architecture

- **GitHub Issue Form** is the user interface.
- **GitHub Actions** performs NASA discovery, HDF/NetCDF/GeoTIFF conversion, strict component filtering, closest-date fallback, ground-data fusion, and CSV merging.
- **GitHub Actions artifacts** deliver the final CSV and `job_report.json`.
- Heavy processing runs on a normal GitHub-hosted Linux runner with native HDF4/HDF5/NetCDF/GDAL libraries instead of Vercel serverless functions.
- NASA credentials are read only from the encrypted repository secret `EARTHDATA_TOKEN`.

## Start a job

Open:

https://github.com/rakatashraf/lupus-cortexdata/issues/new?template=earthdata-job.yml

Fill in components, NASA collection concept IDs, bbox, dates, fallback behavior, workers, ground-data preference and output filename, then submit the issue.

Submitting an issue whose title starts with `[Earthdata Job]` triggers:

`.github/workflows/earthdata-github-runner.yml`

The workflow checks out this `github-hosted` branch, installs the native scientific libraries, performs the conversion and uploads the result as a workflow artifact. A completion comment is added to the issue with the run link.

## Required repository secret

Repository setting:

**Settings → Secrets and variables → Actions → New repository secret**

Name:

`EARTHDATA_TOKEN`

Value:

your NASA Earthdata bearer token.

Optional ground-air-quality enrichment uses:

`OPENAQ_API_KEY`

## Vercel retirement

This branch contains no `vercel.json` and no Pages deployment workflow. The downloader no longer depends on Vercel.

The old Vercel project itself must be deleted from the Vercel dashboard because the connected Vercel API available to ChatGPT does not expose project deletion.
