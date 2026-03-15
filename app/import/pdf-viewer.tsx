"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// используем worker из node_modules
pdfjs.GlobalWorkerOptions.workerSrc =
  new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export default function PDFViewer({ file }: { file: File }) {
  const [numPages, setNumPages] = useState(0);

  function onLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <Document file={file} onLoadSuccess={onLoadSuccess}>
      {Array.from({ length: numPages }, (_, index) => (
        <div key={index} style={{ marginBottom: 40 }}>
          <div style={{ marginBottom: 10 }}>
            <b>Page {index + 1}</b>
          </div>

          <Page pageNumber={index + 1} width={800} />
        </div>
      ))}
    </Document>
  );
}