# Change Log

## 2026-03-16 - Planner and Study Flow Stabilization

- Что изменилось:
  - упрощены home cards;
  - перестроен workflow language course;
  - исправлены возвраты и навигация в planner;
  - убраны отдельные production blockers и lazy-loading проблемы.
- Зачем:
  - стабилизировать основные пользовательские переходы;
  - упростить стартовый экран;
  - подготовить базу для дальнейшей перестройки учебного модуля.
- Статус: `accepted`

## 2026-03-17 - Languages Workspace Experiments

- Что изменилось:
  - добавлены workspace и deploy fixes для language flow;
  - добавлена Ollama support для языкового AI.
- Зачем:
  - проверить отдельный сценарий языкового обучения и его AI-поддержку.
- Статус: `reworked`

## 2026-03-18 - Removal of Old Language Workspace

- Что изменилось:
  - OpenAI убран из language workspace;
  - сам language learning workspace затем удалён.
- Зачем:
  - свернуть неудачную отдельную ветку и вернуть фокус в основной продукт.
- Статус: `accepted`

## 2026-03-18 - Study Infrastructure Added

- Что изменилось:
  - добавлена инфраструктура учебников.
- Зачем:
  - создать основу для отдельного режима работы с учебниками.
- Статус: `accepted`

## 2026-03-19 - Article Card Type

- Что изменилось:
  - добавлен тип карточки article.
- Зачем:
  - расширить knowledge-base сценарии.
- Статус: `accepted`

## 2026-03-21 - Interactive Study Blocks

- Что изменилось:
  - study lessons были переработаны в interactive blocks;
  - добавлена поддержка custom study block type.
- Зачем:
  - перейти от плоского представления материала к более управляемым структурным блокам.
- Статус: `accepted`

## 2026-03-22 - Planner Layout Iteration

- Что изменилось:
  - обновлён layout planner;
  - улучшено редактирование заголовка;
  - folders переведены на 3-column grid.
- Зачем:
  - улучшить визуальную управляемость и плотность интерфейса планировщика.
- Статус: `accepted`

## 2026-03-23 - Planner Deadlines and Ordering

- Что изменилось:
  - добавлено редактирование period;
  - исправлен edit calendar layout;
  - добавлены deadlines и notifications;
  - добавлена сортировка по deadline и порядок folders;
  - folders переведены на drag reorder.
- Зачем:
  - сделать planner реальным инструментом ежедневной работы, а не только списком задач.
- Статус: `accepted`

## 2026-03-23 - Editor Scale Adjustment

- Что изменилось:
  - увеличен display scale текстового редактора.
- Зачем:
  - улучшить читаемость и удобство работы в editor/texts.
- Статус: `accepted`

## 2026-03-24 - Knowledge Folders

- Что изменилось:
  - карточки сгруппированы по сферам;
  - сферы превращены в knowledge folders.
- Зачем:
  - сделать структуру базы знаний более навигационной и удобной для роста.
- Статус: `accepted`

## 2026-03-26 - Daily Plans Collection

- Что изменилось:
  - добавлен сбор daily deadline plans;
  - исправлена загрузка detail page;
  - сохранены исходные планы при сборке;
  - добавлено обновление stale tasks;
  - убрано создание пустых daily plans;
  - отсутствующие daily plans редиректятся в planner.
- Зачем:
  - сформировать устойчивую модель дневных планов как производных от общих планов.
- Статус: `accepted`

## 2026-03-29 - Production Workflow and New Study UI

- Что изменилось:
  - добавлен стабильный Vercel production deploy workflow;
  - в remote history появился новый study parsing UI на базе Gemini;
  - затем `study 2.0` был заново собран как interactive textbook.
- Зачем:
  - улучшить production delivery;
  - попробовать новую ветку UI для учебников.
- Статус: `reworked`

## 2026-04-05 - Study 2.0 Eliminated

- Что изменилось:
  - удалён код `study 2.0`;
  - сохранены редиректы со старых `/study` маршрутов на `study-3` и `/cards`;
  - добавлен одноразовый cleanup legacy study-данных после деплоя;
  - `npm run lint` переведён на batched runner через `scripts/run-eslint.mjs`;
  - production deploy был успешно обновлён.
- Зачем:
  - окончательно закрыть legacy study-ветку и оставить единую реализацию учебников;
  - сделать деплой и сопровождение проекта более стабильными.
- Статус: `accepted`

## 2026-04-05 - Remote Main History Integrated

- Что изменилось:
  - удалённая история `main` была безопасно интегрирована без force-push;
  - итоговое состояние отправлено в GitHub через обычный push.
- Зачем:
  - синхронизировать локальную и удалённую линии разработки, не переписывая remote history.
- Статус: `accepted`

## 2026-04-05 - Agent Docs Bootstrap and Git Workflow Stabilized

- Что изменилось:
  - добавлена папка `docs/` с единым стартовым prompt, картой проекта, coding rules, current state, changelog, roadmap и open issues;
  - локальный `main` заново выровнен с актуальным `origin/main`;
  - broken refs вида `main 2` удалены.
- Зачем:
  - дать следующим ИИ-агентам устойчивую стартовую точку;
  - вернуть локальному git workflow предсказуемость для обычных `pull` и `push`.
- Статус: `accepted`
