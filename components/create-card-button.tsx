"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  editor: any;
  onCreateCard: () => void;
};

export default function CreateCardButton({ editor, onCreateCard }: Props) {

  const [visible,setVisible] = useState(false);
  const [pos,setPos] = useState({top:0,left:0});

  useEffect(()=>{

    if(!editor) return;

    function update(){

      const {from,to} = editor.state.selection;

      if(from === to){
        setVisible(false);
        return;
      }

      const text = editor.state.doc.textBetween(from,to," ").trim();

      if(!text){
        setVisible(false);
        return;
      }

      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);

      const left = (start.left + end.right) / 2;

      setPos({
        top:start.top - 45,
        left:left
      });

      setVisible(true);

    }

    editor.on("selectionUpdate",update);

    return ()=>editor.off("selectionUpdate",update);

  },[editor]);

  if(!visible) return null;

  return createPortal(

    <button
      onMouseDown={(e)=>e.preventDefault()}
      onClick={onCreateCard}
      style={{
        position:"fixed",
        top:pos.top,
        left:pos.left,
        transform:"translateX(-50%)",
        zIndex:9999
      }}
      className="bg-black text-white text-sm px-3 py-1 rounded shadow"
    >
      Создать карточку
    </button>,

    document.body

  );

}