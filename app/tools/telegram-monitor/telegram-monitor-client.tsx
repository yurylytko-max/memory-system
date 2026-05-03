"use client";

import { useEffect, useMemo, useState } from "react";

type Direction = "asc" | "desc";
type Tab = "overview" | "sources" | "posts" | "matches" | "clusters" | "narratives";
type GroupFilter = "all" | "BY" | "RU";
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
  narratives: Narrative[];
  narrative_clusters: NarrativeCluster[];
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Обзор" },
  { id: "sources", label: "Источники" },
  { id: "posts", label: "Посты" },
  { id: "matches", label: "Совпадения" },
  { id: "clusters", label: "Группы материалов" },
  { id: "narratives", label: "Нарративы" },
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

export default function TelegramMonitorClient() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<GroupFilter>("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");
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
        inPeriod(match.created_at ?? match.published_a ?? match.published_b, range) &&
        includesText([match.id, match.source_a, match.source_b, match.msg_a, match.msg_b, match.match_type], query),
    );
    return sortRows(rows, matchSort);
  }, [snapshot, group, query, range, matchSort]);

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
        inPeriod(cluster.first_seen_at, range) &&
        includesText([cluster.id, cluster.title, cluster.first_source, cluster.source_type, cluster.group_mix], query),
    );
    return sortRows(rows, clusterSort);
  }, [snapshot, group, query, range, clusterSort, clusterPostsById]);

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
          <MatchesTable rows={filteredMatches} setSort={setMatchSort} sort={matchSort} />
        ) : null}

        {snapshot && activeTab === "clusters" ? (
          <ClustersTable
            clusterPostsById={clusterPostsById}
            rows={filteredClusters}
            setSort={setClusterSort}
            sort={clusterSort}
          />
        ) : null}

        {snapshot && activeTab === "narratives" ? (
          <NarrativesTable clusters={snapshot.narrative_clusters} rows={snapshot.narratives} />
        ) : null}
      </section>
    </main>
  );
}

function Overview({
  clusters,
  matches,
  periodSummary,
  posts,
  snapshot,
  sources,
}: {
  clusters: Cluster[];
  matches: Match[];
  periodSummary: string;
  posts: Post[];
  snapshot: Snapshot;
  sources: Source[];
}) {
  const totalViews = clusters.reduce((sum, cluster) => sum + (cluster.total_views ?? 0), 0);

  return (
    <>
      <section className="tm-metrics">
        <Metric label="Источники" value={formatInt(sources.length)} />
        <Metric label="Посты" value={formatInt(posts.length)} />
        <Metric label="Совпадения" value={formatInt(matches.length)} />
        <Metric label="Группы материалов" value={formatInt(clusters.length)} />
        <Metric label="Суммарные просмотры групп" value={formatInt(totalViews)} />
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
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((source) => (
            <tr key={source.id}>
              <td>#{source.id}</td>
              <td><Badge>{source.group_code}</Badge></td>
              <td>{source.title}</td>
              <td>{source.username}</td>
              <td>{source.status}</td>
              <td>{source.is_active ? "да" : "нет"}</td>
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
              <td>{post.source_title}</td>
              <td><Badge>{post.group_code}</Badge></td>
              <td>{formatDate(post.published_at)}</td>
              <td>{formatInt(post.views)}</td>
              <td>{formatAvailableInt(post.subscribers)}</td>
              <td>{post.post_url ? <ExternalLink href={post.post_url}>Telegram</ExternalLink> : null}</td>
              <td className="tm-text">{shortText(post.text_clean)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function MatchesTable({
  rows,
  setSort,
  sort,
}: {
  rows: Match[];
  setSort: (sort: { key: keyof Match; direction: Direction }) => void;
  sort: { key: keyof Match; direction: Direction };
}) {
  return (
    <Panel title={`Совпадения: ${formatInt(rows.length)}`}>
      <table>
        <thead>
          <tr>
            <SortableTh label="ID" name="id" setSort={setSort} sort={sort} />
            <SortableTh label="Сходство" name="similarity" setSort={setSort} sort={sort} />
            <SortableTh label="Тип" name="match_type" setSort={setSort} sort={sort} />
            <SortableTh label="Источник A" name="source_a" setSort={setSort} sort={sort} />
            <SortableTh label="Источник B" name="source_b" setSort={setSort} sort={sort} />
            <th>Посты</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function ClustersTable({
  clusterPostsById,
  rows,
  setSort,
  sort,
}: {
  clusterPostsById: Map<number, ClusterPost[]>;
  rows: Cluster[];
  setSort: (sort: { key: keyof Cluster; direction: Direction }) => void;
  sort: { key: keyof Cluster; direction: Direction };
}) {
  return (
    <Panel title={`Группы материалов: ${formatInt(rows.length)}`}>
      <table>
        <thead>
          <tr>
            <SortableTh label="ID" name="id" setSort={setSort} sort={sort} />
            <SortableTh label="Заголовок" name="title" setSort={setSort} sort={sort} />
            <SortableTh label="Первый источник" name="first_source" setSort={setSort} sort={sort} />
            <SortableTh label="Первое появление" name="first_seen_at" setSort={setSort} sort={sort} />
            <SortableTh label="Публикации" name="posts_count" setSort={setSort} sort={sort} />
            <SortableTh label="Источники" name="sources_count" setSort={setSort} sort={sort} />
            <SortableTh label="Просмотры" name="total_views" setSort={setSort} sort={sort} />
            <SortableTh label="Подписчики" name="total_subscribers" setSort={setSort} sort={sort} />
            <SortableTh label="Views/subs" name="views_to_subscribers_ratio" setSort={setSort} sort={sort} />
            <SortableTh label="Состав" name="group_mix" setSort={setSort} sort={sort} />
            <SortableTh label="Тип" name="source_type" setSort={setSort} sort={sort} />
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
        <td className="tm-text">{shortText(cluster.title, 120)}</td>
        <td>{cluster.first_source}</td>
        <td>{formatDate(cluster.first_seen_at)}</td>
        <td>{cluster.posts_count}</td>
        <td>{cluster.sources_count}</td>
        <td>{formatInt(cluster.total_views)}</td>
        <td>{formatAvailableInt(cluster.total_subscribers)}</td>
        <td>{formatRatio(cluster.views_to_subscribers_ratio)}</td>
        <td>{groupMixLabels[cluster.group_mix ?? ""] ?? cluster.group_mix}</td>
        <td>{sourceTypeLabels[cluster.source_type ?? ""] ?? cluster.source_type}</td>
        <td>{cluster.source_confidence}</td>
      </tr>
      <tr>
        <td className="tm-detail-cell" colSpan={12}>
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
  grid-template-columns: minmax(240px, 1.5fr) repeat(4, minmax(130px, 1fr));
  padding: 12px;
}
.tm-filters label {
  color: #687385;
  display: grid;
  font-size: 12px;
  gap: 4px;
}
.tm-filters input,
.tm-filters select {
  background: white;
  border: 1px solid #dfe4ea;
  border-radius: 6px;
  color: #17202a;
  font: inherit;
  min-height: 36px;
  padding: 7px 8px;
  width: 100%;
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
