"use client";

import { getAllCards, updateCard } from "@/lib/cards";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditCardPage() {
  const params = useParams();
  const router = useRouter();

  const cardId = Array.isArray(params.cardId)
    ? params.cardId[0]
    : params.cardId;

  const [card, setCard] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const cards = await getAllCards();
      const found = cards.find((c: any) => String(c.id) === String(cardId));

      if (found) {
        setCard(found);
        setTitle(found.title || "");
        setContent(found.content || "");
      }

      setLoaded(true);
    }

    load();
  }, [cardId]);

  async function handleSave() {
    if (!card) return;

    await updateCard({
      ...card,
      title,
      content,
    });

    router.push("/cards");
  }

  if (!loaded) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  if (!card) {
    return <div style={{ padding: 40 }}>Card not found</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Edit Card</h1>

      <div style={{ marginTop: 20 }}>
        <input
          style={{ width: "100%", padding: 10, fontSize: 16 }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <textarea
          style={{ width: "100%", height: 200, padding: 10, fontSize: 16 }}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Content"
        />
      </div>

      <div style={{ marginTop: 30 }}>
        <button onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}