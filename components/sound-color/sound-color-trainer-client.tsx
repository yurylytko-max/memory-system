"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  COLOR_PALETTE,
  NOTE_DEFINITIONS,
  SOUND_COLOR_STORAGE_KEY,
  createPreciseColorFromBase,
  createSoundColorProfile,
  findProblemNotes,
  getBoundedHue,
  getBoundedHueRange,
  getCalibratedNoteProfiles,
  getColorOptionById,
  getNextProblemNoteId,
  getTrainerUserState,
  normalizeSoundColorProfile,
  recordCalibrationChoice,
  recordTrainingAttempt,
  setTrainerUiMode,
  type ConfidenceLevel,
  type NoteProfile,
  type PreciseColor,
  type SoundColorProfile,
} from "@/lib/sound-color-trainer";

type Screen = "start" | "calibration" | "training" | "reverse" | "stats";

type PendingConfidence = {
  noteId: string;
  color: PreciseColor;
  reactionTime: number;
};

type ActivePrompt = {
  noteId: string;
  startedAt: number;
  expiresAt: number;
};

type ColorRefinementSession = {
  mode: "calibration" | "training";
  noteId: string;
  reactionTime: number;
  selectedColor: PreciseColor;
};

const RESPONSE_WINDOW_MS = 4000;
const HUE_VARIANCE = 24;

function getSignedHueOffset(center: number, hue: number) {
  const rawOffset = ((hue - center + 540) % 360) - 180;

  return Math.max(-HUE_VARIANCE, Math.min(HUE_VARIANCE, rawOffset));
}

function getStatusLabel(profile: SoundColorProfile) {
  const state = getTrainerUserState(profile);

  if (state === "new") {
    return "Новый";
  }

  if (state === "in_progress") {
    return "В процессе";
  }

  return "Закрепление";
}

function readProfileFromStorage() {
  if (typeof window === "undefined") {
    return createSoundColorProfile();
  }

  const raw = window.localStorage.getItem(SOUND_COLOR_STORAGE_KEY);

  if (!raw) {
    return createSoundColorProfile();
  }

  try {
    return normalizeSoundColorProfile(JSON.parse(raw));
  } catch {
    return createSoundColorProfile();
  }
}

export default function SoundColorTrainerClient() {
  const [profile, setProfile] = useState<SoundColorProfile>(() => createSoundColorProfile());
  const [screen, setScreen] = useState<Screen>("start");
  const [isHydrated, setIsHydrated] = useState(false);
  const [activePrompt, setActivePrompt] = useState<ActivePrompt | null>(null);
  const [pendingConfidence, setPendingConfidence] = useState<PendingConfidence | null>(null);
  const [colorRefinement, setColorRefinement] = useState<ColorRefinementSession | null>(null);
  const [trainingRound, setTrainingRound] = useState(0);
  const [reverseRound, setReverseRound] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [countdownMs, setCountdownMs] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const refinementDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const nextProfile = readProfileFromStorage();
    setProfile(nextProfile);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SOUND_COLOR_STORAGE_KEY, JSON.stringify(profile));
  }, [isHydrated, profile]);

  useEffect(() => {
    if (!activePrompt) {
      setCountdownMs(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, activePrompt.expiresAt - Date.now());
      setCountdownMs(remaining);

      if (remaining === 0) {
        setActivePrompt(null);
        setFeedback("Время вышло. Повтори попытку.");
      }
    };

    updateCountdown();

    const intervalId = window.setInterval(updateCountdown, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activePrompt]);

  useEffect(() => {
    return () => {
      void audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!colorRefinement) {
      return;
    }

    refinementDialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setColorRefinement(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [colorRefinement]);

  const calibratedNotes = getCalibratedNoteProfiles(profile);
  const problemNotes = findProblemNotes(profile);
  const calibrationIndex = profile.noteProfiles.findIndex((noteProfile) => !noteProfile.baseColor);
  const currentCalibrationNote = calibrationIndex >= 0 ? NOTE_DEFINITIONS[calibrationIndex] : null;
  const currentTrainingNoteId = getNextProblemNoteId(profile, trainingRound);
  const currentTrainingProfile = currentTrainingNoteId
    ? profile.noteProfiles.find((noteProfile) => noteProfile.noteId === currentTrainingNoteId) ?? null
    : null;
  const currentReverseProfile = calibratedNotes.length > 0
    ? calibratedNotes[reverseRound % calibratedNotes.length] ?? null
    : null;
  const refinementRange = colorRefinement
    ? getBoundedHueRange(colorRefinement.selectedColor.baseId, HUE_VARIANCE)
    : null;

  async function ensureAudioContext() {
    if (typeof window === "undefined") {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }

  async function playNote(noteId: string) {
    const note = NOTE_DEFINITIONS.find((item) => item.id === noteId);

    if (!note) {
      return;
    }

    const audioContext = await ensureAudioContext();

    if (!audioContext) {
      return;
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(note.frequency, now);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 1.08);
  }

  async function startPrompt(noteId: string) {
    setFeedback("");
    await playNote(noteId);
    const now = Date.now();
    setActivePrompt({
      noteId,
      startedAt: now,
      expiresAt: now + RESPONSE_WINDOW_MS,
    });
  }

  function saveProfile(nextProfile: SoundColorProfile) {
    setProfile(nextProfile);
  }

  function handleCalibrationColor(baseId: string) {
    if (!activePrompt || !currentCalibrationNote || activePrompt.noteId !== currentCalibrationNote.id) {
      return;
    }

    const reactionTime = Date.now() - activePrompt.startedAt;
    setActivePrompt(null);
    setColorRefinement({
      mode: "calibration",
      noteId: currentCalibrationNote.id,
      selectedColor: createPreciseColorFromBase(baseId),
      reactionTime,
    });
  }

  function handleCalibrationConfidence(confidenceLevel: ConfidenceLevel) {
    if (!pendingConfidence) {
      return;
    }

    const nextProfile = recordCalibrationChoice(profile, {
      noteId: pendingConfidence.noteId,
      color: pendingConfidence.color,
      reactionTime: pendingConfidence.reactionTime,
      confidenceLevel,
    });

    saveProfile(nextProfile);
    setPendingConfidence(null);
    setFeedback("Ассоциация сохранена.");

    const remainingUncalibrated = nextProfile.noteProfiles.some((noteProfile) => !noteProfile.baseColor);

    if (!remainingUncalibrated) {
      setScreen("training");
      setFeedback("Калибровка завершена. Можно переходить к повторению.");
    }
  }

  function handleTrainingColor(baseId: string) {
    if (!activePrompt || !currentTrainingProfile || activePrompt.noteId !== currentTrainingProfile.noteId) {
      return;
    }

    const reactionTime = Date.now() - activePrompt.startedAt;
    setActivePrompt(null);
    setColorRefinement({
      mode: "training",
      noteId: currentTrainingProfile.noteId,
      selectedColor: createPreciseColorFromBase(baseId),
      reactionTime,
    });
  }

  function handleReverseAnswer(selectedNoteId: string) {
    if (!currentReverseProfile) {
      return;
    }

    const nextProfile = recordTrainingAttempt(profile, {
      noteId: currentReverseProfile.noteId,
      direction: "color_to_sound",
      selectedNoteId,
      reactionTime: 0,
    });
    const updatedNote = nextProfile.noteProfiles.find(
      (noteProfile) => noteProfile.noteId === currentReverseProfile.noteId
    );

    saveProfile(nextProfile);
    setReverseRound((value) => value + 1);
    setFeedback(updatedNote?.trainingAttempts.at(-1)?.correct ? "Верно." : "Неверно.");
  }

  function handleReset() {
    const nextProfile = createSoundColorProfile();
    saveProfile(nextProfile);
    setScreen("start");
    setActivePrompt(null);
    setPendingConfidence(null);
    setColorRefinement(null);
    setFeedback("Профиль очищен.");
    setTrainingRound(0);
    setReverseRound(0);
  }

  function handleRefinementColorChange(
    field: "h" | "s" | "l",
    nextValue: number
  ) {
    if (!colorRefinement) {
      return;
    }

    setColorRefinement({
      ...colorRefinement,
      selectedColor: createPreciseColorFromBase(colorRefinement.selectedColor.baseId, {
        h:
          field === "h"
            ? getBoundedHue(colorRefinement.selectedColor.baseId, nextValue)
            : colorRefinement.selectedColor.h,
        s: field === "s" ? nextValue : colorRefinement.selectedColor.s,
        l: field === "l" ? nextValue : colorRefinement.selectedColor.l,
      }),
    });
  }

  function confirmRefinedColor() {
    if (!colorRefinement) {
      return;
    }

    if (colorRefinement.mode === "calibration") {
      setPendingConfidence({
        noteId: colorRefinement.noteId,
        color: colorRefinement.selectedColor,
        reactionTime: colorRefinement.reactionTime,
      });
      setColorRefinement(null);
      return;
    }

    const nextProfile = recordTrainingAttempt(profile, {
      noteId: colorRefinement.noteId,
      direction: "sound_to_color",
      selectedColor: colorRefinement.selectedColor,
      reactionTime: colorRefinement.reactionTime,
    });
    const updatedNote = nextProfile.noteProfiles.find(
      (noteProfile) => noteProfile.noteId === colorRefinement.noteId
    );

    saveProfile(nextProfile);
    setColorRefinement(null);
    setTrainingRound((value) => value + 1);
    setFeedback(updatedNote?.trainingAttempts.at(-1)?.correct ? "Совпало." : "Не совпало.");
  }

  function renderPalette(onPick: (baseId: string) => void, selectedColor?: PreciseColor) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {COLOR_PALETTE.map((colorOption) => {
          const isSelected = selectedColor?.baseId === colorOption.id;

          return (
            <button
              key={colorOption.id}
              type="button"
              onClick={() => onPick(colorOption.id)}
              className="rounded-[1.25rem] border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
              style={{
                outline: isSelected ? "2px solid #111827" : undefined,
              }}
            >
              <div
                className="h-12 rounded-xl"
                style={{ background: colorOption.hex }}
              />
              <div className="mt-2 text-sm font-medium text-slate-900">{colorOption.label}</div>
              <div className="mt-1 text-xs text-slate-500">Уточнить после клика</div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderScreenNavigation() {
    const items: { id: Screen; label: string; disabled?: boolean }[] = [
      { id: "start", label: "Старт" },
      { id: "calibration", label: "Калибровка" },
      { id: "training", label: "Тренировка", disabled: calibratedNotes.length === 0 },
      { id: "reverse", label: "Обратная проверка", disabled: calibratedNotes.length === 0 },
      { id: "stats", label: "Статистика" },
    ];

    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              setScreen(item.id);
              setFeedback("");
              setActivePrompt(null);
              setPendingConfidence(null);
              setColorRefinement(null);
            }}
            className="rounded-full border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: screen === item.id ? "#111827" : "#ffffff",
              color: screen === item.id ? "#ffffff" : "#111827",
              borderColor: "#d1d5db",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  function renderStartScreen() {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Статус
        </div>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">Звук → цвет</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">
          Локальный тренажёр устойчивых аудиовизуальных якорей. Сначала нота вызывает цвет,
          затем связь проверяется в обе стороны.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <MetricCard label="Состояние" value={getStatusLabel(profile)} />
          <MetricCard label="Калибровано нот" value={`${calibratedNotes.length}/${NOTE_DEFINITIONS.length}`} />
          <MetricCard label="Проблемных нот" value={String(problemNotes.length)} />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setScreen("calibration")}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white"
          >
            Начать калибровку
          </button>
          <button
            type="button"
            onClick={() => setScreen("training")}
            disabled={calibratedNotes.length === 0}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Перейти к повторению
          </button>
          <button
            type="button"
            onClick={() => setScreen("reverse")}
            disabled={calibratedNotes.length === 0}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Обратная проверка
          </button>
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
          <div className="text-sm font-medium text-slate-900">Режим подсказок</div>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => saveProfile(setTrainerUiMode(profile, "withColor"))}
              className="rounded-full border px-4 py-2 text-sm"
              style={{
                background: profile.uiMode === "withColor" ? "#111827" : "#ffffff",
                color: profile.uiMode === "withColor" ? "#ffffff" : "#111827",
              }}
            >
              С цветом
            </button>
            <button
              type="button"
              onClick={() => saveProfile(setTrainerUiMode(profile, "noColor"))}
              className="rounded-full border px-4 py-2 text-sm"
              style={{
                background: profile.uiMode === "noColor" ? "#111827" : "#ffffff",
                color: profile.uiMode === "noColor" ? "#ffffff" : "#111827",
              }}
            >
              Без цвета
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderCalibrationScreen() {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Калибровка
        </div>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">Быстрая реакция на звук</h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          Слушай ноту и сразу выбирай цвет. На ответ даётся 4 секунды. Название ноты заранее не
          показывается.
        </p>

        {!currentCalibrationNote ? (
          <div className="mt-8 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            Все 12 нот уже откалиброваны. Можно переходить к тренировке.
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm text-slate-600">
                Шаг {calibrationIndex + 1} из {NOTE_DEFINITIONS.length}
              </div>
              <button
                type="button"
                onClick={() => startPrompt(currentCalibrationNote.id)}
                disabled={Boolean(activePrompt) || Boolean(pendingConfidence)}
                className="mt-4 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Проиграть ноту
              </button>
              {activePrompt ? (
                <div className="mt-3 text-sm text-slate-700">
                  Выбери цвет сейчас. Осталось: {(countdownMs / 1000).toFixed(1)} сек.
                </div>
              ) : null}
            </div>

            {pendingConfidence ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-medium text-slate-900">Оцени уверенность</div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {(["low", "mid", "high"] as ConfidenceLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleCalibrationConfidence(level)}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900"
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              renderPalette(handleCalibrationColor)
            )}
          </div>
        )}
      </section>
    );
  }

  function renderTrainingScreen() {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Тренировка
        </div>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">Звук → цвет</h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          Система подаёт ноту и ждёт цвет. Совпадение проверяется с сохранённой ассоциацией и
          временем реакции.
        </p>

        {!currentTrainingProfile ? (
          <div className="mt-8 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Сначала нужна хотя бы одна откалиброванная нота.
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <button
                type="button"
                onClick={() => startPrompt(currentTrainingProfile.noteId)}
                disabled={Boolean(activePrompt)}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Проиграть ноту
              </button>
              {activePrompt ? (
                <div className="mt-3 text-sm text-slate-700">
                  Выбери цвет сейчас. Осталось: {(countdownMs / 1000).toFixed(1)} сек.
                </div>
              ) : null}
              <div className="mt-3 text-sm text-slate-600">
                Цель: закрепить стабильное мгновенное соответствие.
              </div>
            </div>

            {renderPalette(handleTrainingColor, currentTrainingProfile.baseColor)}

            {currentTrainingProfile.baseColor && profile.uiMode === "withColor" ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm text-slate-600">Сохранённый цвет текущей ноты</div>
                <div
                  className="mt-3 h-14 rounded-2xl border border-slate-200"
                  style={{ background: currentTrainingProfile.baseColor.hex }}
                />
              </div>
            ) : null}
          </div>
        )}
      </section>
    );
  }

  function renderReverseScreen() {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Обратная проверка
        </div>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">Цвет → звук</h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          Цвет показывается как якорь, а ответом становится нота. Это обязательная обратная связь
          для закрепления.
        </p>

        {!currentReverseProfile?.baseColor ? (
          <div className="mt-8 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Обратная проверка откроется после калибровки хотя бы одной ноты.
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm text-slate-600">Определи ноту по цвету</div>
              <div
                className="mt-4 h-24 rounded-[1.5rem] border border-slate-200"
                style={{ background: currentReverseProfile.baseColor.hex }}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {NOTE_DEFINITIONS.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => handleReverseAnswer(note.id)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                >
                  {note.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  function renderStatsScreen() {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Диагностика
        </div>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">Проблемные ноты</h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          Список собирается по нестабильности, уверенности и скорости реакции.
        </p>

        {problemNotes.length === 0 ? (
          <div className="mt-8 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            Проблемные ноты пока не обнаружены.
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {problemNotes.map((problem) => {
              const noteProfile = profile.noteProfiles.find(
                (item) => item.noteId === problem.noteId
              ) as NoteProfile | undefined;

              return (
                <div
                  key={problem.noteId}
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{problem.noteId}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Стабильность: {problem.stabilityScore.toFixed(2)}. Уверенность:{" "}
                        {problem.confidenceScore.toFixed(2)}.
                      </div>
                    </div>
                    {noteProfile?.baseColor ? (
                      <div
                        className="h-10 w-24 rounded-xl border border-slate-200"
                        style={{ background: noteProfile.baseColor.hex }}
                      />
                    ) : null}
                  </div>
                  <div className="mt-3 text-sm text-slate-700">
                    {problem.reasons.join(", ")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3efe7] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm text-slate-600 transition hover:text-slate-950"
          >
            ← Назад
          </Link>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900"
          >
            Сбросить локальные данные
          </button>
        </div>

        <div className="mt-6 rounded-[2rem] border border-[#d7cebf] bg-[#fffaf0] p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                MVP
              </div>
              <div className="mt-3 text-4xl font-semibold text-slate-950">
                Тренировка слуха через цветовые якоря
              </div>
              <div className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
                Минимальный режим без внешних API и без сервера: Web Audio API, локальное хранение,
                калибровка, повторение, обратная проверка и простая диагностика.
              </div>
            </div>
            {renderScreenNavigation()}
          </div>
        </div>

        <div className="mt-8">
          {screen === "start" ? renderStartScreen() : null}
          {screen === "calibration" ? renderCalibrationScreen() : null}
          {screen === "training" ? renderTrainingScreen() : null}
          {screen === "reverse" ? renderReverseScreen() : null}
          {screen === "stats" ? renderStatsScreen() : null}
        </div>

        {feedback ? (
          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-sm">
            {feedback}
          </div>
        ) : null}

        {colorRefinement ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4"
            onClick={() => setColorRefinement(null)}
          >
            <div
              ref={refinementDialogRef}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl outline-none"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Уточнение цвета
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950">Выбери точный оттенок</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Уточнение ограничено вокруг выбранного базового цвета. Ответ сохранится только после
                подтверждения.
              </p>

              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {getColorOptionById(colorRefinement.selectedColor.baseId)?.label ?? "Цвет"}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {colorRefinement.selectedColor.hex} · H {Math.round(colorRefinement.selectedColor.h)} · S{" "}
                      {Math.round(colorRefinement.selectedColor.s * 100)}% · L{" "}
                      {Math.round(colorRefinement.selectedColor.l * 100)}%
                    </div>
                  </div>
                  <div
                    className="h-16 w-24 rounded-2xl border border-slate-200"
                    style={{ background: colorRefinement.selectedColor.hex }}
                  />
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-900">
                    Hue ({Math.round(colorRefinement.selectedColor.h)}°)
                  </div>
                  <input
                    type="range"
                    min={-HUE_VARIANCE}
                    max={HUE_VARIANCE}
                    value={refinementRange ? getSignedHueOffset(refinementRange.center, colorRefinement.selectedColor.h) : 0}
                    onChange={(event) => {
                      if (!refinementRange) {
                        return;
                      }

                      handleRefinementColorChange(
                        "h",
                        refinementRange.center + Number(event.target.value)
                      );
                    }}
                    className="w-full"
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Диапазон: {refinementRange ? `${Math.round(refinementRange.center - HUE_VARIANCE)}° … ${Math.round(refinementRange.center + HUE_VARIANCE)}°` : ""}
                  </div>
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-900">
                    Saturation ({Math.round(colorRefinement.selectedColor.s * 100)}%)
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(colorRefinement.selectedColor.s * 100)}
                    onChange={(event) =>
                      handleRefinementColorChange("s", Number(event.target.value) / 100)
                    }
                    className="w-full"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-900">
                    Lightness ({Math.round(colorRefinement.selectedColor.l * 100)}%)
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={85}
                    value={Math.round(colorRefinement.selectedColor.l * 100)}
                    onChange={(event) =>
                      handleRefinementColorChange("l", Number(event.target.value) / 100)
                    }
                    className="w-full"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setColorRefinement(null)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={confirmRefinedColor}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
                >
                  Подтвердить
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!isHydrated ? (
          <div className="mt-6 text-sm text-slate-500">Загружаем локальный профиль...</div>
        ) : null}
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}
