FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    EARTHDATA_RUNTIME_PROFILE=persistent

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    libhdf4-alt-dev \
    libhdf5-dev \
    libnetcdf-dev \
    libgdal-dev \
    gdal-bin \
    libjpeg-dev \
    zlib1g-dev \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && pip install -r requirements.txt

COPY app ./app
COPY static ./static

EXPOSE 8000
CMD ["sh","-c","uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
