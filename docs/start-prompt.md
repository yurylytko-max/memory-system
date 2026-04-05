# Start Prompt For AI Agents

Ты работаешь в репозитории `memory-system`.

Твоя стартовая точка всегда находится в этой папке документации. Перед любой работой прочитай документы в таком порядке:

1. [`docs/current-state.md`](./current-state.md)
2. [`docs/open-issues.md`](./open-issues.md)
3. [`docs/roadmap.md`](./roadmap.md)
4. [`docs/coding-rules.md`](./coding-rules.md)
5. [`docs/project-structure.md`](./project-structure.md)
6. [`docs/change-log.md`](./change-log.md)

## Main Goal

Поддерживать и развивать единое приложение "Система памяти" на Next.js. Основные активные модули проекта сейчас:

- планировщик;
- база знаний и карточки;
- тексты и редактор;
- учебники `study-3`;
- словарь `vocabulary`;
- инфраструктура авторизации и production deploy.

Legacy `study 2.0` удалён из кода. Старые маршруты `/study` редиректят в `study-3` или `/cards`.

## Mandatory Working Rules

- Сначала опирайся на документы из `docs/`, потом проверяй код.
- Если работа меняет архитектуру, продуктовый сценарий, ограничения или known issues, обнови соответствующий файл в `docs/`.
- Если меняется фактическое состояние проекта, обнови [`docs/current-state.md`](./current-state.md).
- Если появляется новая незакрытая проблема, обнови [`docs/open-issues.md`](./open-issues.md).
- Если завершён важный этап или произошёл заметный сдвиг, добавь запись в конец [`docs/change-log.md`](./change-log.md).
- Если после работы меняются следующие шаги, обнови [`docs/roadmap.md`](./roadmap.md).
- Не возвращай `study 2.0`, если этого явно не потребует пользователь.
- Не ломай текущие редиректы `/study -> /study-3` и `/study/cards -> /cards` без осознанного решения.
- Учитывай, что `next.config.ts` сейчас содержит `typescript.ignoreBuildErrors = true`; это временная техническая уступка, а не желаемое конечное состояние.
- Учитывай, что в локальном sandbox `next dev` и часть git/network операций могут вести себя нестабильно; если поведение отличается от production, доверяй проверкам с подтверждением по build, lint и production.

## Current High-Level Truths

- Production-домен: `memory-system-delta.vercel.app`.
- В проекте включена парольная защита через `/login` и cookie-based auth.
- `study-3` является единственной актуальной веткой учебников.
- После деплоя существует одноразовый cleanup legacy study-данных через internal route.
- `npm run lint` должен запускаться через `scripts/run-eslint.mjs`, а не через прямой обход `eslint .`.

## What To Inspect Before Editing

Для большинства задач сначала проверь:

- маршруты в `app/`;
- API route в `app/api/`;
- бизнес-логику в `lib/` и `lib/server/`;
- UI-компоненты в `components/`;
- текущее состояние и ограничения в `docs/`.

Для задач по учебникам сначала смотри:

- [`app/study-3/page.tsx`](../app/study-3/page.tsx)
- [`app/study-3/[bookId]/page.tsx`](../app/study-3/[bookId]/page.tsx)
- [`components/study-3/study-three-library.tsx`](../components/study-3/study-three-library.tsx)
- [`components/study-3/study-three-reader.tsx`](../components/study-3/study-three-reader.tsx)
- [`app/api/study-3`](../app/api/study-3)
- [`lib/study-3.ts`](../lib/study-3.ts)
- [`lib/server/study-3-store.ts`](../lib/server/study-3-store.ts)
- [`lib/server/study-3-gemini.ts`](../lib/server/study-3-gemini.ts)

Для задач по планировщику сначала смотри:

- [`app/planner/page.tsx`](../app/planner/page.tsx)
- [`app/planner/[planId]/page.tsx`](../app/planner/[planId]/page.tsx)
- [`app/api/plans`](../app/api/plans)
- [`lib/plans.ts`](../lib/plans.ts)
- [`lib/planner-daily-plans.ts`](../lib/planner-daily-plans.ts)
- [`lib/server/plans-store.ts`](../lib/server/plans-store.ts)

Для задач по карточкам и знаниям сначала смотри:

- [`app/cards/page.tsx`](../app/cards/page.tsx)
- [`app/cards/new/page.tsx`](../app/cards/new/page.tsx)
- [`app/cards/[cardId]/page.tsx`](../app/cards/[cardId]/page.tsx)
- [`app/api/cards`](../app/api/cards)
- [`lib/cards.ts`](../lib/cards.ts)
- [`lib/server/cards-store.ts`](../lib/server/cards-store.ts)

## Default Workflow

1. Прочитать `docs/`.
2. Подтвердить текущее состояние по коду.
3. Внести минимально достаточные изменения.
4. Проверить релевантный `lint` и `build`.
5. Обновить `docs/`, если изменилась реальность проекта.
6. В конце кратко описать:
   - что изменено;
   - что проверено;
   - что осталось риском или следующим шагом.

## Documentation Maintenance Policy

Обновляй документы так:

- `start-prompt.md`: только если меняется сам ритуал входа в проект.
- `project-structure.md`: при добавлении, удалении, переименовании или важной смене роли файлов.
- `coding-rules.md`: при появлении новых устойчивых инженерных правил.
- `current-state.md`: при любом существенном изменении продукта, инфраструктуры или статуса модулей.
- `change-log.md`: новая запись всегда дописывается в конец.
- `roadmap.md`: обновляй после закрытия или перестановки приоритетов.
- `open-issues.md`: обновляй при появлении, уточнении или закрытии известных проблем.

## Changelog Format Reminder

В `docs/change-log.md` каждая запись должна содержать:

- дату или номер итерации;
- краткий заголовок изменения;
- что изменилось;
- зачем это изменение было сделано;
- при необходимости статус: `draft`, `accepted`, `reworked`.

Записи идут по возрастанию даты: старые сверху, новые снизу.

## Final Instruction

Если пользователь пишет: "Начни с `docs/start-prompt.md` и следуй инструкциям из него", это означает, что ты обязан считать `docs/` основным источником контекста и поддерживать их актуальность по ходу работы.
