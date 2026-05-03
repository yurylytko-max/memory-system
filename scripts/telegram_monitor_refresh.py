#!/usr/bin/env python3
import argparse
import asyncio
import base64
import difflib
import json
import os
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SNAPSHOT_PATH = ROOT / "app" / "tools" / "telegram-monitor" / "snapshot-data.json"
SESSION_PATH = ROOT / ".tmp" / "telegram.session"
SIMULTANEOUS_WINDOW_SECONDS = 180
DIRECT_IMPORT_SIMILARITY = 0.88
MATCH_THRESHOLD = 0.88


def now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat()


def parse_dt(value):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def normalize_text(value: str) -> str:
    return " ".join((value or "").lower().split())


def text_similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, a, b).ratio()


def load_snapshot(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_snapshot(path: Path, snapshot: dict) -> None:
    path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")


def ensure_session() -> None:
    encoded = os.environ.get("TELEGRAM_SESSION_BASE64", "").strip()
    if not encoded:
        raise SystemExit("Missing TELEGRAM_SESSION_BASE64 secret.")
    SESSION_PATH.parent.mkdir(parents=True, exist_ok=True)
    SESSION_PATH.write_bytes(base64.b64decode(encoded))


def credentials() -> tuple[int, str]:
    api_id = os.environ.get("TELEGRAM_API_ID", "").strip()
    api_hash = os.environ.get("TELEGRAM_API_HASH", "").strip()
    if not api_id or not api_hash:
        raise SystemExit("Missing TELEGRAM_API_ID or TELEGRAM_API_HASH secrets.")
    return int(api_id), api_hash


async def collect_with_telethon(snapshot: dict, group: str, limit: int, days: int) -> dict:
    from telethon import TelegramClient
    from telethon.tl.functions.channels import GetFullChannelRequest

    ensure_session()
    api_id, api_hash = credentials()
    started_at = now()
    cutoff = started_at - timedelta(days=days)
    sources = [
        source for source in snapshot.get("sources", [])
        if source.get("username") and (group == "ALL" or source.get("group_code") == group)
    ]
    posts_by_key = {
        (post.get("source_id"), str(post.get("telegram_message_id"))): post
        for post in snapshot.get("posts", [])
    }
    source_snapshots = snapshot.setdefault("source_snapshots", [])
    errors = snapshot.setdefault("errors", [])
    added = 0
    updated = 0
    snapshots_added = 0
    processed = 0

    async with TelegramClient(str(SESSION_PATH), api_id, api_hash) as client:
        for source in sources:
            username = source.get("username")
            subscribers = None
            try:
                entity = await client.get_entity(username)
                try:
                    full = await client(GetFullChannelRequest(entity))
                    subscribers = getattr(full.full_chat, "participants_count", None)
                except Exception as exc:
                    errors.append({
                        "id": len(errors) + 1,
                        "run_id": None,
                        "source_id": source.get("id"),
                        "source_url": source.get("url"),
                        "stage": "source_snapshot",
                        "error_type": exc.__class__.__name__,
                        "message": str(exc),
                        "traceback": "",
                        "created_at": iso(now()),
                    })

                source["latest_subscribers"] = subscribers
                source["latest_subscribers_at"] = iso(started_at) if subscribers is not None else source.get("latest_subscribers_at")
                source_snapshots.append({
                    "id": len(source_snapshots) + 1,
                    "source_id": source.get("id"),
                    "collected_at": iso(started_at),
                    "subscribers": subscribers,
                    "title": getattr(entity, "title", None) or source.get("title"),
                    "username": getattr(entity, "username", None) or username,
                    "status": "collected" if subscribers is not None else "unavailable",
                    "source_title": source.get("title"),
                    "group_code": source.get("group_code"),
                })
                snapshots_added += 1

                async for message in client.iter_messages(entity, limit=limit):
                    published = message.date.astimezone(timezone.utc).replace(microsecond=0)
                    if published < cutoff:
                        break
                    text = message.message or ""
                    if not text and not getattr(message, "media", None):
                        continue
                    key = (source.get("id"), str(message.id))
                    clean = normalize_text(text)
                    post = posts_by_key.get(key)
                    payload = {
                        "source_id": source.get("id"),
                        "telegram_message_id": str(message.id),
                        "post_url": f"https://t.me/{username}/{message.id}",
                        "published_at": iso(published),
                        "collected_at": iso(started_at),
                        "text": text,
                        "text_clean": clean,
                        "views": getattr(message, "views", None),
                        "subscribers": subscribers,
                        "is_forward": 1 if getattr(message, "forward", None) else 0,
                        "forward_source_url": "",
                        "has_media": 1 if getattr(message, "media", None) else 0,
                        "language": "",
                        "source_title": source.get("title"),
                        "group_code": source.get("group_code"),
                    }
                    if post is None:
                        payload["id"] = max([p.get("id", 0) for p in snapshot.get("posts", [])] + [0]) + 1
                        snapshot.setdefault("posts", []).append(payload)
                        posts_by_key[key] = payload
                        added += 1
                    else:
                        changed = False
                        for field, value in payload.items():
                            if field == "text" and post.get("text"):
                                continue
                            if post.get(field) != value:
                                post[field] = value
                                changed = True
                        if changed:
                            updated += 1
                processed += 1
            except Exception as exc:
                errors.append({
                    "id": len(errors) + 1,
                    "run_id": None,
                    "source_id": source.get("id"),
                    "source_url": source.get("url"),
                    "stage": "telethon_collect",
                    "error_type": exc.__class__.__name__,
                    "message": str(exc),
                    "traceback": "",
                    "created_at": iso(now()),
                })

    run = {
        "id": max([row.get("id", 0) for row in snapshot.get("runs", [])] + [0]) + 1,
        "run_type": "github_actions_telethon",
        "status": "success",
        "started_at": iso(started_at),
        "finished_at": iso(now()),
        "sources_total": len(sources),
        "sources_processed": processed,
        "posts_added": added,
        "posts_updated": updated,
        "snapshots_added": snapshots_added,
        "matches_added": 0,
        "matches_updated": 0,
        "chains_built": 0,
        "errors_count": len([e for e in errors if e.get("created_at", "") >= iso(started_at)]),
        "notes": f"scheduled group={group}; limit={limit}; days={days}",
    }
    snapshot.setdefault("runs", []).insert(0, run)
    snapshot["runs"] = snapshot["runs"][:100]
    snapshot["errors"] = errors[-200:]
    return run


def connected_components(edges: list[tuple[int, int, float]]) -> list[set[int]]:
    graph = defaultdict(set)
    for a, b, _score in edges:
        graph[a].add(b)
        graph[b].add(a)
    seen = set()
    components = []
    for start in graph:
        if start in seen:
            continue
        queue = deque([start])
        seen.add(start)
        component = set()
        while queue:
            item = queue.popleft()
            component.add(item)
            for nxt in graph[item]:
                if nxt not in seen:
                    seen.add(nxt)
                    queue.append(nxt)
        if len(component) > 1:
            components.append(component)
    return components


def rebuild_matches_and_clusters(snapshot: dict) -> None:
    posts = [p for p in snapshot.get("posts", []) if len(p.get("text_clean") or "") >= 80]
    matches = []
    edges = []
    for i, a in enumerate(posts):
        for b in posts[i + 1:]:
            if a.get("source_id") == b.get("source_id"):
                continue
            score = text_similarity(a.get("text_clean") or "", b.get("text_clean") or "")
            if score < MATCH_THRESHOLD:
                continue
            match = {
                "id": len(matches) + 1,
                "post_id_a": a.get("id"),
                "post_id_b": b.get("id"),
                "similarity": round(score, 6),
                "match_type": "exact" if score >= 0.995 else "near_duplicate",
                "created_at": iso(now()),
                "source_a": a.get("source_title"),
                "group_a": a.get("group_code"),
                "source_b": b.get("source_title"),
                "group_b": b.get("group_code"),
            }
            matches.append(match)
            edges.append((a.get("id"), b.get("id"), score))
    post_by_id = {p.get("id"): p for p in snapshot.get("posts", [])}
    clusters = []
    cluster_posts = []
    for component in connected_components(edges):
        rows = [post_by_id[p] for p in component if p in post_by_id]
        rows.sort(key=lambda p: parse_dt(p.get("published_at")) or datetime.max.replace(tzinfo=timezone.utc))
        first = rows[0]
        groups = {row.get("group_code") for row in rows}
        by_rows = [row for row in rows if row.get("group_code") == "BY"]
        ru_rows = [row for row in rows if row.get("group_code") == "RU"]
        by_views = sum(row.get("views") or 0 for row in by_rows)
        ru_views = sum(row.get("views") or 0 for row in ru_rows)
        total_views = by_views + ru_views
        first_group = first.get("group_code") or "UNKNOWN"
        if groups == {"BY"}:
            direction = "BY_ONLY"
            group_mix = "BY_ONLY"
            ru_import_type = "by_native"
        elif groups == {"RU"}:
            direction = "RU_ONLY"
            group_mix = "RU_ONLY"
            ru_import_type = None
        else:
            group_mix = "MIXED"
            direction = "RU_TO_BY" if first_group == "RU" else "BY_TO_RU" if first_group == "BY" else "UNKNOWN"
            ru_import_type = "direct_ru_import" if direction == "RU_TO_BY" else "by_to_ru" if direction == "BY_TO_RU" else "mixed_or_unknown"
        cluster = {
            "id": len(clusters) + 1,
            "period_start": None,
            "period_end": None,
            "first_post_id": first.get("id"),
            "first_source_id": first.get("source_id"),
            "first_seen_at": first.get("published_at"),
            "title": (first.get("text_clean") or first.get("text") or "")[:120],
            "status": "active",
            "source_type": "earliest_observed",
            "source_confidence": "medium",
            "group_mix": group_mix,
            "direction": direction,
            "first_group": first_group,
            "posts_count": len(rows),
            "sources_count": len({row.get("source_id") for row in rows}),
            "by_posts_count": len(by_rows),
            "ru_posts_count": len(ru_rows),
            "by_sources_count": len({row.get("source_id") for row in by_rows}),
            "ru_sources_count": len({row.get("source_id") for row in ru_rows}),
            "by_views": by_views,
            "ru_views": ru_views,
            "total_views": total_views,
            "total_views_without_ru": by_views,
            "total_views_only_ru": ru_views,
            "total_subscribers": None,
            "total_subscribers_without_ru": None,
            "total_subscribers_only_ru": None,
            "views_to_subscribers_ratio": None,
            "views_to_subscribers_ratio_without_ru": None,
            "views_to_subscribers_ratio_only_ru": None,
            "ru_import_type": ru_import_type,
            "first_source": first.get("source_title"),
            "first_source_group": first_group,
            "created_at": iso(now()),
            "updated_at": iso(now()),
        }
        clusters.append(cluster)
        first_dt = parse_dt(first.get("published_at"))
        for row in rows:
            row_dt = parse_dt(row.get("published_at"))
            lag = int((row_dt - first_dt).total_seconds()) if row_dt and first_dt else None
            cluster_posts.append({
                "id": len(cluster_posts) + 1,
                "cluster_id": cluster["id"],
                "post_id": row.get("id"),
                "source_id": row.get("source_id"),
                "role": "first" if row.get("id") == first.get("id") else "related",
                "relation_type": "near_text_match",
                "published_at": row.get("published_at"),
                "lag_seconds": lag,
                "views": row.get("views"),
                "subscribers": row.get("subscribers"),
                "post_url": row.get("post_url"),
                "telegram_message_id": row.get("telegram_message_id"),
                "text_clean": row.get("text_clean"),
                "text": row.get("text"),
                "source_title": row.get("source_title"),
                "group_code": row.get("group_code"),
            })
    for match in matches:
        for cp in cluster_posts:
            if cp["post_id"] == match["post_id_a"]:
                match["cluster_a_id"] = cp["cluster_id"]
            if cp["post_id"] == match["post_id_b"]:
                match["cluster_b_id"] = cp["cluster_id"]
    snapshot["matches"] = matches
    snapshot["clusters"] = clusters
    snapshot["cluster_posts"] = cluster_posts


def rebuild_channel_analytics(snapshot: dict) -> None:
    posts_by_source = defaultdict(list)
    for post in snapshot.get("posts", []):
        posts_by_source[post.get("source_id")].append(post)
    cluster_posts = snapshot.get("cluster_posts", [])
    clusters_by_id = {cluster.get("id"): cluster for cluster in snapshot.get("clusters", [])}
    analytics = []
    daily = []
    for source in snapshot.get("sources", []):
        source_posts = sorted(posts_by_source[source.get("id")], key=lambda p: p.get("published_at") or "")
        views = [post.get("views") or 0 for post in source_posts]
        involved = [cp for cp in cluster_posts if cp.get("source_id") == source.get("id")]
        cluster_ids = {cp.get("cluster_id") for cp in involved}
        total_views = sum(views)
        subscribers = source.get("latest_subscribers")
        analytics.append({
            "source_id": source.get("id"),
            "posts_count": len(source_posts),
            "total_views": total_views,
            "avg_views_per_post": total_views / len(source_posts) if source_posts else None,
            "median_views_per_post": sorted(views)[len(views)//2] if views else None,
            "max_views": max(views) if views else None,
            "latest_subscribers": subscribers,
            "latest_subscribers_at": source.get("latest_subscribers_at"),
            "views_to_subscribers_ratio": total_views / subscribers if subscribers else None,
            "first_post_at": source_posts[0].get("published_at") if source_posts else None,
            "last_post_at": source_posts[-1].get("published_at") if source_posts else None,
            "first_source_count": len([cp for cp in involved if cp.get("role") == "first"]),
            "related_count": len([cp for cp in involved if cp.get("role") == "related"]),
            "clusters_count": len(cluster_ids),
            "own_posts_views": sum(cp.get("views") or 0 for cp in involved),
            "involved_clusters_total_views": sum((clusters_by_id.get(cid) or {}).get("total_views") or 0 for cid in cluster_ids),
            "source_title": source.get("title"),
            "group_code": source.get("group_code"),
            "username": source.get("username"),
            "url": source.get("url"),
        })
        by_day = defaultdict(lambda: {"posts_count": 0, "total_views": 0, "clusters_count": 0, "first_source_count": 0, "related_count": 0})
        for post in source_posts:
            day = (post.get("published_at") or "")[:10]
            if not day:
                continue
            by_day[day]["posts_count"] += 1
            by_day[day]["total_views"] += post.get("views") or 0
        for day, values in by_day.items():
            values["source_id"] = source.get("id")
            values["date"] = day
            values["avg_views"] = values["total_views"] / values["posts_count"] if values["posts_count"] else None
            daily.append(values)
    snapshot["channel_analytics"] = sorted(analytics, key=lambda row: row.get("total_views") or 0, reverse=True)
    snapshot["source_daily_stats"] = sorted(daily, key=lambda row: (row.get("source_id"), row.get("date")))


def update_counts_and_automation(snapshot: dict, run: dict, schedule: str) -> None:
    current = now()
    snapshot["generated_at"] = iso(current)
    snapshot["counts"] = {
        "sources": len(snapshot.get("sources", [])),
        "posts": len(snapshot.get("posts", [])),
        "matches": len(snapshot.get("matches", [])),
        "clusters": len(snapshot.get("clusters", [])),
        "narratives": len(snapshot.get("narratives", [])),
    }
    counts = defaultdict(int)
    for source in snapshot.get("sources", []):
        counts[source.get("group_code")] += 1
    snapshot["sources_by_group"] = [{"group_code": key, "count": value} for key, value in sorted(counts.items())]
    snapshot["automation"] = {
        "last_success_at": run.get("finished_at"),
        "next_run_at": iso(current + timedelta(hours=6)),
        "schedule": schedule,
        "mode": "Telethon scheduled refresh",
        "workflow": "telegram-monitor-refresh.yml",
        "manual_fallback": "GitHub Actions → Telegram Monitor Refresh → Run workflow",
    }


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--group", default=os.environ.get("TELEGRAM_MONITOR_GROUP", "ALL"), choices=["BY", "RU", "ALL"])
    parser.add_argument("--limit", type=int, default=int(os.environ.get("TELEGRAM_MONITOR_LIMIT", "80")))
    parser.add_argument("--days", type=int, default=int(os.environ.get("TELEGRAM_MONITOR_DAYS", "7")))
    parser.add_argument("--schedule", default=os.environ.get("TELEGRAM_MONITOR_SCHEDULE", "0 */6 * * *"))
    args = parser.parse_args()

    snapshot = load_snapshot(SNAPSHOT_PATH)
    run = await collect_with_telethon(snapshot, args.group, args.limit, args.days)
    rebuild_matches_and_clusters(snapshot)
    rebuild_channel_analytics(snapshot)
    update_counts_and_automation(snapshot, run, args.schedule)
    write_snapshot(SNAPSHOT_PATH, snapshot)


if __name__ == "__main__":
    asyncio.run(main())
