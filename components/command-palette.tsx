"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Doc = {
  id: string;
  title: string;
  content?: string;
  tag?: string;
};

export default function CommandPalette() {

  const router = useRouter();

  const [open,setOpen] = useState(false);
  const [query,setQuery] = useState("");

  const [docs,setDocs] = useState<Doc[]>([]);
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
    async function loadData() {
      const { getAllTexts } = await import("@/lib/texts");
      const texts = await getAllTexts();

      setDocs(texts);
    }

    if (open) {
      void loadData();
    }

  },[open]);

  function newDocument(){
    router.push("/texts/new");
    setOpen(false);

  }

  function newCard(){
    router.push("/cards/new");
    setOpen(false);

  }

  function newCardFromSelection(){
    const fn = (
      window as Window & {
        createCardFromEditorSelection?: () => void;
      }
    ).createCardFromEditorSelection;

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
            onClick={()=>{
              router.push("/cards/space/life");
              setOpen(false);
            }}
          >
            База знаний: жизнь
          </button>

          <button
            className="w-full rounded px-3 py-2 text-left hover:bg-gray-100"
            onClick={()=>{
              router.push("/cards/space/work");
              setOpen(false);
            }}
          >
            База знаний: работа
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

        </div>

      </div>

    </div>

  );

}
