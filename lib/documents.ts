export type Document = {
    id: string
    title: string
    content: string
    tag?: string
    createdAt?: string
    updatedAt?: string
  }
  
  const STORAGE_KEY = "documents_db"
  
  function readRaw(): Document[] {
    if (typeof window === "undefined") return []
  
    const raw = localStorage.getItem(STORAGE_KEY)
  
    if (!raw) return []
  
    try {
      const parsed = JSON.parse(raw)
  
      if (Array.isArray(parsed)) {
        return parsed
      }
  
      return []
    } catch {
      return []
    }
  }
  
  function writeRaw(docs: Document[]) {
    if (typeof window === "undefined") return
  
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs))
  }
  
  export function getAllDocuments(): Document[] {
    return readRaw()
  }
  
  export function getDocument(id: string): Document | undefined {
    return readRaw().find((d) => d.id === id)
  }
  
  export function createDocument(doc: Document) {
    const docs = readRaw()
  
    const updated = [...docs, doc]
  
    writeRaw(updated)
  }
  
  export function updateDocument(doc: Document) {
    const docs = readRaw()
  
    const index = docs.findIndex((d) => d.id === doc.id)
  
    if (index === -1) {
      writeRaw([...docs, doc])
      return
    }
  
    const updated = [...docs]
  
    updated[index] = doc
  
    writeRaw(updated)
  }
  
  export function deleteDocument(id: string) {
    const docs = readRaw()
  
    const filtered = docs.filter((d) => d.id !== id)
  
    writeRaw(filtered)
  }