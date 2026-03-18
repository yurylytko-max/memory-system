"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import type { LanguageCourse, LanguageImportJob } from "@/lib/languages";

type RenderedPage = {
  pageNumber: number;
  width: number;
  height: number;
  fileName: string;
  blob: Blob;
};

const UPLOAD_BATCH_SIZE = 2;

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error || "Request failed.");
  }

  return payload as T;
}

async function renderPdfToImages(file: File): Promise<RenderedPage[]> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  const pages: RenderedPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.15 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas context is unavailable.");
    }

    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => {
          if (!nextBlob) {
            reject(new Error(`Could not render page ${pageNumber}.`));
            return;
          }

          resolve(nextBlob);
        },
        "image/jpeg",
        0.72
      );
    });

    pages.push({
      pageNumber,
      width: canvas.width,
      height: canvas.height,
      fileName: `page-${String(pageNumber).padStart(4, "0")}.jpg`,
      blob,
    });
  }

  return pages;
}

export default function LanguagesImportPage() {
  const router = useRouter();
  const [job, setJob] = useState<LanguageImportJob | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setLoading(true);
    setJob(null);
    setStatus("Рендерю PDF в изображения для vision import...");

    try {
      const renderedPages = await renderPdfToImages(file);
      const pageAssets = renderedPages.map((page) => ({
        pageNumber: page.pageNumber,
        width: page.width,
        height: page.height,
        fileName: page.fileName,
      }));
      let nextJob = await fetchJson<LanguageImportJob>("/api/languages/import-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceFileName: file.name,
          totalPages: renderedPages.length,
          pageAssets,
        }),
      });

      setJob(nextJob);

      for (let index = 0; index < renderedPages.length; index += UPLOAD_BATCH_SIZE) {
        const pageBatch = renderedPages.slice(index, index + UPLOAD_BATCH_SIZE);
        const batchFormData = new FormData();

        batchFormData.set(
          "pageAssets",
          JSON.stringify(
            pageBatch.map((page) => ({
              pageNumber: page.pageNumber,
              width: page.width,
              height: page.height,
              fileName: page.fileName,
            }))
          )
        );

        for (const page of pageBatch) {
          batchFormData.append("pageImages", page.blob, page.fileName);
        }

        setStatus(
          `Stage A upload: pages ${index + 1}-${Math.min(index + pageBatch.length, renderedPages.length)} of ${renderedPages.length}`
        );
        nextJob = await fetchJson<LanguageImportJob>(
          `/api/languages/import-jobs/${nextJob.id}/advance`,
          {
            method: "POST",
            body: batchFormData,
          }
        );
        setJob(nextJob);

        if (nextJob.status === "failed") {
          throw new Error(nextJob.errorMessage ?? nextJob.progressLabel);
        }
      }

      while (nextJob.status !== "completed" && nextJob.status !== "failed") {
        setStatus(nextJob.progressLabel);
        nextJob = await fetchJson<LanguageImportJob>(
          `/api/languages/import-jobs/${nextJob.id}/advance`,
          { method: "POST" }
        );
        setJob(nextJob);

        if (nextJob.status === "failed") {
          throw new Error(nextJob.errorMessage ?? nextJob.progressLabel);
        }
      }

      setStatus(nextJob.progressLabel);

      if (nextJob.status === "completed" && nextJob.languageCourseId) {
        const course = await fetchJson<LanguageCourse>(
          `/api/languages/courses/${nextJob.languageCourseId}`
        );
        router.push(`/languages/courses/${course.id}`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff3db_0%,#fff9ef_35%,#ffffff_72%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Link
          href="/languages"
          className="inline-flex w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-900 transition hover:bg-orange-50"
        >
          ← К разделу
        </Link>

        <section className="rounded-[36px] border border-orange-200 bg-white p-8">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
            Импорт учебника
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Новый курс создаётся через vision-first pipeline, а не через PDF text
            parsing. Backend работает только через Ollama.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFile}
                className="hidden"
                disabled={loading}
              />
              {loading ? "Идёт import..." : "Загрузить PDF"}
            </label>

            <Link
              href="/languages"
              className="inline-flex items-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Назад к курсам
            </Link>
          </div>

          {status ? <p className="mt-5 text-sm text-slate-600">{status}</p> : null}
        </section>

        {job ? (
          <section className="rounded-[32px] border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-semibold text-slate-950">Import job</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="text-sm text-slate-500">Stage</div>
                <div className="mt-2 text-lg font-semibold text-slate-950">
                  {job.stage}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="text-sm text-slate-500">Pages</div>
                <div className="mt-2 text-lg font-semibold text-slate-950">
                  {job.analyzedPageCount}/{job.totalPages}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="text-sm text-slate-500">Lessons</div>
                <div className="mt-2 text-lg font-semibold text-slate-950">
                  {job.generatedLessonCount}/{job.lessonDraftCount}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
