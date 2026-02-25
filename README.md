# Aux

> Your weekly music club. Share songs, vote favorites, crown the DJ.

[![CI](https://github.com/alvarotorresc/aux/actions/workflows/ci.yml/badge.svg)](https://github.com/alvarotorresc/aux/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

## What is this

Aux is a weekly music club for friend groups. Create a group, share a link, and every week each member drops their favorite tracks. Everyone rates the songs (0-5 stars with half-star precision), and a leaderboard crowns the best DJ. Works cross-platform — paste a Spotify or YouTube Music link and Aux resolves it for every platform.

No signup required. Share a link and you're in.

## Tech Stack

- **Framework:** Astro 5 + React islands
- **Styling:** Tailwind CSS 4 + CSS custom properties
- **Data:** Supabase (PostgreSQL + client-side SDK)
- **Links API:** Odesli (song.link) for cross-platform resolution
- **Deploy:** Netlify
- **Testing:** Vitest
- **i18n:** English (default) + Spanish

## Local Development

### Prerequisites

- Node.js >= 20
- pnpm
- A Supabase project (free tier works)

### Installation

```bash
pnpm install
```

### Environment Variables

Copy `.env.example` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

| Variable                   | Description                 |
| -------------------------- | --------------------------- |
| `PUBLIC_SUPABASE_URL`      | Your Supabase project URL   |
| `PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

### Database Setup

Run the SQL in `supabase/schema.sql` in your Supabase SQL editor to create the tables, indexes, and RLS policies.

### Start Development

```bash
pnpm dev
```

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `pnpm dev`     | Start development server |
| `pnpm build`   | Production build         |
| `pnpm preview` | Preview production build |
| `pnpm lint`    | ESLint + Astro check     |
| `pnpm test`    | Run tests                |
| `pnpm format`  | Format with Prettier     |

## How It Works

1. **Create a group** — Pick a name, get a shareable link
2. **Share the link** — Friends join with just a name, no signup
3. **Drop tracks** — Paste Spotify or YouTube links each round
4. **Vote & compete** — Rate songs 0-5 stars, climb the leaderboard

Rounds are automatic (Monday-Sunday UTC). A new round starts each week.

## License

MIT — see [LICENSE](./LICENSE)
