# Current State

## Snapshot

- Date: `2026-04-22`
- Project type: single Next.js application for planning, knowledge capture, texts, cards, vocabulary and interactive textbooks.
- Main production domain: `memory-system-delta.vercel.app`
- Auth model: password gate with login page and auth cookie.

## Active Product Modules

### Sound Color Trainer

- UI: [`app/sound-color/page.tsx`](../app/sound-color/page.tsx)
- UI component: [`components/sound-color/sound-color-trainer-client.tsx`](../components/sound-color/sound-color-trainer-client.tsx)
- Domain logic: [`lib/sound-color-trainer.ts`](../lib/sound-color-trainer.ts)

Текущее состояние:

- Добавлен локальный web-based MVP для тренировки музыкального слуха через пользовательские ассоциации `звук -> цвет`.
- Модуль не использует серверные API и не зависит от внешних сервисов.
- Звук генерируется через `Web Audio API` синусоидой для 12 фиксированных нот одной октавы.
- Данные хранятся локально в `localStorage`.
- MVP покрывает:
  - стартовый экран со статусом пользователя;
  - калибровку `звук -> цвет` с ограничением времени реакции;
  - сохранение цвета, времени реакции и уровня уверенности `low/mid/high`;
  - второй уровень выбора цвета через popover-уточнение после клика по базовому цвету;
  - хранение не только базового цвета, но и точного оттенка в `HEX + HSL`;
  - повторение `звук -> цвет` с проверкой совпадения по близости оттенка внутри выбранной базовой группы;
  - обязательную обратную проверку `цвет -> нота`;
  - простую диагностику проблемных нот по стабильности, уверенности и скорости.
- В архитектуру уже заложен режим деградации подсказок:
  - `withColor`;
  - `noColor`.
- Хранение и расчёты вынесены в отдельный доменный модуль, чтобы позже можно было расширять тренажёр на интервалы и аккорды без смешивания с другими доменами.
- Для быстрого локального просмотра без запуска всего Next-приложения добавлен standalone prototype:
  - [`standalone/sound-color-prototype.html`](../standalone/sound-color-prototype.html)
- Standalone prototype не заменяет основной маршрут `/sound-color`, а нужен как временный обходной способ проверки UI/flow при проблемах локального dev-runtime.
- Standalone prototype перестроен в pipeline этапов:
  - `ASSIGNMENT`;
  - `NOTES_IN_ONE_OCTAVE`;
  - `INTERVALS`;
  - `MELODY_IN_ONE_OCTAVE`;
  - `OCTAVES`.
- Для этапов `notes`, `intervals`, `melody`, `octaves` в standalone prototype введены отдельные подфазы:
  - `fixation`;
  - `test`.
- В standalone prototype добавлен единый registry режимов с полями:
  - `id`;
  - `stage`;
  - `phase`;
  - `subsetSize`;
  - `usesOctave`;
  - `description`.
- В exercises standalone prototype больше не использует глобальную палитру: ответы строятся только из текущего subset нот/цветов.
- В octave-stage добавлена функция `getColorForOctave(baseColor, octaveOffset)` с правилом изменения `lightness` и ограничением диапазона `20–80`.
- Standalone prototype теперь логирует локальные попытки и обновляет per-note stats по stage/phase.

### Mind Palaces

- UI: [`app/mind-palaces/page.tsx`](../app/mind-palaces/page.tsx), [`app/mind-palaces/[palaceId]/page.tsx`](../app/mind-palaces/[palaceId]/page.tsx)
- API: [`app/api/mind-palaces/route.ts`](../app/api/mind-palaces/route.ts), [`app/api/mind-palaces/[id]/route.ts`](../app/api/mind-palaces/[id]/route.ts), [`app/api/mind-palaces/[id]/check/route.ts`](../app/api/mind-palaces/[id]/check/route.ts)
- Domain/store: [`lib/mind-palaces.ts`](../lib/mind-palaces.ts), [`lib/server/mind-palaces-store.ts`](../lib/server/mind-palaces-store.ts)
- UI components: [`components/mind-palaces/mind-palaces-page-client.tsx`](../components/mind-palaces/mind-palaces-page-client.tsx), [`components/mind-palaces/mind-palace-detail-client.tsx`](../components/mind-palaces/mind-palace-detail-client.tsx)

Текущее состояние:

- `Чертоги разума` реализованы как отдельный домен и не смешиваются с `/cards` или `study-3/vocabulary`.
- MVP покрывает:
  - создание чертога;
  - линейный маршрут;
  - точки-loci;
  - фиксацию маршрута;
  - обязательную проверку вперёд, назад и по номеру.
- Маршрут принимает только 5–15 точек.
- Порядок маршрута строгий: без пропусков, прыжков и пустых точек.
- Точка должна быть конкретным визуальным образом; абстрактные описания отклоняются доменной валидацией.
- Стабильный статус чертога выставляется только после успешного прохождения трёх обязательных проверок:
  - `что после X`;
  - `что перед X`;
  - `точка №N`.
- При ошибке на проверке маршрут возвращается на этап фиксации.
- Добавление информации в точки до стабилизации маршрута намеренно запрещено и не открыто в UI первого этапа.

### Planner

- Главная страница планировщика: [`app/planner/page.tsx`](../app/planner/page.tsx)
- Детальная страница плана: [`app/planner/[planId]/page.tsx`](../app/planner/[planId]/page.tsx)
- API: [`app/api/plans/route.ts`](../app/api/plans/route.ts), [`app/api/plans/[id]/route.ts`](../app/api/plans/[id]/route.ts)
- Store: [`lib/server/plans-store.ts`](../lib/server/plans-store.ts)
- Дополнительная логика: [`lib/plans.ts`](../lib/plans.ts), [`lib/planner-daily-plans.ts`](../lib/planner-daily-plans.ts)

Текущее состояние:

- Поддерживаются обычные планы и собранные дневные планы.
- При закрытии задачи в дневном плане её статус синхронизируется в исходный план.
- Задачи поддерживают вложенные подзадачи с собственными дедлайнами, редактированием, историей изменений и отдельным статусом выполнения.
- Для списков подзадач доступна отдельная сортировка по дедлайнам внутри родительской задачи.
- Подзадачи синхронизируются между общими и дневными планами в обе стороны вместе с родительской задачей.
- Выполнение всех подзадач не завершает родительскую задачу автоматически.
- При удалении задачи из дневного плана она удаляется и из исходного плана.
- При удалении всего дневного плана его содержимое удаляется из общих планов.

### Knowledge Cards

- UI: [`app/cards/page.tsx`](../app/cards/page.tsx), [`app/cards/new/page.tsx`](../app/cards/new/page.tsx), [`app/cards/[cardId]/page.tsx`](../app/cards/[cardId]/page.tsx), [`app/cards/edit/[cardId]/page.tsx`](../app/cards/edit/[cardId]/page.tsx), [`app/cards/spheres/[sphere]/page.tsx`](../app/cards/spheres/[sphere]/page.tsx)
- Workspace list UI: [`app/cards/space/[workspace]/page.tsx`](../app/cards/space/[workspace]/page.tsx)
- API: [`app/api/cards/route.ts`](../app/api/cards/route.ts), [`app/api/cards/[id]/route.ts`](../app/api/cards/[id]/route.ts)
- Domain/store: [`lib/cards.ts`](../lib/cards.ts), [`lib/server/cards-store.ts`](../lib/server/cards-store.ts)

Текущее состояние:

- Карточки являются частью базы знаний.
- База знаний разделена на три изолированных пространства: `жизнь`, `работа` и `учёба`.
- Все legacy карточки без указанного пространства автоматически нормализуются в `жизнь`.
- Экран `/cards` теперь служит выбором пространства, а список карточек открывается внутри выбранного workspace.
- Экран `/cards/new` теперь сначала предлагает выбрать пространство, после чего создаёт карточку только внутри него.
- Содержание карточки поддерживает два режима: обычный текст и структурированный чек-лист.
- Чек-лист хранится в карточке как массив пунктов с собственными `id`, текстом и статусом выполнения; `content` остаётся текстовым fallback/preview для старых списков и поиска.
- Сферы реорганизованы в knowledge folders.
- Поиск, фильтры, сферы, теги и списки карточек работают только в рамках выбранного пространства.
- Есть сценарии просмотра, создания, редактирования и открытия карточки по id с сохранением workspace-контекста.

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
- HTML для `study-3` страниц теперь хранится как persistent page-state в server store, а не как основной временный клиентский кэш.
- Источник истины для уже обработанной страницы теперь состоит из:
  - `layout_json` с блоками страницы;
  - `html_content` как render artifact поверх сохранённой структуры.
- Route HTML-представления сначала пытается получить от Gemini structured JSON layout, а затем рендерит HTML на стороне сервера; legacy HTML fallback сохранён как запасной путь.
- Для каждой страницы reader использует явный статус HTML:
  - `not_generated`;
  - `generated`.
- Кнопка `Получить HTML` всегда доступна и запускает только инкрементальную генерацию для ещё не обработанной страницы.
- Кнопка `Показать HTML` появляется только после успешной генерации и открывает уже сохранённое значение без повторного вызова Gemini.
- Chat-assistant в reader больше не ограничен только выбранным фрагментом: выделение и контекст передаются как подсказка, но пользователь может задавать любые вопросы по языку.
- Слова из reader теперь сохраняются в отдельный словарь `study-3`, а не в knowledge cards.
- Внутри `study-3` есть маршруты словаря и карточного режима изучения лексики.
- Актуальная production-версия уже включает словарь `study-3` и режим `учить лексику`.
- В библиотеке `study-3` поддерживается удаление загруженных учебников и отдельных image-based page entries.
- Удаление записи учебника из `study-3` удаляет её из server store и очищает локальные файловые/HTML артефакты fallback-хранилища.
- Reader перестроен в двухколоночный рабочий layout: страница/HTML слева и ассистент справа в симметричных колонках на desktop.

### Vocabulary

- UI/flow связан с API: [`app/study-3/vocabulary/page.tsx`](../app/study-3/vocabulary/page.tsx), [`app/study-3/vocabulary/review/page.tsx`](../app/study-3/vocabulary/review/page.tsx), [`app/api/vocabulary/route.ts`](../app/api/vocabulary/route.ts), [`app/api/vocabulary/review/route.ts`](../app/api/vocabulary/review/route.ts), [`app/api/vocabulary/[id]/route.ts`](../app/api/vocabulary/[id]/route.ts)
- Domain/store: [`lib/vocabulary.ts`](../lib/vocabulary.ts), [`lib/server/vocabulary-store.ts`](../lib/server/vocabulary-store.ts)
- Study UI: [`components/study-3/study-three-vocabulary.tsx`](../components/study-3/study-three-vocabulary.tsx), [`components/study-3/study-three-vocabulary-review.tsx`](../components/study-3/study-three-vocabulary-review.tsx), [`components/study-3/study-three-mnemonic-panel.tsx`](../components/study-3/study-three-mnemonic-panel.tsx)

Текущее состояние:

- Словарь является отдельным доменом данных и используется как подпространство `Учебники 3.0`.
- Слова из `study-3` сохраняются отдельно от `/cards` в коллекцию `словарь`.
- Для словаря есть отдельный список слов и отдельный экран `учить лексику`.
- Первый проход новых слов идёт последовательно по порядку добавления.
- После первого успешного прохождения слова переходят в интервальные повторения по упрощённой Anki-подобной логике.
- У lexical cards появился встроенный вспомогательный слой мнемотехники, который не заменяет review engine и не связан с knowledge cards.
- Мнемотехника имеет отдельные состояния `none`, `in_progress`, `anchored`.
- Поддерживаются структурированные режимы:
  - `sound`;
  - `image`;
  - `linked_word`;
  - `chain`;
  - `nested`.
- Система не генерирует мнемонику автоматически: она только предлагает включить её после ошибок, нестабильных ответов или по ручному запросу.
- После создания связи карточка проходит короткую проверку на воспроизведение; если связь не сработала позже, пользователь может быстро перевести её обратно в `in_progress` и переделать.
- Из словаря можно удалять lexical cards целиком.
- Мнемотехнику можно удалить полностью и собрать заново.
- Внутри mnemonic-режимов поддерживается удаление отдельных дополнений:
  - звукового якоря или образа;
  - связи с другим словом;
  - элементов цепочки;
  - вложенных элементов.

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
- Последний production deploy уже включает:
  - отдельный модуль `Чертоги разума` с маршрутами, проверкой и статусом стабилизации;
  - отделение словаря `study-3` от knowledge cards;
  - mnemonic-layer для lexical cards;
  - delete-flows для учебников/page-entry, словаря и мнемотехники;
  - reader layout с симметричными колонками `страница/HTML ↔ ассистент`.
- Одноразовый cleanup legacy study-данных запускается через:
  - [`lib/server/post-deploy-cleanup.ts`](../lib/server/post-deploy-cleanup.ts)
  - [`app/api/internal/post-deploy-cleanup/route.ts`](../app/api/internal/post-deploy-cleanup/route.ts)
- Триггер cleanup вызывается из [`app/layout.tsx`](../app/layout.tsx) через server-side `fetch`.

## Tooling State

- `npm run lint` переопределён на [`scripts/run-eslint.mjs`](../scripts/run-eslint.mjs), чтобы избежать зависания при прямом обходе `eslint .`.
- Полный lint по-прежнему шумный и может завершаться non-zero из-за warning-level замечаний в других частях репозитория.
- Локальный `next dev` в sandbox ранее не доходил до normal `listen()` стадии; это считалось ограничением окружения, а не обязательно багом приложения.
- В репозитории добавлена тестовая инфраструктура:
  - browser-level тесты на Playwright в `tests/e2e`;
  - integration/domain/API тесты в `tests/integration`;
  - отдельный test env через `.env.test`;
  - изолированное test storage через `TEST_DATA_ROOT`;
  - reset/seed скрипты `scripts/test-reset.mjs` и `scripts/test-seed.mjs`.
- Для CI добавлен workflow [`tests.yml`](../.github/workflows/tests.yml) с `lint`, `build`, integration tests и smoke Playwright suite.
- Для `mind palaces` добавлены отдельные integration/domain/API тесты на route-инварианты, проверки вперёд/назад/по номеру и переход в `stable`.

## Git State

- В истории есть коммит `study 2.0 eliminated`.
- Затем была интеграция удалённого `main` через merge и безопасный push без force.
- На remote `main` есть интеграционный коммит `Sync local main state`.
- Локальный `main` заново выровнен с актуальным `origin/main`.
- На remote `main` уже отправлен коммит `Add mind palaces MVP`.
- Broken refs вида `main 2` удалены.
- Документация для ИИ-агентов сохранена в `docs/` и уже является официальной стартовой точкой для следующих сессий.

## Practical Reading Order For New Tasks

Если задача непонятна, начинай с:

1. [`docs/start-prompt.md`](./start-prompt.md)
2. [`docs/current-state.md`](./current-state.md)
3. [`docs/open-issues.md`](./open-issues.md)
4. релевантных маршрутов в `app/`
5. релевантных store-файлов в `lib/server/`
