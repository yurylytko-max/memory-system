import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  hasValidSiteAuthCookie,
  isSitePasswordProtectionEnabled,
  SITE_AUTH_COOKIE,
} from "@/lib/auth"

type LoginPageProps = {
  searchParams: Promise<{
    error?: string
    next?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SITE_AUTH_COOKIE)?.value

  if (await hasValidSiteAuthCookie(sessionCookie)) {
    redirect(params.next || "/")
  }

  const isProtectionEnabled = isSitePasswordProtectionEnabled()
  const hasError = params.error === "1"

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-stone-950 px-6 py-12 text-stone-50"
      data-testid="login-page"
    >
      <div className="w-full max-w-md rounded-3xl border border-stone-800 bg-stone-900/90 p-8 shadow-2xl shadow-black/30">
        <p className="text-sm uppercase tracking-[0.28em] text-stone-400">
          Memory System
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Вход в систему</h1>
        <p className="mt-3 text-sm leading-6 text-stone-300">
          Доступ к сайту открыт только после ввода пароля.
        </p>

        {!isProtectionEnabled ? (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Защита пока не включена. Добавьте переменную окружения
            {" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">
              SITE_PASSWORD
            </code>
            {" "}
            и перезапустите приложение.
          </div>
        ) : null}

        <form
          action="/api/auth/login"
          method="post"
          className="mt-8 space-y-4"
          data-testid="login-form"
        >
          <input type="hidden" name="next" value={params.next || "/"} />

          <label className="block">
            <span className="mb-2 block text-sm text-stone-300">Пароль</span>
            <input
              type="password"
              name="password"
              required
              autoFocus
              data-testid="login-password-input"
              className="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-base text-stone-50 outline-none transition focus:border-stone-500"
              placeholder="Введите пароль"
            />
          </label>

          {hasError ? (
            <div
              className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              data-testid="login-error"
            >
              Неверный пароль.
            </div>
          ) : null}

          <button
            type="submit"
            data-testid="login-submit-button"
            className="w-full rounded-2xl bg-stone-50 px-4 py-3 text-sm font-medium text-stone-950 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isProtectionEnabled}
          >
            Войти
          </button>
        </form>
      </div>
    </main>
  )
}
