"use client";

import { useState } from "react";

type Lesson = {
  id: string;
  start: number;
  end: number;
};

export default function LessonPanel() {
  const [start, setStart] = useState<number>(1);
  const [end, setEnd] = useState<number>(1);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  function createLesson() {
    if (end < start) return;

    const lesson: Lesson = {
      id: crypto.randomUUID(),
      start,
      end,
    };

    setLessons((prev) => [...prev, lesson]);
  }

  return (
    <div
      style={{
        marginTop: 30,
        padding: 20,
        border: "1px solid #ddd",
        background: "#fafafa",
      }}
    >
      <h2>Create lesson</h2>

      <div style={{ marginBottom: 10 }}>
        Start page
        <input
          type="number"
          value={start}
          onChange={(e) => setStart(Number(e.target.value))}
          style={{ marginLeft: 10, width: 80 }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        End page
        <input
          type="number"
          value={end}
          onChange={(e) => setEnd(Number(e.target.value))}
          style={{ marginLeft: 20, width: 80 }}
        />
      </div>

      <button
        onClick={createLesson}
        style={{
          padding: "6px 12px",
          border: "1px solid black",
          background: "white",
          cursor: "pointer",
        }}
      >
        Save lesson
      </button>

      <div style={{ marginTop: 20 }}>
        <h3>Lessons</h3>

        {lessons.length === 0 && <div>No lessons yet</div>}

        {lessons.map((lesson, i) => (
          <div key={lesson.id}>
            Lesson {i + 1} — pages {lesson.start}–{lesson.end}
          </div>
        ))}
      </div>
    </div>
  );
}