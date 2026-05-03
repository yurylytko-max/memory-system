This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Site Password

To restrict the whole site with a single password, set an environment variable before starting the app:

```bash
SITE_PASSWORD=your-password
```

Optional:

```bash
SITE_AUTH_SECRET=any-extra-secret
```

After restart, all pages and API routes will require login at `/login`.

## Telegram Monitor Snapshot Upload

Telegram Monitor lives inside the memory system at `/tools/telegram-monitor`.
It is a read-only review surface: monitoring data is not written to the memory
database and is not collected from Vercel.

Current update flow:

1. Locally, in the Telegram Monitor project, run:

```bash
make update-and-snapshot
```

2. The local file appears at:

```bash
exports/telegram-monitor-snapshot.json
```

3. Open `/tools/telegram-monitor/update`, choose that JSON file, and click
“Использовать этот snapshot”.

4. The UI stores the uploaded JSON in browser `localStorage` under:

```text
telegram_monitor_snapshot_override
telegram_monitor_snapshot_override_meta
```

5. The data-source indicator at the top of Telegram Monitor shows whether the
page is using the built-in snapshot or the uploaded snapshot.

6. “Сбросить snapshot” removes the override and returns the UI to the built-in
snapshot shipped with the app.

The uploaded file is not sent to a server, not written to Vercel filesystem, and
not committed. It is browser-local state for the current reviewer.

Local collection uses the separate Telegram Monitor project. Telethon reads
local `.env` and `data/telegram.session`; these files must never be committed.
Public web collection is only a fallback and may not provide subscribers or deep
history. `total_views` is the sum of post views, not unique reach. LLM-based
classification is not used in this stage.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
