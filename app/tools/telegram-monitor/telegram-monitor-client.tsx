"use client";

import { useEffect, useMemo, useState } from "react";

type Direction = "asc" | "desc";
type Tab = "overview" | "sources" | "posts" | "matches" | "clusters" | "channels" | "narratives" | "update" | "runs";
type GroupFilter = "all" | "BY" | "RU";
type CountMode = "all" | "BY" | "RU" | "without_ru";
type ClusterQuickFilter = "all" | "BY_ONLY" | "RU_ONLY" | "MIXED" | "RU_TO_BY" | "BY_TO_RU" | "BY_NATIVE" | "BY_RU_IMPORT";
type PeriodFilter =
  | "all"
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "quarter"
  | "year"
  | "custom";

type Source = {
  id: number;
  group_code: string | null;
  title: string | null;
  url: string | null;
  status: string | null;
  username: string | null;
  is_active: number | null;
  created_at: string | null;
  updated_at: string | null;
  latest_subscribers?: number | null;
  latest_subscribers_at?: string | null;
};

type Post = {
  id: number;
  source_id: number | null;
  telegram_message_id: string | null;
  post_url: string | null;
  published_at: string | null;
  collected_at: string | null;
  views: number | null;
  subscribers: number | null;
  language: string | null;
  is_forward: number | null;
  forward_source_url: string | null;
  has_media: number | null;
  text_clean: string | null;
  text: string | null;
  source_title: string | null;
  group_code: string | null;
};

type Cluster = {
  id: number;
  period_start: string | null;
  period_end: string | null;
  first_post_id: number | null;
  first_source_id: number | null;
  first_seen_at: string | null;
  title: string | null;
  status: string | null;
  source_type: string | null;
  source_confidence: string | null;
  group_mix: string | null;
  direction?: string | null;
  first_group?: string | null;
  by_posts_count?: number | null;
  ru_posts_count?: number | null;
  by_sources_count?: number | null;
  ru_sources_count?: number | null;
  by_views?: number | null;
  ru_views?: number | null;
  total_views_without_ru?: number | null;
  total_views_only_ru?: number | null;
  total_subscribers_without_ru?: number | null;
  total_subscribers_only_ru?: number | null;
  views_to_subscribers_ratio_without_ru?: number | null;
  views_to_subscribers_ratio_only_ru?: number | null;
  ru_import_type?: string | null;
  matched_ru_cluster_id?: number | null;
  matched_ru_post_id?: number | null;
  matched_ru_first_seen_at?: string | null;
  ru_lag_seconds?: number | null;
  ru_match_confidence?: number | null;
  ru_match_reason?: string | null;
  posts_count: number | null;
  sources_count: number | null;
  total_views: number | null;
  total_subscribers: number | null;
  views_to_subscribers_ratio: number | null;
  created_at: string | null;
  updated_at: string | null;
  first_source: string | null;
  first_source_group: string | null;
};

type ClusterPost = {
  id: number;
  cluster_id: number;
  post_id: number | null;
  source_id: number | null;
  role: string | null;
  relation_type: string | null;
  published_at: string | null;
  lag_seconds: number | null;
  views: number | null;
  subscribers: number | null;
  post_url: string | null;
  telegram_message_id: string | null;
  text_clean: string | null;
  text: string | null;
  source_title: string | null;
  group_code: string | null;
};

type Match = {
  id: number;
  similarity: number | null;
  match_type: string | null;
  created_at: string | null;
  post_a_id: number | null;
  msg_a: string | null;
  published_a: string | null;
  source_a: string | null;
  group_a: string | null;
  post_b_id: number | null;
  msg_b: string | null;
  published_b: string | null;
  source_b: string | null;
  group_b: string | null;
  cluster_a_id?: number | null;
  cluster_b_id?: number | null;
};

type ChannelAnalytics = {
  source_id: number;
  period_start: string | null;
  period_end: string | null;
  posts_count: number | null;
  total_views: number | null;
  avg_views_per_post: number | null;
  median_views_per_post: number | null;
  max_views: number | null;
  latest_subscribers: number | null;
  latest_subscribers_at: string | null;
  views_to_subscribers_ratio: number | null;
  first_post_at: string | null;
  last_post_at: string | null;
  first_source_count: number | null;
  related_count: number | null;
  clusters_count: number | null;
  own_posts_views: number | null;
  involved_clusters_total_views: number | null;
  own_to_cluster_views_ratio: number | null;
  by_native_count: number | null;
  direct_ru_import_count: number | null;
  ru_story_import_count: number | null;
  by_to_ru_count: number | null;
  mixed_or_unknown_count: number | null;
  ru_only_count: number | null;
  ru_to_by_count: number | null;
  by_sources_after_ru_count: number | null;
  ru_views: number | null;
  by_views_after_ru: number | null;
  source_title: string | null;
  group_code: string | null;
  username: string | null;
  url: string | null;
};

type SourceDailyStat = {
  source_id: number;
  date: string | null;
  posts_count: number | null;
  total_views: number | null;
  avg_views: number | null;
  clusters_count: number | null;
  first_source_count: number | null;
  related_count: number | null;
};

type SourceSnapshot = {
  source_id: number;
  collected_at: string | null;
  subscribers: number | null;
  status: string | null;
};

type RunRow = {
  id: number;
  run_type: string | null;
  status: string | null;
  started_at: string | null;
  finished_at: string | null;
  sources_total: number | null;
  sources_processed: number | null;
  posts_added: number | null;
  posts_updated: number | null;
  snapshots_added: number | null;
  matches_added: number | null;
  matches_updated: number | null;
  chains_built: number | null;
  errors_count: number | null;
  notes: string | null;
};

type Narrative = {
  id: number;
  title: string | null;
  description: string | null;
  status: string | null;
  origin: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type NarrativeCluster = {
  id: number;
  narrative_id: number | null;
  cluster_id: number | null;
  confidence: number | null;
  validation_status: string | null;
  created_at: string | null;
  narrative_title: string | null;
  cluster_title: string | null;
  total_views: number | null;
  posts_count: number | null;
  sources_count: number | null;
};

type Snapshot = {
  generated_at: string;
  counts: {
    sources: number;
    posts: number;
    matches: number;
    clusters: number;
    narratives: number;
  };
  sources_by_group: Array<{ group_code: string; count: number }>;
  sources: Source[];
  posts: Post[];
  matches: Match[];
  clusters: Cluster[];
  cluster_posts: ClusterPost[];
  channel_analytics?: ChannelAnalytics[];
  source_daily_stats?: SourceDailyStat[];
  source_snapshots?: SourceSnapshot[];
  runs?: RunRow[];
  errors?: Array<Record<string, string | number | null>>;
  automation?: {
    last_success_at?: string | null;
    next_run_at?: string | null;
    schedule?: string | null;
    mode?: string | null;
    workflow?: string | null;
    manual_fallback?: string | null;
  };
  narratives: Narrative[];
  narrative_clusters: NarrativeCluster[];
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Обзор" },
  { id: "sources", label: "Источники" },
  { id: "posts", label: "Посты" },
  { id: "matches", label: "Совпадения текстов" },
  { id: "clusters", label: "Группы материалов" },
  { id: "channels", label: "Каналы" },
  { id: "narratives", label: "Нарративы" },
  { id: "update", label: "Обновление" },
  { id: "runs", label: "Запуски" },
];

const sourceTypeLabels: Record<string, string> = {
  explicit_forward: "явный forward",
  earliest_observed: "первое наблюдение",
  simultaneous_publication: "синхронная публикация",
  unknown: "неизвестно",
};

const groupMixLabels: Record<string, string> = {
  BY_ONLY: "только BY",
  RU_ONLY: "только RU",
  MIXED: "смешанная",
};

const directionLabels: Record<string, string> = {
  BY_ONLY: "только BY",
  RU_ONLY: "только RU",
  RU_TO_BY: "RU → BY",
  BY_TO_RU: "BY → RU",
  MIXED_SIMULTANEOUS: "синхронно BY/RU",
  UNKNOWN: "неизвестно",
};

const ruImportLabels: Record<string, string> = {
  direct_ru_import: "прямой RU-импорт",
  ru_story_import: "сюжет из RU",
  by_native: "BY без RU",
  by_to_ru: "BY → RU",
  mixed_or_unknown: "смешано/неясно",
};

const countModeLabels: Record<CountMode, string> = {
  all: "все источники",
  BY: "только BY",
  RU: "только RU",
  without_ru: "без RU",
};

const roleLabels: Record<string, string> = {
  first: "первый",
  related: "связанный",
};

const relationLabels: Record<string, string> = {
  forward: "forward",
  exact_text_match: "точный текст",
  near_text_match: "похожий текст",
  text_with_comment: "текст с комментарием",
  simultaneous: "синхронно",
};

const periodLabels: Record<PeriodFilter, string> = {
  all: "всё время",
  today: "сегодня",
  yesterday: "вчера",
  last_7_days: "7 дней",
  last_30_days: "30 дней",
  quarter: "квартал",
  year: "год",
  custom: "диапазон",
};

function formatInt(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatAvailableInt(value: number | null | undefined) {
  return value === null || value === undefined ? "недоступно" : formatInt(value);
}

function formatNumber(value: number | null | undefined, digits = 1) {
  return value === null || value === undefined ? "" : value.toFixed(digits);
}

function formatRatio(value: number | null | undefined) {
  return value === null || value === undefined ? "недоступно" : value.toFixed(3);
}

function shortText(value: string | null | undefined, limit = 180) {
  const text = value ?? "";
  return text.length > limit ? `${text.slice(0, limit - 1)}...` : text;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function formatLag(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }
  if (Math.abs(value) < 60) {
    return `${value} с`;
  }
  const abs = Math.abs(value);
  const minutes = Math.floor(abs / 60);
  const seconds = abs % 60;
  return `${value < 0 ? "-" : ""}${minutes} мин ${seconds} с`;
}

function includesText(values: Array<string | number | null | undefined>, query: string) {
  if (!query) {
    return true;
  }
  const normalized = query.trim().toLowerCase();
  return values.some((value) => String(value ?? "").toLowerCase().includes(normalized));
}

function periodRange(period: PeriodFilter, customFrom: string, customTo: string) {
  if (period === "all") {
    return null;
  }

  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (period === "today") {
    return { start, end };
  }

  if (period === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
    return { start, end };
  }

  if (period === "last_7_days") {
    start.setDate(start.getDate() - 6);
    return { start, end };
  }

  if (period === "last_30_days") {
    start.setDate(start.getDate() - 29);
    return { start, end };
  }

  if (period === "quarter") {
    start.setMonth(start.getMonth() - 3);
    return { start, end };
  }

  if (period === "year") {
    start.setFullYear(start.getFullYear() - 1);
    return { start, end };
  }

  const customStart = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
  const customEnd = customTo ? new Date(`${customTo}T23:59:59`) : null;

  if (!customStart && !customEnd) {
    return null;
  }

  return {
    start: customStart && !Number.isNaN(customStart.getTime()) ? customStart : null,
    end: customEnd && !Number.isNaN(customEnd.getTime()) ? customEnd : null,
  };
}

function inPeriod(value: string | null | undefined, range: ReturnType<typeof periodRange>) {
  if (!range || !value) {
    return true;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return true;
  }
  if (range.start && date < range.start) {
    return false;
  }
  if (range.end && date > range.end) {
    return false;
  }
  return true;
}

function sortRows<T>(rows: T[], sort: { key: keyof T; direction: Direction }) {
  return [...rows].sort((a, b) => {
    const left = a[sort.key];
    const right = b[sort.key];

    if (left === right) {
      return 0;
    }
    if (left === null || left === undefined) {
      return 1;
    }
    if (right === null || right === undefined) {
      return -1;
    }

    const result =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), "ru");

    return sort.direction === "asc" ? result : -result;
  });
}

function viewsForMode(cluster: Cluster, mode: CountMode) {
  if (mode === "BY" || mode === "without_ru") {
    return cluster.total_views_without_ru ?? 0;
  }
  if (mode === "RU") {
    return cluster.total_views_only_ru ?? 0;
  }
  return cluster.total_views ?? 0;
}

function downloadRows(name: string, rows: Array<Record<string, unknown>>, format: "csv" | "json" | "markdown") {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  let body = "";
  let type = "text/plain;charset=utf-8";
  if (format === "json") {
    body = JSON.stringify(rows, null, 2);
    type = "application/json;charset=utf-8";
  } else if (format === "csv") {
    body = [headers.join(","), ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(","))].join("\n");
    type = "text/csv;charset=utf-8";
  } else {
    body = [
      `| ${headers.join(" | ")} |`,
      `| ${headers.map(() => "---").join(" | ")} |`,
      ...rows.map((row) => `| ${headers.map((header) => String(row[header] ?? "").replaceAll("|", "\\|")).join(" | ")} |`),
    ].join("\n");
  }
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.${format === "markdown" ? "md" : format}`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function TelegramMonitorClient({
  initialClusterId,
  initialPostId,
  initialSourceId,
  initialTab = "overview",
}: {
  initialClusterId?: number;
  initialPostId?: number;
  initialSourceId?: number;
  initialTab?: Tab;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<GroupFilter>("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [countMode, setCountMode] = useState<CountMode>("all");
  const [clusterFilter, setClusterFilter] = useState<ClusterQuickFilter>("all");
  const [matchKind, setMatchKind] = useState("all");
  const [minSimilarity, setMinSimilarity] = useState("0");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sourceSort, setSourceSort] = useState<{ key: keyof Source; direction: Direction }>({
    key: "group_code",
    direction: "asc",
  });
  const [postSort, setPostSort] = useState<{ key: keyof Post; direction: Direction }>({
    key: "published_at",
    direction: "desc",
  });
  const [matchSort, setMatchSort] = useState<{ key: keyof Match; direction: Direction }>({
    key: "similarity",
    direction: "desc",
  });
  const [clusterSort, setClusterSort] = useState<{ key: keyof Cluster; direction: Direction }>({
    key: "total_views",
    direction: "desc",
  });

  useEffect(() => {
    let active = true;

    fetch("/api/tools/telegram-monitor/snapshot")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<Snapshot>;
      })
      .then((data) => {
        if (active) {
          setSnapshot(data);
        }
      })
      .catch((error: Error) => {
        if (active) {
          setLoadError(error.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const range = useMemo(() => periodRange(period, customFrom, customTo), [period, customFrom, customTo]);

  const clusterPostsById = useMemo(() => {
    const map = new Map<number, ClusterPost[]>();
    if (!snapshot) {
      return map;
    }
    for (const post of snapshot.cluster_posts) {
      const rows = map.get(post.cluster_id) ?? [];
      rows.push(post);
      map.set(post.cluster_id, rows);
    }
    return map;
  }, [snapshot]);

  const filteredSources = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    const rows = snapshot.sources.filter(
      (source) =>
        (group === "all" || source.group_code === group) &&
        includesText([source.title, source.username, source.url, source.status], query),
    );
    return sortRows(rows, sourceSort);
  }, [snapshot, group, query, sourceSort]);

  const filteredPosts = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    const rows = snapshot.posts.filter(
      (post) =>
        (group === "all" || post.group_code === group) &&
        inPeriod(post.published_at, range) &&
        includesText([post.id, post.source_title, post.telegram_message_id, post.text_clean], query),
    );
    return sortRows(rows, postSort);
  }, [snapshot, group, query, range, postSort]);

  const filteredMatches = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    const rows = snapshot.matches.filter(
      (match) =>
        (group === "all" || match.group_a === group || match.group_b === group) &&
        (matchKind === "all" ||
          `${match.group_a}-${match.group_b}` === matchKind ||
          (matchKind === "exact" && match.match_type === "exact") ||
          (matchKind === "near" && match.match_type !== "exact")) &&
        (match.similarity ?? 0) >= Number(minSimilarity || 0) &&
        inPeriod(match.created_at ?? match.published_a ?? match.published_b, range) &&
        includesText([match.id, match.source_a, match.source_b, match.msg_a, match.msg_b, match.match_type], query),
    );
    return sortRows(rows, matchSort);
  }, [snapshot, group, query, range, matchSort, matchKind, minSimilarity]);

  const filteredClusters = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    const rows = snapshot.clusters.filter(
      (cluster) =>
        (group === "all" ||
          cluster.group_mix === `${group}_ONLY` ||
          cluster.first_source_group === group ||
          (clusterPostsById.get(cluster.id) ?? []).some((post) => post.group_code === group)) &&
        (clusterFilter === "all" ||
          cluster.group_mix === clusterFilter ||
          cluster.direction === clusterFilter ||
          (clusterFilter === "BY_NATIVE" && cluster.group_mix === "BY_ONLY" && cluster.ru_import_type === "by_native") ||
          (clusterFilter === "BY_RU_IMPORT" && ["direct_ru_import", "ru_story_import"].includes(cluster.ru_import_type ?? ""))) &&
        inPeriod(cluster.first_seen_at, range) &&
        includesText([cluster.id, cluster.title, cluster.first_source, cluster.source_type, cluster.group_mix], query),
    );
    return sortRows(rows, clusterSort);
  }, [snapshot, group, query, range, clusterSort, clusterPostsById, clusterFilter]);

  const periodSummary = range
    ? `${formatDateOnly(range.start?.toISOString()) || "начало"} - ${formatDateOnly(range.end?.toISOString()) || "конец"}`
    : "всё время";

  return (
    <main data-testid="telegram-monitor-page" className="tm-main">
      <style>{styles}</style>
      <section className="tm-shell">
        <div className="tm-header">
          <div>
            <p className="tm-eyebrow">Tools / research</p>
            <h1>Telegram Monitor</h1>
            <p>
              Изолированный раздел мониторинга публичных Telegram-публикаций.
              Snapshot собран из отдельной SQLite-базы мониторинга и не смешан с
              memory database.
            </p>
          </div>
          <div className="tm-stamp">
            <span>Snapshot</span>
            <strong>{snapshot ? formatDate(snapshot.generated_at) : "загрузка"}</strong>
          </div>
        </div>

        {!snapshot || loadError ? (
          <section className="tm-notice">
            {loadError
              ? `Не удалось загрузить snapshot мониторинга: ${loadError}`
              : "Загружаю snapshot мониторинга..."}
          </section>
        ) : null}

        {snapshot ? <div className="tm-tabs" aria-label="Разделы мониторинга">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? "active" : ""}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div> : null}

        {snapshot ? <section className="tm-filters">
          <label>
            Поиск
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="текст, источник, id, username"
              value={query}
            />
          </label>
          <label>
            Группа
            <select onChange={(event) => setGroup(event.target.value as GroupFilter)} value={group}>
              <option value="all">BY и RU</option>
              <option value="BY">только BY</option>
              <option value="RU">только RU</option>
            </select>
          </label>
          <label>
            Период
            <select onChange={(event) => setPeriod(event.target.value as PeriodFilter)} value={period}>
              {Object.entries(periodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Режим подсчёта
            <select onChange={(event) => setCountMode(event.target.value as CountMode)} value={countMode}>
              {Object.entries(countModeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            C
            <input
              disabled={period !== "custom"}
              onChange={(event) => setCustomFrom(event.target.value)}
              type="date"
              value={customFrom}
            />
          </label>
          <label>
            По
            <input
              disabled={period !== "custom"}
              onChange={(event) => setCustomTo(event.target.value)}
              type="date"
              value={customTo}
            />
          </label>
        </section> : null}

        {snapshot && activeTab === "overview" ? (
          <Overview
            countMode={countMode}
            clusters={filteredClusters}
            matches={filteredMatches}
            periodSummary={periodSummary}
            posts={filteredPosts}
            snapshot={snapshot}
            sources={filteredSources}
          />
        ) : null}

        {snapshot && activeTab === "sources" ? (
          <SourcesTable rows={filteredSources} setSort={setSourceSort} sort={sourceSort} />
        ) : null}

        {snapshot && activeTab === "posts" ? (
          <PostsTable rows={filteredPosts} setSort={setPostSort} sort={postSort} />
        ) : null}

        {snapshot && activeTab === "matches" ? (
          <MatchesTable
            matchKind={matchKind}
            minSimilarity={minSimilarity}
            rows={filteredMatches}
            setMatchKind={setMatchKind}
            setMinSimilarity={setMinSimilarity}
            setSort={setMatchSort}
            sort={matchSort}
          />
        ) : null}

        {snapshot && activeTab === "clusters" ? (
          <ClustersTable
            clusterFilter={clusterFilter}
            clusterPostsById={clusterPostsById}
            rows={filteredClusters}
            setClusterFilter={setClusterFilter}
            setSort={setClusterSort}
            sort={clusterSort}
          />
        ) : null}

        {snapshot && activeTab === "channels" ? (
          <ChannelsTable rows={snapshot.channel_analytics ?? []} />
        ) : null}

        {snapshot && activeTab === "narratives" ? (
          <NarrativesTable clusters={snapshot.narrative_clusters} rows={snapshot.narratives} />
        ) : null}

        {snapshot && activeTab === "update" ? <UpdatePanel automation={snapshot.automation} /> : null}

        {snapshot && activeTab === "runs" ? <RunsTable errors={snapshot.errors ?? []} rows={snapshot.runs ?? []} /> : null}

        {snapshot && initialSourceId ? (
          <SourceDetail
            analytics={(snapshot.channel_analytics ?? []).find((row) => row.source_id === initialSourceId)}
            clusters={snapshot.clusters}
            clusterPosts={snapshot.cluster_posts}
            dailyStats={(snapshot.source_daily_stats ?? []).filter((row) => row.source_id === initialSourceId)}
            posts={snapshot.posts.filter((post) => post.source_id === initialSourceId)}
            snapshots={(snapshot.source_snapshots ?? []).filter((row) => row.source_id === initialSourceId)}
            source={snapshot.sources.find((source) => source.id === initialSourceId)}
          />
        ) : null}

        {snapshot && initialPostId ? (
          <PostDetail
            clusterPosts={snapshot.cluster_posts}
            clusters={snapshot.clusters}
            post={snapshot.posts.find((row) => row.id === initialPostId)}
          />
        ) : null}

        {snapshot && initialClusterId ? (
          <ClusterDetail
            cluster={snapshot.clusters.find((row) => row.id === initialClusterId)}
            posts={snapshot.cluster_posts.filter((row) => row.cluster_id === initialClusterId)}
          />
        ) : null}
      </section>
    </main>
  );
}

function Overview({
  countMode,
  clusters,
  matches,
  periodSummary,
  posts,
  snapshot,
  sources,
}: {
  countMode: CountMode;
  clusters: Cluster[];
  matches: Match[];
  periodSummary: string;
  posts: Post[];
  snapshot: Snapshot;
  sources: Source[];
}) {
  const totalViews = clusters.reduce((sum, cluster) => sum + viewsForMode(cluster, countMode), 0);
  const totalViewsWithoutRu = clusters.reduce((sum, cluster) => sum + (cluster.total_views_without_ru ?? 0), 0);
  const totalViewsOnlyRu = clusters.reduce((sum, cluster) => sum + (cluster.total_views_only_ru ?? 0), 0);
  const ruSources = sources.filter((source) => source.group_code === "RU");
  const ruPosts = posts.filter((post) => post.group_code === "RU");
  const ruOnlyClusters = clusters.filter((cluster) => cluster.group_mix === "RU_ONLY" || cluster.direction === "RU_ONLY");
  const byClusters = clusters.filter((cluster) => cluster.group_mix === "BY_ONLY" || cluster.first_source_group === "BY");
  const byNative = clusters.filter((cluster) => cluster.group_mix === "BY_ONLY" && cluster.ru_import_type === "by_native");
  const byRuImport = clusters.filter((cluster) => ["direct_ru_import", "ru_story_import"].includes(cluster.ru_import_type ?? ""));
  const topRuSourcesByPosts = ruSources
    .map((source) => ({
      source,
      posts: posts.filter((post) => post.source_id === source.id).length,
      views: posts.filter((post) => post.source_id === source.id).reduce((sum, post) => sum + (post.views ?? 0), 0),
    }))
    .sort((a, b) => b.posts - a.posts)
    .slice(0, 5);

  return (
    <>
      <section className="tm-metrics">
        <Metric label="Источники" value={formatInt(sources.length)} />
        <Metric label="Посты" value={formatInt(posts.length)} />
        <Metric label="Совпадения" value={formatInt(matches.length)} />
        <Metric label="Группы материалов" value={formatInt(clusters.length)} />
        <Metric label={`Просмотры (${countModeLabels[countMode]})`} value={formatInt(totalViews)} />
        <Metric label="Просмотры без RU" value={formatInt(totalViewsWithoutRu)} />
        <Metric label="Только RU просмотры" value={formatInt(totalViewsOnlyRu)} />
      </section>

      <section className="tm-notice">
        <strong>Методологические ограничения.</strong> Суммарные просмотры группы
        материалов это сумма просмотров публикаций, не уникальный охват.
        Подписчики при публичном сборе могут быть недоступны; в таком случае
        показывается "недоступно", а не 0. Группы построены по сходству текста и
        времени публикации, без LLM. Текущий фильтр периода: {periodSummary}.
      </section>

      <section className="tm-grid-2">
        <div>
          <h2>Источники по группам</h2>
          <div className="tm-mini-grid">
            {snapshot.sources_by_group.map((row) => (
              <div className="tm-card-row" key={row.group_code}>
                <span>{row.group_code}</span>
                <strong>{formatInt(row.count)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2>Топ групп по просмотрам</h2>
          <div className="tm-list">
            {clusters.slice(0, 6).map((cluster) => (
              <div className="tm-list-item" key={cluster.id}>
                <strong>#{cluster.id} {shortText(cluster.title, 90)}</strong>
                <span>{formatInt(cluster.total_views)} просмотров, {cluster.posts_count} публикаций</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tm-grid-2">
        <div>
          <h2>Русская выборка</h2>
          <div className="tm-mini-grid">
            <div className="tm-card-row"><span>RU источников</span><strong>{formatInt(ruSources.length)}</strong></div>
            <div className="tm-card-row"><span>RU публикаций</span><strong>{formatInt(ruPosts.length)}</strong></div>
            <div className="tm-card-row"><span>RU_ONLY групп</span><strong>{formatInt(ruOnlyClusters.length)}</strong></div>
            <div className="tm-card-row"><span>Просмотры RU_ONLY</span><strong>{formatInt(ruOnlyClusters.reduce((sum, cluster) => sum + (cluster.total_views_only_ru ?? cluster.total_views ?? 0), 0))}</strong></div>
          </div>
          <h2>Топ RU-источников</h2>
          <div className="tm-list">
            {topRuSourcesByPosts.map((row) => (
              <div className="tm-list-item" key={row.source.id}>
                <strong>{row.source.title}</strong>
                <span>{formatInt(row.posts)} публикаций, {formatInt(row.views)} просмотров</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2>Беларусская повестка и RU-импорт</h2>
          <div className="tm-mini-grid">
            <div className="tm-card-row"><span>BY групп всего</span><strong>{formatInt(byClusters.length)}</strong></div>
            <div className="tm-card-row"><span>BY без RU</span><strong>{formatInt(byNative.length)}</strong></div>
            <div className="tm-card-row"><span>BY с RU-импортом</span><strong>{formatInt(byRuImport.length)}</strong></div>
            <div className="tm-card-row"><span>BY → RU</span><strong>{formatInt(clusters.filter((cluster) => cluster.direction === "BY_TO_RU").length)}</strong></div>
            <div className="tm-card-row"><span>Смешано/неясно</span><strong>{formatInt(clusters.filter((cluster) => cluster.ru_import_type === "mixed_or_unknown").length)}</strong></div>
            <div className="tm-card-row"><span>Просмотры BY без RU</span><strong>{formatInt(byNative.reduce((sum, cluster) => sum + (cluster.total_views_without_ru ?? 0), 0))}</strong></div>
            <div className="tm-card-row"><span>Просмотры BY с RU-импортом</span><strong>{formatInt(byRuImport.reduce((sum, cluster) => sum + (cluster.total_views_without_ru ?? 0), 0))}</strong></div>
          </div>
        </div>
      </section>
    </>
  );
}

function SourcesTable({
  rows,
  setSort,
  sort,
}: {
  rows: Source[];
  setSort: (sort: { key: keyof Source; direction: Direction }) => void;
  sort: { key: keyof Source; direction: Direction };
}) {
  return (
    <Panel title={`Источники: ${formatInt(rows.length)}`}>
      <table>
        <thead>
          <tr>
            <SortableTh label="ID" name="id" setSort={setSort} sort={sort} />
            <SortableTh label="Группа" name="group_code" setSort={setSort} sort={sort} />
            <SortableTh label="Название" name="title" setSort={setSort} sort={sort} />
            <SortableTh label="Username" name="username" setSort={setSort} sort={sort} />
            <SortableTh label="Статус" name="status" setSort={setSort} sort={sort} />
            <SortableTh label="Активен" name="is_active" setSort={setSort} sort={sort} />
            <th>Подписчики</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((source) => (
            <tr key={source.id}>
              <td>#{source.id}</td>
              <td><Badge>{source.group_code}</Badge></td>
              <td><a href={`/tools/telegram-monitor/sources/${source.id}`}>{source.title}</a></td>
              <td>{source.username}</td>
              <td>{source.status}</td>
              <td>{source.is_active ? "да" : "нет"}</td>
              <td>{formatAvailableInt(source.latest_subscribers)}{source.latest_subscribers_at ? ` / ${formatDate(source.latest_subscribers_at)}` : ""}</td>
              <td>{source.url ? <ExternalLink href={source.url}>Telegram</ExternalLink> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function PostsTable({
  rows,
  setSort,
  sort,
}: {
  rows: Post[];
  setSort: (sort: { key: keyof Post; direction: Direction }) => void;
  sort: { key: keyof Post; direction: Direction };
}) {
  return (
    <Panel title={`Посты: ${formatInt(rows.length)}`}>
      <table>
        <thead>
          <tr>
            <SortableTh label="ID" name="id" setSort={setSort} sort={sort} />
            <SortableTh label="Источник" name="source_title" setSort={setSort} sort={sort} />
            <SortableTh label="Группа" name="group_code" setSort={setSort} sort={sort} />
            <SortableTh label="Опубликован" name="published_at" setSort={setSort} sort={sort} />
            <SortableTh label="Просмотры" name="views" setSort={setSort} sort={sort} />
            <SortableTh label="Подписчики" name="subscribers" setSort={setSort} sort={sort} />
            <th>Telegram</th>
            <th>Текст</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((post) => (
            <tr key={post.id}>
              <td>#{post.id}</td>
              <td>{post.source_id ? <a href={`/tools/telegram-monitor/sources/${post.source_id}`}>{post.source_title}</a> : post.source_title}</td>
              <td><Badge>{post.group_code}</Badge></td>
              <td>{formatDate(post.published_at)}</td>
              <td>{formatInt(post.views)}</td>
              <td>{formatAvailableInt(post.subscribers)}</td>
              <td>{post.post_url ? <ExternalLink href={post.post_url}>Telegram</ExternalLink> : null}</td>
              <td className="tm-text"><a href={`/tools/telegram-monitor/posts/${post.id}`}>#{post.id}</a> {shortText(post.text_clean)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function MatchesTable({
  matchKind,
  minSimilarity,
  rows,
  setMatchKind,
  setMinSimilarity,
  setSort,
  sort,
}: {
  matchKind: string;
  minSimilarity: string;
  rows: Match[];
  setMatchKind: (value: string) => void;
  setMinSimilarity: (value: string) => void;
  setSort: (sort: { key: keyof Match; direction: Direction }) => void;
  sort: { key: keyof Match; direction: Direction };
}) {
  return (
    <Panel title={`Совпадения текстов: ${formatInt(rows.length)}`}>
      <div className="tm-panel-note">Это техническая таблица пар похожих публикаций. Она используется для построения групп материалов. Для аналитической работы смотрите вкладку "Группы материалов".</div>
      <div className="tm-inline-filters">
        <select onChange={(event) => setMatchKind(event.target.value)} value={matchKind}>
          <option value="all">все пары</option>
          <option value="BY-BY">BY-BY</option>
          <option value="RU-RU">RU-RU</option>
          <option value="RU-BY">RU-BY</option>
          <option value="BY-RU">BY-RU</option>
          <option value="exact">exact</option>
          <option value="near">near</option>
        </select>
        <input min="0" max="1" step="0.01" type="number" value={minSimilarity} onChange={(event) => setMinSimilarity(event.target.value)} />
      </div>
      <ExportButtons name="matches" rows={rows as unknown as Array<Record<string, unknown>>} />
      <table>
        <thead>
          <tr>
            <SortableTh label="ID" name="id" setSort={setSort} sort={sort} />
            <SortableTh label="Сходство" name="similarity" setSort={setSort} sort={sort} />
            <SortableTh label="Тип" name="match_type" setSort={setSort} sort={sort} />
            <SortableTh label="Источник A" name="source_a" setSort={setSort} sort={sort} />
            <SortableTh label="Источник B" name="source_b" setSort={setSort} sort={sort} />
            <th>Посты</th>
            <th>Группа материалов</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((match) => (
            <tr key={match.id}>
              <td>#{match.id}</td>
              <td>{match.similarity}</td>
              <td>{match.match_type}</td>
              <td>{match.source_a} <Badge>{match.group_a}</Badge></td>
              <td>{match.source_b} <Badge>{match.group_b}</Badge></td>
              <td>#{match.post_a_id} / #{match.post_b_id}</td>
              <td>{match.cluster_a_id || match.cluster_b_id ? <a href={`/tools/telegram-monitor/clusters/${match.cluster_a_id ?? match.cluster_b_id}`}>#{match.cluster_a_id ?? match.cluster_b_id}</a> : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function ClustersTable({
  clusterFilter,
  clusterPostsById,
  rows,
  setClusterFilter,
  setSort,
  sort,
}: {
  clusterFilter: ClusterQuickFilter;
  clusterPostsById: Map<number, ClusterPost[]>;
  rows: Cluster[];
  setClusterFilter: (value: ClusterQuickFilter) => void;
  setSort: (sort: { key: keyof Cluster; direction: Direction }) => void;
  sort: { key: keyof Cluster; direction: Direction };
}) {
  return (
    <Panel title={`Группы материалов: ${formatInt(rows.length)}`}>
      <div className="tm-chip-row">
        {[
          ["all", "все"],
          ["BY_ONLY", "только BY"],
          ["RU_ONLY", "только RU"],
          ["MIXED", "смешанные BY/RU"],
          ["RU_TO_BY", "RU → BY"],
          ["BY_TO_RU", "BY → RU"],
          ["BY_NATIVE", "BY без RU"],
          ["BY_RU_IMPORT", "BY с RU-импортом"],
        ].map(([value, label]) => (
          <button className={clusterFilter === value ? "active" : ""} key={value} onClick={() => setClusterFilter(value as ClusterQuickFilter)} type="button">{label}</button>
        ))}
      </div>
      <ExportButtons name="content_clusters" rows={rows as unknown as Array<Record<string, unknown>>} />
      <table>
        <thead>
          <tr>
            <SortableTh label="ID" name="id" setSort={setSort} sort={sort} />
            <SortableTh label="Заголовок" name="title" setSort={setSort} sort={sort} />
            <SortableTh label="Первый источник" name="first_source" setSort={setSort} sort={sort} />
            <SortableTh label="First group" name="first_group" setSort={setSort} sort={sort} />
            <SortableTh label="Первое появление" name="first_seen_at" setSort={setSort} sort={sort} />
            <SortableTh label="Публикации" name="posts_count" setSort={setSort} sort={sort} />
            <SortableTh label="Источники" name="sources_count" setSort={setSort} sort={sort} />
            <SortableTh label="Просмотры" name="total_views" setSort={setSort} sort={sort} />
            <SortableTh label="Без RU" name="total_views_without_ru" setSort={setSort} sort={sort} />
            <SortableTh label="Только RU" name="total_views_only_ru" setSort={setSort} sort={sort} />
            <SortableTh label="Подписчики" name="total_subscribers" setSort={setSort} sort={sort} />
            <SortableTh label="Views/subs" name="views_to_subscribers_ratio" setSort={setSort} sort={sort} />
            <SortableTh label="Состав" name="group_mix" setSort={setSort} sort={sort} />
            <SortableTh label="Направление" name="direction" setSort={setSort} sort={sort} />
            <SortableTh label="RU-импорт" name="ru_import_type" setSort={setSort} sort={sort} />
            <SortableTh label="Уверенность" name="source_confidence" setSort={setSort} sort={sort} />
          </tr>
        </thead>
        <tbody>
          {rows.map((cluster) => (
            <ClusterRow cluster={cluster} key={cluster.id} posts={clusterPostsById.get(cluster.id) ?? []} />
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function ClusterRow({ cluster, posts }: { cluster: Cluster; posts: ClusterPost[] }) {
  return (
    <>
      <tr>
        <td>#{cluster.id}</td>
        <td className="tm-text"><a href={`/tools/telegram-monitor/clusters/${cluster.id}`}>#{cluster.id}</a> {shortText(cluster.title, 120)}</td>
        <td>{cluster.first_source}</td>
        <td><Badge>{cluster.first_group ?? cluster.first_source_group}</Badge></td>
        <td>{formatDate(cluster.first_seen_at)}</td>
        <td>{cluster.posts_count}</td>
        <td>{cluster.sources_count}</td>
        <td>{formatInt(cluster.total_views)}</td>
        <td>{formatInt(cluster.total_views_without_ru)}</td>
        <td>{formatInt(cluster.total_views_only_ru)}</td>
        <td>{formatAvailableInt(cluster.total_subscribers)}</td>
        <td>{formatRatio(cluster.views_to_subscribers_ratio)}</td>
        <td>{groupMixLabels[cluster.group_mix ?? ""] ?? cluster.group_mix}</td>
        <td>{directionLabels[cluster.direction ?? ""] ?? cluster.direction}</td>
        <td>{ruImportLabels[cluster.ru_import_type ?? ""] ?? cluster.ru_import_type}</td>
        <td>{cluster.source_confidence}</td>
      </tr>
      <tr>
        <td className="tm-detail-cell" colSpan={16}>
          <details>
            <summary>Связанные публикации: {formatInt(posts.length)}</summary>
            <div className="tm-related">
              {posts.map((post) => (
                <div className="tm-related-row" key={post.id}>
                  <strong>{roleLabels[post.role ?? ""] ?? post.role}</strong>
                  <span>{post.source_title}</span>
                  <Badge>{post.group_code}</Badge>
                  <span>{formatDate(post.published_at)}</span>
                  <span>лаг: {formatLag(post.lag_seconds)}</span>
                  <span>просмотры: {formatInt(post.views)}</span>
                  <span>{relationLabels[post.relation_type ?? ""] ?? post.relation_type}</span>
                  {post.post_url ? <ExternalLink href={post.post_url}>Telegram</ExternalLink> : null}
                  <span className="tm-related-text">{shortText(post.text_clean, 150)}</span>
                </div>
              ))}
            </div>
          </details>
        </td>
      </tr>
    </>
  );
}

function NarrativesTable({ clusters, rows }: { clusters: NarrativeCluster[]; rows: Narrative[] }) {
  if (rows.length === 0) {
    return (
      <Panel title="Нарративы">
        <div className="tm-empty">
          Нарративы пока не заведены. Логика выше групп материалов уже предусмотрена:
          narrative_clusters есть в snapshot, но сейчас связей нет.
        </div>
      </Panel>
    );
  }

  return (
    <Panel title={`Нарративы: ${formatInt(rows.length)}`}>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Название</th>
            <th>Статус</th>
            <th>Источник</th>
            <th>Группы</th>
            <th>Обновлён</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((narrative) => {
            const linked = clusters.filter((cluster) => cluster.narrative_id === narrative.id);
            return (
              <tr key={narrative.id}>
                <td>#{narrative.id}</td>
                <td>{narrative.title}</td>
                <td>{narrative.status}</td>
                <td>{narrative.origin}</td>
                <td>{linked.length}</td>
                <td>{formatDate(narrative.updated_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

function ChannelsTable({ rows }: { rows: ChannelAnalytics[] }) {
  return (
    <Panel title={`Каналы: ${formatInt(rows.length)}`}>
      <ExportButtons name="channel_analytics" rows={rows as unknown as Array<Record<string, unknown>>} />
      <table>
        <thead>
          <tr>
            <th>Канал</th>
            <th>Группа</th>
            <th>Посты</th>
            <th>Просмотры</th>
            <th>Средние</th>
            <th>Медиана</th>
            <th>Макс.</th>
            <th>Подписчики</th>
            <th>Первый</th>
            <th>Related</th>
            <th>Группы</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.source_id}>
              <td><a href={`/tools/telegram-monitor/sources/${row.source_id}`}>{row.source_title}</a></td>
              <td><Badge>{row.group_code}</Badge></td>
              <td>{formatInt(row.posts_count)}</td>
              <td>{formatInt(row.total_views)}</td>
              <td>{formatNumber(row.avg_views_per_post, 0)}</td>
              <td>{formatNumber(row.median_views_per_post, 0)}</td>
              <td>{formatInt(row.max_views)}</td>
              <td>{formatAvailableInt(row.latest_subscribers)}{row.latest_subscribers_at ? ` / ${formatDate(row.latest_subscribers_at)}` : ""}</td>
              <td>{formatInt(row.first_source_count)}</td>
              <td>{formatInt(row.related_count)}</td>
              <td>{formatInt(row.clusters_count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function UpdatePanel({ automation }: { automation?: Snapshot["automation"] }) {
  const commands = [
    ["Автоматический scheduled workflow", "GitHub Actions → Telegram Monitor Refresh", "Основной режим: запускается по расписанию, собирает данные через Telethon, обновляет snapshot, коммитит его и деплоит Vercel."],
    ["Форсировать вручную", "GitHub Actions → Telegram Monitor Refresh → Run workflow", "Ручной запуск нужен только как fallback, если нужно обновить вне расписания."],
    ["Секреты workflow", "TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION_BASE64", "Сессия не хранится в репозитории. TELEGRAM_SESSION_BASE64 — base64 от data/telegram.session."],
  ];
  return (
    <Panel title="Обновление данных">
      <section className="tm-metrics">
        <Metric label="Последний успешный запуск" value={automation?.last_success_at ? formatDate(automation.last_success_at) : "нет данных"} />
        <Metric label="Следующий запуск" value={automation?.next_run_at ? formatDate(automation.next_run_at) : "по расписанию GitHub"} />
        <Metric label="Режим" value={automation?.mode ?? "Telethon scheduled refresh"} />
        <Metric label="Расписание" value={automation?.schedule ?? "0 */6 * * *"} />
      </section>
      <div className="tm-notice">
        Основной путь обновления теперь автоматический: GitHub Actions запускается по расписанию, обновляет snapshot и коммитит его. После коммита Vercel redeploy выполняется workflow-ом, если доступен <code>VERCEL_TOKEN</code>; также может сработать Git integration Vercel. Public web остаётся только fallback, Telethon — основной режим для подписчиков и истории.
      </div>
      <div className="tm-list">
        {commands.map(([title, command, description]) => (
          <div className="tm-list-item" key={command}>
            <strong>{title}</strong>
            <code>{command}</code>
            <span>{description}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RunsTable({ errors, rows }: { errors: Array<Record<string, string | number | null>>; rows: RunRow[] }) {
  return (
    <>
      <Panel title={`Запуски: ${formatInt(rows.length)}`}>
        <table>
          <thead>
            <tr><th>ID</th><th>Тип</th><th>Статус</th><th>Старт</th><th>Источники</th><th>Посты +/обн.</th><th>Ошибки</th><th>Заметки</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>#{row.id}</td><td>{row.run_type}</td><td>{row.status}</td><td>{formatDate(row.started_at)}</td>
                <td>{formatInt(row.sources_processed)} / {formatInt(row.sources_total)}</td>
                <td>{formatInt(row.posts_added)} / {formatInt(row.posts_updated)}</td>
                <td>{formatInt(row.errors_count)}</td><td className="tm-text">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title={`Ошибки: ${formatInt(errors.length)}`}>
        <table>
          <thead><tr><th>ID</th><th>Run</th><th>Stage</th><th>Type</th><th>Message</th><th>Created</th></tr></thead>
          <tbody>{errors.map((row) => <tr key={String(row.id)}><td>#{String(row.id)}</td><td>{String(row.run_id ?? "")}</td><td>{String(row.stage ?? "")}</td><td>{String(row.error_type ?? "")}</td><td className="tm-text">{String(row.message ?? "")}</td><td>{formatDate(String(row.created_at ?? ""))}</td></tr>)}</tbody>
        </table>
      </Panel>
    </>
  );
}

function SourceDetail({ analytics, clusters, clusterPosts, dailyStats, posts, snapshots, source }: { analytics?: ChannelAnalytics; clusters: Cluster[]; clusterPosts: ClusterPost[]; dailyStats: SourceDailyStat[]; posts: Post[]; snapshots: SourceSnapshot[]; source?: Source }) {
  if (!source) return <Panel title="Канал"><div className="tm-empty">Канал не найден.</div></Panel>;
  const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster]));
  const involved = clusterPosts.filter((row) => row.source_id === source.id);
  const firstRows = involved.filter((row) => row.role === "first");
  const relatedRows = involved.filter((row) => row.role === "related");
  const pickedUpBy = clusterPosts.filter((row) => {
    const cluster = clusterById.get(row.cluster_id);
    return cluster?.first_source_id === source.id && row.source_id !== source.id;
  });
  const pickedFrom = involved.filter((row) => {
    const cluster = clusterById.get(row.cluster_id);
    return row.role === "related" && cluster?.first_source_id !== source.id;
  });
  const topClusters = involved.map((row) => ({ row, cluster: clusterById.get(row.cluster_id) })).filter((item) => item.cluster).sort((a, b) => (b.cluster?.total_views ?? 0) - (a.cluster?.total_views ?? 0)).slice(0, 20);
  return (
    <>
      <Panel title={`Канал: ${source.title}`}>
        <section className="tm-metrics">
          <Metric label="Группа" value={source.group_code ?? ""} />
          <Metric label="Посты периода" value={formatInt(analytics?.posts_count ?? posts.length)} />
          <Metric label="Просмотры" value={formatInt(analytics?.total_views ?? posts.reduce((sum, post) => sum + (post.views ?? 0), 0))} />
          <Metric label="Подписчики" value={formatAvailableInt(analytics?.latest_subscribers ?? source.latest_subscribers)} />
          <Metric label="Первый источник" value={formatInt(analytics?.first_source_count)} />
          <Metric label="Related" value={formatInt(analytics?.related_count)} />
          <Metric label="Группы" value={formatInt(analytics?.clusters_count)} />
        </section>
        <div className="tm-mini-grid">
          <div className="tm-card-row"><span>username</span><strong>{source.username}</strong></div>
          <div className="tm-card-row"><span>Telegram</span><strong>{source.url ? <ExternalLink href={source.url}>открыть</ExternalLink> : "нет"}</strong></div>
          <div className="tm-card-row"><span>Статус</span><strong>{source.status}</strong></div>
          <div className="tm-card-row"><span>active</span><strong>{source.is_active ? "да" : "нет"}</strong></div>
          <div className="tm-card-row"><span>snapshot подписчиков</span><strong>{formatDate(analytics?.latest_subscribers_at ?? source.latest_subscribers_at)}</strong></div>
          <div className="tm-card-row"><span>views/subscribers</span><strong>{formatRatio(analytics?.views_to_subscribers_ratio)}</strong></div>
          <div className="tm-card-row"><span>первый пост</span><strong>{formatDate(analytics?.first_post_at)}</strong></div>
          <div className="tm-card-row"><span>последний пост</span><strong>{formatDate(analytics?.last_post_at)}</strong></div>
        </div>
      </Panel>
      <Panel title="Динамика по дням">
        <ExportButtons name={`source_${source.id}_daily_stats`} rows={dailyStats as unknown as Array<Record<string, unknown>>} />
        <table><thead><tr><th>Дата</th><th>Посты</th><th>Просмотры</th><th>Средние</th><th>Группы</th><th>First</th><th>Related</th></tr></thead><tbody>{dailyStats.map((row) => <tr key={row.date}><td>{row.date}</td><td>{formatInt(row.posts_count)}</td><td>{formatInt(row.total_views)}</td><td>{formatNumber(row.avg_views, 0)}</td><td>{formatInt(row.clusters_count)}</td><td>{formatInt(row.first_source_count)}</td><td>{formatInt(row.related_count)}</td></tr>)}</tbody></table>
      </Panel>
      <Panel title="Кто подхватывал этот канал">
        <RelationTable rows={pickedUpBy} clusterById={clusterById} mode="pickedBy" />
      </Panel>
      <Panel title="У кого канал подхватывал">
        <RelationTable rows={pickedFrom} clusterById={clusterById} mode="pickedFrom" />
      </Panel>
      <Panel title="Топ групп материалов с участием канала">
        <ExportButtons name={`source_${source.id}_clusters`} rows={topClusters.map(({ row, cluster }) => ({ ...row, cluster_title: cluster?.title, cluster_total_views: cluster?.total_views, direction: cluster?.direction, ru_import_type: cluster?.ru_import_type }))} />
        <table><thead><tr><th>Группа</th><th>Заголовок</th><th>Роль</th><th>Время поста</th><th>Лаг</th><th>Просмотры поста</th><th>Просмотры группы</th><th>Без RU</th><th>Direction</th><th>RU import</th></tr></thead><tbody>{topClusters.map(({ row, cluster }) => <tr key={row.id}><td><a href={`/tools/telegram-monitor/clusters/${row.cluster_id}`}>#{row.cluster_id}</a></td><td className="tm-text">{shortText(cluster?.title)}</td><td>{row.role}</td><td>{formatDate(row.published_at)}</td><td>{formatLag(row.lag_seconds)}</td><td>{formatInt(row.views)}</td><td>{formatInt(cluster?.total_views)}</td><td>{formatInt(cluster?.total_views_without_ru)}</td><td>{directionLabels[cluster?.direction ?? ""] ?? cluster?.direction}</td><td>{ruImportLabels[cluster?.ru_import_type ?? ""] ?? cluster?.ru_import_type}</td></tr>)}</tbody></table>
      </Panel>
      <Panel title="Топ публикаций канала">
        <ExportButtons name={`source_${source.id}_posts`} rows={posts as unknown as Array<Record<string, unknown>>} />
        <table><thead><tr><th>Пост</th><th>Время</th><th>Просмотры</th><th>Группа</th><th>Первый?</th><th>Telegram</th><th>Текст</th></tr></thead><tbody>{posts.slice(0, 50).map((post) => { const link = clusterPosts.find((row) => row.post_id === post.id); return <tr key={post.id}><td><a href={`/tools/telegram-monitor/posts/${post.id}`}>#{post.id}</a></td><td>{formatDate(post.published_at)}</td><td>{formatInt(post.views)}</td><td>{link ? <a href={`/tools/telegram-monitor/clusters/${link.cluster_id}`}>#{link.cluster_id}</a> : ""}</td><td>{link?.role === "first" ? "да" : "нет"}</td><td>{post.post_url ? <ExternalLink href={post.post_url}>Telegram</ExternalLink> : ""}</td><td className="tm-text">{shortText(post.text_clean)}</td></tr>; })}</tbody></table>
      </Panel>
      <Panel title="Снимки подписчиков">
        <table><thead><tr><th>Дата</th><th>Подписчики</th><th>Статус</th></tr></thead><tbody>{snapshots.map((row, index) => <tr key={index}><td>{formatDate(row.collected_at)}</td><td>{formatAvailableInt(row.subscribers)}</td><td>{row.status}</td></tr>)}</tbody></table>
      </Panel>
    </>
  );
}

function RelationTable({ clusterById, mode, rows }: { clusterById: Map<number, Cluster>; mode: "pickedBy" | "pickedFrom"; rows: ClusterPost[] }) {
  const grouped = new Map<string, { title: string | null; group: string | null; clusters: Set<number>; posts: number; views: number; lags: number[]; last: string | null }>();
  for (const row of rows) {
    const cluster = clusterById.get(row.cluster_id);
    const key = mode === "pickedBy" ? String(row.source_id) : String(cluster?.first_source_id);
    const title = mode === "pickedBy" ? row.source_title : cluster?.first_source;
    const group = mode === "pickedBy" ? row.group_code : cluster?.first_group;
    const item = grouped.get(key) ?? { title: title ?? "", group: group ?? "", clusters: new Set<number>(), posts: 0, views: 0, lags: [], last: null };
    item.clusters.add(row.cluster_id); item.posts += 1; item.views += row.views ?? 0;
    if (row.lag_seconds !== null && row.lag_seconds !== undefined) item.lags.push(row.lag_seconds);
    if (!item.last || (row.published_at ?? "") > item.last) item.last = row.published_at;
    grouped.set(key, item);
  }
  const tableRows = [...grouped.values()].sort((a, b) => b.clusters.size - a.clusters.size);
  return <table><thead><tr><th>Источник</th><th>Группа</th><th>Группы</th><th>Посты</th><th>Просмотры</th><th>Средний лаг</th><th>Последний раз</th></tr></thead><tbody>{tableRows.map((row, index) => <tr key={index}><td>{row.title}</td><td><Badge>{row.group}</Badge></td><td>{formatInt(row.clusters.size)}</td><td>{formatInt(row.posts)}</td><td>{formatInt(row.views)}</td><td>{formatLag(row.lags.length ? Math.round(row.lags.reduce((sum, lag) => sum + lag, 0) / row.lags.length) : null)}</td><td>{formatDate(row.last)}</td></tr>)}</tbody></table>;
}

function PostDetail({ clusterPosts, clusters, post }: { clusterPosts: ClusterPost[]; clusters: Cluster[]; post?: Post }) {
  if (!post) return <Panel title="Публикация"><div className="tm-empty">Публикация не найдена.</div></Panel>;
  const links = clusterPosts.filter((row) => row.post_id === post.id);
  const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster]));
  const primary = links.map((link) => clusterById.get(link.cluster_id)).filter(Boolean).sort((a, b) => (b?.total_views ?? 0) - (a?.total_views ?? 0))[0];
  const related = primary ? clusterPosts.filter((row) => row.cluster_id === primary.id) : [];
  const ownLink = links.find((link) => link.cluster_id === primary?.id);
  return (
    <>
      <Panel title={`Публикация #${post.id}`}>
        <section className="tm-metrics">
          <Metric label="Источник" value={post.source_title ?? ""} />
          <Metric label="Группа" value={post.group_code ?? ""} />
          <Metric label="Просмотры поста" value={formatInt(post.views)} />
          <Metric label="Подписчики поста" value={formatAvailableInt(post.subscribers)} />
        </section>
        <div className="tm-notice">{post.post_url ? <ExternalLink href={post.post_url}>Открыть в Telegram</ExternalLink> : null}<p>{post.text_clean}</p></div>
      </Panel>
      <Panel title="Распространение этого материала">
        {primary ? (
          <>
            <section className="tm-metrics">
              <Metric label="Первый в группе?" value={ownLink?.role === "first" ? "да" : "нет"} />
              <Metric label="content_cluster_id" value={`#${primary.id}`} />
              <Metric label="Публикаций в группе" value={formatInt(primary.posts_count)} />
              <Metric label="Источников в группе" value={formatInt(primary.sources_count)} />
              <Metric label="Просмотры всей группы" value={formatInt(primary.total_views)} />
              <Metric label="Просмотры без RU" value={formatInt(primary.total_views_without_ru)} />
              <Metric label="Только RU" value={formatInt(primary.total_views_only_ru)} />
            </section>
            <div className="tm-mini-grid">
              <div className="tm-card-row"><span>первый источник</span><strong>{primary.first_source}</strong></div>
              <div className="tm-card-row"><span>first_seen_at</span><strong>{formatDate(primary.first_seen_at)}</strong></div>
              <div className="tm-card-row"><span>direction</span><strong>{directionLabels[primary.direction ?? ""] ?? primary.direction}</strong></div>
              <div className="tm-card-row"><span>ru_import_type</span><strong>{ruImportLabels[primary.ru_import_type ?? ""] ?? primary.ru_import_type}</strong></div>
              <div className="tm-card-row"><span>подписчики всей группы</span><strong>{formatAvailableInt(primary.total_subscribers)}</strong></div>
              <div className="tm-card-row"><span>подписчики без RU</span><strong>{formatAvailableInt(primary.total_subscribers_without_ru)}</strong></div>
              <div className="tm-card-row"><span>подписчики только RU</span><strong>{formatAvailableInt(primary.total_subscribers_only_ru)}</strong></div>
              <div className="tm-card-row"><span>views/subs</span><strong>{formatRatio(primary.views_to_subscribers_ratio)}</strong></div>
            </div>
            <a href={`/tools/telegram-monitor/clusters/${primary.id}`}>Открыть группу материалов</a>
          </>
        ) : <div className="tm-empty">Связанные публикации пока не найдены.</div>}
      </Panel>
      {primary ? <RelatedPostsTable rows={related} title="Связанные публикации" /> : null}
    </>
  );
}

function ClusterDetail({ cluster, posts }: { cluster?: Cluster; posts: ClusterPost[] }) {
  if (!cluster) return <Panel title="Группа материалов"><div className="tm-empty">Группа не найдена.</div></Panel>;
  return (
    <>
      <Panel title={`Группа материалов #${cluster.id}`}>
        <section className="tm-metrics">
          <Metric label="Просмотры" value={formatInt(cluster.total_views)} />
          <Metric label="Без RU" value={formatInt(cluster.total_views_without_ru)} />
          <Metric label="Только RU" value={formatInt(cluster.total_views_only_ru)} />
          <Metric label="Публикации" value={formatInt(cluster.posts_count)} />
          <Metric label="Источники" value={formatInt(cluster.sources_count)} />
          <Metric label="Подписчики" value={formatAvailableInt(cluster.total_subscribers)} />
        </section>
        <div className="tm-mini-grid">
          <div className="tm-card-row"><span>title</span><strong>{shortText(cluster.title, 140)}</strong></div>
          <div className="tm-card-row"><span>first_source</span><strong>{cluster.first_source}</strong></div>
          <div className="tm-card-row"><span>first_group</span><strong>{cluster.first_group ?? cluster.first_source_group}</strong></div>
          <div className="tm-card-row"><span>first_seen_at</span><strong>{formatDate(cluster.first_seen_at)}</strong></div>
          <div className="tm-card-row"><span>direction</span><strong>{directionLabels[cluster.direction ?? ""] ?? cluster.direction}</strong></div>
          <div className="tm-card-row"><span>ru_import_type</span><strong>{ruImportLabels[cluster.ru_import_type ?? ""] ?? cluster.ru_import_type}</strong></div>
          <div className="tm-card-row"><span>BY/RU posts</span><strong>{formatInt(cluster.by_posts_count)} / {formatInt(cluster.ru_posts_count)}</strong></div>
          <div className="tm-card-row"><span>BY/RU sources</span><strong>{formatInt(cluster.by_sources_count)} / {formatInt(cluster.ru_sources_count)}</strong></div>
          <div className="tm-card-row"><span>matched RU</span><strong>{cluster.matched_ru_cluster_id ? <a href={`/tools/telegram-monitor/clusters/${cluster.matched_ru_cluster_id}`}>#{cluster.matched_ru_cluster_id}</a> : "нет"}</strong></div>
          <div className="tm-card-row"><span>RU lag/confidence</span><strong>{formatLag(cluster.ru_lag_seconds)} / {formatRatio(cluster.ru_match_confidence)}</strong></div>
          <div className="tm-card-row"><span>reason</span><strong>{cluster.ru_match_reason}</strong></div>
        </div>
      </Panel>
      <RelatedPostsTable rows={posts} title="Публикации группы" />
      <Panel title="Ручные нарративы">
        <div className="tm-notice">LLM не используется. Ручные действия с нарративами остаются в локальной панели мониторинга; в Vercel snapshot-разделе они показаны как данные, без фальшивых кнопок записи.</div>
      </Panel>
    </>
  );
}

function RelatedPostsTable({ rows, title }: { rows: ClusterPost[]; title: string }) {
  return (
    <Panel title={title}>
      <ExportButtons name={title.toLowerCase().replaceAll(" ", "_")} rows={rows as unknown as Array<Record<string, unknown>>} />
      <table><thead><tr><th>Роль</th><th>Источник</th><th>BY/RU</th><th>Время</th><th>Лаг</th><th>Просмотры</th><th>Подписчики</th><th>Тип связи</th><th>Telegram</th><th>Текст</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{roleLabels[row.role ?? ""] ?? row.role}</td><td>{row.source_id ? <a href={`/tools/telegram-monitor/sources/${row.source_id}`}>{row.source_title}</a> : row.source_title}</td><td><Badge>{row.group_code}</Badge></td><td>{formatDate(row.published_at)}</td><td>{formatLag(row.lag_seconds)}</td><td>{formatInt(row.views)}</td><td>{formatAvailableInt(row.subscribers)}</td><td>{relationLabels[row.relation_type ?? ""] ?? row.relation_type}</td><td>{row.post_url ? <ExternalLink href={row.post_url}>Telegram</ExternalLink> : ""}</td><td className="tm-text">{shortText(row.text_clean)}</td></tr>)}</tbody></table>
    </Panel>
  );
}

function ExportButtons({ name, rows }: { name: string; rows: Array<Record<string, unknown>> }) {
  return (
    <div className="tm-export-row">
      <button onClick={() => downloadRows(name, rows, "csv")} type="button">CSV</button>
      <button onClick={() => downloadRows(name, rows, "json")} type="button">JSON</button>
      <button onClick={() => downloadRows(name, rows, "markdown")} type="button">Markdown</button>
    </div>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="tm-panel">
      <h2>{title}</h2>
      <div className="tm-table-wrap">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="tm-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="tm-badge">{children}</span>;
}

function ExternalLink({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  );
}

function SortableTh<T>({
  label,
  name,
  setSort,
  sort,
}: {
  label: string;
  name: keyof T;
  setSort: (sort: { key: keyof T; direction: Direction }) => void;
  sort: { key: keyof T; direction: Direction };
}) {
  const active = sort.key === name;
  const nextDirection = active && sort.direction === "asc" ? "desc" : "asc";

  return (
    <th>
      <button
        className="tm-sort"
        onClick={() => setSort({ key: name, direction: nextDirection })}
        type="button"
      >
        {label}
        <span>{active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>
  );
}

const styles = `
.tm-main {
  min-height: calc(100vh - 56px);
  background: #f7f8fa;
  color: #17202a;
  padding: 24px;
}
.tm-shell {
  display: grid;
  gap: 18px;
  margin: 0 auto;
  max-width: 1440px;
}
.tm-header {
  align-items: flex-start;
  display: flex;
  gap: 18px;
  justify-content: space-between;
}
.tm-eyebrow {
  color: #687385;
  font-size: 14px;
  margin: 0 0 6px;
}
.tm-header h1 {
  font-size: 30px;
  letter-spacing: 0;
  margin: 0;
}
.tm-header p {
  color: #687385;
  line-height: 1.5;
  margin: 10px 0 0;
  max-width: 850px;
}
.tm-stamp {
  background: white;
  border: 1px solid #dfe4ea;
  border-radius: 8px;
  display: grid;
  gap: 4px;
  min-width: 210px;
  padding: 12px;
}
.tm-stamp span,
.tm-metric span,
.tm-list-item span {
  color: #687385;
}
.tm-tabs {
  background: white;
  border: 1px solid #dfe4ea;
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px;
}
.tm-tabs button,
.tm-sort {
  background: transparent;
  border: 0;
  color: #687385;
  cursor: pointer;
  font: inherit;
}
.tm-tabs button {
  border-radius: 6px;
  font-weight: 700;
  padding: 8px 10px;
}
.tm-tabs button.active,
.tm-tabs button:hover {
  background: #d9f0ec;
  color: #0f766e;
}
.tm-filters {
  align-items: end;
  background: white;
  border: 1px solid #dfe4ea;
  border-radius: 8px;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(240px, 1.5fr) repeat(5, minmax(130px, 1fr));
  padding: 12px;
}
.tm-filters label {
  color: #687385;
  display: grid;
  font-size: 12px;
  gap: 4px;
}
.tm-filters input,
.tm-filters select,
.tm-inline-filters input,
.tm-inline-filters select {
  background: white;
  border: 1px solid #dfe4ea;
  border-radius: 6px;
  color: #17202a;
  font: inherit;
  min-height: 36px;
  padding: 7px 8px;
  width: 100%;
}
.tm-inline-filters,
.tm-chip-row,
.tm-export-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 14px 12px;
}
.tm-chip-row button,
.tm-export-row button {
  background: white;
  border: 1px solid #dfe4ea;
  border-radius: 6px;
  color: #0f766e;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 7px 10px;
}
.tm-chip-row button.active,
.tm-chip-row button:hover,
.tm-export-row button:hover {
  background: #d9f0ec;
}
.tm-metrics {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
}
.tm-metric,
.tm-notice,
.tm-panel,
.tm-card-row,
.tm-list-item {
  background: white;
  border: 1px solid #dfe4ea;
  border-radius: 8px;
}
.tm-metric {
  display: grid;
  gap: 4px;
  padding: 14px;
}
.tm-metric strong {
  font-size: 28px;
}
.tm-notice {
  line-height: 1.55;
  padding: 14px;
}
.tm-panel-note {
  color: #687385;
  line-height: 1.5;
  padding: 0 14px 12px;
}
code {
  background: #101820;
  border-radius: 6px;
  color: #f4f7f9;
  display: inline-block;
  padding: 3px 6px;
}
.tm-grid-2 {
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(240px, .8fr) minmax(320px, 1.2fr);
}
.tm-grid-2 h2,
.tm-panel h2 {
  font-size: 18px;
  letter-spacing: 0;
  margin: 0 0 10px;
}
.tm-mini-grid,
.tm-list {
  display: grid;
  gap: 8px;
}
.tm-card-row {
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 12px;
}
.tm-list-item {
  display: grid;
  gap: 4px;
  padding: 12px;
}
.tm-panel {
  overflow: hidden;
}
.tm-panel h2 {
  padding: 14px 14px 0;
}
.tm-table-wrap {
  overflow-x: auto;
}
table {
  border-collapse: collapse;
  font-size: 13px;
  width: 100%;
}
th,
td {
  border-bottom: 1px solid #dfe4ea;
  padding: 9px 10px;
  text-align: left;
  vertical-align: top;
}
th {
  background: #fbfcfd;
  color: #687385;
  font-weight: 700;
  white-space: nowrap;
}
a {
  color: #0f766e;
  font-weight: 700;
  text-decoration: none;
}
.tm-sort {
  align-items: center;
  color: #687385;
  display: inline-flex;
  font-weight: 700;
  gap: 5px;
  padding: 0;
  white-space: nowrap;
}
.tm-badge {
  background: #d9f0ec;
  border-radius: 999px;
  color: #0f766e;
  display: inline-block;
  font-size: 12px;
  font-weight: 800;
  padding: 2px 7px;
}
.tm-text {
  line-height: 1.4;
  min-width: 260px;
  max-width: 520px;
}
.tm-detail-cell {
  background: #fbfcfd;
  padding: 10px;
}
.tm-detail-cell summary {
  color: #0f766e;
  cursor: pointer;
  font-weight: 800;
}
.tm-related {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}
.tm-related-row {
  align-items: center;
  background: white;
  border: 1px solid #dfe4ea;
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 10px;
}
.tm-related-row span {
  color: #687385;
}
.tm-related-text {
  flex-basis: 100%;
  line-height: 1.4;
}
.tm-empty {
  color: #687385;
  padding: 14px;
}
@media (max-width: 900px) {
  .tm-main {
    padding: 16px;
  }
  .tm-header {
    display: grid;
  }
  .tm-filters,
  .tm-grid-2 {
    grid-template-columns: 1fr;
  }
}
`;
