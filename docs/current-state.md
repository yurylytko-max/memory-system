# Current State

## Snapshot

- Date: `2026-04-05`
- Project type: single Next.js application for planning, knowledge capture, texts, cards, vocabulary and interactive textbooks.
- Main production domain: `memory-system-delta.vercel.app`
- Auth model: password gate with login page and auth cookie.

## Active Product Modules

### Planner

- Главная страница планировщика: [`app/planner/page.tsx`](../app/planner/page.tsx)
- Детальная страница плана: [`app/planner/[planId]/page.tsx`](../app/planner/[planId]/page.tsx)
- API: [`app/api/plans/route.ts`](../app/api/plans/route.ts), [`app/api/plans/[id]/route.ts`](../app/api/plans/[id]/route.ts)
- Store: [`lib/server/plans-store.ts`](../lib/server/plans-store.ts)
- Дополнительная логика: [`lib/plans.ts`](../lib/plans.ts), [`lib/planner-daily-plans.ts`](../lib/planner-daily-plans.ts)

Текущее состояние:

- Поддерживаются обычные планы и собранные дневные планы.
- При закрытии задачи в дневном плане её статус синхронизируется в исходный план.
- При удалении задачи из дневного плана она удаляется и из исходного плана.
- При удалении всего дневного плана его содержимое удаляется из общих планов.

### Knowledge Cards

- UI: [`app/cards/page.tsx`](../app/cards/page.tsx), [`app/cards/new/page.tsx`](../app/cards/new/page.tsx), [`app/cards/[cardId]/page.tsx`](../app/cards/[cardId]/page.tsx), [`app/cards/edit/[cardId]/page.tsx`](../app/cards/edit/[cardId]/page.tsx), [`app/cards/spheres/[sphere]/page.tsx`](../app/cards/spheres/[sphere]/page.tsx)
- API: [`app/api/cards/route.ts`](../app/api/cards/route.ts), [`app/api/cards/[id]/route.ts`](../app/api/cards/[id]/route.ts)
- Domain/store: [`lib/cards.ts`](../lib/cards.ts), [`lib/server/cards-store.ts`](../lib/server/cards-store.ts)

Текущее состояние:

- Карточки являются частью базы знаний.
- Сферы реорганизованы в knowledge folders.
- Есть сценарии просмотра, создания, редактирования и открытия карточки по id.

### Texts And Editor

- Texts UI: [`app/texts/page.tsx`](../app/texts/page.tsx), [`app/texts/new/page.tsx`](../app/texts/new/page.tsx), [`app/texts/[id]/page.tsx`](../app/texts/[id]/page.tsx), [`app/texts/[id]/edit/page.tsx`](../app/texts/[id]/edit/page.tsx)
- Editor UI: [`app/editor/page.tsx`](../app/editor/page.tsx), [`app/editor/new/page.tsx`](../app/editor/new/page.tsx), [`app/editor/[id]/page.tsx`](../app/editor/[id]/page.tsx)
- Text store: [`lib/texts.ts`](../lib/texts.ts), [`lib/server/texts-store.ts`](../lib/server/texts-store.ts)
- Plate editor stack: [`components/editor`](../components/editor), [`components/ui`](../components/ui), [`components/texts/plate-text-editor.tsx`](../components/texts/plate-text-editor.tsx)

Текущее состояние:

- В проекте есть полноценный rich-text/editor стек на Plate.
- Включены AI command routes для редактора.
- В `next.config.ts` всё ещё включён `typescript.ignoreBuildErrors`, потому что editor stack несёт технический долг по типам.

### Study 3

- Library page: [`app/study-3/page.tsx`](../app/study-3/page.tsx)
- Reader page: [`app/study-3/[bookId]/page.tsx`](../app/study-3/[bookId]/page.tsx)
- UI components: [`components/study-3/study-three-library.tsx`](../components/study-3/study-three-library.tsx), [`components/study-3/study-three-reader.tsx`](../components/study-3/study-three-reader.tsx)
- API: [`app/api/study-3`](../app/api/study-3)
- Logic: [`lib/study-3.ts`](../lib/study-3.ts), [`lib/study-3-local.ts`](../lib/study-3-local.ts)
- Server/store/integration: [`lib/server/study-3-store.ts`](../lib/server/study-3-store.ts), [`lib/server/study-3-gemini.ts`](../lib/server/study-3-gemini.ts)

Текущее состояние:

- `study 3` является единственной активной реализацией учебников.
- `study 2.0` удалён из кода.
- Старые маршруты редиректят:
  - `/study -> /study-3`
  - `/study/cards -> /cards`
  - `/study/:path* -> /study-3`
- Есть загрузка книг, чтение книги, HTML pipeline, assistant routes `chat`, `explain`, `translate`, blob route и работа с Gemini-based parsing flow.

### Vocabulary

- UI/flow связан с API: [`app/api/vocabulary/route.ts`](../app/api/vocabulary/route.ts), [`app/api/vocabulary/review/route.ts`](../app/api/vocabulary/review/route.ts)
- Domain/store: [`lib/vocabulary.ts`](../lib/vocabulary.ts), [`lib/server/vocabulary-store.ts`](../lib/server/vocabulary-store.ts)

Текущее состояние:

- Словарь добавлен как отдельный домен данных.
- Нужно отдельное продуктовое уточнение по UI и пользовательскому флоу; это пока не главный модуль проекта.

## Auth And Routing

- Глобальная auth-защита настроена через [`proxy.ts`](../proxy.ts).
- Логин/логаут routes:
  - [`app/api/auth/login/route.ts`](../app/api/auth/login/route.ts)
  - [`app/api/auth/logout/route.ts`](../app/api/auth/logout/route.ts)
- Login page: [`app/login/page.tsx`](../app/login/page.tsx)
- В public allowlist добавлен [`app/api/internal/post-deploy-cleanup/route.ts`](../app/api/internal/post-deploy-cleanup/route.ts).

## Deploy And Operations

- Vercel production deploy workflow существует и уже использовался.
- Alias прод-домена указывает на `memory-system-delta.vercel.app`.
- Одноразовый cleanup legacy study-данных запускается через:
  - [`lib/server/post-deploy-cleanup.ts`](../lib/server/post-deploy-cleanup.ts)
  - [`app/api/internal/post-deploy-cleanup/route.ts`](../app/api/internal/post-deploy-cleanup/route.ts)
- Триггер cleanup вызывается из [`app/layout.tsx`](../app/layout.tsx) через server-side `fetch`.

## Tooling State

- `npm run lint` переопределён на [`scripts/run-eslint.mjs`](../scripts/run-eslint.mjs), чтобы избежать зависания при прямом обходе `eslint .`.
- Полный lint сейчас должен завершаться успешно.
- Локальный `next dev` в sandbox ранее не доходил до normal `listen()` стадии; это считалось ограничением окружения, а не обязательно багом приложения.

## Git State

- В истории есть коммит `study 2.0 eliminated`.
- Затем была интеграция удалённого `main` через merge и безопасный push без force.
- На remote `main` есть интеграционный коммит `Sync local main state`.
- Локальный `main` заново выровнен с актуальным `origin/main`.
- Broken refs вида `main 2` удалены.
- Документация для ИИ-агентов сохранена в `docs/` и уже является официальной стартовой точкой для следующих сессий.

## Practical Reading Order For New Tasks

Если задача непонятна, начинай с:

1. [`docs/start-prompt.md`](./start-prompt.md)
2. [`docs/current-state.md`](./current-state.md)
3. [`docs/open-issues.md`](./open-issues.md)
4. релевантных маршрутов в `app/`
5. релевантных store-файлов в `lib/server/`
