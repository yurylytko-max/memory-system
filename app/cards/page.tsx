import Link from "next/link"

import { CARD_WORKSPACE_META, CARD_WORKSPACES, type CardWorkspace } from "@/lib/cards"

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

        <div className="grid gap-6 md:grid-cols-3">
          {CARD_WORKSPACES.map(workspace => (
            <WorkspaceCard
              key={workspace}
              workspace={workspace}
              href={`/cards/space/${workspace}`}
              title={CARD_WORKSPACE_META[workspace].label}
              description={CARD_WORKSPACE_META[workspace].description}
              testId={`workspace-${workspace}`}
            />
          ))}
        </div>
      </div>
    </main>
  )
}

function WorkspaceCard({
  workspace,
  href,
  title,
  description,
  testId,
}: {
  workspace: CardWorkspace
  href: string
  title: string
  description: string
  testId: string
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      data-workspace={workspace}
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
