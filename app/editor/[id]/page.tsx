"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Link as LinkIcon,
} from "lucide-react"

type Document = {
  id: string
  title: string
  content: string
  tag: string
}

export default function DocumentPage() {

  const router = useRouter()
  const params = useParams()

  const id = params.id as string

  const [title,setTitle] = useState("")
  const [tag,setTag] = useState("")
  const [loadedContent,setLoadedContent] = useState("")

  const editor = useEditor({
    immediatelyRender:false,
    extensions:[
      StarterKit,
      Underline,
      Link
    ],
    content:loadedContent
  })

  useEffect(()=>{

    const stored = localStorage.getItem("documents")

    if(!stored) return

    const docs:Document[] = JSON.parse(stored)

    const doc = docs.find(d => d.id === id)

    if(!doc) return

    setTitle(doc.title)
    setTag(doc.tag)
    setLoadedContent(doc.content)

    if(editor){
      editor.commands.setContent(doc.content)
    }

  },[editor,id])

  function saveDocument(){

    if(!editor) return

    const stored = localStorage.getItem("documents")

    if(!stored) return

    const docs:Document[] = JSON.parse(stored)

    const updated = docs.map(doc=>{
      if(doc.id === id){
        return {
          ...doc,
          title,
          tag,
          content:editor.getHTML()
        }
      }
      return doc
    })

    localStorage.setItem("documents",JSON.stringify(updated))

    alert("Документ обновлён")
  }

  if(!editor) return null

  const btn = (active:boolean)=>({
    padding:"6px 8px",
    border:"1px solid #ddd",
    borderRadius:6,
    background:active?"#eee":"white",
    cursor:"pointer",
    display:"flex",
    alignItems:"center",
    justifyContent:"center"
  })

  return (
    <main style={{maxWidth:900,margin:"40px auto"}}>

      <button
        onClick={()=>router.push("/editor")}
        style={{marginBottom:20}}
      >
        ← Назад
      </button>

      <h1 style={{fontSize:32,marginBottom:20}}>
        Документ
      </h1>

      <div style={{display:"flex",gap:10,marginBottom:20}}>

        <input
          value={title}
          onChange={(e)=>setTitle(e.target.value)}
          placeholder="Название документа"
          style={{
            flex:1,
            padding:10,
            border:"1px solid #ddd",
            borderRadius:6
          }}
        />

        <input
          value={tag}
          onChange={(e)=>setTag(e.target.value)}
          placeholder="Тег"
          style={{
            width:200,
            padding:10,
            border:"1px solid #ddd",
            borderRadius:6
          }}
        />

        <button
          onClick={saveDocument}
          style={{
            padding:"10px 16px",
            background:"black",
            color:"white",
            borderRadius:6
          }}
        >
          Сохранить
        </button>

      </div>

      <div style={{border:"1px solid #ddd",borderRadius:10,overflow:"hidden"}}>

        <div style={{
          display:"flex",
          gap:6,
          padding:10,
          borderBottom:"1px solid #ddd",
          flexWrap:"wrap",
          background:"#fafafa"
        }}>

          <button style={btn(editor.isActive("bold"))}
            onClick={()=>editor.chain().focus().toggleBold().run()}>
            <Bold size={16}/>
          </button>

          <button style={btn(editor.isActive("italic"))}
            onClick={()=>editor.chain().focus().toggleItalic().run()}>
            <Italic size={16}/>
          </button>

          <button style={btn(editor.isActive("underline"))}
            onClick={()=>editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon size={16}/>
          </button>

          <button style={btn(editor.isActive("heading",{level:1}))}
            onClick={()=>editor.chain().focus().toggleHeading({level:1}).run()}>
            <Heading1 size={16}/>
          </button>

          <button style={btn(editor.isActive("heading",{level:2}))}
            onClick={()=>editor.chain().focus().toggleHeading({level:2}).run()}>
            <Heading2 size={16}/>
          </button>

          <button style={btn(editor.isActive("bulletList"))}
            onClick={()=>editor.chain().focus().toggleBulletList().run()}>
            <List size={16}/>
          </button>

          <button style={btn(editor.isActive("orderedList"))}
            onClick={()=>editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered size={16}/>
          </button>

          <button style={btn(editor.isActive("blockquote"))}
            onClick={()=>editor.chain().focus().toggleBlockquote().run()}>
            <Quote size={16}/>
          </button>

          <button style={btn(editor.isActive("codeBlock"))}
            onClick={()=>editor.chain().focus().toggleCodeBlock().run()}>
            <Code size={16}/>
          </button>

          <button style={btn(false)}
            onClick={()=>{
              const url=prompt("URL")
              if(url){
                editor.chain().focus().setLink({href:url}).run()
              }
            }}>
            <LinkIcon size={16}/>
          </button>

          <button style={btn(false)}
            onClick={()=>editor.chain().focus().undo().run()}>
            <Undo size={16}/>
          </button>

          <button style={btn(false)}
            onClick={()=>editor.chain().focus().redo().run()}>
            <Redo size={16}/>
          </button>

        </div>

        <EditorContent
          editor={editor}
          style={{
            minHeight:500,
            padding:20,
            fontSize:18,
            lineHeight:1.6,
            outline:"none"
          }}
        />

      </div>

    </main>
  )
}