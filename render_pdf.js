ObjC.import('Foundation')
ObjC.import('PDFKit')
ObjC.import('AppKit')

const fm = $.NSFileManager.defaultManager
const pdfPath = '/Users/user/Documents/memory-system/Lithuania-2026-short.pdf'
const outDir = '/tmp/lith-pages'

fm.removeItemAtPathError($(outDir), null)
fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError($(outDir), true, $(), null)

const doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath($(pdfPath)))
if (!doc) {
  throw new Error('Failed to open PDF')
}

console.log(`pages=${doc.pageCount}`)

for (let i = 0; i < doc.pageCount; i++) {
  const page = doc.pageAtIndex(i)
  const bounds = page.boundsForBox($.kPDFDisplayBoxMediaBox)
  const scale = 2.0
  const width = Math.round(bounds.size.width * scale)
  const height = Math.round(bounds.size.height * scale)

  const image = page.thumbnailOfSizeForBox($.NSMakeSize(width, height), $.kPDFDisplayBoxMediaBox)
  const tiff = image.TIFFRepresentation
  const bitmap = $.NSBitmapImageRep.imageRepWithData(tiff)
  const png = bitmap.representationUsingTypeProperties(
    $.NSBitmapImageFileTypePNG,
    $.NSDictionary.dictionary
  )
  const pageNo = String(i + 1).padStart(2, '0')
  const pngPath = `${outDir}/page-${pageNo}.png`
  png.writeToFileAtomically($(pngPath), true)

  const text = ObjC.unwrap(page.string) || ''
  const textPath = `${outDir}/page-${pageNo}.txt`
  $(text).writeToFileAtomicallyEncodingError($(textPath), true, $.NSUTF8StringEncoding, null)
}
