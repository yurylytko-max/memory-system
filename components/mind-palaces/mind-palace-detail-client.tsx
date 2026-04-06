"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type {
  MindPalace,
  MindPalaceCheckInput,
  MindPalaceCheckMode,
  MindPalaceLocus,
} from "@/lib/mind-palaces";

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

function getStageLabel(palace: MindPalace) {
  if (palace.stage === "creation") {
    return "создание";
  }

  if (palace.stage === "fixation") {
    return "фиксация";
  }

  if (palace.stage === "verification") {
    return "проверка";
  }

  if (palace.stage === "reinforcement") {
    return "закрепление";
  }

  return "готов к добавлению информации";
}

function getStatusLabel(palace: MindPalace) {
  return palace.status === "stable" ? "стабилен" : "в процессе";
}

export default function MindPalaceDetailClient({
  palaceId,
}: {
  palaceId: string;
}) {
  const [palace, setPalace] = useState<MindPalace | null>(null);
  const [routeDraft, setRouteDraft] = useState<string[]>([]);
  const [currentPoint, setCurrentPoint] = useState("");
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [forwardAnchor, setForwardAnchor] = useState(1);
  const [forwardAnswer, setForwardAnswer] = useState("");
  const [backwardAnchor, setBackwardAnchor] = useState(2);
  const [backwardAnswer, setBackwardAnswer] = useState("");
  const [randomPosition, setRandomPosition] = useState(1);
  const [randomAnswer, setRandomAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [isChecking, setIsChecking] = useState<null | MindPalaceCheckMode>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/mind-palaces/${palaceId}`, {
          cache: "no-store",
        });
        const data = await readJsonSafely<MindPalaceResponse>(response);

        if (!response.ok || !data.item) {
          throw new Error(data.error ?? "Не удалось загрузить чертог.");
        }

        if (!cancelled) {
          setPalace(data.item);
          setRouteDraft(data.item.route.loci.map((locus) => locus.cue));
          setForwardAnchor(1);
          setBackwardAnchor(Math.min(2, data.item.route.loci.length || 2));
          setRandomPosition(1);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить чертог.");
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
  }, [palaceId]);

  const routeLoci = useMemo(() => palace?.route.loci ?? [], [palace]);
  const canRunChecks = routeLoci.length >= 5;

  function syncWithPalace(nextPalace: MindPalace) {
    setPalace(nextPalace);
    setRouteDraft(nextPalace.route.loci.map((locus) => locus.cue));
    setForwardAnchor(1);
    setBackwardAnchor(Math.min(2, nextPalace.route.loci.length || 2));
    setRandomPosition(1);
  }

  function handleAddPoint() {
    const value = currentPoint.trim();

    if (!value) {
      setError("Нужен конкретный визуальный образ точки.");
      return;
    }

    if (routeDraft.length >= 15) {
      setError("В маршруте может быть максимум 15 точек.");
      return;
    }

    setRouteDraft((current) => [...current, value]);
    setCurrentPoint("");
    setError("");
  }

  function handleRemoveLastPoint() {
    setRouteDraft((current) => current.slice(0, -1));
    setError("");
  }

  async function handleSaveRoute() {
    if (!palace) {
      return;
    }

    setIsSavingRoute(true);
    setError("");
    setMessage("");

    try {
      const loci: MindPalaceLocus[] = routeDraft.map((value, index) => ({
        position: index + 1,
        description: value.trim(),
        cue: value.trim(),
        linked_images: [],
      }));
      const response = await fetch(`/api/mind-palaces/${palace.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: palace.title,
          loci,
        }),
      });
      const data = await readJsonSafely<MindPalaceResponse>(response);

      if (!response.ok || !data.item) {
        throw new Error(data.error ?? "Не удалось сохранить маршрут.");
      }

      syncWithPalace(data.item);
      setIsEditingRoute(false);
      setMessage("Маршрут сохранён. Теперь пройди его мысленно и переходи к проверке.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить маршрут.");
    } finally {
      setIsSavingRoute(false);
    }
  }

  async function runCheck(input: MindPalaceCheckInput) {
    if (!palace) {
      return;
    }

    setIsChecking(input.mode);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/mind-palaces/${palace.id}/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const data = await readJsonSafely<MindPalaceResponse>(response);

      if (!response.ok || !data.item) {
        throw new Error(data.error ?? "Не удалось выполнить проверку.");
      }

      syncWithPalace(data.item);
      setForwardAnswer("");
      setBackwardAnswer("");
      setRandomAnswer("");
      setMessage(
        data.item.status === "stable"
          ? "Маршрут стабилизирован. Теперь он готов к следующему этапу."
          : data.item.stage === "fixation"
            ? "Есть ошибка. Вернись к маршруту и снова пройди его мысленно."
            : "Проверка засчитана. Продолжай до полного воспроизведения без подсказок."
      );
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : "Не удалось выполнить проверку.");
    } finally {
      setIsChecking(null);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f6f1e7] px-6 py-10">
        <div className="mx-auto max-w-5xl text-sm text-slate-700">Загружаем чертог...</div>
      </main>
    );
  }

  if (!palace) {
    return (
      <main className="min-h-screen bg-[#f6f1e7] px-6 py-10">
        <div className="mx-auto max-w-5xl text-sm text-red-700">
          {error || "Чертог не найден."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f1e7] px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/mind-palaces"
          className="text-sm text-slate-600 transition hover:text-slate-950"
        >
          ← К списку чертогов
        </Link>

        <section className="mt-6 rounded-[2rem] border border-[#d8cdb6] bg-[#fffaf0] p-8 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Чертог
              </div>
              <h1 className="mt-3 text-4xl font-semibold text-slate-950">{palace.title}</h1>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              <div>Статус: {getStatusLabel(palace)}</div>
              <div>Этап: {getStageLabel(palace)}</div>
              <div>Точек: {routeLoci.length}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Создание
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Построить маршрут</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Начни с входа и двигайся только вперёд. Система фиксирует точку за точкой без
                пропусков и прыжков.
              </p>

              {!isEditingRoute && routeLoci.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsEditingRoute(true)}
                  className="mt-5 rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                >
                  Редактировать маршрут
                </button>
              ) : null}

              {isEditingRoute || routeLoci.length === 0 ? (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-[#d8cdb6] bg-[#fffdf7] p-4 text-sm leading-7 text-slate-700">
                    <div>1. Выбери знакомое место.</div>
                    <div>2. Начни с входа.</div>
                    <div>3. На каждом шаге отвечай: что первое видишь?</div>
                  </div>

                  <label className="block text-sm font-medium text-slate-800">
                    Что первое видишь? Точка №{routeDraft.length + 1}
                    <input
                      value={currentPoint}
                      onChange={(event) => setCurrentPoint(event.target.value)}
                      placeholder="Например: дверь"
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleAddPoint}
                      className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Добавить точку
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLastPoint}
                      disabled={routeDraft.length === 0}
                      className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Удалить последнюю
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRoute}
                      disabled={isSavingRoute}
                      className="rounded-2xl border border-[#d8cdb6] bg-[#fff1c8] px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-[#ffe7a2] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingRoute ? "Сохраняем..." : "Сохранить маршрут"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-[#fcfbf7] p-5">
                <div className="text-sm font-medium text-slate-900">Фиксация маршрута</div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  После сохранения система показывает список точек. Пройди маршрут мысленно от
                  первой до последней без пропусков.
                </p>
                {routeDraft.length > 0 ? (
                  <div className="mt-4 space-y-2 rounded-2xl bg-white p-4 font-mono text-sm text-slate-800">
                    {routeDraft.map((point, index) => (
                      <div key={`${point}-${index}`}>
                        {index + 1}. {point}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">Маршрут пока не зафиксирован.</p>
                )}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Проверка
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Воспроизведение</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Маршрут считается рабочим только если ты проходишь его вперёд, назад и по номеру
                без подсказок.
              </p>

              <div className="mt-5 space-y-3 text-sm text-slate-700">
                <div>
                  Прямой порядок: {palace.verification.forward_passed ? "пройден" : "не пройден"}
                </div>
                <div>
                  Обратный порядок:{" "}
                  {palace.verification.backward_passed ? "пройден" : "не пройден"}
                </div>
                <div>
                  Случайный доступ:{" "}
                  {palace.verification.random_access_passed ? "пройден" : "не пройден"}
                </div>
              </div>

              {!canRunChecks ? (
                <p className="mt-6 text-sm text-slate-600">
                  Сначала зафиксируй маршрут минимум из пяти точек.
                </p>
              ) : (
                <div className="mt-6 space-y-6">
                  <form
                    className="rounded-2xl border border-slate-200 bg-[#fcfbf7] p-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void runCheck({
                        mode: "forward",
                        anchor_position: forwardAnchor,
                        answer: forwardAnswer,
                      });
                    }}
                  >
                    <div className="text-sm font-medium text-slate-900">Прямой порядок</div>
                    <div className="mt-3 grid gap-3">
                      <label className="text-sm text-slate-700">
                        Что после точки
                        <select
                          value={forwardAnchor}
                          onChange={(event) => setForwardAnchor(Number(event.target.value))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                        >
                          {routeLoci.slice(0, -1).map((locus) => (
                            <option key={`forward-${locus.position}`} value={locus.position}>
                              {locus.position}. {locus.cue}
                            </option>
                          ))}
                        </select>
                      </label>
                      <input
                        value={forwardAnswer}
                        onChange={(event) => setForwardAnswer(event.target.value)}
                        placeholder="Ответ без подсказок"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={isChecking === "forward"}
                        className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isChecking === "forward" ? "Проверяем..." : "Проверить"}
                      </button>
                    </div>
                  </form>

                  <form
                    className="rounded-2xl border border-slate-200 bg-[#fcfbf7] p-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void runCheck({
                        mode: "backward",
                        anchor_position: backwardAnchor,
                        answer: backwardAnswer,
                      });
                    }}
                  >
                    <div className="text-sm font-medium text-slate-900">Обратный порядок</div>
                    <div className="mt-3 grid gap-3">
                      <label className="text-sm text-slate-700">
                        Что перед точкой
                        <select
                          value={backwardAnchor}
                          onChange={(event) => setBackwardAnchor(Number(event.target.value))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                        >
                          {routeLoci.slice(1).map((locus) => (
                            <option key={`backward-${locus.position}`} value={locus.position}>
                              {locus.position}. {locus.cue}
                            </option>
                          ))}
                        </select>
                      </label>
                      <input
                        value={backwardAnswer}
                        onChange={(event) => setBackwardAnswer(event.target.value)}
                        placeholder="Ответ без подсказок"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={isChecking === "backward"}
                        className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isChecking === "backward" ? "Проверяем..." : "Проверить"}
                      </button>
                    </div>
                  </form>

                  <form
                    className="rounded-2xl border border-slate-200 bg-[#fcfbf7] p-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void runCheck({
                        mode: "random_access",
                        target_position: randomPosition,
                        answer: randomAnswer,
                      });
                    }}
                  >
                    <div className="text-sm font-medium text-slate-900">Случайный доступ</div>
                    <div className="mt-3 grid gap-3">
                      <label className="text-sm text-slate-700">
                        Назови точку по номеру
                        <select
                          value={randomPosition}
                          onChange={(event) => setRandomPosition(Number(event.target.value))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                        >
                          {routeLoci.map((locus) => (
                            <option key={`random-${locus.position}`} value={locus.position}>
                              Точка №{locus.position}
                            </option>
                          ))}
                        </select>
                      </label>
                      <input
                        value={randomAnswer}
                        onChange={(event) => setRandomAnswer(event.target.value)}
                        placeholder="Ответ без подсказок"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={isChecking === "random_access"}
                        className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isChecking === "random_access" ? "Проверяем..." : "Проверить"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </section>
          </div>

          {message ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
