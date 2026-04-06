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

## 3. Post-Deploy Cleanup Relies On Runtime Trigger

- Симптом:
  - cleanup legacy study-данных запускается через server-side вызов internal route из [`app/layout.tsx`](../app/layout.tsx).
- Риск:
  - если runtime trigger изменится, cleanup может перестать запускаться так, как ожидалось.
- Что делать:
  - при следующих инфраструктурных изменениях перепроверить этот механизм.

## 4. Some Lint Warnings Still Exist

- Симптом:
  - `npm run lint` по-прежнему упирается в warning-level замечания в других частях репозитория.
- Риск:
  - кодовая база остаётся частично шумной и сложнее поддерживается.
- Что делать:
  - постепенно убрать предупреждения по неиспользуемым переменным и отдельным `<img>`-случаям.

## 5. Vocabulary Review Mechanics Are Still Intentionally Minimal

- Симптом:
  - словарь `study-3` уже отделён от knowledge cards и умеет повторять лексику, но scheduling пока реализован как упрощённая Anki-подобная модель.
- Риск:
  - при росте объёма слов может понадобиться более точная настройка learning steps, daily limits и качеств ответа.
- Что делать:
  - постепенно расширять review engine без смешивания его с `/cards`.

## 6. Local Browser Test Runtime Is Still Constrained By Sandbox

- Симптом:
  - Playwright webServer локально в sandbox упирается в `listen EPERM` даже на `127.0.0.1`.
- Риск:
  - browser-level e2e тесты труднее честно прогонять в текущем локальном окружении, хотя сами spec-файлы и инфраструктура уже добавлены.
- Что делать:
  - использовать CI для полноценного browser run;
  - локально опираться на `lint`, `build`, listing/smoke checks и запускать браузерные тесты там, где порт можно открыть без sandbox-ограничения.

## 7. Source Deletion And Vocabulary Retention Policy Is Still Conservative

- Симптом:
  - при удалении учебника или отдельной page-entry исходный material source удаляется, но связанные vocabulary cards сейчас сохраняются как самостоятельные lexical entries.
- Риск:
  - у части карточек источник уже не существует, хотя сами слова продолжают жить в словаре и повторениях.
- Что делать:
  - при следующей итерации явно решить, нужно ли удалять такие слова автоматически, отвязывать source-reference или оставлять текущее поведение как окончательное правило.
