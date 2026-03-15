"use client"

import { useParams } from "next/navigation"
import { useState } from "react"

export default function LessonPage(){

  const params = useParams()
  const lessonId = params.id

  const [text,setText] = useState("")
  const [words,setWords] = useState<string[]>([])
  const [cards,setCards] = useState<string[]>([])

  function extractWords(){

    const clean = text
      .toLowerCase()
      .replace(/[.,!?;:()\n]/g," ")

    const list = clean
      .split(" ")
      .map(w=>w.trim())
      .filter(w=>w.length>2)

    const unique = Array.from(new Set(list))

    setWords(unique)

  }

  function createCards(){

    setCards(words)

  }

  return(

    <main
      style={{
        maxWidth:900,
        margin:"0 auto",
        padding:40,
        fontFamily:"system-ui"
      }}
    >

      <h1>Lesson {lessonId}</h1>

      <h2 style={{marginTop:40}}>Vocabulary</h2>

      <textarea
        value={text}
        onChange={(e)=>setText(e.target.value)}
        placeholder="вставь текст урока"
        style={{
          width:"100%",
          height:200,
          marginTop:10
        }}
      />

      <div style={{marginTop:10}}>

        <button onClick={extractWords}>
          Extract words
        </button>

      </div>

      {words.length>0 &&(

        <div style={{marginTop:30}}>

          <h3>Найденные слова</h3>

          {words.map(word=>(
            <div key={word}>
              {word}
            </div>
          ))}

          <button
            style={{marginTop:20}}
            onClick={createCards}
          >
            Create flashcards
          </button>

        </div>

      )}

      {cards.length>0 &&(

        <div style={{marginTop:40}}>

          <h2>Flashcards</h2>

          {cards.map(word=>(
            <div
              key={word}
              style={{
                border:"1px solid #ddd",
                padding:12,
                marginTop:10
              }}
            >
              {word}
            </div>
          ))}

        </div>

      )}

    </main>

  )

}