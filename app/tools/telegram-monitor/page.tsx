import snapshot from "./snapshot.json";
import type { CSSProperties, ReactNode } from "react";

type Snapshot = typeof snapshot;
type Cluster = Snapshot["clusters"][number];
type ClusterPost = Snapshot["cluster_posts"][number];
type Post = Snapshot["posts"][number];
type Match = Snapshot["matches"][number];

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

function shortText(value: string | null | undefined, limit = 190) {
  const text = value ?? "";
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function formatLag(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }
  if (Math.abs(value) < 60) {
    return `${value} с`;
  }
  const minutes = Math.floor(Math.abs(value) / 60);
  const seconds = Math.abs(value) % 60;
  return `${value < 0 ? "-" : ""}${minutes} мин ${seconds} с`;
}

function metric(label: string, value: string | number) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );
}

export default function TelegramMonitorPage() {
  const clusterPostsById = new Map<number, ClusterPost[]>();
  for (const post of snapshot.cluster_posts) {
    const rows = clusterPostsById.get(post.cluster_id) ?? [];
    rows.push(post);
    clusterPostsById.set(post.cluster_id, rows);
  }

  return (
    <main data-testid="telegram-monitor-page" style={styles.main}>
      <section style={styles.shell}>
        <div>
          <p style={styles.eyebrow}>Tools / research</p>
          <h1 style={styles.title}>Telegram Monitor</h1>
          <p style={styles.subtitle}>
            Задеплоенный snapshot локального MVP мониторинга Telegram. Данные
            лежат отдельно от memory database и собраны из отдельной SQLite-базы
            мониторинга.
          </p>
        </div>

        <section style={styles.metrics}>
          {metric("Источники", formatInt(snapshot.counts.sources))}
          {metric("Посты", formatInt(snapshot.counts.posts))}
          {metric("Совпадения", formatInt(snapshot.counts.matches))}
          {metric("Группы материалов", formatInt(snapshot.counts.clusters))}
          {metric("Нарративы", formatInt(snapshot.counts.narratives))}
        </section>

        <section style={styles.notice}>
          <strong>Методологические ограничения.</strong> Суммарные просмотры группы
          материалов — это сумма просмотров публикаций, не уникальный охват.
          Подписчики при публичном сборе могут быть недоступны; в таком случае
          показывается “недоступно”, а не 0. Группы построены по сходству текста
          и времени публикации, без LLM.
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Источники по группам</h2>
          <div style={styles.groupGrid}>
            {snapshot.sources_by_group.map((row) => (
              <div key={row.group_code} style={styles.groupCard}>
                <span>{row.group_code}</span>
                <strong>{formatInt(row.count)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Группы материалов</h2>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Заголовок</Th>
                  <Th>Первый источник</Th>
                  <Th>Первое появление</Th>
                  <Th>Публикации</Th>
                  <Th>Источники</Th>
                  <Th>Просмотры</Th>
                  <Th>Подписчики</Th>
                  <Th>Views/subs</Th>
                  <Th>Состав</Th>
                  <Th>Тип</Th>
                  <Th>Уверенность</Th>
                </tr>
              </thead>
              <tbody>
                {snapshot.clusters.map((cluster) => (
                  <ClusterRow
                    key={cluster.id}
                    cluster={cluster}
                    posts={clusterPostsById.get(cluster.id) ?? []}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Последние посты</h2>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Источник</Th>
                  <Th>Группа</Th>
                  <Th>Опубликован</Th>
                  <Th>Просмотры</Th>
                  <Th>Подписчики</Th>
                  <Th>Telegram</Th>
                  <Th>Текст</Th>
                </tr>
              </thead>
              <tbody>
                {snapshot.posts.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Совпадения</h2>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Сходство</Th>
                  <Th>Тип</Th>
                  <Th>Источник A</Th>
                  <Th>Пост A</Th>
                  <Th>Источник B</Th>
                  <Th>Пост B</Th>
                </tr>
              </thead>
              <tbody>
                {snapshot.matches.map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function ClusterRow({ cluster, posts }: { cluster: Cluster; posts: ClusterPost[] }) {
  return (
    <>
      <tr>
        <Td>#{cluster.id}</Td>
        <Td>{shortText(cluster.title, 120)}</Td>
        <Td>{cluster.first_source}</Td>
        <Td>{cluster.first_seen_at}</Td>
        <Td>{cluster.posts_count}</Td>
        <Td>{cluster.sources_count}</Td>
        <Td>{formatInt(cluster.total_views)}</Td>
        <Td>{formatAvailableInt(cluster.total_subscribers)}</Td>
        <Td>{formatRatio(cluster.views_to_subscribers_ratio)}</Td>
        <Td>{groupMixLabels[cluster.group_mix] ?? cluster.group_mix}</Td>
        <Td>{sourceTypeLabels[cluster.source_type] ?? cluster.source_type}</Td>
        <Td>{cluster.source_confidence}</Td>
      </tr>
      {posts.length > 0 ? (
        <tr>
          <td colSpan={12} style={styles.clusterPostsCell}>
            <div style={styles.clusterPosts}>
              {posts.map((post) => (
                <div key={`${post.cluster_id}-${post.post_id}`} style={styles.clusterPost}>
                  <strong>{roleLabels[post.role] ?? post.role}</strong>
                  <span>{post.source_title}</span>
                  <span>{post.group_code}</span>
                  <span>{post.published_at}</span>
                  <span>лаг: {formatLag(post.lag_seconds)}</span>
                  <span>просмотры: {formatInt(post.views)}</span>
                  <span>{relationLabels[post.relation_type] ?? post.relation_type}</span>
                  {post.post_url ? (
                    <a href={post.post_url} rel="noreferrer" target="_blank">
                      Telegram
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function PostRow({ post }: { post: Post }) {
  return (
    <tr>
      <Td>#{post.id}</Td>
      <Td>{post.source_title}</Td>
      <Td>{post.group_code}</Td>
      <Td>{post.published_at}</Td>
      <Td>{formatInt(post.views)}</Td>
      <Td>{formatAvailableInt(post.subscribers)}</Td>
      <Td>
        {post.post_url ? (
          <a href={post.post_url} rel="noreferrer" target="_blank">
            Telegram
          </a>
        ) : null}
      </Td>
      <Td>{shortText(post.text_clean)}</Td>
    </tr>
  );
}

function MatchRow({ match }: { match: Match }) {
  return (
    <tr>
      <Td>#{match.id}</Td>
      <Td>{match.similarity}</Td>
      <Td>{match.match_type}</Td>
      <Td>{match.source_a}</Td>
      <Td>{match.msg_a}</Td>
      <Td>{match.source_b}</Td>
      <Td>{match.msg_b}</Td>
    </tr>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th style={styles.th}>{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td style={styles.td}>{children}</td>;
}

const styles: Record<string, CSSProperties> = {
  main: {
    minHeight: "calc(100vh - 56px)",
    background: "#f7f8fa",
    color: "#17202a",
    padding: 24,
    fontFamily: "system-ui",
  },
  shell: {
    maxWidth: 1320,
    margin: "0 auto",
    display: "grid",
    gap: 18,
  },
  eyebrow: {
    color: "#687385",
    margin: "0 0 6px",
  },
  title: {
    fontSize: 30,
    margin: 0,
  },
  subtitle: {
    color: "#687385",
    maxWidth: 820,
    lineHeight: 1.5,
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
  },
  metric: {
    border: "1px solid #dfe4ea",
    borderRadius: 8,
    background: "white",
    padding: 14,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: 750,
  },
  metricLabel: {
    color: "#687385",
    marginTop: 4,
  },
  notice: {
    border: "1px solid #dfe4ea",
    borderRadius: 8,
    background: "white",
    padding: 14,
    lineHeight: 1.55,
  },
  section: {
    display: "grid",
    gap: 10,
  },
  heading: {
    fontSize: 18,
    margin: "10px 0 0",
  },
  groupGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
  },
  groupCard: {
    border: "1px solid #dfe4ea",
    borderRadius: 8,
    background: "white",
    padding: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #dfe4ea",
    borderRadius: 8,
    background: "white",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    verticalAlign: "top",
    color: "#687385",
    background: "#fbfcfd",
    borderBottom: "1px solid #dfe4ea",
    padding: "9px 10px",
    whiteSpace: "nowrap",
  },
  td: {
    textAlign: "left",
    verticalAlign: "top",
    borderBottom: "1px solid #dfe4ea",
    padding: "9px 10px",
  },
  clusterPostsCell: {
    borderBottom: "1px solid #dfe4ea",
    padding: 10,
    background: "#fbfcfd",
  },
  clusterPosts: {
    display: "grid",
    gap: 6,
  },
  clusterPost: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 12px",
    color: "#687385",
  },
};
