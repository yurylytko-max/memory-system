"use client";

export const dynamic = "force-dynamic";
export const runtime = "edge";

import { createCard, Card } from "@/lib/cards";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { compressImage } from "@/lib/utils"
import { BackButton } from "@/components/back-button";

export default function NewCardPage() {
  const router = useRouter();
  const params = useSearchParams();

  const initialText = params.get("text") || "";
  const initialTag = params.get("tag") || "";
  const initialSource = params.get("doc") || "";
  const editorId = params.get("editorId");
  const textId = params.get("textId");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [tags, setTags] = useState("");
  const [type, setType] = useState("thought");
  const [image, setImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialText) {
      setTitle(initialText);
      setContent(initialText);
    }

    if (initialTag) {
      setTags(initialTag);
    }

    if (initialSource) {
      setSource(initialSource);
    }
  }, [initialText, initialTag, initialSource]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
  
    const compressed = await compressImage(file)
  
    setImage(compressed)
  }

  function buildCard(withImage: boolean): Card {
    return {
      id: crypto.randomUUID(),
      title,
      content,
      source,
      type,
      image: withImage ? image : null,
      tags: tags
        .split(" ")
        .map((t) => t.trim())
        .filter(Boolean),
    };
  }

  function goToSavedCard(id: string) {
    if (textId) {
      router.push(`/texts/${textId}?insertCard=${id}`);
    } else {
      router.push(`/cards/${id}`);
    }
  }

  async function handleSave() {
    if (isSaving) return;

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

  return (
    <main className="min-h-screen bg-gray-100 p-10 max-w-xl mx-auto">
      <BackButton fallbackHref="/cards" className="text-sm text-gray-500">
        ← Назад
      </BackButton>

      <h1 className="text-2xl font-bold mb-6 mt-4">Новая карточка</h1>

      <div className="space-y-4">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border p-3 rounded w-full"
        >
          <option value="thought">Мысль</option>
          <option value="quote">Цитата</option>
          <option value="book">Книга</option>
          <option value="music">Музыка</option>
          <option value="idea">Идея</option>
          <option value="recipe">Рецепт</option>
          <option value="screenshot">Скриншот</option>
        </select>

        <input
          placeholder="Заголовок"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-3 rounded w-full"
        />

        <textarea
          placeholder="Содержание"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border p-3 rounded w-full h-32"
        />

        <input
          placeholder="Источник"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="border p-3 rounded w-full"
        />

        <input
          placeholder="Теги через пробел"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="border p-3 rounded w-full"
        />

        <div className="space-y-2">
          <label className="text-sm text-gray-600">Прикрепить скриншот</label>

          <input type="file" accept="image/*" onChange={handleImageUpload} />

          {image && <img src={image} className="rounded border max-h-60" alt="" />}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
        >
          {isSaving ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>
    </main>
  );
}
