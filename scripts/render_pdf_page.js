/* eslint-disable @typescript-eslint/no-unused-vars */

ObjC.import("Foundation");
ObjC.import("PDFKit");
ObjC.import("AppKit");

function run(argv) {
  const [pdfPath, outPath, pageNumberArg] = argv;
  const pageNumber = Math.max(1, Number(pageNumberArg || "1"));
  const document = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath($(pdfPath)));

  if (!document) {
    throw new Error("Failed to open PDF");
  }

  const pageIndex = Math.min(pageNumber - 1, document.pageCount - 1);
  const page = document.pageAtIndex(pageIndex);

  if (!page) {
    throw new Error("Requested PDF page is missing");
  }

  const bounds = page.boundsForBox($.kPDFDisplayBoxMediaBox);
  const scale = 2;
  const image = page.thumbnailOfSizeForBox(
    $.NSMakeSize(Math.round(bounds.size.width * scale), Math.round(bounds.size.height * scale)),
    $.kPDFDisplayBoxMediaBox
  );
  const tiff = image.TIFFRepresentation;
  const bitmap = $.NSBitmapImageRep.imageRepWithData(tiff);
  const png = bitmap.representationUsingTypeProperties(
    $.NSBitmapImageFileTypePNG,
    $.NSDictionary.dictionary
  );

  png.writeToFileAtomically($(outPath), true);

  return String(document.pageCount);
}
