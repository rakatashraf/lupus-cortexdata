from __future__ import annotations

from datetime import datetime, timedelta, timezone
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
            if not hits and len(batch) < page_size:
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
        component: Optional[str] = None,
        collection_name: Optional[str] = None,
        bbox: Optional[str] = None,
        platforms: Optional[list[str]] = None,
        instruments: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        component = (component or "").strip()
        collection_name = (collection_name or "").strip()

        if not component and not collection_name:
            raise ValueError("Provide a component/variable or a collection name.")

        common: list[tuple[str, str]] = [("has_granules", "true")]
        if component:
            common.append(("keyword", component))
        if bbox:
            common.append(("bounding_box", bbox))
        for p in platforms or []:
            if p.strip():
                common.append(("platform[]", p.strip()))
        for i in instruments or []:
            if i.strip():
                common.append(("instrument[]", i.strip()))

        searches: list[list[tuple[str, str]]] = []
        if collection_name:
            pattern = collection_name if "*" in collection_name or "?" in collection_name else f"*{collection_name}*"
            searches.append(
                common
                + [
                    ("entry_title[]", pattern),
                    ("options[entry_title][pattern]", "true"),
                    ("options[entry_title][ignore_case]", "true"),
                ]
            )
            searches.append(
                common
                + [
                    ("short_name[]", pattern),
                    ("options[short_name][pattern]", "true"),
                    ("options[short_name][ignore_case]", "true"),
                ]
            )
        else:
            searches.append(common)

        raw_items: list[dict[str, Any]] = []
        reported_hits = 0
        for params in searches:
            hits, batch = await self._all_pages("collections.umm_json", params)
            reported_hits += hits
            raw_items.extend(batch)

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
            title = umm.get("EntryTitle") or umm.get("ShortName")
            short_name = umm.get("ShortName")
            items.append(
                {
                    "concept_id": meta.get("concept-id"),
                    "provider": meta.get("provider-id"),
                    "short_name": short_name,
                    "version": umm.get("Version"),
                    "title": title,
                    "abstract": umm.get("Abstract") or umm.get("Purpose") or "",
                    "platforms": self._platforms(umm),
                    "instruments": self._instruments(umm),
                    "temporal_start": begin,
                    "temporal_end": end,
                    "processing_level": (umm.get("ProcessingLevel") or {}).get("Id"),
                    "cloud_hosted": bool(meta.get("cloud-hosted")),
                }
            )

        if collection_name:
            target = collection_name.casefold()

            def collection_rank(item: dict[str, Any]) -> tuple[int, str, str]:
                short_name = str(item.get("short_name") or "")
                title = str(item.get("title") or "")
                short_cf = short_name.casefold()
                title_cf = title.casefold()

                if short_cf == target:
                    priority = 0
                elif title_cf == target:
                    priority = 1
                elif short_cf.startswith(target):
                    priority = 2
                elif title_cf.startswith(target):
                    priority = 3
                elif target in short_cf:
                    priority = 4
                elif target in title_cf:
                    priority = 5
                else:
                    priority = 6

                return (priority, short_cf, title_cf)

            items.sort(key=collection_rank)

        satellite_groups: dict[str, int] = {}
        for item in items:
            platforms_for_item = item.get("platforms") or ["Unspecified platform"]
            for platform in platforms_for_item:
                satellite_groups[platform] = satellite_groups.get(platform, 0) + 1

        return {
            "hits": len(items),
            "reported_hits_before_deduplication": reported_hits,
            "retrieved": len(items),
            "items": items,
            "satellite_groups": dict(sorted(satellite_groups.items(), key=lambda x: x[0].lower())),
            "search_mode": "collection_name" if collection_name and not component else ("component_and_collection_name" if collection_name else "component"),
            "collection_name_query": collection_name or None,
            "component_query": component or None,
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

    async def variables_for_collection(
        self,
        collection_id: str,
    ) -> list[dict[str, Any]]:
        """Return UMM-Var records explicitly associated with one collection."""
        if not collection_id:
            return []

        try:
            _, items = await self._all_pages(
                "variables.umm_json",
                [
                    ("keyword", collection_id),
                    ("options[keyword][pattern]", "false"),
                ],
                page_size=2000,
            )
        except Exception:
            return []

        out: list[dict[str, Any]] = []
        for entry in items:
            associations = entry.get("associations") or {}
            collection_refs = associations.get("collections") or []

            associated = False
            for ref in collection_refs:
                if isinstance(ref, str) and ref == collection_id:
                    associated = True
                    break
                if isinstance(ref, dict):
                    concept_id = (
                        ref.get("concept-id")
                        or ref.get("concept_id")
                        or ref.get("conceptId")
                    )
                    if concept_id == collection_id:
                        associated = True
                        break
            if not associated:
                continue

            umm = entry.get("umm") or {}
            additional_ids = []
            for identifier in umm.get("AdditionalIdentifiers") or []:
                if isinstance(identifier, dict) and identifier.get("Identifier"):
                    additional_ids.append(str(identifier["Identifier"]))

            science_keywords = []
            for keyword in umm.get("ScienceKeywords") or []:
                if not isinstance(keyword, dict):
                    continue
                science_keywords.extend(
                    str(keyword.get(key) or "")
                    for key in (
                        "Category",
                        "Topic",
                        "Term",
                        "VariableLevel1",
                        "VariableLevel2",
                        "VariableLevel3",
                        "DetailedVariable",
                    )
                    if keyword.get(key)
                )

            out.append(
                {
                    "concept_id": (entry.get("meta") or {}).get("concept-id"),
                    "name": str(umm.get("Name") or ""),
                    "long_name": str(umm.get("LongName") or ""),
                    "standard_name": str(umm.get("StandardName") or ""),
                    "definition": str(umm.get("Definition") or ""),
                    "units": str(umm.get("Units") or ""),
                    "variable_type": str(umm.get("VariableType") or ""),
                    "additional_identifiers": additional_ids,
                    "science_keywords": science_keywords,
                }
            )
        return out


    async def granule_by_id(
        self,
        granule_id: str,
        collection_id: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        params: list[tuple[str, str]] = [
            ("concept_id[]", granule_id.strip()),
            ("downloadable", "true"),
            ("page_size", "1"),
        ]
        if collection_id:
            params.append(("collection_concept_id", collection_id.strip()))

        data = await self._get("granules.umm_json", params)
        items = data.get("items") or []
        if not items:
            return None
        return self._format_granule(items[0])

    async def granule_by_ur(
        self,
        granule_ur: str,
        collection_id: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        name = granule_ur.strip()
        if not name:
            return None
        params: list[tuple[str, str]] = [
            ("readable_granule_name[]", name),
            ("downloadable", "true"),
            ("page_size", "5"),
        ]
        if collection_id:
            params.append(("collection_concept_id", collection_id.strip()))

        data = await self._get("granules.umm_json", params)
        items = data.get("items") or []
        if not items:
            return None

        exact: Optional[dict[str, Any]] = None
        first: Optional[dict[str, Any]] = None
        for entry in items:
            formatted = self._format_granule(entry)
            if first is None:
                first = formatted
            if str(formatted.get("granule_ur") or "") == name:
                exact = formatted
                break
        return exact or first


    @staticmethod
    def _granule_cycle_summary(items: list[dict[str, Any]]) -> dict[str, Any]:
        timestamps: list[datetime] = []
        for item in items:
            value = item.get("begin")
            if not value:
                continue
            try:
                parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                timestamps.append(parsed.astimezone(timezone.utc))
            except Exception:
                continue

        unique = sorted(set(timestamps))
        if len(unique) < 2:
            return {
                "label": "Single/unknown",
                "interval_seconds": None,
                "detail": "Only one usable granule start timestamp is available, so granule cadence cannot be inferred.",
                "basis": "Granule start timestamps",
            }

        diffs = [
            (unique[i] - unique[i - 1]).total_seconds()
            for i in range(1, len(unique))
            if (unique[i] - unique[i - 1]).total_seconds() > 0
        ]
        if not diffs:
            return {
                "label": "Single/unknown",
                "interval_seconds": None,
                "detail": "No positive interval exists between granule start timestamps.",
                "basis": "Granule start timestamps",
            }

        diffs.sort()
        middle = len(diffs) // 2
        median = diffs[middle] if len(diffs) % 2 else (diffs[middle - 1] + diffs[middle]) / 2

        if median < 60:
            label = "Sub-minute"
            detail = f"About every {max(1, round(median))} second(s)"
        elif median < 45 * 60:
            minutes = max(1, round(median / 60))
            label = f"{minutes}-minute"
            detail = f"About every {minutes} minute(s)"
        elif median <= 90 * 60:
            label = "Hourly"
            detail = "About every 1 hour"
        elif median < 18 * 3600:
            hours = max(2, round(median / 3600))
            label = f"{hours}-hourly"
            detail = f"About every {hours} hours"
        elif median <= 36 * 3600:
            label = "Daily"
            detail = "About every 1 day"
        elif median < 25 * 86400:
            days = max(2, round(median / 86400))
            label = f"{days}-day"
            detail = f"About every {days} days"
        elif median <= 35 * 86400:
            label = "Monthly"
            detail = "About every 1 month"
        elif 330 * 86400 <= median <= 400 * 86400:
            label = "Yearly"
            detail = "About every 1 year"
        else:
            days = max(1, round(median / 86400))
            label = "Irregular/long-cycle"
            detail = f"Median granule interval is about {days} days"

        return {
            "label": label,
            "interval_seconds": median,
            "detail": detail,
            "basis": "Granule start timestamps",
        }

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
        fallback_relation: Optional[str] = None
        fallback_distance_days: Optional[float] = None
        fallback_target_date = end_date
        effective_start_date = start_date
        effective_end_date = end_date

        if not items and fallback_latest:
            target = datetime.fromisoformat(f"{end_date}T23:59:59+00:00")

            async def nearest_one(
                temporal: str,
                sort_key: str,
            ) -> Optional[dict[str, Any]]:
                data = await self._get(
                    "granules.umm_json",
                    base + [
                        ("temporal", temporal),
                        ("page_size", "1"),
                        ("sort_key[]", sort_key),
                    ],
                )
                raw = data.get("items") or []
                return self._format_granule(raw[0]) if raw else None

            prior = await nearest_one(
                f"1900-01-01T00:00:00Z,{target.strftime('%Y-%m-%dT%H:%M:%SZ')}",
                "-start_date",
            )
            future = await nearest_one(
                f"{(target + timedelta(seconds=1)).strftime('%Y-%m-%dT%H:%M:%SZ')},",
                "+start_date",
            )

            candidates: list[tuple[float, int, str, dict[str, Any]]] = []
            for relation, preference, candidate in (
                ("nearest_prior", 0, prior),
                ("nearest_future", 1, future),
            ):
                if not candidate or not candidate.get("begin"):
                    continue
                try:
                    parsed = datetime.fromisoformat(
                        str(candidate["begin"]).replace("Z", "+00:00")
                    )
                    if parsed.tzinfo is None:
                        parsed = parsed.replace(tzinfo=timezone.utc)
                    parsed = parsed.astimezone(timezone.utc)
                    distance = abs((parsed - target).total_seconds())
                    candidates.append((distance, preference, relation, candidate))
                except Exception:
                    continue

            if candidates:
                candidates.sort(key=lambda item: (item[0], item[1]))
                distance_seconds, _, fallback_relation, nearest = candidates[0]
                parsed = datetime.fromisoformat(
                    str(nearest["begin"]).replace("Z", "+00:00")
                )
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                fallback_date = parsed.astimezone(timezone.utc).date().isoformat()
                fallback_distance_days = round(distance_seconds / 86400.0, 3)

                fallback_temporal = (
                    f"{fallback_date}T00:00:00Z,"
                    f"{fallback_date}T23:59:59Z"
                )
                hits, items = await self._query_all_granules(
                    base,
                    fallback_temporal,
                    "+start_date",
                )
                if not items:
                    hits = 1
                    items = [nearest]

                fallback_used = bool(items)
                if fallback_used:
                    effective_start_date = fallback_date
                    effective_end_date = fallback_date

        cycle_summary = self._granule_cycle_summary(items)

        return {
            "hits": hits,
            "retrieved": len(items),
            "items": items,
            "granule_cycle": cycle_summary,
            "fallback_used": fallback_used,
            "fallback_date": fallback_date,
            "fallback_relation": fallback_relation,
            "fallback_distance_days": fallback_distance_days,
            "fallback_target_date": fallback_target_date,
            "requested_start_date": start_date,
            "requested_end_date": end_date,
            "effective_start_date": effective_start_date,
            "effective_end_date": effective_end_date,
            "fallback_reason": (
                (
                    "No granules matched the requested date range. "
                    f"The closest available data date to {fallback_target_date} "
                    f"was {fallback_date} ({fallback_relation}, "
                    f"{fallback_distance_days} day(s) away)."
                )
                if fallback_used
                else None
            ),
        }
