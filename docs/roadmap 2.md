# Forward Plan

## Step 1 - Stabilize Local And Git Workflow

- Сверить локальный `main` с удалённым `origin/main`, чтобы дальнейшие `git pull` и `git push` снова были прямолинейными.
- Проверить и при необходимости убрать broken refs вида `main 2`.
- Зафиксировать нормальный рабочий git workflow в документации, если проблема повторится.

## Step 2 - Reduce Technical Debt In Build And Runtime

- Постепенно убрать зависимость от `typescript.ignoreBuildErrors` в [`next.config.ts`](../next.config.ts).
- Отдельно локализовать типовые проблемы editor stack и исправлять их пакетно.
- Понять, является ли нестабильность `next dev` в sandbox только проблемой среды или есть дополнительная причина в коде.

## Step 3 - Consolidate Study 3

- Пройтись по `study-3` UX как по единственной версии учебников.
- Уточнить и усилить сценарии:
  - загрузка книги;
  - HTML pipeline;
  - explain;
  - translate;
  - chat;
  - сохранение и кеширование страниц.
- Решить, нужен ли отдельный UI для vocabulary внутри study flow.

## Step 4 - Harden Planner

- Проверить остальные edge-case сценарии дневных планов:
  - перенос задач;
  - конкурирующие редактирования;
  - пересборка дня при изменении источников;
  - уведомления и дедлайны после серии массовых изменений.
- Добавить явные smoke checks для критичных planner flows.

## Step 5 - Clarify Knowledge And Vocabulary Strategy

- Определить роль `vocabulary` относительно `cards`.
- Понять, должен ли словарь стать подмодулем учебников, карточек или отдельным рабочим пространством.
- Устранить дублирование концепций между knowledge cards и vocabulary entries.

## Step 6 - Improve Project Observability

- Добавить более формализованные проверки post-deploy сценариев.
- При необходимости оформить scripts для типовых production smoke tests как стандартный набор сопровождения.
- Обновить docs после появления устойчивого релизного ритуала.
