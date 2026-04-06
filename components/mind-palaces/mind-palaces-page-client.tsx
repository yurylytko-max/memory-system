"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { MindPalace } from "@/lib/mind-palaces";

type MindPalacesResponse = {
  items?: MindPalace[];
  error?: string;
};

type MindPalaceResponse = {
  item?: MindPalace;
  error?: string;
};

async function readJsonSafely<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return { error: raw.trim() || "Сервер вернул некорректный ответ." } as T;
  }
}

export default function MindPalacesPageClient() {
  const router = useRouter();
  const [items, setItems] = useState<MindPalace[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch("/api/mind-palaces", {
          cache: "no-store",
        });
        const data = await readJsonSafely<MindPalacesResponse>(response);

        if (!response.ok) {
          throw new Error(data.error ?? "Не удалось загрузить чертоги.");
        }

        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить чертоги.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/mind-palaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });
      const data = await readJsonSafely<MindPalaceResponse>(response);

      if (!response.ok || !data.item) {
        throw new Error(data.error ?? "Не удалось создать чертог.");
      }

      router.push(`/mind-palaces/${data.item.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось создать чертог.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f1e7] px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="text-sm text-slate-600 transition hover:text-slate-950"
        >
          ← Назад
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-[#d8cdb6] bg-[#fffaf0] p-8 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Чертоги разума
            </div>
            <h1 className="mt-3 text-4xl font-semibold text-slate-950">Маршруты памяти</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">
              Система помогает зафиксировать устойчивый линейный маршрут из опорных образов,
              проверить его вперёд, назад и по номеру, а затем довести до автоматического
              воспроизведения.
            </p>
            <div className="mt-8 rounded-3xl border border-dashed border-[#d8cdb6] bg-white/70 p-5">
              <div className="text-sm font-medium text-slate-900">Правила маршрута</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>5–15 точек.</li>
                <li>Только линейный порядок, без пропусков и прыжков.</li>
                <li>Точка должна быть конкретным визуальным образом.</li>
                <li>Маршрут становится рабочим только после трёх проверок.</li>
              </ul>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Создание
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Новый чертог</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Выбери знакомое место и дай ему короткое название. Дальше система проведёт тебя от
              входа по точкам маршрута.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleCreate}>
              <label className="block text-sm font-medium text-slate-800">
                Название знакомого места
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Например: моя квартира"
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Создаём..." : "Создать чертог"}
              </button>
            </form>
          </section>
        </div>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Список
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Текущие чертоги</h2>
            </div>
          </div>

          {isLoading ? (
            <p className="mt-6 text-sm text-slate-600">Загружаем чертоги...</p>
          ) : items.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600">
              Пока нет ни одного чертога. Начни с одного знакомого маршрута.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/mind-palaces/${item.id}`}
                  className="rounded-[1.5rem] border border-slate-200 bg-[#fffdf7] p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="text-sm font-medium text-slate-950">{item.title}</div>
                  <div className="mt-2 text-sm text-slate-600">
                    Статус: {item.status === "stable" ? "стабилен" : "в процессе"}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Точек: {item.route.loci.length}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
