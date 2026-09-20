from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

import httpx

CMR = "https://cmr.earthdata.nasa.gov/search"
CMR_PAGE_SIZE = 2000


class CMRClient:
    def __init__(self, token: str):
        self.token = token.strip()
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "Client-Id": "earthdata-csv-downloader",
            "User-Agent": "EarthdataCSVDownloader/1.2",
        }

    async def _get(self, path: str, params: list[tuple[str, str]]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=90, follow_redirects=True) as client:
            r = await client.get(f"{CMR}/{path}", params=params, headers=self.headers)
        r.raise_for_status()
        return r.json()

    async def _all_pages(
        self,
        path: str,
        params: list[tuple[str, str]],
        page_size: int = CMR_PAGE_SIZE,
    ) -> tuple[int, list[dict[str, Any]]]:
        page_size = max(1, min(int(page_size), CMR_PAGE_SIZE))
        page_num = 1
        hits: Optional[int] = None
        all_items: list[dict[str, Any]] = []

        while True:
            page_params = list(params) + [
                ("page_size", str(page_size)),
                ("page_num", str(page_num)),
            ]
            data = await self._get(path, page_params)

            if hits is None:
                try:
                    hits = int(data.get("hits", 0))
                except Exception:
                    hits = 0

            batch = data.get("items") or []
            if not batch:
                break

            all_items.extend(batch)

            if hits and len(all_items) >= hits:
                break
            if len(batch) < page_size:
                break

            page_num += 1

        return hits if hits is not None else len(all_items), all_items

    async def validate(self) -> dict[str, Any]:
        try:
            data = await self._get(
                "collections.umm_json",
                [("page_size", "1"), ("has_granules", "true")],
            )
            return {"valid": True, "hits": data.get("hits", 0)}
        except httpx.HTTPStatusError as exc:
            code = exc.response.status_code
            return {
                "valid": False,
                "status": code,
                "message": "Earthdata rejected the token." if code in (401, 403) else f"NASA CMR returned HTTP {code}.",
            }

    @staticmethod
    def _platforms(umm: dict[str, Any]) -> list[str]:
        out: list[str] = []
        for p in umm.get("Platforms") or []:
            n = p.get("ShortName") or p.get("LongName")
            if n and n not in out:
                out.append(n)
        return out

    @staticmethod
    def _instruments(umm: dict[str, Any]) -> list[str]:
        out: list[str] = []
        for p in umm.get("Platforms") or []:
            for i in p.get("Instruments") or []:
                n = i.get("ShortName") or i.get("LongName")
                if n and n not in out:
                    out.append(n)
        return out

    @staticmethod
    def _collection_time(umm: dict[str, Any]) -> tuple[Optional[str], Optional[str]]:
        starts: list[str] = []
        ends: list[str] = []
        for extent in umm.get("TemporalExtents") or []:
            for r in extent.get("RangeDateTimes") or []:
                if r.get("BeginningDateTime"):
                    starts.append(r["BeginningDateTime"])
                if r.get("EndingDateTime"):
                    ends.append(r["EndingDateTime"])
            for s in extent.get("SingleDateTimes") or []:
                if s:
                    starts.append(s)
                    ends.append(s)
        return (min(starts) if starts else None, max(ends) if ends else None)

    async def collections(
        self,
        component: str,
        bbox: Optional[str] = None,
        platforms: Optional[list[str]] = None,
        instruments: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        params: list[tuple[str, str]] = [
            ("keyword", component.strip()),
            ("has_granules", "true"),
        ]
        if bbox:
            params.append(("bounding_box", bbox))
        for p in platforms or []:
            if p.strip():
                params.append(("platform[]", p.strip()))
        for i in instruments or []:
            if i.strip():
                params.append(("instrument[]", i.strip()))

        hits, raw_items = await self._all_pages("collections.umm_json", params)

        items: list[dict[str, Any]] = []
        seen: set[str] = set()

        for entry in raw_items:
            meta = entry.get("meta") or {}
            umm = entry.get("umm") or {}
            concept_id = str(meta.get("concept-id") or "")
            if concept_id and concept_id in seen:
                continue
            if concept_id:
                seen.add(concept_id)

            begin, end = self._collection_time(umm)
            items.append(
                {
                    "concept_id": meta.get("concept-id"),
                    "provider": meta.get("provider-id"),
                    "short_name": umm.get("ShortName"),
                    "version": umm.get("Version"),
                    "title": umm.get("EntryTitle") or umm.get("ShortName"),
                    "abstract": umm.get("Abstract") or umm.get("Purpose") or "",
                    "platforms": self._platforms(umm),
                    "instruments": self._instruments(umm),
                    "temporal_start": begin,
                    "temporal_end": end,
                    "processing_level": (umm.get("ProcessingLevel") or {}).get("Id"),
                    "cloud_hosted": bool(meta.get("cloud-hosted")),
                }
            )

        satellite_groups: dict[str, int] = {}
        for item in items:
            platforms_for_item = item.get("platforms") or ["Unspecified platform"]
            for platform in platforms_for_item:
                satellite_groups[platform] = satellite_groups.get(platform, 0) + 1

        return {
            "hits": hits,
            "retrieved": len(items),
            "items": items,
            "satellite_groups": dict(sorted(satellite_groups.items(), key=lambda x: x[0].lower())),
        }

    @staticmethod
    def _download_urls(umm: dict[str, Any]) -> list[str]:
        scored: list[tuple[int, str]] = []
        for item in umm.get("RelatedUrls") or []:
            url = str(item.get("URL") or "")
            if not url.lower().startswith(("http://", "https://")):
                continue

            typ = str(item.get("Type") or "").upper()
            subtype = str(item.get("Subtype") or "").upper()
            desc = str(item.get("Description") or "").upper()

            if "GET DATA" not in typ and "DOWNLOAD" not in subtype and "DOWNLOAD" not in desc:
                continue

            lower = url.lower()
            if any(x in lower for x in ("opendap", "dods", "metadata", ".xml")):
                score = 5
            elif any(lower.split("?")[0].endswith(ext) for ext in (
                ".nc", ".nc4", ".cdf", ".h5", ".hdf5", ".he5", ".hdf",
                ".tif", ".tiff", ".csv", ".tsv", ".json", ".geojson", ".zip", ".gz"
            )):
                score = 0
            else:
                score = 2
            scored.append((score, url))

        out: list[str] = []
        seen: set[str] = set()
        for _, url in sorted(scored, key=lambda x: x[0]):
            if url not in seen:
                seen.add(url)
                out.append(url)
        return out

    def _format_granule(self, entry: dict[str, Any]) -> dict[str, Any]:
        meta = entry.get("meta") or {}
        umm = entry.get("umm") or {}
        extent = (umm.get("TemporalExtent") or {}).get("RangeDateTime") or {}
        urls = self._download_urls(umm)
        dg = umm.get("DataGranule") or {}

        return {
            "concept_id": meta.get("concept-id"),
            "granule_ur": umm.get("GranuleUR"),
            "begin": extent.get("BeginningDateTime"),
            "end": extent.get("EndingDateTime"),
            "production_date": dg.get("ProductionDateTime"),
            "size_mb": dg.get("SizeMBDataGranule"),
            "platforms": self._platforms(umm),
            "instruments": self._instruments(umm),
            "download_urls": urls,
            "primary_url": urls[0] if urls else None,
        }

    async def _query_all_granules(
        self,
        base: list[tuple[str, str]],
        temporal: Optional[str],
        sort_key: str,
    ) -> tuple[int, list[dict[str, Any]]]:
        params = list(base)
        if temporal:
            params.append(("temporal", temporal))
        params.append(("sort_key[]", sort_key))

        hits, raw_items = await self._all_pages(
            "granules.umm_json",
            params,
            page_size=CMR_PAGE_SIZE,
        )

        items: list[dict[str, Any]] = []
        seen: set[str] = set()

        for entry in raw_items:
            formatted = self._format_granule(entry)
            concept_id = str(formatted.get("concept_id") or "")
            if concept_id and concept_id in seen:
                continue
            if concept_id:
                seen.add(concept_id)
            items.append(formatted)

        return hits, items

    async def granules(
        self,
        collection_id: str,
        bbox: str,
        start_date: str,
        end_date: str,
        platform: Optional[str] = None,
        instrument: Optional[str] = None,
        fallback_latest: bool = True,
    ) -> dict[str, Any]:
        base: list[tuple[str, str]] = [
            ("collection_concept_id", collection_id),
            ("bounding_box", bbox),
            ("downloadable", "true"),
        ]
        if platform:
            base.append(("platform[]", platform))
        if instrument:
            base.append(("instrument[]", instrument))

        requested_temporal = f"{start_date}T00:00:00Z,{end_date}T23:59:59Z"
        hits, items = await self._query_all_granules(
            base,
            requested_temporal,
            "+start_date",
        )

        fallback_used = False
        fallback_date: Optional[str] = None

        if not items and fallback_latest:
            latest_data = await self._get(
                "granules.umm_json",
                base + [
                    ("page_size", "1"),
                    ("sort_key[]", "-start_date"),
                ],
            )
            latest_raw = latest_data.get("items") or []

            if latest_raw:
                latest = self._format_granule(latest_raw[0])
                latest_begin = latest.get("begin")

                if latest_begin:
                    try:
                        parsed = datetime.fromisoformat(str(latest_begin).replace("Z", "+00:00"))
                        if parsed.tzinfo is None:
                            parsed = parsed.replace(tzinfo=timezone.utc)
                        fallback_date = parsed.date().isoformat()
                        fallback_temporal = f"{fallback_date}T00:00:00Z,{fallback_date}T23:59:59Z"
                        hits, items = await self._query_all_granules(
                            base,
                            fallback_temporal,
                            "+start_date",
                        )
                    except Exception:
                        hits = 1
                        items = [latest]
                else:
                    hits = 1
                    items = [latest]

                fallback_used = bool(items)

        return {
            "hits": hits,
            "retrieved": len(items),
            "items": items,
            "fallback_used": fallback_used,
            "fallback_date": fallback_date,
            "fallback_reason": (
                "No data matched the requested dates, so all granules available on the most recent data date were returned."
                if fallback_used
                else None
            ),
        }
