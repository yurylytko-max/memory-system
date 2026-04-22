"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BackButton } from "@/components/back-button";
import {
  DEFAULT_CARD_SPHERE,
  getAllCards,
  getCard,
  getCardWorkspaceLabel,
  getUniqueCardSpheres,
  isCardWorkspace,
  updateCard,
  type Card,
  type CardChecklistItem,
  type CardContentType,
} from "@/lib/cards";

function createChecklistItem(text = ""): CardChecklistItem {
  return {
    id: crypto.randomUUID(),
    text,
    checked: false,
  };
}

export default function EditCardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const cardId = Array.isArray(params.cardId)
    ? params.cardId[0]
    : params.cardId;
  const workspaceParam = searchParams.get("workspace");
  const workspace = isCardWorkspace(workspaceParam) ? workspaceParam : undefined;

  const [card, setCard] = useState<Card | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [sphere, setSphere] = useState(DEFAULT_CARD_SPHERE);
  const [tags, setTags] = useState("");
  const [type, setType] = useState("thought");
  const [contentType, setContentType] = useState<CardContentType>("text");
  const [checklist, setChecklist] = useState<CardChecklistItem[]>([
    { id: "initial-checklist-item", text: "", checked: false },
  ]);
  const [sphereOptions, setSphereOptions] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      if (!cardId) {
        setLoaded(true);
        return;
      }

      const found = await getCard(cardId, workspace);

      if (found) {
        setCard(found);
        setTitle(found.title || "");
        setContent(found.content || "");
        setSource(found.source || "");
        setSphere(found.sphere || DEFAULT_CARD_SPHERE);
        setTags((found.tags || []).join(" "));
        setType(found.type || "thought");
        setContentType(found.contentType || "text");
        setChecklist(
          found.checklist && found.checklist.length > 0
            ? found.checklist
            : [{ id: "initial-checklist-item", text: "", checked: false }]
        );
      }

      setLoaded(true);
    }

    load();
  }, [cardId, workspace]);

  useEffect(() => {
    const targetWorkspace = card?.workspace ?? workspace;

    if (!targetWorkspace) {
      setSphereOptions([]);
      return;
    }

    let isMounted = true;

    async function loadSphereOptions() {
      try {
        const cards = await getAllCards(targetWorkspace);

        if (isMounted) {
          setSphereOptions(getUniqueCardSpheres(cards));
        }
      } catch (error) {
        console.error("Failed to load card spheres:", error);
      }
    }

    void loadSphereOptions();

    return () => {
      isMounted = false;
    };
  }, [card?.workspace, workspace]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!card) return;
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

    const updatedCard: Card = {
      ...card,
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
      tags: tags
        .split(" ")
        .map(tag => tag.trim())
        .filter(Boolean),
    };

    await updateCard(updatedCard, workspace);
    router.push(`/cards/${card.id}?workspace=${updatedCard.workspace}`);
  }

  if (!loaded) {
    return (
      <main className="p-10 text-gray-500" data-testid="edit-card-loading">
        Загрузка карточки...
      </main>
    );
  }

  if (!card) {
    return (
      <main className="p-10" data-testid="edit-card-not-found">
        <BackButton
          fallbackHref={workspace ? `/cards/space/${workspace}` : "/cards"}
          className="text-sm text-gray-500"
        >
          ← Назад
        </BackButton>

        <div className="mt-6 text-gray-500">Карточка не найдена</div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-gray-100 p-10"
      data-testid="edit-card-page"
      data-workspace={card.workspace}
    >
      <div className="max-w-xl mx-auto">
        <BackButton
          fallbackHref={`/cards/${card.id}?workspace=${card.workspace}`}
          className="inline-block text-sm text-gray-500 hover:text-black mb-6"
        >
          ← Назад к карточке
        </BackButton>

        <div className="bg-white p-6 rounded-xl shadow">
          <h1 className="text-2xl font-bold mb-6">Редактировать карточку</h1>
          <p className="mb-4 text-sm text-gray-500">
            Пространство: {getCardWorkspaceLabel(card.workspace)}
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <select
              data-testid="card-type-select"
              className="w-full border p-3 rounded"
              value={type}
              onChange={e => setType(e.target.value)}
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
              className="w-full border p-3 rounded"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Заголовок"
            />

            <textarea
              data-testid="card-content-input"
              className={contentType === "text" ? "w-full border p-3 rounded min-h-40" : "hidden"}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Содержание"
            />

            <div className="rounded border p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <label htmlFor="card-content-type" className="text-sm text-gray-600">
                  Формат содержания
                </label>
                <select
                  id="card-content-type"
                  data-testid="card-content-type-select"
                  className="rounded border p-2 text-sm"
                  value={contentType}
                  onChange={e => setContentType(e.target.value as CardContentType)}
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
                        className="min-w-0 flex-1 rounded border p-2"
                        value={item.text}
                        onChange={e => {
                          const nextChecklist = [...checklist];
                          nextChecklist[index] = {
                            ...item,
                            text: e.target.value,
                          };
                          setChecklist(nextChecklist);
                        }}
                        placeholder={`Пункт ${index + 1}`}
                      />
                      <button
                        type="button"
                        aria-label="Удалить пункт"
                        className="rounded border px-3 py-2 text-sm text-gray-500"
                        onClick={() =>
                          setChecklist(current =>
                            current.length > 1
                              ? current.filter(candidate => candidate.id !== item.id)
                              : current
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    data-testid="card-add-checklist-item"
                    className="rounded border px-3 py-2 text-sm"
                    onClick={() => setChecklist(current => [...current, createChecklistItem()])}
                  >
                    Добавить пункт
                  </button>
                </div>
              ) : null}
            </div>

            <input
              data-testid="card-source-input"
              className="w-full border p-3 rounded"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Источник"
            />

            <input
              data-testid="card-sphere-input"
              list="card-sphere-options"
              className="w-full border p-3 rounded"
              value={sphere}
              onChange={e => setSphere(e.target.value)}
              placeholder="Сфера"
              required
            />
            <datalist id="card-sphere-options">
              {sphereOptions.map(option => (
                <option key={option} value={option} />
              ))}
            </datalist>

            <input
              data-testid="card-tags-input"
              className="w-full border p-3 rounded"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="Теги через пробел"
            />

            <button className="bg-black text-white px-6 py-3 rounded" data-testid="card-save-button">
              Сохранить
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
