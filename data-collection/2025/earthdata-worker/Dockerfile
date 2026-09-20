FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
# Distribution GDAL/rasterio includes HDF4 needed by MODIS. PyPI rasterio wheels often do not.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv python3-pip python3-rasterio gdal-bin libhdf4-alt-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv --system-site-packages /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -c "import rasterio; e=rasterio.Env(); e.__enter__(); assert any('HDF4' in d for d in e.drivers()), 'GDAL HDF4 driver missing'"
COPY . .
EXPOSE 8080
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
