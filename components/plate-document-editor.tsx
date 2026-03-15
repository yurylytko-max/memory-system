"use client";

import type { ReactNode } from "react";

import { BlockquotePlugin, H1Plugin, H2Plugin } from "@platejs/basic-nodes/react";
import { upsertLink } from "@platejs/link";
import { LinkPlugin } from "@platejs/link/react";
import { ListStyleType, someList, toggleList } from "@platejs/list";
import { ListPlugin } from "@platejs/list/react";
import { Bold, Heading1, Heading2, Italic, List, ListOrdered, Quote, RotateCcw, RotateCw, Sparkles, Underline } from "lucide-react";
import { deserializeHtml, type TSelection, type Value } from "platejs";
import { Plate, type PlateEditor, useEditorRef, useEditorSelector } from "platejs/react";
import { serializeHtml } from "platejs/static";

import { BasicNodesKit } from "@/components/editor/plugins/basic-nodes-kit";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { FixedToolbar } from "@/components/ui/fixed-toolbar";
import { MarkToolbarButton } from "@/components/ui/mark-toolbar-button";
import { ToolbarButton, ToolbarSeparator } from "@/components/ui/toolbar";

type PlateDocumentEditorProps = {
  editor: PlateEditor;
  createCard: () => void;
};

type ToolbarActionButtonProps = {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
  tooltip: string;
};

export type PendingCardLink = {
  editorId: string;
  selection: Exclude<TSelection, null>;
  text: string;
};

export const PENDING_CARD_LINK_KEY = "pending_card_link";

export const DOCUMENT_PLATE_PLUGINS = [
  ...BasicNodesKit,
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

function ToolbarActionButton({
  active = false,
  children,
  onClick,
  tooltip,
}: ToolbarActionButtonProps) {
  return (
    <ToolbarButton
      pressed={active}
      tooltip={tooltip}
      type="button"
      variant="outline"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </ToolbarButton>
  );
}

function BlockButton({
  children,
  type,
  tooltip,
}: {
  children: ReactNode;
  type: string;
  tooltip: string;
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
    <ToolbarActionButton
      active={active}
      tooltip={tooltip}
      onClick={() => {
        editor.tf.focus();
        editor.tf.toggleBlock(type);
      }}
    >
      {children}
    </ToolbarActionButton>
  );
}

function ListButton({
  children,
  type,
  tooltip,
}: {
  children: ReactNode;
  type: ListStyleType;
  tooltip: string;
}) {
  const editor = useEditorRef();
  const active = useEditorSelector((currentEditor) => {
    return someList(currentEditor, type);
  }, [type]);

  return (
    <ToolbarActionButton
      active={active}
      tooltip={tooltip}
      onClick={() => {
        editor.tf.focus();
        toggleList(editor, {
          listStyleType: type,
        });
      }}
    >
      {children}
    </ToolbarActionButton>
  );
}

export default function PlateDocumentEditor({
  editor,
  createCard,
}: PlateDocumentEditorProps) {
  return (
    <Plate editor={editor}>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <FixedToolbar className="gap-1 px-2 py-2">
          <div className="flex items-center gap-1">
            <MarkToolbarButton nodeType="bold" tooltip="Bold" variant="outline">
              <Bold />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType="italic" tooltip="Italic" variant="outline">
              <Italic />
            </MarkToolbarButton>
            <MarkToolbarButton
              nodeType="underline"
              tooltip="Underline"
              variant="outline"
            >
              <Underline />
            </MarkToolbarButton>
          </div>

          <ToolbarSeparator />

          <div className="flex items-center gap-1">
            <BlockButton type={H1Plugin.key} tooltip="Heading 1">
              <Heading1 />
            </BlockButton>
            <BlockButton type={H2Plugin.key} tooltip="Heading 2">
              <Heading2 />
            </BlockButton>
            <BlockButton type={BlockquotePlugin.key} tooltip="Quote">
              <Quote />
            </BlockButton>
          </div>

          <ToolbarSeparator />

          <div className="flex items-center gap-1">
            <ListButton type={ListStyleType.Disc} tooltip="Bulleted list">
              <List />
            </ListButton>
            <ListButton type={ListStyleType.Decimal} tooltip="Numbered list">
              <ListOrdered />
            </ListButton>
          </div>

          <ToolbarSeparator />

          <div className="flex items-center gap-1">
            <ToolbarActionButton
              tooltip="Undo"
              onClick={() => {
                editor.tf.undo();
              }}
            >
              <RotateCcw />
            </ToolbarActionButton>
            <ToolbarActionButton
              tooltip="Redo"
              onClick={() => {
                editor.tf.redo();
              }}
            >
              <RotateCw />
            </ToolbarActionButton>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <ToolbarActionButton tooltip="Create card" onClick={createCard}>
              <Sparkles />
              <span>Card</span>
            </ToolbarActionButton>
          </div>
        </FixedToolbar>

        <EditorContainer className="min-h-[560px] bg-background">
          <Editor
            autoFocus
            className="min-h-[560px] px-12 py-8 text-[18px] leading-8"
            variant="fullWidth"
          />
        </EditorContainer>
      </div>
    </Plate>
  );
}
