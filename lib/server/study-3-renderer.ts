import "server-only";

import type { StudyThreePageBlock, StudyThreePageLayout } from "@/lib/study-3";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderParagraphs(lines: string[]) {
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

function renderList(items: string[], ordered = false) {
  const tag = ordered ? "ol" : "ul";
  return `<${tag}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</${tag}>`;
}

function renderTable(rows: string[][]) {
  if (rows.length === 0) {
    return "";
  }

  return `<table><tbody>${rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
    )
    .join("")}</tbody></table>`;
}

function renderBlock(block: StudyThreePageBlock) {
  switch (block.type) {
    case "title":
      return `<h1>${escapeHtml(block.text ?? block.label ?? "")}</h1>`;
    case "heading":
      return `<h2>${escapeHtml(block.text ?? block.label ?? "")}</h2>`;
    case "paragraph":
      return `<p>${escapeHtml(block.text ?? "")}</p>`;
    case "dialogue":
      return `<section class="study-dialogue">${renderParagraphs(block.lines ?? [])}</section>`;
    case "exercise":
      return `<section class="study-exercise">${
        block.label ? `<h3>${escapeHtml(block.label)}</h3>` : ""
      }${block.text ? `<p>${escapeHtml(block.text)}</p>` : ""}${
        (block.items?.length ?? 0) > 0 ? renderList(block.items ?? [], true) : ""
      }</section>`;
    case "note":
      return `<section class="study-note">${
        block.label ? `<h3>${escapeHtml(block.label)}</h3>` : ""
      }${block.text ? `<p>${escapeHtml(block.text)}</p>` : ""}${
        (block.lines?.length ?? 0) > 0 ? renderParagraphs(block.lines ?? []) : ""
      }</section>`;
    case "vocabulary":
      return `<section class="study-vocabulary">${
        block.label ? `<h3>${escapeHtml(block.label)}</h3>` : ""
      }${(block.items?.length ?? 0) > 0 ? renderList(block.items ?? []) : ""}${
        (block.rows?.length ?? 0) > 0 ? renderTable(block.rows ?? []) : ""
      }</section>`;
    case "image":
      return `<figure class="study-image">${
        block.label ? `<div class="study-image-label">${escapeHtml(block.label)}</div>` : ""
      }<div class="study-image-placeholder">Изображение страницы</div>${
        block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ""
      }</figure>`;
    case "table":
      return `<section class="study-table">${renderTable(block.rows ?? [])}</section>`;
    case "list":
      return `<section class="study-list">${renderList(block.items ?? [])}</section>`;
    case "raw_html":
      return block.html ?? "";
    default:
      return "";
  }
}

export function renderStudyThreePageLayout(layout: StudyThreePageLayout) {
  return layout.blocks
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((block) => renderBlock(block))
    .filter((html) => html.trim().length > 0)
    .join("");
}
