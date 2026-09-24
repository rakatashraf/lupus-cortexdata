from __future__ import annotations
import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from mcp.server.fastmcp import FastMCP
from earthdata_plugin import BBOX, TEMPORAL, SOURCES, NON_NASA, resolve, granules, run

mcp = FastMCP("Lupus Cortex NASA Earthdata")

@mcp.tool()
def auth_status() -> dict:
    """Return whether an Earthdata user token is configured, without exposing it."""
    return {"earthdata_token_configured": bool(os.getenv("EARTHDATA_TOKEN")), "bbox": BBOX, "temporal": TEMPORAL}

@mcp.tool()
def get_source_manifest() -> dict:
    """Return the 2025 NASA collection jobs and non-NASA dependencies for all 30 components."""
    return {"bbox": BBOX, "temporal": TEMPORAL, "nasa_sources": SOURCES, "non_nasa": NON_NASA}

@mcp.tool()
def resolve_collection(source_key: str) -> dict:
    """Resolve one Lupus Cortex source key to the active NASA CMR collection."""
    if source_key not in SOURCES: raise ValueError(f"Unknown source_key: {source_key}")
    return resolve(source_key)

@mcp.tool()
def list_2025_granules(source_key: str, limit: int = 100) -> dict:
    """List granules intersecting W89.24/S22.80/E91.31/N24.80 during calendar year 2025."""
    if source_key not in SOURCES: raise ValueError(f"Unknown source_key: {source_key}")
    limit=max(1,min(int(limit),2000)); rows=[]
    for g in granules(source_key):
        rows.append(g)
        if len(rows)>=limit: break
    return {"source_key":source_key,"count":len(rows),"granules":rows}

@mcp.tool()
def download_2025_source(source_key: str, output_dir: str = "earthdata_output") -> dict:
    """Download all 2025 granules for one configured NASA source. Requires EARTHDATA_TOKEN."""
    if source_key not in SOURCES: raise ValueError(f"Unknown source_key: {source_key}")
    return run([source_key], output_dir, False)

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
