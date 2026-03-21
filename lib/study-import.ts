import { z } from "zod";

import type { StudyTextbook } from "@/lib/study";
import { normalizeStudyTextbook } from "@/lib/study";

const vocabularySchema = z.object({
  id: z.string().optional(),
  de: z.string().optional(),
  ru: z.string().optional(),
  term: z.string().optional(),
  translation: z.string().optional(),
  article: z.string().optional(),
  lessonId: z.string().optional(),
  blockId: z.string().optional(),
  sectionType: z.string().optional(),
  section: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cardModes: z.array(z.enum(["de_to_ru", "ru_to_de"])).optional(),
  notes: z.string().optional(),
  review: z
    .object({
      de_to_ru: z.record(z.string(), z.any()).optional(),
      ru_to_de: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
});

const grammarSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  summary: z.string().optional(),
  explanation: z.string().optional(),
  content: z.string().optional(),
  pattern: z.string().optional(),
  examples: z.array(z.string()).optional(),
  pitfalls: z.array(z.string()).optional(),
  notes: z.string().optional(),
  linkedTaskIds: z.array(z.string()).optional(),
});

const contentItemSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  type: z.enum(["dialogue", "reading"]).optional(),
  text: z.string().optional(),
  lines: z
    .array(
      z.object({
        speaker: z.string().optional(),
        text: z.string(),
      })
    )
    .optional(),
  translationRu: z.union([z.string(), z.array(z.object({ speaker: z.string().optional(), text: z.string() }))]).optional(),
  comprehensionFocus: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const taskSchema = z.object({
  id: z.string().optional(),
  type: z.enum([
    "single_choice",
    "multiple_choice",
    "matching",
    "ordering",
    "fill_in_blank",
    "form_fill",
    "guided_writing",
  ]),
  skill: z.enum(["recognition", "guided_production", "free_production"]).optional(),
  instruction: z.string(),
  prompt: z.string().optional(),
  question: z.string().optional(),
  explanation: z.string().optional(),
  options: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.string(),
        isCorrect: z.boolean().optional(),
      })
    )
    .optional(),
  acceptedAnswers: z.array(z.string()).optional(),
  normalizedAcceptedAnswers: z.array(z.string()).optional(),
  leftItems: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  rightItems: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  correctPairs: z.array(z.tuple([z.string(), z.string()])).optional(),
  tokens: z.array(z.string()).optional(),
  correctOrder: z.array(z.string()).optional(),
  fields: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string(),
        inputType: z.enum(["text", "number"]).optional(),
        acceptedAnswers: z.array(z.string()).optional(),
        normalizedAcceptedAnswers: z.array(z.string()).optional(),
      })
    )
    .optional(),
  template: z.array(z.string()).optional(),
  requiredPhrases: z.array(z.string()).optional(),
  sampleAnswer: z.string().optional(),
});

const blockSchema = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  title: z.string(),
  goal: z.string().optional(),
  sceneType: z
    .enum(["dialogue", "reading", "forms", "phonetics", "culture", "mixed"])
    .optional(),
  intro: z.string().optional(),
  corePhrases: z.array(z.string()).optional(),
  content: z
    .object({
      dialogues: z.array(contentItemSchema).optional(),
      readings: z.array(contentItemSchema).optional(),
      explainer: z.string().optional(),
    })
    .optional(),
  grammarPoints: z.array(grammarSchema).optional(),
  vocabulary: z.array(z.string()).optional(),
  tasks: z.array(taskSchema).optional(),
  notes: z.string().optional(),
});

const lessonSchema = z.object({
  id: z.string().optional(),
  order: z.number().int().positive().optional(),
  title: z.string(),
  topic: z.string().optional(),
  notes: z.string().optional(),
  lessonGlossary: z.array(vocabularySchema).optional(),
  blocks: z.array(blockSchema).optional(),
  summary: z
    .object({
      grammar: z
        .array(
          z.object({
            id: z.string().optional(),
            title: z.string(),
            content: z.string(),
          })
        )
        .optional(),
      communication: z
        .array(
          z.object({
            id: z.string().optional(),
            title: z.string(),
            phrases: z.array(z.string()).optional(),
          })
        )
        .optional(),
      goals: z.array(z.string()).optional(),
    })
    .optional(),
  extras: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.enum(["song", "film", "project", "game", "culture"]).optional(),
        title: z.string(),
        content: z
          .object({
            text: z.string().optional(),
            items: z.array(z.string()).optional(),
          })
          .optional(),
        notes: z.string().optional(),
      })
    )
    .optional(),
  grammar: z.array(grammarSchema).optional(),
  vocabulary: z.array(vocabularySchema).optional(),
  sections: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.enum(["reading", "exercises", "custom"]).optional(),
        title: z.string(),
        content: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .optional(),
});

const textbookBodySchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  languageCode: z.string().optional(),
  baseLanguageCode: z.string().optional(),
  level: z.string().optional(),
  series: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  lessons: z.array(lessonSchema).optional(),
});

const rootSchema = z.union([
  textbookBodySchema.extend({
    version: z.number().optional(),
  }),
  z.object({
    version: z.number().optional(),
    textbook: textbookBodySchema,
  }),
]);

export function normalizeStudyImport(input: unknown): StudyTextbook {
  const parsed = rootSchema.parse(input);
  return normalizeStudyTextbook(parsed);
}

export const STUDY_IMPORT_TEMPLATE = {
  version: 2,
  textbook: {
    id: "schritte-plus-neu-a1-1-sample",
    title: "Schritte plus Neu A1.1",
    languageCode: "de",
    baseLanguageCode: "ru",
    level: "A1.1",
    series: "Schritte plus Neu",
    notes: "Один JSON на весь учебник. Внутри уроки состоят из блоков A/B/C/D/E, словаря, summary и extras.",
    lessons: [
      {
        id: "lektion-1",
        order: 1,
        title: "Lektion 1",
        topic: "Begruessung, Name, Herkunft, Sprache, Adresse",
        lessonGlossary: [
          {
            id: "l1-a-guten-tag",
            de: "Guten Tag",
            ru: "Добрый день",
            lessonId: "lektion-1",
            blockId: "l1-block-a",
            sectionType: "dialogue",
            tags: ["greeting"],
            cardModes: ["de_to_ru", "ru_to_de"],
          },
          {
            id: "l1-b-name",
            de: "der Name",
            ru: "имя",
            article: "der",
            lessonId: "lektion-1",
            blockId: "l1-block-b",
            sectionType: "dialogue",
            tags: ["identity"],
            cardModes: ["de_to_ru", "ru_to_de"],
          },
        ],
        blocks: [
          {
            id: "l1-block-a",
            code: "A",
            title: "Guten Tag",
            goal: "Научиться здороваться и прощаться в типовых ситуациях.",
            sceneType: "dialogue",
            intro: "Базовые формулы приветствия и прощания.",
            corePhrases: ["Guten Tag.", "Hallo.", "Auf Wiedersehen.", "Tschuess."],
            content: {
              dialogues: [
                {
                  id: "l1-a-dialogue-1",
                  title: "Мини-диалог приветствия",
                  type: "dialogue",
                  lines: [
                    { speaker: "A", text: "Guten Tag." },
                    { speaker: "B", text: "Hallo." },
                  ],
                  translationRu: [
                    { speaker: "A", text: "Добрый день." },
                    { speaker: "B", text: "Привет." },
                  ],
                },
              ],
              readings: [],
              explainer: "Приветствие зависит от времени суток и степени формальности.",
            },
            grammarPoints: [],
            vocabulary: ["l1-a-guten-tag"],
            tasks: [
              {
                id: "l1-a-task-1",
                type: "matching",
                skill: "recognition",
                instruction: "Соотнесите реплики и перевод.",
                leftItems: [
                  { id: "l1", text: "Guten Tag." },
                  { id: "l2", text: "Auf Wiedersehen." },
                ],
                rightItems: [
                  { id: "r1", text: "До свидания." },
                  { id: "r2", text: "Добрый день." },
                ],
                correctPairs: [
                  ["l1", "r2"],
                  ["l2", "r1"],
                ],
              },
            ],
          },
        ],
        summary: {
          grammar: [
            {
              title: "W-Fragen",
              content: "Wie heissen Sie? Woher kommen Sie? Was sprechen Sie?",
            },
          ],
          communication: [
            {
              title: "Begruessung",
              phrases: ["Hallo.", "Guten Tag.", "Guten Morgen."],
            },
          ],
          goals: ["Я могу поздороваться и назвать своё имя."],
        },
        extras: [
          {
            type: "culture",
            title: "Begruessung regional",
            content: {
              text: "Региональные формы приветствия в DACH.",
              items: ["Moin", "Servus", "Gruezi"],
            },
          },
        ],
      },
    ],
  },
};
