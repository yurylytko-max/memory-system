# Project Structure

Ниже перечислены рабочие файлы проекта и их текущая роль. Описания намеренно короткие, чтобы документ можно было поддерживать вживую.

## Root Files

- `package.json` - npm scripts, зависимости и базовые метаданные проекта.
- `playwright.config.ts` - конфигурация browser integration/smoke тестов.
- `vitest.config.ts` - конфигурация integration/domain/API тестов.
- `tsconfig.json` - TypeScript configuration.
- `eslint.config.mjs` - ESLint configuration для проекта.
- `next.config.ts` - Next.js config; сейчас содержит redirects со старых `study` маршрутов и `typescript.ignoreBuildErrors`.
- `postcss.config.mjs` - PostCSS config.
- `vercel.json` - Vercel runtime/deploy configuration.
- `.env.example` - пример env-переменных.
- `.env.test` - локальное тестовое окружение для integration/e2e запусков.
- `components.json` - конфигурация shadcn/ui.
- `README.md` - базовый README проекта, сейчас менее актуален, чем `docs/`.
- `render_pdf.js` - отдельный runtime-скрипт для PDF-rendering сценариев.
- `Lithuania-2026-short.pdf` - рабочий бинарный артефакт для отдельного контента/экспорта.
- `deu.traineddata` - tesseract language data для немецкого OCR.
- `eng.traineddata` - tesseract language data для английского OCR.

## Docs

- `docs/start-prompt.md` - стартовый инструктаж для ИИ-агента.
- `docs/project-structure.md` - карта файлов проекта.
- `docs/coding-rules.md` - инженерные правила.
- `docs/current-state.md` - актуальное состояние продукта и инфраструктуры.
- `docs/change-log.md` - журнал значимых изменений.
- `docs/roadmap.md` - план на ближайшие шаги.
- `docs/open-issues.md` - открытые проблемы и риски.

## Tests

- `tests/e2e` - browser-level smoke и интеграционные тесты на Playwright.
- `tests/integration` - route/store/domain integration тесты.
- `tests/helpers` - test helpers для auth, env, storage, seeds и UI ожиданий.
- `tests/fixtures` - предсказуемые фикстуры для planner, cards, study-3 и texts.
- `tests/global` - global setup/teardown для test runners.

## Scripts

- `scripts/test-reset.mjs` - сброс изолированных тестовых данных.
- `scripts/test-seed.mjs` - заполнение изолированных тестовых данных для smoke/e2e.
- `scripts/test-serve.mjs` - вспомогательный запуск приложения для Playwright smoke/e2e сценариев.

## App Routes

### Core Shell

- `app/layout.tsx` - корневой layout; подключает chrome, top nav, planner manager и триггерит post-deploy cleanup.
- `app/page.tsx` - домашняя страница с карточками основных модулей.
- `app/globals.css` - глобальные стили приложения.
- `app/favicon.ico` - favicon приложения.
- `app/login/page.tsx` - страница парольного входа.

### Planner

- `app/planner/page.tsx` - главная страница списка планов и дневных сборок.
- `app/planner/[planId]/page.tsx` - страница конкретного плана с задачами и действиями.
- `app/api/plans/route.ts` - API списка и создания планов.
- `app/api/plans/[id]/route.ts` - API чтения, обновления и удаления плана.

### Cards And Knowledge

- `app/cards/page.tsx` - библиотека карточек/знаний.
- `app/cards/new/page.tsx` - выбор workspace и создание новой карточки.
- `app/cards/space/[workspace]/page.tsx` - список карточек внутри изолированного knowledge workspace.
- `app/cards/[cardId]/page.tsx` - просмотр карточки.
- `app/cards/edit/[cardId]/page.tsx` - редактирование карточки.
- `app/cards/spheres/[sphere]/page.tsx` - просмотр карточек внутри knowledge folder/sphere в рамках выбранного workspace.
- `app/api/cards/route.ts` - API списка и создания карточек.
- `app/api/cards/[id]/route.ts` - API чтения, изменения и удаления карточки.

### Texts And Editor

- `app/texts/page.tsx` - список текстов.
- `app/texts/new/page.tsx` - создание текста.
- `app/texts/[id]/page.tsx` - просмотр текста.
- `app/texts/[id]/edit/page.tsx` - редактирование текста.
- `app/api/texts/route.ts` - API списка и создания текстов.
- `app/api/texts/[id]/route.ts` - API работы с конкретным текстом.
- `app/editor/page.tsx` - основной экран редактора.
- `app/editor/new/page.tsx` - создание нового editor document.
- `app/editor/[id]/page.tsx` - экран конкретного editor document.

### Study 3

- `app/study-3/page.tsx` - библиотека учебников `study-3`.
- `app/study-3/[bookId]/page.tsx` - экран чтения конкретного учебника.
- `app/study-3/vocabulary/page.tsx` - словарь подпространства `Учебники 3.0`.
- `app/study-3/vocabulary/review/page.tsx` - экран изучения лексики карточками внутри `study-3`.
- `app/api/study-3/books/route.ts` - API списка книг.
- `app/api/study-3/books/upload/route.ts` - API загрузки книги.
- `app/api/study-3/books/[bookId]/route.ts` - API метаданных книги и удаления записи учебника/page-entry.
- `app/api/study-3/books/[bookId]/file/route.ts` - API доступа к файлу книги.
- `app/api/study-3/books/[bookId]/html/route.ts` - API HTML-представления страниц книги.
- `app/api/study-3/blob/route.ts` - API для blob/storage сценариев.
- `app/api/study-3/assistant/chat/route.ts` - assistant chat route для study-3.
- `app/api/study-3/assistant/explain/route.ts` - assistant explain route для study-3.
- `app/api/study-3/assistant/translate/route.ts` - assistant translate route для study-3.

### Vocabulary

- `app/api/vocabulary/route.ts` - API словаря, который сейчас обслуживает `study-3`.
- `app/api/vocabulary/review/route.ts` - API review/scoring флоу словаря и очереди карточек.
- `app/api/vocabulary/[id]/route.ts` - API чтения отдельной lexical card и обновления её mnemonic-state.

## Lib And Server

- `lib/vocabulary.ts` - доменная модель словаря, нормализация данных и логика review queue.
- `lib/server/vocabulary-store.ts` - серверное хранение словаря через Redis/file fallback.
- `lib/server/storage-paths.ts` - единая точка разрешения data-root для runtime и test storage.
- `lib/server/study-3-store.ts` - хранение учебников `study-3`, HTML-артефактов и удаление локальных файловых fallback-данных.

### AI And Internal Operations

- `app/api/ai/command/route.ts` - основной AI command route для редакторных действий.
- `app/api/ai/command/utils.ts` - утилиты для AI command route.
- `app/api/ai/command/prompt/common.ts` - общий prompt-building код.
- `app/api/ai/command/prompt/index.ts` - re-export prompt builders.
- `app/api/ai/command/prompt/getChooseToolPrompt.ts` - prompt для выбора AI tool.
- `app/api/ai/command/prompt/getCommentPrompt.ts` - prompt для AI-comment flow.
- `app/api/ai/command/prompt/getEditPrompt.ts` - prompt для AI-edit flow.
- `app/api/ai/command/prompt/getEditTablePrompt.ts` - prompt для AI table edit flow.
- `app/api/ai/command/prompt/getGeneratePrompt.ts` - prompt для AI generate flow.
- `app/api/ai/copilot/route.ts` - copilot API route для editor-related сценариев.
- `app/api/internal/post-deploy-cleanup/route.ts` - internal route для одноразового post-deploy cleanup legacy study-данных.

### Auth

- `app/api/auth/login/route.ts` - API логина по паролю сайта.
- `app/api/auth/logout/route.ts` - API логаута.

### Tags

- `app/tags/[tag]/page.tsx` - страница фильтрации/просмотра по tag.

## Components

### App-Level Components

- `components/app-chrome.tsx` - общий chrome/обвязка интерфейса.
- `components/top-nav.tsx` - верхняя навигация приложения.
- `components/back-button.tsx` - универсальная кнопка назад.
- `components/command-menu.tsx` - визуальная часть command menu.
- `components/command-palette.tsx` - command palette для быстрых действий.
- `components/planner-deadline-manager.tsx` - глобальная логика планировщика, связанная с дедлайнами.
- `components/planner-notifications-button.tsx` - кнопка уведомлений planner.

### Study Components

- `components/study-3/study-three-library.tsx` - библиотека и список учебников `study-3`.
- `components/study-3/study-three-reader.tsx` - reader UI для страницы учебника с двухколоночным layout `страница/HTML ↔ ассистент`.
- `components/study-3/study-three-vocabulary.tsx` - экран словаря учебников.
- `components/study-3/study-three-vocabulary-review.tsx` - экран карточек и повторения лексики.
- `components/study-3/study-three-mnemonic-panel.tsx` - пошаговый UI для ручного создания, удаления и пересборки мнемотехники lexical cards.

### Text Components

- `components/texts/plate-text-editor.tsx` - основная интеграция Plate editor для текстов.

### Editor Core

- `components/editor/editor-base-kit.tsx` - базовая сборка editor kit.
- `components/editor/editor-kit.tsx` - расширенная сборка editor kit.
- `components/editor/transforms.ts` - editor transforms и служебные операции.
- `components/editor/use-chat.ts` - hook AI chat/editor взаимодействия.

### Editor Plugins

- `components/editor/plugins/ai-kit.tsx` - AI plugin kit.
- `components/editor/plugins/align-base-kit.tsx` - базовая конфигурация выравнивания.
- `components/editor/plugins/align-kit.tsx` - расширенная конфигурация выравнивания.
- `components/editor/plugins/autoformat-kit.tsx` - autoformat plugin kit.
- `components/editor/plugins/basic-blocks-base-kit.tsx` - базовые block plugins.
- `components/editor/plugins/basic-blocks-kit.tsx` - расширенные block plugins.
- `components/editor/plugins/basic-marks-base-kit.tsx` - базовые mark plugins.
- `components/editor/plugins/basic-marks-kit.tsx` - расширенные mark plugins.
- `components/editor/plugins/basic-nodes-kit.tsx` - базовые node plugins.
- `components/editor/plugins/block-menu-kit.tsx` - конфигурация block menu.
- `components/editor/plugins/block-placeholder-kit.tsx` - block placeholder plugins.
- `components/editor/plugins/block-selection-kit.tsx` - block selection plugins.
- `components/editor/plugins/callout-base-kit.tsx` - базовый callout plugin.
- `components/editor/plugins/callout-kit.tsx` - callout plugin kit.
- `components/editor/plugins/code-block-base-kit.tsx` - базовый code block plugin.
- `components/editor/plugins/code-block-kit.tsx` - code block plugin kit.
- `components/editor/plugins/code-drawing-base-kit.tsx` - базовый code drawing plugin.
- `components/editor/plugins/code-drawing-kit.tsx` - code drawing plugin kit.
- `components/editor/plugins/column-base-kit.tsx` - базовый column plugin.
- `components/editor/plugins/column-kit.tsx` - column plugin kit.
- `components/editor/plugins/comment-base-kit.tsx` - базовый comment plugin.
- `components/editor/plugins/comment-kit.tsx` - comment plugin kit.
- `components/editor/plugins/cursor-overlay-kit.tsx` - cursor overlay plugin kit.
- `components/editor/plugins/date-base-kit.tsx` - базовый date plugin.
- `components/editor/plugins/date-kit.tsx` - date plugin kit.
- `components/editor/plugins/discussion-kit.tsx` - discussion/comment thread plugin kit.
- `components/editor/plugins/dnd-kit.tsx` - drag-and-drop plugin kit.
- `components/editor/plugins/docx-export-kit.tsx` - DOCX export plugin kit.
- `components/editor/plugins/docx-kit.tsx` - DOCX import/export integrations.
- `components/editor/plugins/emoji-kit.tsx` - emoji plugin kit.
- `components/editor/plugins/excalidraw-kit.tsx` - Excalidraw plugin kit.
- `components/editor/plugins/exit-break-kit.tsx` - exit break behavior plugins.
- `components/editor/plugins/fixed-toolbar-kit.tsx` - fixed toolbar plugin kit.
- `components/editor/plugins/floating-toolbar-kit.tsx` - floating toolbar plugin kit.
- `components/editor/plugins/font-base-kit.tsx` - базовый font plugin.
- `components/editor/plugins/font-kit.tsx` - font plugin kit.
- `components/editor/plugins/indent-base-kit.tsx` - базовый indent plugin.
- `components/editor/plugins/indent-kit.tsx` - indent plugin kit.
- `components/editor/plugins/line-height-base-kit.tsx` - базовый line-height plugin.
- `components/editor/plugins/line-height-kit.tsx` - line-height plugin kit.
- `components/editor/plugins/link-base-kit.tsx` - базовый link plugin.
- `components/editor/plugins/link-kit.tsx` - link plugin kit.
- `components/editor/plugins/list-base-kit.tsx` - базовый list plugin.
- `components/editor/plugins/list-kit.tsx` - list plugin kit.
- `components/editor/plugins/markdown-kit.tsx` - markdown support kit.
- `components/editor/plugins/math-base-kit.tsx` - базовый math plugin.
- `components/editor/plugins/math-kit.tsx` - math plugin kit.
- `components/editor/plugins/media-base-kit.tsx` - базовый media plugin.
- `components/editor/plugins/media-kit.tsx` - media plugin kit.
- `components/editor/plugins/mention-base-kit.tsx` - базовый mention plugin.
- `components/editor/plugins/mention-kit.tsx` - mention plugin kit.
- `components/editor/plugins/slash-kit.tsx` - slash command plugin kit.
- `components/editor/plugins/suggestion-base-kit.tsx` - базовый suggestion plugin.
- `components/editor/plugins/suggestion-kit.tsx` - suggestion plugin kit.
- `components/editor/plugins/table-base-kit.tsx` - базовый table plugin.
- `components/editor/plugins/table-kit.tsx` - table plugin kit.
- `components/editor/plugins/toc-base-kit.tsx` - базовый table-of-contents plugin.
- `components/editor/plugins/toc-kit.tsx` - table-of-contents plugin kit.
- `components/editor/plugins/toggle-base-kit.tsx` - базовый toggle plugin.
- `components/editor/plugins/toggle-kit.tsx` - toggle plugin kit.

### UI Components

- `components/ui/ai-chat-editor.tsx` - AI chat UI around editor content.
- `components/ui/ai-menu.tsx` - меню AI-действий в editor.
- `components/ui/ai-node.tsx` - renderer AI node.
- `components/ui/ai-toolbar-button.tsx` - toolbar button для AI.
- `components/ui/alert-dialog.tsx` - alert dialog component.
- `components/ui/align-toolbar-button.tsx` - toolbar button выравнивания.
- `components/ui/avatar.tsx` - avatar UI.
- `components/ui/badge.tsx` - badge UI.
- `components/ui/block-context-menu.tsx` - контекстное меню блока editor.
- `components/ui/block-discussion.tsx` - UI discussion around blocks.
- `components/ui/block-draggable.tsx` - drag handle и поведение block dnd.
- `components/ui/block-list-static.tsx` - static renderer списка блоков.
- `components/ui/block-list.tsx` - interactive renderer списка блоков.
- `components/ui/block-selection.tsx` - UI выделения блоков.
- `components/ui/block-suggestion.tsx` - UI suggestion state для блока.
- `components/ui/blockquote-node-static.tsx` - static blockquote node renderer.
- `components/ui/blockquote-node.tsx` - interactive blockquote node renderer.
- `components/ui/button.tsx` - button primitive.
- `components/ui/calendar.tsx` - calendar/date picker UI.
- `components/ui/callout-node-static.tsx` - static callout renderer.
- `components/ui/callout-node.tsx` - interactive callout renderer.
- `components/ui/caption.tsx` - caption UI helper.
- `components/ui/card.tsx` - card primitive.
- `components/ui/checkbox.tsx` - checkbox UI.
- `components/ui/code-block-node-static.tsx` - static code block renderer.
- `components/ui/code-block-node.tsx` - interactive code block renderer.
- `components/ui/code-drawing-node-static.tsx` - static code drawing renderer.
- `components/ui/code-drawing-node.tsx` - interactive code drawing renderer.
- `components/ui/code-node-static.tsx` - static inline code renderer.
- `components/ui/code-node.tsx` - interactive inline code renderer.
- `components/ui/column-node-static.tsx` - static column renderer.
- `components/ui/column-node.tsx` - interactive column renderer.
- `components/ui/command.tsx` - command list primitive.
- `components/ui/comment-node-static.tsx` - static comment node renderer.
- `components/ui/comment-node.tsx` - interactive comment node renderer.
- `components/ui/comment-toolbar-button.tsx` - toolbar button для comments.
- `components/ui/comment.tsx` - comment UI primitive.
- `components/ui/context-menu.tsx` - context menu primitive.
- `components/ui/cursor-overlay.tsx` - cursor overlay UI.
- `components/ui/date-node-static.tsx` - static date renderer.
- `components/ui/date-node.tsx` - interactive date renderer.
- `components/ui/dialog.tsx` - dialog primitive.
- `components/ui/dropdown-menu.tsx` - dropdown menu primitive.
- `components/ui/editor-static.tsx` - static editor renderer.
- `components/ui/editor.tsx` - interactive editor renderer.
- `components/ui/emoji-node.tsx` - emoji node renderer.
- `components/ui/emoji-toolbar-button.tsx` - toolbar button для emoji.
- `components/ui/equation-node-static.tsx` - static equation renderer.
- `components/ui/equation-node.tsx` - interactive equation renderer.
- `components/ui/equation-toolbar-button.tsx` - toolbar button для equation.
- `components/ui/excalidraw-node.tsx` - Excalidraw node renderer.
- `components/ui/export-toolbar-button.tsx` - toolbar export button.
- `components/ui/fixed-toolbar-buttons.tsx` - fixed toolbar button composition.
- `components/ui/fixed-toolbar.tsx` - fixed toolbar shell.
- `components/ui/floating-toolbar-buttons.tsx` - floating toolbar button composition.
- `components/ui/floating-toolbar.tsx` - floating toolbar shell.
- `components/ui/font-color-toolbar-button.tsx` - toolbar button для font color.
- `components/ui/font-size-toolbar-button.tsx` - toolbar button для font size.
- `components/ui/heading-node-static.tsx` - static heading renderer.
- `components/ui/heading-node.tsx` - interactive heading renderer.
- `components/ui/highlight-node-static.tsx` - static highlight renderer.
- `components/ui/highlight-node.tsx` - interactive highlight renderer.
- `components/ui/history-toolbar-button.tsx` - toolbar button для history actions.
- `components/ui/hr-node-static.tsx` - static horizontal rule renderer.
- `components/ui/hr-node.tsx` - interactive horizontal rule renderer.
- `components/ui/import-toolbar-button.tsx` - toolbar import button.
- `components/ui/indent-toolbar-button.tsx` - toolbar indent button.
- `components/ui/inline-combobox.tsx` - inline combobox helper.
- `components/ui/input-group.tsx` - input group primitive.
- `components/ui/input.tsx` - input primitive.
- `components/ui/insert-toolbar-button.tsx` - toolbar insert button.
- `components/ui/kbd-node-static.tsx` - static keyboard key renderer.
- `components/ui/kbd-node.tsx` - interactive keyboard key renderer.
- `components/ui/line-height-toolbar-button.tsx` - toolbar line-height button.
- `components/ui/link-node-static.tsx` - static link renderer.
- `components/ui/link-node.tsx` - interactive link renderer.
- `components/ui/link-toolbar-button.tsx` - toolbar link button.
- `components/ui/link-toolbar.tsx` - toolbar/link popover.
- `components/ui/list-toolbar-button.tsx` - toolbar list button.
- `components/ui/mark-toolbar-button.tsx` - toolbar mark button.
- `components/ui/media-audio-node-static.tsx` - static audio media renderer.
- `components/ui/media-audio-node.tsx` - interactive audio media renderer.
- `components/ui/media-embed-node.tsx` - embedded media renderer.
- `components/ui/media-file-node-static.tsx` - static file media renderer.
- `components/ui/media-file-node.tsx` - interactive file media renderer.
- `components/ui/media-image-node-static.tsx` - static image renderer.
- `components/ui/media-image-node.tsx` - interactive image renderer.
- `components/ui/media-placeholder-node.tsx` - placeholder while media is uploading or absent.
- `components/ui/media-preview-dialog.tsx` - media preview modal.
- `components/ui/media-toolbar-button.tsx` - toolbar media button.
- `components/ui/media-toolbar.tsx` - media toolbar.
- `components/ui/media-upload-toast.tsx` - toast for media upload state.
- `components/ui/media-video-node-static.tsx` - static video renderer.
- `components/ui/media-video-node.tsx` - interactive video renderer.
- `components/ui/mention-node-static.tsx` - static mention renderer.
- `components/ui/mention-node.tsx` - interactive mention renderer.
- `components/ui/mode-toolbar-button.tsx` - toolbar mode switch button.
- `components/ui/more-toolbar-button.tsx` - toolbar overflow button.
- `components/ui/paragraph-node-static.tsx` - static paragraph renderer.
- `components/ui/paragraph-node.tsx` - interactive paragraph renderer.
- `components/ui/popover.tsx` - popover primitive.
- `components/ui/resize-handle.tsx` - resize handle UI.
- `components/ui/select.tsx` - select primitive.
- `components/ui/separator.tsx` - separator primitive.
- `components/ui/slash-node.tsx` - slash command node renderer.
- `components/ui/suggestion-node-static.tsx` - static suggestion renderer.
- `components/ui/suggestion-node.tsx` - interactive suggestion renderer.
- `components/ui/suggestion-toolbar-button.tsx` - toolbar suggestion button.
- `components/ui/table-icons.tsx` - icon helpers for table tooling.
- `components/ui/table-node-static.tsx` - static table renderer.
- `components/ui/table-node.tsx` - interactive table renderer.
- `components/ui/table-toolbar-button.tsx` - toolbar table button.
- `components/ui/textarea.tsx` - textarea primitive.
- `components/ui/toc-node-static.tsx` - static TOC renderer.
- `components/ui/toc-node.tsx` - interactive TOC renderer.
- `components/ui/toggle-node-static.tsx` - static toggle renderer.
- `components/ui/toggle-node.tsx` - interactive toggle renderer.
- `components/ui/toggle-toolbar-button.tsx` - toolbar toggle button.
- `components/ui/toolbar.tsx` - generic toolbar shell.
- `components/ui/tooltip.tsx` - tooltip provider and primitive.
- `components/ui/turn-into-toolbar-button.tsx` - toolbar "turn into" action button.

## Hooks

- `hooks/use-debounce.ts` - debounce hook.
- `hooks/use-is-touch-device.ts` - touch-device detection hook.
- `hooks/use-mobile.ts` - mobile viewport helper.
- `hooks/use-mounted.ts` - mounted-state helper.
- `hooks/use-upload-file.ts` - upload-file helper hook.

## Lib

- `lib/auth.ts` - auth constants, cookie helpers and validation logic.
- `lib/cards.ts` - domain helpers and types for cards.
- `lib/documents.ts` - editor/document helpers.
- `lib/markdown-joiner-transform.ts` - markdown transform helper.
- `lib/plans.ts` - planner domain helpers and types.
- `lib/planner-daily-plans.ts` - сборка и синхронизация дневных планов.
- `lib/study-3.ts` - основной domain layer для study-3.
- `lib/study-3-local.ts` - local helpers/format support для study-3.
- `lib/texts.ts` - texts domain helpers and types.
- `lib/uploadthing.ts` - uploadthing configuration helpers.
- `lib/utils.ts` - общие UI/utility helpers.
- `lib/vocabulary.ts` - vocabulary domain helpers and types.

## Server Lib

- `lib/server/cards-store.ts` - server-side persistence layer for cards.
- `lib/server/plans-store.ts` - server-side persistence layer for plans.
- `lib/server/post-deploy-cleanup.ts` - одноразовая post-deploy очистка legacy study-данных.
- `lib/server/study-3-gemini.ts` - интеграция Gemini для study-3 parsing/assistant сценариев.
- `lib/server/study-3-store.ts` - server-side persistence layer for study-3 books/pages.
- `lib/server/texts-store.ts` - server-side persistence layer for texts.
- `lib/server/vocabulary-store.ts` - server-side persistence layer for vocabulary.

## Proxy And Routing Guard

- `proxy.ts` - auth gate, canonical-host redirect и allowlist public paths.

## Imports And Public Assets

- `imports/schritte-plus-neu-a1-1-full.study.json` - импортированный dataset учебника.
- `imports/schritte-plus-neu-a1-1-v4.study.json` - альтернативная версия импортированного dataset учебника.
- `imports/.DS_Store` - системный macOS артефакт; желательно удалить при чистке репозитория.
- `public/file.svg` - публичная иконка файла.
- `public/globe.svg` - публичная иконка глобуса.
- `public/next.svg` - публичная иконка Next.js.
- `public/vercel.svg` - публичная иконка Vercel.
- `public/window.svg` - публичная иконка окна.

## Scripts

- `scripts/run-eslint.mjs` - batched ESLint runner, текущий backend для `npm run lint`.
- `scripts/check-prod-login.js` - smoke script для проверки production login flow.
- `scripts/check-prod-login-env.js` - проверка env/setup для production login сценария.
- `scripts/check-prod-redis.js` - проверка production Redis connectivity.
- `scripts/check-prod-redis-write.js` - проверка production Redis write path.
- `scripts/check-prod-cards-api.js` - smoke script для cards API.
- `scripts/check-prod-cards-noop-save.js` - безопасная проверка save path для cards.
- `scripts/build_github_tree_payload.py` - helper script для сборки payload/tree representation.
- `scripts/compare_selected_files.py` - сравнение выбранных файлов.
- `scripts/generate-accurate-slide.js` - JS-скрипт генерации/рендера слайда.
- `scripts/generate_accurate_slide.py` - Python-скрипт генерации/рендера слайда.
- `scripts/generate_lithuania_redesign.py` - Python-скрипт генерации литовской презентации/редизайна.
- `scripts/generate_lithuania_redesign_pptx.js` - JS-экспорт/сборка PPTX для литовского редизайна.
- `scripts/render_pdf_page.js` - рендер отдельной страницы PDF.

## Export Artifacts

- `exports/lithuania-2026-redesign.pdf` - экспортный PDF-артефакт.
- `exports/lithuania-2026-redesign-v2.pdf` - экспортный PDF-артефакт, версия 2.
- `exports/lithuania-2026-redesign-v3.pdf` - экспортный PDF-артефакт, версия 3.
- `exports/lithuania-2026-redesign-v4.pdf` - экспортный PDF-артефакт, версия 4.
- `exports/lithuania-2026-redesign-v4.pptx` - экспортный PPTX-артефакт, версия 4.
- `exports/lithuania-2026-redesign-v5.pdf` - экспортный PDF-артефакт, версия 5.
- `exports/lithuania-2026-redesign-v6.pdf` - экспортный PDF-артефакт, версия 6.
- `exports/slide-overall-sentiment.pptx` - экспортный PPTX со slide sentiment.

## Maintenance Note

Если добавляется новый рабочий файл, этот документ нужно обновить в той же задаче. Если файл удаляется, его запись тоже нужно удалить или перенести в changelog, если это часть важной миграции.
