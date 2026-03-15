"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Doc = {
  id: string;
  title: string;
  content?: string;
  tag?: string;
};

type Card = {
  id: string;
  title: string;
  content?: string;
};

export default function CommandPalette() {

  const router = useRouter();

  const [open,setOpen] = useState(false);
  const [query,setQuery] = useState("");

  const [docs,setDocs] = useState<Doc[]>([]);
  const [cards,setCards] = useState<Card[]>([]);

  useEffect(()=>{

    function key(e:KeyboardEvent){

      if((e.metaKey || e.ctrlKey) && e.key==="k"){
        e.preventDefault();
        setOpen(o=>!o);
      }

      if(e.key==="Escape"){
        setOpen(false);
      }

    }

    window.addEventListener("keydown",key);
    return ()=>window.removeEventListener("keydown",key);

  },[]);

  useEffect(()=>{

    const rawDocs = localStorage.getItem("texts_db");
    const rawCards = localStorage.getItem("cards_db");

    setDocs(rawDocs ? JSON.parse(rawDocs) : []);
    setCards(rawCards ? JSON.parse(rawCards) : []);

  },[open]);

  function newDocument(){
    router.push("/texts/new");
    setOpen(false);

  }

  function newCard(){

    const id = Date.now().toString();

    const raw = localStorage.getItem("cards_db");
    const cards = raw ? JSON.parse(raw) : [];

    cards.push({
      id,
      title:"Новая карточка",
      content:""
    });

    localStorage.setItem("cards_db",JSON.stringify(cards));

    router.push(`/cards/${id}`);
    setOpen(false);

  }

  function newCardFromSelection(){

    const fn = (window as any).createCardFromEditorSelection;

    if(fn){
      fn();
      setOpen(false);
    }else{
      alert("Сначала открой документ и выдели текст");
    }

  }

  const q = query.toLowerCase();

  const foundDocs = docs.filter(d =>
    (d.title || "").toLowerCase().includes(q)
  );

  const foundCards = cards.filter(c =>
    (c.title || "").toLowerCase().includes(q)
  );

  if(!open) return null;

  return(

    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-32"
      onClick={()=>setOpen(false)}
    >

      <div
        className="w-[600px] rounded-xl bg-white p-4 shadow-xl"
        onClick={(e)=>e.stopPropagation()}
      >

        <input
          autoFocus
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
          placeholder="Поиск…"
          className="mb-3 w-full rounded border p-3"
        />

        <div className="max-h-[400px] space-y-1 overflow-y-auto">

          <div className="px-2 pt-2 text-xs text-gray-500">
            Команды
          </div>

          <button
            className="w-full rounded px-3 py-2 text-left hover:bg-gray-100"
            onClick={newDocument}
          >
            Создать текст
          </button>

          <button
            className="w-full rounded px-3 py-2 text-left hover:bg-gray-100"
            onClick={newCard}
          >
            Создать карточку
          </button>

          <button
            className="w-full rounded px-3 py-2 text-left hover:bg-gray-100"
            onClick={newCardFromSelection}
          >
            Создать карточку из выделенного текста
          </button>

          {foundDocs.length>0 && (
            <>
              <div className="px-2 pt-3 text-xs text-gray-500">
                Тексты
              </div>

              {foundDocs.map(doc=>(
                <button
                  key={doc.id}
                  className="w-full rounded px-3 py-2 text-left hover:bg-gray-100"
                  onClick={()=>{
                    router.push(`/texts/${doc.id}`);
                    setOpen(false);
                  }}
                >
                  {doc.title || "Без названия"}
                </button>
              ))}
            </>
          )}

          {foundCards.length>0 && (
            <>
              <div className="px-2 pt-3 text-xs text-gray-500">
                Карточки
              </div>

              {foundCards.map(card=>(
                <button
                  key={card.id}
                  className="w-full rounded px-3 py-2 text-left hover:bg-gray-100"
                  onClick={()=>{
                    router.push(`/cards/${card.id}`);
                    setOpen(false);
                  }}
                >
                  {card.title || "Без названия"}
                </button>
              ))}
            </>
          )}

        </div>

      </div>

    </div>

  );

}
