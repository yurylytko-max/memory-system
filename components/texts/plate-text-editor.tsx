"use client";

import * as React from "react";

import type { Alignment } from "@platejs/basic-styles";
import type { TLinkElement } from "platejs";
import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";

import {
  FontBackgroundColorPlugin,
  FontColorPlugin,
  FontSizePlugin,
  LineHeightPlugin,
  TextAlignPlugin,
} from "@platejs/basic-styles/react";
import { getLinkAttributes } from "@platejs/link";
import {
  BoldPlugin,
  HighlightPlugin,
  ItalicPlugin,
  StrikethroughPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import { upsertLink } from "@platejs/link";
import { LinkPlugin } from "@platejs/link/react";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  HighlighterIcon,
  ItalicIcon,
  Minus,
  Redo2Icon,
  Sparkles,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
  WrapText,
} from "lucide-react";
import { deserializeHtml, KEYS, type TSelection, type Value } from "platejs";
import {
  ParagraphPlugin,
  Plate,
  type PlateEditor,
  PlateElement,
  type PlateElementProps,
  useEditorPlugin,
  useEditorRef,
  useEditorSelector,
  useSelectionFragmentProp,
} from "platejs/react";
import { serializeHtml } from "platejs/static";

import { ParagraphElement } from "@/components/ui/paragraph-node";
import { HighlightLeaf } from "@/components/ui/highlight-node";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { FixedToolbar } from "@/components/ui/fixed-toolbar";
import { MarkToolbarButton } from "@/components/ui/mark-toolbar-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToolbarButton, ToolbarGroup } from "@/components/ui/toolbar";

type PlateTextEditorProps = {
  createCard: () => void;
  editor: PlateEditor;
};

export type PendingTextCardLink = {
  selection: Exclude<TSelection, null>;
  text: string;
  textId: string;
};

const DEFAULT_FONT_SIZE = "12";
const DEFAULT_LINE_HEIGHT = 1.15;
const EDITOR_DISPLAY_ZOOM = 1.2;

const FONT_SIZE_OPTIONS = ["8", "9", "10", "12", "14", "16", "18", "20", "24", "30", "36"] as const;
const LINE_HEIGHT_OPTIONS = ["1", "1.15", "1.5", "2"] as const;
const TEXT_COLOR_OPTIONS = ["#000000", "#374151", "#991B1B", "#92400E", "#166534", "#1D4ED8", "#6D28D9"] as const;
const HIGHLIGHT_COLOR_OPTIONS = ["#FEF3C7", "#FDE68A", "#BFDBFE", "#C7D2FE", "#BBF7D0", "#FBCFE8"] as const;
export const PENDING_TEXT_CARD_LINK_KEY = "pending_text_card_link";

const TextAlignIcons: Record<Exclude<Alignment, "justify">, React.ComponentType<{ className?: string }>> = {
  center: AlignCenterIcon,
  end: AlignRightIcon,
  left: AlignLeftIcon,
  right: AlignRightIcon,
  start: AlignLeftIcon,
};

const baseFontInject = {
  inject: {
    targetPlugins: [KEYS.p] as string[],
  },
};

export const TEXTS_PLATE_PLUGINS = [
  ParagraphPlugin.withComponent(ParagraphElement),
  LinkPlugin.configure({
    render: {
      node: TextCardLinkElement,
    },
  }),
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin.configure({
    shortcuts: { toggle: { keys: "mod+shift+x" } },
  }),
  HighlightPlugin.configure({
    node: { component: HighlightLeaf },
    shortcuts: { toggle: { keys: "mod+shift+h" } },
  }),
  FontColorPlugin.configure({
    inject: {
      ...baseFontInject.inject,
      nodeProps: {
        defaultNodeValue: "black",
      },
    },
  }),
  FontBackgroundColorPlugin.configure(baseFontInject),
  FontSizePlugin.configure(baseFontInject),
  TextAlignPlugin.configure({
    inject: {
      nodeProps: {
        defaultNodeValue: "left",
        nodeKey: "align",
        styleKey: "textAlign",
        validNodeValues: ["left", "center", "right"],
      },
      targetPlugins: [KEYS.p],
    },
  }),
  LineHeightPlugin.configure({
    inject: {
      nodeProps: {
        defaultNodeValue: DEFAULT_LINE_HEIGHT,
        validNodeValues: LINE_HEIGHT_OPTIONS.map(Number),
      },
      targetPlugins: [KEYS.p],
    },
  }),
];

export const DEFAULT_TEXT_HTML = "<p></p>";

export function parseHtmlToTextValue(editor: PlateEditor, html: string) {
  return deserializeHtml(editor, {
    element: html?.trim() ? html : "<p></p>",
  }) as Value;
}

export async function serializeTextEditorHtml(editor: PlateEditor) {
  return serializeHtml(editor, {
    stripClassNames: true,
    stripDataAttributes: true,
  });
}

function TextCardLinkElement(props: PlateElementProps<TLinkElement>) {
  const attributes = getLinkAttributes(props.editor, props.element);
  const href = typeof attributes.href === "string" ? attributes.href : "";

  return (
    <PlateElement
      {...props}
      as="a"
      className="cursor-pointer font-medium text-blue-700 underline decoration-blue-700 underline-offset-4"
      attributes={{
        ...props.attributes,
        ...attributes,
        onClick: (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (href) {
            window.location.assign(href);
          }
        },
        onMouseOver: (event) => {
          event.stopPropagation();
        },
      }}
    >
      {props.children}
    </PlateElement>
  );
}

export function insertTextCardLink(
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

function UndoToolbarButton(props: React.ComponentProps<typeof ToolbarButton>) {
  const editor = useEditorRef();
  const disabled = useEditorSelector((currentEditor) => currentEditor.history.undos.length === 0, []);

  return (
    <ToolbarButton
      {...props}
      disabled={disabled}
      tooltip="Undo"
      onClick={() => editor.undo()}
      onMouseDown={(event) => event.preventDefault()}
    >
      <Undo2Icon />
    </ToolbarButton>
  );
}

function RedoToolbarButton(props: React.ComponentProps<typeof ToolbarButton>) {
  const editor = useEditorRef();
  const disabled = useEditorSelector((currentEditor) => currentEditor.history.redos.length === 0, []);

  return (
    <ToolbarButton
      {...props}
      disabled={disabled}
      tooltip="Redo"
      onClick={() => editor.redo()}
      onMouseDown={(event) => event.preventDefault()}
    >
      <Redo2Icon />
    </ToolbarButton>
  );
}

function TextFontSizeToolbarButton() {
  const [open, setOpen] = React.useState(false);
  const { editor, tf } = useEditorPlugin(FontSizePlugin);

  const value = useEditorSelector((currentEditor) => {
    const fontSize = currentEditor.api.marks()?.[KEYS.fontSize] as string | undefined;
    return fontSize ? fontSize.replace("px", "") : DEFAULT_FONT_SIZE;
  }, []);

  const applySize = React.useCallback(
    (nextValue: string) => {
      tf.fontSize.addMark(`${nextValue}px`);
      editor.tf.focus();
    },
    [editor, tf]
  );

  const increment = React.useCallback(
    (delta: number) => {
      const next = Math.max(8, Number(value) + delta);
      applySize(String(next));
    },
    [applySize, value]
  );

  return (
    <div className="flex items-center gap-1 rounded-md bg-muted/60 px-1 py-0.5">
      <ToolbarButton tooltip="Decrease font size" onClick={() => increment(-1)}>
        <Minus />
      </ToolbarButton>

      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <ToolbarButton pressed={open} tooltip="Font size" isDropdown>
            <span className="min-w-6 text-center text-sm">{value}</span>
          </ToolbarButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="min-w-[72px]" align="start">
          {FONT_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              className="flex h-8 w-full items-center justify-center rounded-sm px-2 text-sm hover:bg-accent"
              onClick={() => {
                applySize(size);
                setOpen(false);
              }}
            >
              {size}
            </button>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarButton tooltip="Increase font size" onClick={() => increment(1)}>
        <span className="text-base font-medium">+</span>
      </ToolbarButton>
    </div>
  );
}

function TextAlignToolbarButton({ value }: { value: "left" | "center" | "right" }) {
  const { editor, tf } = useEditorPlugin(TextAlignPlugin);
  const currentValue = useSelectionFragmentProp({
    defaultValue: "left",
    getProp: (node) => node.align,
  }) as "left" | "center" | "right";

  const Icon = TextAlignIcons[value];

  return (
    <ToolbarButton
      pressed={currentValue === value}
      tooltip={`Align ${value}`}
      onClick={() => {
        tf.textAlign.setNodes(value);
        editor.tf.focus();
      }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <Icon />
    </ToolbarButton>
  );
}

function TextLineHeightToolbarButton(props: DropdownMenuProps) {
  const editor = useEditorRef();
  const value = useSelectionFragmentProp({
    defaultValue: String(DEFAULT_LINE_HEIGHT),
    getProp: (node) => node.lineHeight,
  });

  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Line height" isDropdown>
          <WrapText />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-[120px]" align="start">
        <DropdownMenuRadioGroup
          value={String(value ?? DEFAULT_LINE_HEIGHT)}
          onValueChange={(nextValue) => {
            editor.getTransforms(LineHeightPlugin).lineHeight.setNodes(Number(nextValue));
            editor.tf.focus();
          }}
        >
          {LINE_HEIGHT_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option}
              className="pl-2 *:first:[span]:hidden"
              value={option}
            >
              {option}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ColorSwatch({
  active,
  onClick,
  value,
}: {
  active: boolean;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      type="button"
      className="h-6 w-6 rounded-full border border-slate-300 transition hover:scale-105"
      style={{
        backgroundColor: value,
        boxShadow: active ? "0 0 0 2px #0f172a inset" : undefined,
      }}
      onClick={onClick}
    />
  );
}

function TextColorToolbarButton({
  mark,
  options,
  tooltip,
  trigger,
}: {
  mark: typeof KEYS.color | typeof KEYS.backgroundColor;
  options: readonly string[];
  tooltip: string;
  trigger: React.ReactNode;
}) {
  const editor = useEditorRef();
  const currentValue = useEditorSelector(
    (currentEditor) => currentEditor.api.mark(mark) as string | undefined,
    [mark]
  );
  const [open, setOpen] = React.useState(false);

  const applyColor = React.useCallback(
    (value: string) => {
      editor.tf.focus();
      editor.tf.addMarks({ [mark]: value });
      setOpen(false);
    },
    [editor, mark]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip={tooltip}>
          {trigger}
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="start">
        <div className="grid grid-cols-6 gap-2 p-2">
          {options.map((option) => (
            <ColorSwatch
              key={option}
              active={currentValue === option}
              value={option}
              onClick={() => applyColor(option)}
            />
          ))}
        </div>

        <DropdownMenuItem asChild>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-xs">
            <span>Custom</span>
            <input
              type="color"
              defaultValue={currentValue ?? options[0]}
              className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
              onChange={(event) => applyColor(event.target.value)}
            />
          </label>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TextsToolbar({ createCard }: { createCard: () => void }) {
  return (
    <FixedToolbar className="justify-start gap-2 border-b border-slate-200 bg-white/95 px-3 py-2">
      <ToolbarGroup>
        <UndoToolbarButton />
        <RedoToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <TextFontSizeToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <MarkToolbarButton nodeType={KEYS.bold} tooltip="Bold">
          <BoldIcon />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={KEYS.italic} tooltip="Italic">
          <ItalicIcon />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={KEYS.underline} tooltip="Underline">
          <UnderlineIcon />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={KEYS.strikethrough} tooltip="Strikethrough">
          <StrikethroughIcon />
        </MarkToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <TextColorToolbarButton
          mark={KEYS.color}
          options={TEXT_COLOR_OPTIONS}
          tooltip="Text color"
          trigger={<span className="text-sm font-semibold">A</span>}
        />
        <TextColorToolbarButton
          mark={KEYS.backgroundColor}
          options={HIGHLIGHT_COLOR_OPTIONS}
          tooltip="Highlight"
          trigger={<HighlighterIcon />}
        />
      </ToolbarGroup>

      <ToolbarGroup>
        <TextAlignToolbarButton value="left" />
        <TextAlignToolbarButton value="center" />
        <TextAlignToolbarButton value="right" />
      </ToolbarGroup>

      <ToolbarGroup>
        <TextLineHeightToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          tooltip="Create card from selection"
          onClick={createCard}
          onMouseDown={(event) => event.preventDefault()}
        >
          <Sparkles />
          <span>Card</span>
        </ToolbarButton>
      </ToolbarGroup>
    </FixedToolbar>
  );
}

export default function PlateTextEditor({ createCard, editor }: PlateTextEditorProps) {
  return (
    <Plate editor={editor}>
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
        <TextsToolbar createCard={createCard} />

        <div className="bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.10),_transparent_45%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-4 md:px-6 md:py-6">
          <EditorContainer className="min-h-[720px] rounded-[24px] border border-slate-200 bg-white shadow-inner">
            <Editor
              autoFocus
              placeholder=""
              className="min-h-[720px] px-16 pt-4 pb-72 text-[12px] leading-[1.15] sm:px-24"
              style={{
                fontFamily: '"Times New Roman", Times, serif',
                zoom: EDITOR_DISPLAY_ZOOM,
              }}
              variant="fullWidth"
            />
          </EditorContainer>
        </div>
      </div>
    </Plate>
  );
}
