"use client";

import type { ReactNode } from "react";

import { H1Plugin, H2Plugin, BasicMarksPlugin, BlockquotePlugin } from "@platejs/basic-nodes/react";
import { upsertLink } from "@platejs/link";
import { LinkPlugin } from "@platejs/link/react";
import { ListStyleType, someList, toggleList } from "@platejs/list";
import { ListPlugin } from "@platejs/list/react";
import {
  deserializeHtml,
  type Value,
  type TSelection,
} from "platejs";
import {
  ParagraphPlugin,
  Plate,
  PlateContent,
  type PlateEditor,
  useEditorRef,
  useEditorSelector,
} from "platejs/react";
import { serializeHtml } from "platejs/static";

type PlateDocumentEditorProps = {
  editor: PlateEditor;
  createCard: () => void;
};

type ToolbarButtonProps = {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
};

export type PendingCardLink = {
  editorId: string;
  selection: Exclude<TSelection, null>;
  text: string;
};

export const PENDING_CARD_LINK_KEY = "pending_card_link";

export const DOCUMENT_PLATE_PLUGINS = [
  ParagraphPlugin,
  H1Plugin,
  H2Plugin,
  BlockquotePlugin,
  BasicMarksPlugin,
  ListPlugin,
  LinkPlugin,
];

export function parseHtmlToPlateValue(editor: PlateEditor, html: string) {
  return deserializeHtml(editor, {
    element: html?.trim() ? html : "<p></p>",
  }) as Value;
}

export async function serializePlateEditorHtml(editor: PlateEditor) {
  return serializeHtml(editor, {
    stripClassNames: true,
    stripDataAttributes: true,
  });
}

export function insertCardLink(
  editor: PlateEditor,
  cardId: string,
  selectedText: string,
  selection: Exclude<TSelection, null>
) {
  editor.tf.focus();
  editor.tf.select(selection);
  upsertLink(editor, {
    skipValidation: true,
    text: selectedText,
    url: `/cards/${cardId}`,
  });
}

function ToolbarButton({ active = false, children, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`px-3 py-1 border rounded text-sm ${
        active ? "bg-gray-200" : "bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function MarkButton({
  children,
  format,
}: {
  children: ReactNode;
  format: "bold" | "italic" | "underline";
}) {
  const editor = useEditorRef();
  const active = useEditorSelector((currentEditor) => {
    return currentEditor.api.hasMark(format);
  }, [format]);

  return (
    <ToolbarButton
      active={active}
      onClick={() => {
        editor.tf.focus();
        editor.tf.toggleMark(format);
      }}
    >
      {children}
    </ToolbarButton>
  );
}

function BlockButton({
  children,
  type,
}: {
  children: ReactNode;
  type: string;
}) {
  const editor = useEditorRef();
  const active = useEditorSelector((currentEditor) => {
    return currentEditor.api.some({
      match: {
        type,
      },
    });
  }, [type]);

  return (
    <ToolbarButton
      active={active}
      onClick={() => {
        editor.tf.focus();
        editor.tf.toggleBlock(type);
      }}
    >
      {children}
    </ToolbarButton>
  );
}

function ListButton({
  children,
  type,
}: {
  children: ReactNode;
  type: ListStyleType;
}) {
  const editor = useEditorRef();
  const active = useEditorSelector((currentEditor) => {
    return someList(currentEditor, type);
  }, [type]);

  return (
    <ToolbarButton
      active={active}
      onClick={() => {
        editor.tf.focus();
        toggleList(editor, {
          listStyleType: type,
        });
      }}
    >
      {children}
    </ToolbarButton>
  );
}

export default function PlateDocumentEditor({
  editor,
  createCard,
}: PlateDocumentEditorProps) {
  return (
    <Plate editor={editor}>
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="flex gap-2 mb-0 flex-wrap border-b border-gray-200 bg-gray-50 p-3">
          <MarkButton format="bold">B</MarkButton>
          <MarkButton format="italic">I</MarkButton>
          <MarkButton format="underline">U</MarkButton>
          <BlockButton type={H1Plugin.key}>H1</BlockButton>
          <BlockButton type={H2Plugin.key}>H2</BlockButton>
          <ListButton type={ListStyleType.Disc}>• List</ListButton>
          <ListButton type={ListStyleType.Decimal}>1. List</ListButton>
          <BlockButton type={BlockquotePlugin.key}>Quote</BlockButton>
          <ToolbarButton
            onClick={() => {
              editor.tf.undo();
            }}
          >
            Undo
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              editor.tf.redo();
            }}
          >
            Redo
          </ToolbarButton>
          <ToolbarButton onClick={createCard}>Card</ToolbarButton>
        </div>

        <PlateContent className="min-h-[520px] p-5 text-[18px] leading-8 outline-none" />
      </div>
    </Plate>
  );
}
