"use client";

import { useState } from "react";

type WordInfo = {
  word: string;
  translation: string;
};

export default function LessonPage() {
  const [text, setText] = useState(
    "Ich gehe nach Hause. Das Haus ist groß. Ich sehe ein kleines Haus."
  );

  const [selectedWord, setSelectedWord] = useState<WordInfo | null>(null);

  const dictionary: Record<string, string> = {
    ich: "I",
    gehe: "go",
    nach: "to",
    hause: "home",
    haus: "house",
    ist: "is",
    groß: "big",
    sehe: "see",
    ein: "a",
    kleines: "small",
  };

  const words = text.split(/(\s+)/);

  function handleWordClick(raw: string) {
    const clean = raw.toLowerCase().replace(/[.,!?]/g, "");

    if (!clean.trim()) return;

    const translation = dictionary[clean] || "—";

    setSelectedWord({
      word: clean,
      translation,
    });
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr 300px",
        height: "100vh",
        fontFamily: "serif",
      }}
    >
      {/* LEFT PANEL */}
      <div
        style={{
          borderRight: "1px solid #ddd",
          padding: 20,
        }}
      >
        <h3>Course</h3>

        <div>Lesson 1</div>
        <div>Lesson 2</div>
        <div>Lesson 3</div>

        <hr />

        <div>Vocabulary</div>
        <div>Grammar</div>
        <div>Exercises</div>
      </div>

      {/* CENTER READER */}
      <div
        style={{
          padding: 40,
          lineHeight: 1.8,
          fontSize: 20,
        }}
      >
        {words.map((w, i) => {
          if (w.trim() === "") return <span key={i}>{w}</span>;

          const clean = w.toLowerCase().replace(/[.,!?]/g, "");
          const selected = selectedWord?.word === clean;

          return (
            <span
              key={i}
              onClick={() => handleWordClick(w)}
              style={{
                cursor: "pointer",
                background: selected ? "#ffeaa7" : "transparent",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>

      {/* RIGHT WORD PANEL */}
      <div
        style={{
          borderLeft: "1px solid #ddd",
          padding: 20,
        }}
      >
        {!selectedWord && <div>Click a word</div>}

        {selectedWord && (
          <div>
            <h3>{selectedWord.word}</h3>

            <div style={{ marginBottom: 10 }}>
              {selectedWord.translation}
            </div>

            <button style={{ marginRight: 10 }}>Add card</button>
            <button>Add note</button>
          </div>
        )}
      </div>
    </div>
  );
}