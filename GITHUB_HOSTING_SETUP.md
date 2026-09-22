# GitHub-hosted Earthdata downloader

This branch is the GitHub-native replacement for the previous Vercel deployment.

## Architecture

- GitHub Pages hosts the static configuration UI from `earthdata-downloader/github_site/`.
- GitHub Issues are used as non-secret processing job requests.
- GitHub Actions runs `.github/workflows/earthdata-github-runner.yml` from the default branch.
- The Actions runner checks out `github-hosted`, installs native HDF4/HDF5/NetCDF/GDAL libraries, downloads NASA granules, converts them, combines the CSV, and uploads the result as an Actions artifact.
- NASA credentials are read only from the repository secret `EARTHDATA_TOKEN`.

## One-time GitHub settings

1. Open repository **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open **Settings → Secrets and variables → Actions**.
4. Add repository secret **EARTHDATA_TOKEN** containing the NASA Earthdata token.
5. Optional: add **OPENAQ_API_KEY** for ground-data enrichment.

After Pages is enabled, rerun the workflow **Deploy Earthdata UI to GitHub Pages** or push any change to `earthdata-downloader/github_site/`.

Expected Pages URL:

`https://rakatashraf.github.io/lupus-cortexdata/`

## Vercel retirement

The `github-hosted` branch no longer contains `vercel.json`.

After GitHub Pages is live, delete the old Vercel project from the Vercel dashboard to remove the previous deployment completely.
