import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 40,
        fontFamily: "system-ui",
      }}
    >
      <h1 style={{ fontSize: 36, marginBottom: 40 }}>Система памяти</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        <Card
          title="Планировщик"
          href="/planner"
        />

        <Card
          title="База знаний"
          href="/cards"
        />

        <Card
          title="Новая карточка"
          href="/cards/new"
        />

        <Card
          title="Тексты"
          href="/texts"
        />

        <Card
          title="Учебники 2.0"
          href="/study"
        />
      </div>
    </main>
  );
}

function Card({
  title,
  href,
}: {
  title: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      style={{
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 20,
        textDecoration: "none",
        color: "black",
        background: "#f7f7f7",
        display: "block",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
    </Link>
  );
}
