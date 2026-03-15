"use client";

import { useState, useEffect } from "react";
import { Command } from "cmdk";

export default function CommandMenu({
  createCardFromSelection,
}: {
  createCardFromSelection: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }

    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-start justify-center pt-40 z-50">

      <Command className="bg-white rounded-xl shadow-xl w-[480px] border">

        <Command.Input
          placeholder="Поиск..."
          className="w-full border-b px-4 py-3 outline-none"
        />

        <Command.List>

          <Command.Group heading="Команды">

            <Command.Item
              value="create-card"
              onSelect={() => {
                createCardFromSelection();
                setOpen(false);
              }}
              className="px-4 py-3 cursor-pointer hover:bg-gray-100"
            >
              Создать карточку из выделенного текста
            </Command.Item>

          </Command.Group>

        </Command.List>

      </Command>

    </div>
  );
}