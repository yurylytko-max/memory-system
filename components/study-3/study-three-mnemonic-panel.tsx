"use client";

import { useMemo, useState, type ReactNode } from "react";

import type {
  VocabularyItem,
  VocabularyMnemonic,
  VocabularyMnemonicChain,
  VocabularyMnemonicChainElement,
  VocabularyMnemonicChainLink,
  VocabularyMnemonicImage,
  VocabularyMnemonicLinkedWord,
  VocabularyMnemonicMode,
  VocabularyMnemonicNested,
  VocabularyMnemonicNestedNode,
  VocabularyMnemonicSound,
} from "@/lib/vocabulary";
import { getVocabularyMnemonicCue } from "@/lib/vocabulary";

type MnemonicPanelProps = {
  item: VocabularyItem;
  allItems: VocabularyItem[];
  onClose: () => void;
  onSaved: (item: VocabularyItem) => void;
};

type SavedItemResponse = {
  item?: VocabularyItem;
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

function createDefaultMnemonic(mode: VocabularyMnemonicMode): VocabularyMnemonic {
  if (mode === "sound") {
    return { kind: "sound" };
  }

  if (mode === "image") {
    return { kind: "image" };
  }

  if (mode === "linked_word") {
    return { kind: "linked_word" };
  }

  if (mode === "chain") {
    return { kind: "chain", elements: [], links: [] };
  }

  return { kind: "nested" };
}

function simplifyError(value: string, maxLength = 80) {
  if (!value.trim()) {
    return "Нужен короткий конкретный ответ.";
  }

  if (value.trim().length > maxLength) {
    return "Слишком сложно. Упрости до короткой связи.";
  }

  return "";
}

async function saveMnemonic(
  itemId: string,
  body: Record<string, unknown>
) {
  const response = await fetch(`/api/vocabulary/${itemId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await readJsonSafely<SavedItemResponse>(response);

  if (!response.ok || !data.item) {
    throw new Error(data.error ?? "Не удалось сохранить мнемотехнику.");
  }

  return data.item;
}

async function deleteMnemonic(itemId: string) {
  const response = await fetch(`/api/vocabulary/${itemId}?scope=mnemonic`, {
    method: "DELETE",
  });
  const data = await readJsonSafely<SavedItemResponse>(response);

  if (!response.ok || !data.item) {
    throw new Error(data.error ?? "Не удалось удалить мнемотехнику.");
  }

  return data.item;
}

export default function StudyThreeMnemonicPanel({
  item,
  allItems,
  onClose,
  onSaved,
}: MnemonicPanelProps) {
  const [mode, setMode] = useState<VocabularyMnemonicMode | null>(item.mnemonic_mode ?? null);
  const [draft, setDraft] = useState<VocabularyMnemonic | undefined>(item.mnemonic);
  const [stage, setStage] = useState<"choose" | "edit" | "verify" | "done">("choose");
  const [showStructureChoice, setShowStructureChoice] = useState(false);
  const [verifyAnswer, setVerifyAnswer] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const relatedItems = useMemo(
    () => allItems.filter((entry) => entry.id !== item.id),
    [allItems, item.id]
  );
  const cue = useMemo(() => {
    if (!draft || !mode) {
      return "";
    }

    return getVocabularyMnemonicCue({
      ...item,
      mnemonic_mode: mode,
      mnemonic: draft,
    });
  }, [draft, item, mode]);

  async function startMode(nextMode: VocabularyMnemonicMode) {
    setIsSaving(true);
    setError("");

    try {
      const initialDraft =
        item.mnemonic_mode === nextMode && item.mnemonic
          ? item.mnemonic
          : createDefaultMnemonic(nextMode);
      const updatedItem = await saveMnemonic(item.id, {
        mnemonic_status: "in_progress",
        mnemonic_mode: nextMode,
        mnemonic: initialDraft,
      });

      setMode(nextMode);
      setDraft(updatedItem.mnemonic);
      setShowStructureChoice(false);
      setStage("edit");
      onSaved(updatedItem);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось включить мнемотехнику.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDraftReady(nextDraft: VocabularyMnemonic) {
    if (!mode) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const updatedItem = await saveMnemonic(item.id, {
        mnemonic_status: "in_progress",
        mnemonic_mode: mode,
        mnemonic: nextDraft,
      });

      setDraft(updatedItem.mnemonic);
      setStage("verify");
      onSaved(updatedItem);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить мнемотехнику.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleVerify() {
    if (!mode || !draft) {
      return;
    }

    const normalizedAnswer = verifyAnswer.trim().toLocaleLowerCase("de-DE");
    const success = normalizedAnswer === item.text.trim().toLocaleLowerCase("de-DE");

    setIsSaving(true);
    setError("");

    try {
      const updatedItem = await saveMnemonic(item.id, {
        mnemonic_status: success ? "anchored" : "in_progress",
        mnemonic_mode: mode,
        mnemonic: draft,
        verify_success: success,
      });

      onSaved(updatedItem);
      setResultMessage(
        success
          ? "Связь закреплена. Теперь она будет усиливать слабые повторения."
          : "Связь пока не сработала. Система предлагает упростить и переделать её."
      );
      setStage(success ? "done" : "edit");
      if (success) {
        setVerifyAnswer("");
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось завершить проверку.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteMnemonic() {
    setIsSaving(true);
    setError("");

    try {
      const updatedItem = await deleteMnemonic(item.id);
      setMode(null);
      setDraft(undefined);
      setStage("choose");
      setShowStructureChoice(false);
      setVerifyAnswer("");
      setResultMessage("Мнемотехника удалена. Можно собрать новую связь.");
      onSaved(updatedItem);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить мнемотехнику.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-[#fffdf7] p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Мнемотехника
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Создать крючок</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Система не придумывает связь за вас. Она задаёт короткие вопросы и помогает удержать
            ассоциацию простой и структурированной.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.mnemonic_status !== "none" || draft ? (
            <button
              type="button"
              onClick={() => void handleDeleteMnemonic()}
              disabled={isSaving}
              className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              Удалить мнемотехнику
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Закрыть
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {resultMessage ? (
        <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {resultMessage}
        </div>
      ) : null}

      {stage === "choose" ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
          {MNEMONIC_MODES.map((entry) => (
            <button
              key={entry.mode}
              type="button"
              onClick={() => {
                if (entry.mode === "structure") {
                  setShowStructureChoice(true);
                  return;
                }

                void startMode(entry.mode);
              }}
              disabled={isSaving}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left transition hover:border-slate-300 hover:shadow-sm disabled:opacity-60"
            >
              <div className="text-lg font-semibold text-slate-950">{entry.label}</div>
              <div className="mt-2 text-sm text-slate-600">{entry.description}</div>
            </button>
          ))}
          </div>

          {showStructureChoice ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void startMode("chain")}
                disabled={isSaving}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Цепочка
              </button>
              <button
                type="button"
                onClick={() => void startMode("nested")}
                disabled={isSaving}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Вложение
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {stage === "edit" && mode ? (
        <div className="mt-6">
          {mode === "sound" ? (
            <SoundMnemonicEditor
              value={(draft as VocabularyMnemonicSound | undefined) ?? { kind: "sound" }}
              disabled={isSaving}
              onChange={setDraft}
              onSubmit={(value) => void handleDraftReady(value)}
            />
          ) : null}
          {mode === "image" ? (
            <ImageMnemonicEditor
              value={(draft as VocabularyMnemonicImage | undefined) ?? { kind: "image" }}
              disabled={isSaving}
              onChange={setDraft}
              onSubmit={(value) => void handleDraftReady(value)}
            />
          ) : null}
          {mode === "linked_word" ? (
            <LinkedWordMnemonicEditor
              value={
                (draft as VocabularyMnemonicLinkedWord | undefined) ?? { kind: "linked_word" }
              }
              options={relatedItems}
              disabled={isSaving}
              onChange={setDraft}
              onSubmit={(value) => void handleDraftReady(value)}
            />
          ) : null}
          {mode === "chain" ? (
            <ChainMnemonicEditor
              value={(draft as VocabularyMnemonicChain | undefined) ?? { kind: "chain", elements: [], links: [] }}
              disabled={isSaving}
              onChange={setDraft}
              onSubmit={(value) => void handleDraftReady(value)}
            />
          ) : null}
          {mode === "nested" ? (
            <NestedMnemonicEditor
              value={(draft as VocabularyMnemonicNested | undefined) ?? { kind: "nested" }}
              disabled={isSaving}
              onChange={setDraft}
              onSubmit={(value) => void handleDraftReady(value)}
            />
          ) : null}
        </div>
      ) : null}

      {stage === "verify" ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Проверка
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              По этой связи восстановите слово:
            </p>
            <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-4 text-lg font-medium text-slate-900">
              {cue || "Сначала соберите короткую связь."}
            </div>
            <input
              value={verifyAnswer}
              onChange={(event) => setVerifyAnswer(event.target.value)}
              placeholder="Напишите слово"
              className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleVerify()}
              disabled={isSaving || !verifyAnswer.trim()}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              Проверить связь
            </button>
            <button
              type="button"
              onClick={() => setStage("edit")}
              disabled={isSaving}
              className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Вернуться и упростить
            </button>
          </div>
        </div>
      ) : null}

      {stage === "done" ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Готово
          </button>
          <button
            type="button"
            onClick={() => setStage("edit")}
            className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            Переделать
          </button>
        </div>
      ) : null}
    </section>
  );
}

const MNEMONIC_MODES: Array<{
  mode: VocabularyMnemonicMode | "structure";
  label: string;
  description: string;
}> = [
  {
    mode: "sound",
    label: "звук",
    description: "Связать звучание слова с известным словом и коротким образом.",
  },
  {
    mode: "image",
    label: "образ",
    description: "Одна простая сцена: что делает образ и с чем взаимодействует.",
  },
  {
    mode: "linked_word",
    label: "через другое слово",
    description: "Привязать новое слово к уже знакомой карточке из системы.",
  },
  {
    mode: "structure",
    label: "цепочка / вложение",
    description: "Связать несколько элементов по порядку или повесить их один на другой.",
  },
];

function EditorShell({
  question,
  children,
  helper,
  actions,
}: {
  question: string;
  children: ReactNode;
  helper?: string;
  actions: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Один шаг
        </div>
        <h3 className="mt-3 text-xl font-semibold text-slate-950">{question}</h3>
        {helper ? <p className="mt-2 text-sm leading-7 text-slate-600">{helper}</p> : null}
        <div className="mt-4">{children}</div>
      </div>
      <div className="flex flex-wrap gap-3">{actions}</div>
    </div>
  );
}

function SoundMnemonicEditor({
  value,
  disabled,
  onChange,
  onSubmit,
}: {
  value: VocabularyMnemonicSound;
  disabled: boolean;
  onChange: (value: VocabularyMnemonicSound) => void;
  onSubmit: (value: VocabularyMnemonicSound) => void;
}) {
  const [draft, setDraft] = useState<VocabularyMnemonicSound>(value);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  function next() {
    const nextError = simplifyError(step === 0 ? draft.sound_anchor ?? "" : draft.image_anchor ?? "");

    if (nextError) {
      setError(nextError);
      return;
    }

    setError("");

    if (step === 0) {
      setStep(1);
      return;
    }

    onSubmit(draft);
  }

  function updateDraft(nextDraft: VocabularyMnemonicSound) {
    setDraft(nextDraft);
    onChange(nextDraft);
  }

  return (
    <EditorShell
      question={step === 0 ? "На что похоже по звучанию?" : "Сделай короткий образ с этим"}
      helper="Коротко и конкретно. Без длинной истории."
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              const nextDraft =
                step === 0
                  ? { ...draft, sound_anchor: undefined }
                  : { ...draft, image_anchor: undefined };
              updateDraft(nextDraft);
            }}
            disabled={disabled}
            className="rounded-2xl border border-red-300 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            Удалить
          </button>
          <button
            type="button"
            onClick={next}
            disabled={disabled}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {step === 0 ? "Дальше" : "Сохранить связь"}
          </button>
        </>
      }
    >
      <input
        value={step === 0 ? draft.sound_anchor ?? "" : draft.image_anchor ?? ""}
        onChange={(event) =>
          updateDraft(
            step === 0
              ? { ...draft, sound_anchor: event.target.value }
              : { ...draft, image_anchor: event.target.value }
          )
        }
        placeholder={step === 0 ? "Например: Haus похоже на хаос" : "Например: хаос в доме"}
        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
      />
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </EditorShell>
  );
}

function ImageMnemonicEditor({
  value,
  disabled,
  onChange,
  onSubmit,
}: {
  value: VocabularyMnemonicImage;
  disabled: boolean;
  onChange: (value: VocabularyMnemonicImage) => void;
  onSubmit: (value: VocabularyMnemonicImage) => void;
}) {
  const [draft, setDraft] = useState<VocabularyMnemonicImage>(value);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  function next() {
    const nextError = simplifyError(step === 0 ? draft.action ?? "" : draft.interaction ?? "");

    if (nextError) {
      setError(nextError);
      return;
    }

    setError("");

    if (step === 0) {
      setStep(1);
      return;
    }

    onSubmit(draft);
  }

  function updateDraft(nextDraft: VocabularyMnemonicImage) {
    setDraft(nextDraft);
    onChange(nextDraft);
  }

  return (
    <EditorShell
      question={step === 0 ? "Что это делает?" : "С чем взаимодействует?"}
      helper="Одна сцена, без длинного описания."
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              const nextDraft =
                step === 0
                  ? { ...draft, action: undefined }
                  : { ...draft, interaction: undefined };
              updateDraft(nextDraft);
            }}
            disabled={disabled}
            className="rounded-2xl border border-red-300 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            Удалить
          </button>
          <button
            type="button"
            onClick={next}
            disabled={disabled}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {step === 0 ? "Дальше" : "Сохранить образ"}
          </button>
        </>
      }
    >
      <input
        value={step === 0 ? draft.action ?? "" : draft.interaction ?? ""}
        onChange={(event) =>
          updateDraft(
            step === 0
              ? { ...draft, action: event.target.value }
              : { ...draft, interaction: event.target.value }
          )
        }
        placeholder={step === 0 ? "Например: бежит" : "Например: сталкивается с дверью"}
        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
      />
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </EditorShell>
  );
}

function LinkedWordMnemonicEditor({
  value,
  options,
  disabled,
  onChange,
  onSubmit,
}: {
  value: VocabularyMnemonicLinkedWord;
  options: VocabularyItem[];
  disabled: boolean;
  onChange: (value: VocabularyMnemonicLinkedWord) => void;
  onSubmit: (value: VocabularyMnemonicLinkedWord) => void;
}) {
  const [draft, setDraft] = useState<VocabularyMnemonicLinkedWord>(value);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  function next() {
    if (step === 0) {
      if (!draft.target_card_id) {
        setError("Сначала выберите существующее слово.");
        return;
      }

      setError("");
      setStep(1);
      return;
    }

    const nextError = simplifyError(draft.relation ?? "");

    if (nextError) {
      setError(nextError);
      return;
    }

    setError("");
    onSubmit(draft);
  }

  function updateDraft(nextDraft: VocabularyMnemonicLinkedWord) {
    setDraft(nextDraft);
    onChange(nextDraft);
  }

  return (
    <EditorShell
      question={step === 0 ? "Выбери существующее слово из системы" : "Что происходит между ними?"}
      helper="Связь должна быть короткой и понятной."
      actions={
        <>
          <button
            type="button"
            onClick={() =>
              updateDraft(
                step === 0
                  ? { ...draft, target_card_id: undefined }
                  : { ...draft, relation: undefined }
              )
            }
            disabled={disabled}
            className="rounded-2xl border border-red-300 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            Удалить
          </button>
          <button
            type="button"
            onClick={next}
            disabled={disabled}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {step === 0 ? "Дальше" : "Сохранить связь"}
          </button>
        </>
      }
    >
      {step === 0 ? (
        <select
          value={draft.target_card_id ?? ""}
          onChange={(event) =>
            updateDraft({ ...draft, target_card_id: event.target.value || undefined })
          }
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
        >
          <option value="">Выберите слово</option>
          {options.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.text} {"->"} {entry.translation}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={draft.relation ?? ""}
          onChange={(event) =>
            updateDraft({ ...draft, relation: event.target.value })
          }
          placeholder="Например: одно открывает другое"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
        />
      )}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </EditorShell>
  );
}

function ChainMnemonicEditor({
  value,
  disabled,
  onChange,
  onSubmit,
}: {
  value: VocabularyMnemonicChain;
  disabled: boolean;
  onChange: (value: VocabularyMnemonicChain) => void;
  onSubmit: (value: VocabularyMnemonicChain) => void;
}) {
  const [draft, setDraft] = useState<VocabularyMnemonicChain>(value);
  const [inputValue, setInputValue] = useState("");
  const [addingNextElement, setAddingNextElement] = useState(draft.elements.length < 2);
  const [error, setError] = useState("");

  const question = getChainQuestion(draft, addingNextElement);

  function updateDraft(nextDraft: VocabularyMnemonicChain) {
    setDraft(nextDraft);
    onChange(nextDraft);
  }

  function submitCurrentStep(action: "continue" | "finish" = "continue") {
    if (question.type === "decision") {
      if (action === "finish") {
        if (draft.elements.length < 2) {
          setError("В цепочке должно быть минимум 2 элемента.");
          return;
        }

        onSubmit(draft);
        return;
      }

      setAddingNextElement(true);
      return;
    }

    const nextError = simplifyError(inputValue, 60);

    if (nextError) {
      setError(nextError);
      return;
    }

    setError("");

    if (question.type === "element") {
      const nextElement: VocabularyMnemonicChainElement = {
        id: `chain-${draft.elements.length + 1}`,
        label: inputValue.trim(),
      };
      updateDraft({
        ...draft,
        elements: [...draft.elements, nextElement],
      });
      setAddingNextElement(false);
      setInputValue("");
      return;
    }

    const from = draft.elements[draft.links.length];
    const to = draft.elements[draft.links.length + 1];

    if (!from || !to) {
      setError("Сначала добавьте элементы цепочки.");
      return;
    }

    const nextLink: VocabularyMnemonicChainLink = {
      from_id: from.id,
      to_id: to.id,
      relation: inputValue.trim(),
    };

    updateDraft({
      ...draft,
      links: [...draft.links, nextLink],
    });
    setInputValue("");
  }

  return (
    <EditorShell
      question={question.label}
      helper="Максимум 5 элементов и строгий порядок."
      actions={
        <>
          {question.type === "decision" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  const nextElements = draft.elements.slice(0, -1);
                  const nextElementIds = new Set(nextElements.map((element) => element.id));
                  const nextLinks = draft.links.filter(
                    (link) => nextElementIds.has(link.from_id) && nextElementIds.has(link.to_id)
                  );
                  updateDraft({
                    kind: "chain",
                    elements: nextElements,
                    links: nextLinks,
                  });
                  setAddingNextElement(nextElements.length < 2);
                }}
                disabled={disabled || draft.elements.length === 0}
                className="rounded-2xl border border-red-300 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                Удалить последний элемент
              </button>
              {draft.elements.length < 5 ? (
                <button
                  type="button"
                  onClick={() => submitCurrentStep("continue")}
                  disabled={disabled}
                  className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Добавить следующий элемент
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => submitCurrentStep("finish")}
                disabled={disabled}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Завершить цепочку
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => submitCurrentStep("continue")}
              disabled={disabled}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              Дальше
            </button>
          )}
        </>
      }
    >
      {question.type === "decision" ? (
        <div className="space-y-2 text-sm text-slate-700">
          {draft.elements.map((element, index) => (
            <div key={element.id} className="flex items-center justify-between gap-3">
              <span>
                {index + 1}. {element.label}
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextElements = draft.elements.filter((entry) => entry.id !== element.id);
                  const nextElementIds = new Set(nextElements.map((entry) => entry.id));
                  const nextLinks = draft.links.filter(
                    (link) => nextElementIds.has(link.from_id) && nextElementIds.has(link.to_id)
                  );
                  updateDraft({
                    kind: "chain",
                    elements: nextElements,
                    links: nextLinks,
                  });
                  setAddingNextElement(nextElements.length < 2);
                }}
                disabled={disabled}
                className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      ) : (
        <input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder={
            question.type === "element"
              ? "Введите элемент"
              : "Опишите связь между соседними элементами"
          }
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
        />
      )}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </EditorShell>
  );
}

function getChainQuestion(draft: VocabularyMnemonicChain, addingNextElement: boolean) {
  if (draft.elements.length < 2 || addingNextElement) {
    return {
      type: "element" as const,
      label:
        draft.elements.length === 0
          ? "Добавьте первый элемент"
          : "Добавьте следующий элемент",
    };
  }

  if (draft.links.length < draft.elements.length - 1) {
    const from = draft.elements[draft.links.length];
    const to = draft.elements[draft.links.length + 1];

    return {
      type: "relation" as const,
      label: `Что происходит между ${from.label} и ${to.label}?`,
    };
  }

  return {
    type: "decision" as const,
    label: "Цепочка собрана. Добавить ещё элемент или завершить?",
  };
}

function NestedMnemonicEditor({
  value,
  disabled,
  onChange,
  onSubmit,
}: {
  value: VocabularyMnemonicNested;
  disabled: boolean;
  onChange: (value: VocabularyMnemonicNested) => void;
  onSubmit: (value: VocabularyMnemonicNested) => void;
}) {
  const [draft, setDraft] = useState<VocabularyMnemonicNested>(value);
  const [inputValue, setInputValue] = useState("");
  const [pendingPlacement, setPendingPlacement] = useState("");
  const [error, setError] = useState("");

  const depth = getNestedDepth(draft.base);
  const deepestNode = getDeepestNode(draft.base);

  function updateDraft(nextDraft: VocabularyMnemonicNested) {
    setDraft(nextDraft);
    onChange(nextDraft);
  }

  function continueFlow(action: "continue" | "finish" = "continue") {
    if (!draft.base) {
      const nextError = simplifyError(inputValue, 60);

      if (nextError) {
        setError(nextError);
        return;
      }

      updateDraft({
        kind: "nested",
        base: {
          id: "nested-base",
          label: inputValue.trim(),
          children: [],
        },
      });
      setInputValue("");
      setError("");
      return;
    }

    if (!pendingPlacement) {
      const nextError = simplifyError(inputValue, 40);

      if (nextError) {
        setError("Коротко укажите, куда прикрепить.");
        return;
      }

      setPendingPlacement(inputValue.trim());
      setInputValue("");
      setError("");
      return;
    }

    if (action === "finish") {
      onSubmit(draft);
      return;
    }

    const nextError = simplifyError(inputValue, 60);

    if (nextError) {
      setError(nextError);
      return;
    }

    const nextNode: VocabularyMnemonicNestedNode = {
      id: `nested-${depth + 1}`,
      label: inputValue.trim(),
      placement: pendingPlacement,
      children: [],
    };

    updateDraft({
      kind: "nested",
      base: appendNestedNode(draft.base, nextNode),
    });
    setPendingPlacement("");
    setInputValue("");
    setError("");
  }

  const question = !draft.base
    ? "Выберите базовый объект"
    : !pendingPlacement
      ? `Куда прикрепить следующий элемент${deepestNode ? ` к ${deepestNode.label}` : ""}?`
      : "Добавьте следующий элемент";

  return (
    <EditorShell
      question={question}
      helper="Максимум 3 уровня. Структура должна оставаться читаемой."
      actions={
        <>
          {draft.base ? (
            <button
              type="button"
              onClick={() => {
                updateDraft({
                  kind: "nested",
                  base: removeDeepestNestedNode(draft.base),
                });
                setPendingPlacement("");
              }}
              disabled={disabled}
              className="rounded-2xl border border-red-300 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              Удалить последний элемент
            </button>
          ) : null}
          {draft.base && !pendingPlacement && depth >= 2 ? (
            <button
              type="button"
              onClick={() => continueFlow("finish")}
              disabled={disabled}
              className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Завершить вложение
            </button>
          ) : null}
          {!draft.base || pendingPlacement || depth < 3 ? (
            <button
              type="button"
              onClick={() => continueFlow("continue")}
              disabled={disabled}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {!draft.base || !pendingPlacement ? "Дальше" : "Добавить элемент"}
            </button>
          ) : null}
        </>
      }
    >
      <input
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        placeholder={
          !draft.base
            ? "Например: шкаф"
            : !pendingPlacement
              ? "Например: внутрь ящика"
              : "Например: ключ"
        }
        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
      />
      {draft.base ? (
        <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-4 text-sm text-slate-700">
          {renderNestedPreview(draft.base)}
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </EditorShell>
  );
}

function appendNestedNode(
  base: VocabularyMnemonicNestedNode | undefined,
  nextNode: VocabularyMnemonicNestedNode
) {
  if (!base) {
    return undefined;
  }

  if (base.children.length === 0) {
    return {
      ...base,
      children: [nextNode],
    };
  }

  return {
    ...base,
    children: [appendNestedNode(base.children[0], nextNode)].filter(
      (child): child is VocabularyMnemonicNestedNode => Boolean(child)
    ),
  };
}

function removeDeepestNestedNode(
  base: VocabularyMnemonicNestedNode | undefined
): VocabularyMnemonicNestedNode | undefined {
  if (!base) {
    return undefined;
  }

  if (base.children.length === 0) {
    return undefined;
  }

  const firstChild = base.children[0];
  const nextChild = removeDeepestNestedNode(firstChild);

  return {
    ...base,
    children: nextChild ? [nextChild] : [],
  };
}

function getNestedDepth(node?: VocabularyMnemonicNestedNode): number {
  if (!node) {
    return 0;
  }

  if (node.children.length === 0) {
    return 1;
  }

  return 1 + getNestedDepth(node.children[0]);
}

function getDeepestNode(node?: VocabularyMnemonicNestedNode): VocabularyMnemonicNestedNode | undefined {
  if (!node) {
    return undefined;
  }

  if (node.children.length === 0) {
    return node;
  }

  return getDeepestNode(node.children[0]);
}

function renderNestedPreview(node: VocabularyMnemonicNestedNode): string {
  if (node.children.length === 0) {
    return node.label;
  }

  const child = node.children[0];
  return `${node.label} -> ${child.placement ?? "внутрь"} -> ${renderNestedPreview(child)}`;
}
