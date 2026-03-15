"use client";

import { getAllCards } from "@/lib/cards";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function TagPage() {
  const params = useParams();
  const tag = Array.isArray(params.tag) ? params.tag[0] : params.tag;

  const [cards, setCards] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const allCards = await getAllCards();

      const filtered = allCards.filter(
        (card: any) => card.tags && card.tags.includes(tag)
      );

      setCards(filtered);
      setLoaded(true);
    }

    load();
  }, [tag]);

  if (!loaded) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Tag: {tag}</h1>

      <div style={{ marginTop: 20 }}>
        {cards.map((card) => (
          <div key={card.id} style={{ marginBottom: 20 }}>
            <h3>{card.title}</h3>
            <p>{card.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}