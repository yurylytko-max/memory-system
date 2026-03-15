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
          description="Задачи и дедлайны"
          href="/planner"
        />

        <Card
          title="База знаний"
          description="Карточки и теги"
          href="/cards"
        />

        <Card
          title="Новая карточка"
          description="Создать элемент знания"
          href="/cards/new"
        />

        <Card
          title="Писательское пространство"
          description="Писать и соединять идеи"
          href="/editor"
        />

        <Card
          title="Тексты"
          description="Отдельная среда с PlateJS"
          href="/texts"
        />

        <Card
          title="Языковая среда"
          description="Учебник → уроки → упражнения → карточки"
          href="/import"
        />
      </div>
    </main>
  );
}

function Card({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
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
      <div style={{ marginTop: 6, opacity: 0.7 }}>{description}</div>
    </Link>
  );
}
