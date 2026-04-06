# Open Issues

## 1. TypeScript Build Debt Is Intentionally Suppressed

- Симптом:
  - в [`next.config.ts`](../next.config.ts) включён `typescript.ignoreBuildErrors = true`.
- Риск:
  - build может проходить, даже если в части editor stack есть реальные типовые дефекты.
- Что делать:
  - постепенно разбирать ошибки по областям и возвращать строгую проверку.

## 2. Local `next dev` Can Behave Unreliably In Sandbox

- Симптом:
  - в локальном sandbox ранее `next dev` запускался, но не доходил до стабильного открытия порта.
- Риск:
  - часть route-проверок сложнее воспроизводить локально через HTTP.
- Что делать:
  - проверять через `lint`, `build` и production/preview, а также отдельно исследовать root cause.

## 3. Broken Git Refs Exist In Local Repository

- Симптом:
  - ранее Git показывал мусорные refs вроде `refs/heads/main 2` и `refs/remotes/origin/main 2`.
- Риск:
  - некоторые git-команды могут вести себя нестабильно или выдавать лишние ошибки.
- Что делать:
  - аккуратно почистить broken refs в отдельной технической задаче.

## 4. Local And Remote Main Histories Were Reconciled Through Integration Commit

- Симптом:
  - синхронизация с GitHub потребовала обходного safe merge/push сценария.
- Риск:
  - локальный рабочий репозиторий может оставаться неидеально выровненным с remote history.
- Что делать:
  - отдельно привести локальный `main` к полностью чистому и предсказуемому состоянию.

## 5. Post-Deploy Cleanup Relies On Runtime Trigger

- Симптом:
  - cleanup legacy study-данных запускается через server-side вызов internal route из [`app/layout.tsx`](../app/layout.tsx).
- Риск:
  - если runtime trigger изменится, cleanup может перестать запускаться так, как ожидалось.
- Что делать:
  - при следующих инфраструктурных изменениях перепроверить этот механизм.

## 6. Some Lint Warnings Still Exist

- Симптом:
  - `npm run lint` проходит, но часть warning-level замечаний остаётся.
- Риск:
  - кодовая база остаётся частично шумной и сложнее поддерживается.
- Что делать:
  - постепенно убрать предупреждения по неиспользуемым переменным и отдельным `<img>`-случаям.

## 7. Vocabulary Direction Is Not Fully Defined

- Симптом:
  - API и store для vocabulary уже появились, но продуктовая роль модуля до конца не зафиксирована.
- Риск:
  - модуль может дублировать часть карточек или study flow.
- Что делать:
  - принять решение о месте vocabulary в общей архитектуре продукта.
