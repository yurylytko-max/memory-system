import Link from "next/link"

export default function CardsWorkspaceSelectPage() {
  return (
    <main className="min-h-screen bg-muted/40 p-10" data-testid="cards-workspace-entry">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-muted-foreground hover:text-black"
        >
          ← Назад
        </Link>

        <h1 className="mb-2 text-3xl font-bold">База знаний</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Выбери изолированное пространство, с которым хочешь работать.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <WorkspaceCard
            href="/cards/space/life"
            title="жизнь"
            description="Личная база знаний, существующие карточки по умолчанию находятся здесь."
            testId="workspace-life"
          />
          <WorkspaceCard
            href="/cards/space/work"
            title="работа"
            description="Отдельное рабочее пространство с полной изоляцией карточек и сфер."
            testId="workspace-work"
          />
        </div>
      </div>
    </main>
  )
}

function WorkspaceCard({
  href,
  title,
  description,
  testId,
}: {
  href: string
  title: string
  description: string
  testId: string
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="mb-3 text-sm uppercase tracking-[0.2em] text-muted-foreground">
        Пространство
      </div>
      <h2 className="mb-3 text-2xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
