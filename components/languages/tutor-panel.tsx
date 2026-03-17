"use client";

import { useState } from "react";

import type { LanguageTutorMessage } from "@/lib/languages";

type TutorPanelProps = {
  courseId: string;
  lessonId?: string | null;
  title?: string;
};

type TutorResponse = {
  thread: {
    id: string;
    messages: LanguageTutorMessage[];
  };
  assistantMessage: LanguageTutorMessage;
};

function getTutorError(payload: TutorResponse | { error?: string }) {
  return "error" in payload ? payload.error || "Tutor request failed." : null;
}

export function TutorPanel({
  courseId,
  lessonId = null,
  title = "AI tutor",
}: TutorPanelProps) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LanguageTutorMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextMessage = draft.trim();

    if (!nextMessage || loading) {
      return;
    }

    const optimisticUserMessage: LanguageTutorMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: nextMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticUserMessage]);
    setDraft("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/languages/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          lessonId,
          threadId,
          message: nextMessage,
        }),
      });

      const payload = (await response.json()) as
        | TutorResponse
        | { error?: string };

      if (!response.ok || !("thread" in payload)) {
        throw new Error(getTutorError(payload) || "Tutor request failed.");
      }

      setThreadId(payload.thread.id);
      setMessages(payload.thread.messages);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Tutor request failed.";

      setError(message);
      setMessages((current) =>
        current.filter((item) => item.id !== optimisticUserMessage.id)
      );
      setDraft(nextMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">
            Спрашивай про грамматику, формулировки, перевод, ошибки и примеры.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {messages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
            Например: &quot;Объясни разницу между `sein` и `heißen` в этом уроке.&quot;
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-3xl px-5 py-4 text-sm leading-6 ${
                message.role === "user"
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-800"
              }`}
            >
              {message.content}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Задай вопрос по уроку или грамматике"
          className="min-h-28 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "AI отвечает..." : "Спросить AI tutor"}
        </button>
      </form>
    </section>
  );
}
