"use client";

import { getAllCards, deleteCard } from "@/lib/cards";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CardPage() {
  const params = useParams();
  const router = useRouter();

  const cardId = Array.isArray(params.cardId)
    ? params.cardId[0]
    : params.cardId;

  const [card, setCard] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      if (typeof window === "undefined") return;

      const cards = await getAllCards();
      const found = cards.find((c: any) => String(c.id) === String(cardId));

      if (found) {
        setCard(found);
      }

      setLoaded(true);
    }

    load();
  }, [cardId]);

  async function handleDelete() {
    if (!cardId) return;

    await deleteCard(cardId);
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
      <h1>{card.title}</h1>

      <div style={{ marginTop: 20 }}>
        <p>{card.content}</p>
      </div>

      <div style={{ marginTop: 30 }}>
        <button onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
}