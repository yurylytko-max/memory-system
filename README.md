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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Telegram Monitor Scheduled Refresh

The isolated Telegram Monitor lives at `/tools/telegram-monitor`.

Automated refresh is handled by GitHub Actions:

- workflow: `.github/workflows/telegram-monitor-refresh.yml`
- schedule: every 6 hours (`0 */6 * * *`)
- manual fallback: GitHub Actions → Telegram Monitor Refresh → Run workflow
- output: `app/tools/telegram-monitor/snapshot-data.json`

Required GitHub Secrets:

```text
TELEGRAM_API_ID
TELEGRAM_API_HASH
TELEGRAM_SESSION_BASE64
```

`TELEGRAM_SESSION_BASE64` is the base64-encoded contents of the local Telethon session file. Do not commit `.env` or `data/telegram.session`.

The workflow collects data through Telethon, updates the snapshot, commits it, and deploys to Vercel when `VERCEL_TOKEN` is available. Public web collection is only a fallback; Telethon is the primary mode for subscribers and deeper history.
