"use client";

import type { ReactNode } from "react";

import { BlockquotePlugin, H1Plugin, H2Plugin } from "@platejs/basic-nodes/react";
import { upsertLink } from "@platejs/link";
import { LinkPlugin } from "@platejs/link/react";
import { ListPlugin } from "@platejs/list/react";
import { Bold, Heading1, Heading2, Quote, Sparkles } from "lucide-react";
import { deserializeHtml, type TSelection, type Value } from "platejs";
import { Plate, type PlateEditor, useEditorRef, useEditorSelector } from "platejs/react";
import { serializeHtml } from "platejs/static";

import { BasicNodesKit } from "@/components/editor/plugins/basic-nodes-kit";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { FixedToolbar } from "@/components/ui/fixed-toolbar";
import { RedoToolbarButton, UndoToolbarButton } from "@/components/ui/history-toolbar-button";
import { LinkToolbarButton } from "@/components/ui/link-toolbar-button";
import { BulletedListToolbarButton, NumberedListToolbarButton } from "@/components/ui/list-toolbar-button";
import { MarkToolbarButton } from "@/components/ui/mark-toolbar-button";
import { ToolbarButton, ToolbarGroup } from "@/components/ui/toolbar";

type PlateDocumentEditorProps = {
  editor: PlateEditor;
  createCard: () => void;
};

type ActionButtonProps = {
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

function ActionButton({
  active = false,
  children,
  onClick,
  tooltip,
}: ActionButtonProps) {
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
    <ActionButton
      active={active}
      tooltip={tooltip}
      onClick={() => {
        editor.tf.focus();
        editor.tf.toggleBlock(type);
      }}
    >
      {children}
    </ActionButton>
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
          <ToolbarGroup>
            <UndoToolbarButton variant="outline" />
            <RedoToolbarButton variant="outline" />
          </ToolbarGroup>

          <ToolbarGroup>
            <MarkToolbarButton nodeType="bold" tooltip="Bold" variant="outline">
              <Bold />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType="italic" tooltip="Italic" variant="outline" />
            <MarkToolbarButton nodeType="underline" tooltip="Underline" variant="outline" />
          </ToolbarGroup>

          <ToolbarGroup>
            <BlockButton type={H1Plugin.key} tooltip="Heading 1">
              <Heading1 />
            </BlockButton>
            <BlockButton type={H2Plugin.key} tooltip="Heading 2">
              <Heading2 />
            </BlockButton>
            <BlockButton type={BlockquotePlugin.key} tooltip="Quote">
              <Quote />
            </BlockButton>
            <BulletedListToolbarButton />
            <NumberedListToolbarButton />
            <LinkToolbarButton variant="outline" />
          </ToolbarGroup>

          <div className="ml-auto flex items-center gap-1 pl-2">
            <ActionButton tooltip="Create card" onClick={createCard}>
              <Sparkles />
              <span>Card</span>
            </ActionButton>
          </div>
        </FixedToolbar>

        <EditorContainer className="min-h-[560px] bg-background">
          <Editor
            autoFocus
            placeholder="Start writing..."
            className="min-h-[560px] px-12 py-8 text-[18px] leading-8"
            variant="fullWidth"
          />
        </EditorContainer>
      </div>
    </Plate>
  );
}
