"use client"

import { useState } from "react"

export default function ImportPage() {

  const [lessons, setLessons] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  async function handleFile(e: any) {

    const file = e.target.files[0]
    if (!file) return

    setLoading(true)

    const pdfjsLib = await import("pdfjs-dist")

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"

    const arrayBuffer = await file.arrayBuffer()

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    let text = ""

    for (let i = 1; i <= pdf.numPages; i++) {

      const page = await pdf.getPage(i)

      const content = await page.getTextContent()

      const pageText = content.items
        .map((item: any) => item.str)
        .join(" ")

      text += pageText + "\n"

    }

    const split = text.split(/lektion\s+\d+/i)

    const result = split
      .map((t) => t.trim())
      .filter((t) => t.length > 200)

    setLessons(result)

    setLoading(false)

  }

  return (

    <div style={{ padding: 40, maxWidth: 900 }}>

      <h1>Импорт учебника</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFile}
      />

      {loading && <p>Обрабатываю PDF...</p>}

      {lessons.length > 0 && (

        <div style={{ marginTop: 40 }}>

          <h2>Уроки</h2>

          {lessons.map((lesson, i) => (

            <div
              key={i}
              style={{
                border: "1px solid #ddd",
                padding: 20,
                marginBottom: 20
              }}
            >

              <h3>Lesson {i + 1}</h3>

              <button
                onClick={() =>
                  localStorage.setItem("lesson_text", lesson)
                }
              >
                Учить слова
              </button>

            </div>

          ))}

        </div>

      )}

    </div>

  )

}