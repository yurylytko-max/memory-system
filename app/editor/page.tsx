"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type Document = {
  id: string
  title: string
  content: string
  tag: string
}

export default function EditorHome() {

  const router = useRouter()

  const [docs,setDocs] = useState<Document[]>([])

  useEffect(()=>{

    const stored = localStorage.getItem("documents")

    if(stored){
      setDocs(JSON.parse(stored))
    }

  },[])

  function deleteDoc(id:string){

    const updated = docs.filter(d => d.id !== id)

    localStorage.setItem("documents",JSON.stringify(updated))

    setDocs(updated)

  }

  return (
    <main className="min-h-screen bg-gray-100 p-10">

      <button
        onClick={()=>router.back()}
        className="mb-6 text-sm text-gray-600 hover:text-black"
      >
        ← Назад
      </button>

      <h1 className="text-3xl font-bold mb-8">
        Писательское пространство
      </h1>

      <div className="mb-8">

        <Link
          href="/editor/new"
          className="bg-black text-white px-4 py-2 rounded"
        >
          Новый документ
        </Link>

      </div>

      <div className="grid grid-cols-2 gap-6">

        {docs.map(doc => (

          <div
            key={doc.id}
            className="bg-white p-6 rounded-xl shadow relative"
          >

            <div className="font-semibold text-lg mb-2">
              {doc.title}
            </div>

            {doc.tag && (
              <div className="text-sm text-gray-500 mb-4">
                тег: {doc.tag}
              </div>
            )}

            <div className="flex gap-3">

              <Link
                href={`/editor/${doc.id}`}
                className="text-sm text-blue-600"
              >
                открыть
              </Link>

              <button
                onClick={()=>deleteDoc(doc.id)}
                className="text-sm text-red-500"
              >
                удалить
              </button>

            </div>

          </div>

        ))}

      </div>

    </main>
  )
}