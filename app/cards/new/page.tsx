"use client";

export const dynamic = "force-dynamic";
export const runtime = "edge";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { BackButton } from "@/components/back-button";
import {
  CARD_WORKSPACE_META,
  CARD_WORKSPACES,
  createCard,
  getCardWorkspaceLabel,
  isCardWorkspace,
  type Card,
  type CardChecklistItem,
  type CardContentType,
  type CardWorkspace,
} from "@/lib/cards";
import { compressImage } from "@/lib/utils";

function buildWorkspaceQuery(
  params: URLSearchParams,
  workspace: CardWorkspace
) {
  const nextParams = new URLSearchParams(params.toString());
  nextParams.set("workspace", workspace);
  return nextParams.toString();
}

function buildSelectionQuery(params: URLSearchParams) {
  const nextParams = new URLSearchParams(params.toString());
  nextParams.delete("workspace");
  return nextParams.toString();
}

function createChecklistItem(text = ""): CardChecklistItem {
  return {
    id: crypto.randomUUID(),
    text,
    checked: false,
  };
}

export default function NewCardPage() {
  const router = useRouter();
  const params = useSearchParams();

  const workspaceParam = params.get("workspace");
  const workspace = isCardWorkspace(workspaceParam) ? workspaceParam : null;
  const initialText = params.get("text") || "";
  const initialTag = params.get("tag") || "";
  const initialSource = params.get("doc") || "";
  const textId = params.get("textId");
  const returnTo = params.get("returnTo");

  const [title, setTitle] = useState(initialText);
  const [content, setContent] = useState(initialText);
  const [source, setSource] = useState(initialSource);
  const [sphere, setSphere] = useState("");
  const [tags, setTags] = useState(initialTag);
  const [type, setType] = useState("thought");
  const [contentType, setContentType] = useState<CardContentType>("text");
  const [checklist, setChecklist] = useState<CardChecklistItem[]>([
    { id: "initial-checklist-item", text: "", checked: false },
  ]);
  const [image, setImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const paramsString = useMemo(() => params.toString(), [params]);
  const selectionQuery = useMemo(() => buildSelectionQuery(params), [params]);

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const compressed = await compressImage(file);
    setImage(compressed);
  }

  function buildCard(withImage: boolean): Card {
    if (!workspace) {
      throw new Error("Workspace is required");
    }

    return {
      id: crypto.randomUUID(),
      title,
      content:
        contentType === "checklist"
          ? checklist
              .map((item) => item.text.trim())
              .filter(Boolean)
              .join("\n")
          : content,
      contentType,
      checklist:
        contentType === "checklist"
          ? checklist
              .map((item) => ({
                ...item,
                text: item.text.trim(),
              }))
              .filter((item) => item.text !== "")
          : [],
      source,
      type,
      sphere: sphere.trim(),
      image: withImage ? image : null,
      workspace,
      tags: tags
        .split(" ")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
  }

  function goToSavedCard(id: string) {
    if (!workspace) {
      return;
    }

    if (textId) {
      if (returnTo === "edit") {
        router.push(`/texts/${textId}/edit?insertCard=${id}`);
        return;
      }

      router.push(`/texts/${textId}?insertCard=${id}`);
      return;
    }

    router.push(`/cards/${id}?workspace=${workspace}`);
  }

  async function handleSave() {
    if (isSaving || !workspace) {
      return;
    }

    if (!sphere.trim()) {
      alert("Укажи сферу карточки.");
      return;
    }

    if (
      contentType === "checklist" &&
      checklist.every((item) => item.text.trim() === "")
    ) {
      alert("Добавь хотя бы один пункт чек-листа.");
      return;
    }

    setIsSaving(true);

    try {
      const card = buildCard(true);
      await createCard(card);
      goToSavedCard(card.id);
      return;
    } catch (error) {
      console.error("Save with image failed:", error);
    }

    try {
      const cardWithoutImage = buildCard(false);
      await createCard(cardWithoutImage);

      alert(
        "Карточка сохранена без изображения. На телефоне не хватило памяти localStorage для фото."
      );

      goToSavedCard(cardWithoutImage.id);
    } catch (error) {
      console.error("Save without image failed:", error);
      alert("Сохранение не удалось даже без изображения.");
      setIsSaving(false);
    }
  }

  if (!workspace) {
    return (
      <main className="min-h-screen bg-gray-100 p-10" data-testid="new-card-workspace-select">
        <div className="mx-auto max-w-3xl">
          <BackButton fallbackHref="/" className="text-sm text-gray-500">
            ← Назад
          </BackButton>

          <h1 className="mb-2 mt-4 text-2xl font-bold">Новая карточка</h1>
          <p className="mb-8 text-sm text-gray-600">
            Выбери, в каком пространстве должна быть создана карточка.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {CARD_WORKSPACES.map((item) => (
              <Link
                key={item}
                href={`/cards/new?${buildWorkspaceQuery(params, item)}`}
                data-testid={`new-card-workspace-${item}`}
                data-workspace={item}
                className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="mb-3 text-sm uppercase tracking-[0.2em] text-gray-500">
                  Пространство
                </div>
                <div className="mb-2 text-2xl font-semibold">
                  {CARD_WORKSPACE_META[item].label}
                </div>
                <p className="text-sm text-gray-600">
                  {CARD_WORKSPACE_META[item].description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="mx-auto min-h-screen max-w-xl bg-gray-100 p-10"
      data-testid="new-card-page"
      data-workspace={workspace}
    >
      <BackButton
        fallbackHref={`/cards/space/${workspace}`}
        className="text-sm text-gray-500"
      >
        ← Назад
      </BackButton>

      <h1 className="mb-2 mt-4 text-2xl font-bold">Новая карточка</h1>
      <p className="mb-6 text-sm text-gray-600">
        Пространство: <span className="font-medium">{getCardWorkspaceLabel(workspace)}</span>
      </p>

      <div className="space-y-4">
        <select
          data-testid="card-type-select"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="w-full rounded border p-3"
        >
          <option value="thought">Мысль</option>
          <option value="article">Статья</option>
          <option value="quote">Цитата</option>
          <option value="book">Книга</option>
          <option value="music">Музыка</option>
          <option value="idea">Идея</option>
          <option value="recipe">Рецепт</option>
          <option value="screenshot">Скриншот</option>
        </select>

        <input
          data-testid="card-title-input"
          placeholder="Заголовок"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded border p-3"
        />

        <textarea
          data-testid="card-content-input"
          placeholder="Содержание"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className={contentType === "text" ? "h-32 w-full rounded border p-3" : "hidden"}
        />

        <div className="rounded border bg-white p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="card-content-type" className="text-sm text-gray-600">
              Формат содержания
            </label>
            <select
              id="card-content-type"
              data-testid="card-content-type-select"
              value={contentType}
              onChange={(event) => setContentType(event.target.value as CardContentType)}
              className="rounded border p-2 text-sm"
            >
              <option value="text">Текст</option>
              <option value="checklist">Чек-лист</option>
            </select>
          </div>

          {contentType === "checklist" ? (
            <div className="space-y-3" data-testid="card-checklist-editor">
              {checklist.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    data-testid={`card-checklist-item-${index}`}
                    value={item.text}
                    onChange={(event) => {
                      const nextChecklist = [...checklist];
                      nextChecklist[index] = {
                        ...item,
                        text: event.target.value,
                      };
                      setChecklist(nextChecklist);
                    }}
                    placeholder={`Пункт ${index + 1}`}
                    className="min-w-0 flex-1 rounded border p-2"
                  />
                  <button
                    type="button"
                    aria-label="Удалить пункт"
                    onClick={() =>
                      setChecklist((current) =>
                        current.length > 1
                          ? current.filter((candidate) => candidate.id !== item.id)
                          : current
                      )
                    }
                    className="rounded border px-3 py-2 text-sm text-gray-500"
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                type="button"
                data-testid="card-add-checklist-item"
                onClick={() => setChecklist((current) => [...current, createChecklistItem()])}
                className="rounded border px-3 py-2 text-sm"
              >
                Добавить пункт
              </button>
            </div>
          ) : null}
        </div>

        <input
          data-testid="card-source-input"
          placeholder="Источник"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="w-full rounded border p-3"
        />

        <input
          data-testid="card-sphere-input"
          placeholder="Сфера"
          value={sphere}
          onChange={(event) => setSphere(event.target.value)}
          className="w-full rounded border p-3"
          required
        />

        <input
          data-testid="card-tags-input"
          placeholder="Теги через пробел"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          className="w-full rounded border p-3"
        />

        <div className="space-y-2">
          <label className="text-sm text-gray-600">Прикрепить скриншот</label>

          <input
            data-testid="card-image-input"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
          />

          {image ? <img src={image} className="max-h-60 rounded border" alt="" /> : null}
        </div>

        <button
          type="button"
          data-testid="card-save-button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded bg-black px-6 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {isSaving ? "Сохраняю..." : "Сохранить"}
        </button>

        {paramsString ? (
          <button
            type="button"
            onClick={() =>
              router.push(selectionQuery ? `/cards/new?${selectionQuery}` : "/cards/new")
            }
            className="block text-sm text-gray-500 underline underline-offset-4"
          >
            Сменить пространство
          </button>
        ) : null}
      </div>
    </main>
  );
}
