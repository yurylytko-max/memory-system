"use client";

import { useMemo, useState } from "react";

import type {
  StudyConversation,
  StudyDialogue,
  StudyInlinePart,
  StudyPageDocument,
} from "@/lib/study";
import { textFromInlineParts } from "@/lib/study";

type SelectionPayload = {
  text: string;
  context: string;
};

function InlineParts({
  parts,
  onSelect,
}: {
  parts: StudyInlinePart[];
  onSelect: (payload: SelectionPayload) => void;
}) {
  const context = useMemo(() => textFromInlineParts(parts), [parts]);
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "blank") {
          return (
            <input
              key={part.id}
              value={values[part.id] ?? ""}
              onChange={(event) =>
                setValues((current) => ({ ...current, [part.id]: event.target.value }))
              }
              placeholder={part.placeholder ?? "____"}
              className="mx-1 inline-flex w-28 rounded-md border border-dashed border-amber-400 bg-white px-2 py-0.5 text-sm"
            />
          );
        }

        if (part.type === "phrase") {
          return (
            <button
              key={`${part.type}-${index}`}
              type="button"
              onClick={() =>
                onSelect({
                  text: part.text,
                  context,
                })
              }
              className="inline rounded px-1 py-0.5 text-left font-medium text-sky-900 underline decoration-sky-300 underline-offset-3 transition hover:bg-sky-100"
            >
              {part.text}
            </button>
          );
        }

        if (part.type === "highlight") {
          return (
            <mark
              key={`${part.type}-${index}`}
              className="rounded bg-amber-200 px-1 py-0.5 text-inherit"
            >
              {part.text}
            </mark>
          );
        }

        return <span key={`${part.type}-${index}`}>{part.text}</span>;
      })}
    </>
  );
}

function DialogueCard({
  dialogue,
  onSelect,
}: {
  dialogue: StudyDialogue;
  onSelect: (payload: SelectionPayload) => void;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      {dialogue.title ? (
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          {dialogue.title}
        </h4>
      ) : null}

      {dialogue.image?.label ? (
        <div className="mb-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          {dialogue.image.label}
        </div>
      ) : null}

      <div className="space-y-2">
        {dialogue.lines.map((line, index) => (
          <p
            key={`${dialogue.id}-${index}`}
            className="rounded-2xl bg-slate-50 px-3 py-2 text-[15px] leading-7 text-slate-800"
          >
            {line.speaker ? <span className="mr-2 font-semibold text-slate-500">{line.speaker}</span> : null}
            <InlineParts parts={line.parts} onSelect={onSelect} />
          </p>
        ))}
      </div>
    </article>
  );
}

function ConversationCard({
  conversation,
  onSelect,
}: {
  conversation: StudyConversation;
  onSelect: (payload: SelectionPayload) => void;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4">
      {conversation.title ? (
        <h4 className="mb-3 text-lg font-semibold text-slate-950">{conversation.title}</h4>
      ) : null}

      <div className="space-y-2">
        {conversation.lines.map((line, index) => (
          <p
            key={`${conversation.id}-${index}`}
            className="text-[15px] leading-7 text-slate-800"
          >
            {line.speaker ? <span className="mr-2 font-semibold text-slate-500">{line.speaker}</span> : null}
            <InlineParts parts={line.parts} onSelect={onSelect} />
          </p>
        ))}
      </div>
    </article>
  );
}

export default function StudyPageRenderer({
  document,
  onSelect,
}: {
  document: StudyPageDocument;
  onSelect: (payload: SelectionPayload) => void;
}) {
  return (
    <div className="space-y-8">
      <header className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Страница {document.page_number}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          {document.lesson_title}
        </h1>
      </header>

      {document.blocks.map((section) => (
        <section
          key={section.id}
          className="rounded-[2rem] border border-slate-200 bg-[#fffdf8] p-6 shadow-sm"
        >
          <h2 className="text-2xl font-semibold text-slate-950">{section.title}</h2>

          <div className="mt-5 space-y-5">
            {section.blocks.map((block, index) => {
              if (block.type === "instruction") {
                return (
                  <p key={`${section.id}-${index}`} className="text-sm leading-7 text-slate-600">
                    {block.text}
                  </p>
                );
              }

              if (block.type === "paragraph") {
                return (
                  <p key={`${section.id}-${index}`} className="text-[15px] leading-7 text-slate-800">
                    <InlineParts parts={block.parts} onSelect={onSelect} />
                  </p>
                );
              }

              if (block.type === "word_bank") {
                return (
                  <div
                    key={`${section.id}-${index}`}
                    className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4"
                  >
                    <div className="flex flex-wrap gap-2">
                      {block.items.map((item) => {
                        if (item.clickable) {
                          return (
                            <button
                              key={item.text}
                              type="button"
                              onClick={() =>
                                onSelect({
                                  text: item.text,
                                  context: item.text,
                                })
                              }
                              className="rounded-full border border-amber-300 bg-white px-3 py-1 text-sm text-slate-800 transition hover:bg-amber-100"
                            >
                              {item.crossed_out ? <span className="line-through">{item.text}</span> : item.text}
                            </button>
                          );
                        }

                        return (
                          <span
                            key={item.text}
                            className="rounded-full border border-amber-300 bg-white px-3 py-1 text-sm text-slate-700"
                          >
                            {item.crossed_out ? <span className="line-through">{item.text}</span> : item.text}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (block.type === "dialogue_group") {
                return (
                  <div key={`${section.id}-${index}`} className="grid gap-4 xl:grid-cols-2">
                    {block.items.map((dialogue) => (
                      <DialogueCard key={dialogue.id} dialogue={dialogue} onSelect={onSelect} />
                    ))}
                  </div>
                );
              }

              if (block.type === "table") {
                return (
                  <div key={`${section.id}-${index}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                    {block.title ? (
                      <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">
                        {block.title}
                      </div>
                    ) : null}
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        {block.headers.length > 0 ? (
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              {block.headers.map((header) => (
                                <th key={header} className="px-4 py-3 font-semibold">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                        ) : null}
                        <tbody>
                          {block.rows.map((row, rowIndex) => (
                            <tr key={`${section.id}-${index}-row-${rowIndex}`} className="border-t border-slate-100">
                              {row.map((cell, cellIndex) => (
                                <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3 text-slate-700">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              if (block.type === "conversation_group") {
                return (
                  <div key={`${section.id}-${index}`} className="grid gap-4 xl:grid-cols-3">
                    {block.items.map((conversation) => (
                      <ConversationCard
                        key={conversation.id}
                        conversation={conversation}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                );
              }

              if (block.type === "image_placeholder") {
                return (
                  <div
                    key={`${section.id}-${index}`}
                    className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500"
                  >
                    {block.label ?? "Иллюстрация"}
                  </div>
                );
              }

              return <hr key={`${section.id}-${index}`} className="border-slate-200" />;
            })}
          </div>
        </section>
      ))}

      {document.footer ? (
        <footer className="pb-6 text-center text-xs uppercase tracking-[0.2em] text-slate-500">
          {document.footer}
        </footer>
      ) : null}
    </div>
  );
}
