# Intern Countdown

A single-page countdown to the last day of an internship — **29 January 2027, 16:00** local time — with daily motivational quotes, an anonymous live chat, and a few small games to pass the time.

The UI is in Bahasa Indonesia. Built with Next.js 16, React 19, and Tailwind CSS 4, and deployed on Vercel.

## Features

- **Flip-clock countdown** with two modes:
  - **All days** — the plain calendar time left until the target.
  - **Work days only** — counts only working hours (Mon–Fri, 07:30–16:00), skips national holidays and *cuti bersama*, and freezes outside working hours.
- **Quotes** that change with the time of day (morning, work, lunch break, after work, day off) and the day of the week.
- **Anonymous bubble chat** — messages float up the screen for every visitor online at that moment, then vanish after 5 seconds. No accounts, no database, no history.
- **Games**: Furdle (an Indonesian Wordle with 4–6 letter words), 2048, Blue Puzzle, Block Blast (drag & drop, combos), and Minesweeper (3 levels, chording, long-press to flag on touch screens).
- **Confetti** when the workday ends (once per day per device) and when the internship is over.
- Light/dark theme, an installable PWA, and a mobile-friendly layout.

## Getting started

Requirements: **Node.js 20.9 or newer** and npm.

```bash
git clone https://github.com/fathoni-tr/countdown-magang.git
cd countdown-magang
npm install
npm run dev
```

Then open <http://localhost:3000>.

| Script          | What it does                                               |
| --------------- | ---------------------------------------------------------- |
| `npm run dev`   | Development server with hot reload                         |
| `npm run build` | Production build                                           |
| `npm start`     | Serve the production build                                 |
| `npm test`      | Logic checks for the schedule, chat, and games (via `tsx`) |
| `npm run lint`  | ESLint                                                     |

No environment variables are required.

## Using it for your own internship

Every date and working hour lives in one file, [`lib/config.ts`](lib/config.ts):

```ts
END_TARGET: { y: 2027, m: 0, d: 29, hour: 16, minute: 0 }, // m is 0-based: 0 = January
WORK_START: { hour: 7, minute: 30 },
WORK_END:   { hour: 16, minute: 0 },
WORK_DAYS:  [1, 2, 3, 4, 5],                                // 0 = Sunday
```

Change the values and redeploy. Also update:

- the page title and description in [`app/layout.tsx`](app/layout.tsx), and
- the holiday lists in [`public/data/holidays-<year>.json`](public/data/) for every year your countdown covers. Each entry looks like:

  ```json
  { "date": "2026-01-01", "name": "Tahun Baru Masehi", "type": "nasional" }
  ```

  `type` is either `nasional` or `cuti_bersama`.

## Project structure

```
app/
  page.tsx            Main page (static)
  layout.tsx          Fonts, metadata, analytics
  globals.css         Theme colours and all game styles
  api/chat/route.ts   Chat endpoint: POST sends, GET streams (SSE)
components/
  Countdown.tsx       Flip clock and mode toggle
  QuoteTicker.tsx     Rotating quotes
  ChatBubbles.tsx     Chat input and floating bubbles
  InfoBar.tsx         Time zone, clock, next holiday
  Globe.tsx           Background globe
  games/              One component per game + GameDock (switcher)
lib/
  config.ts           Dates and working hours — the single source of truth
  schedule.ts         Time-left calculations
  holidays.ts         Loads public/data/holidays-*.json
  quotes.ts           Quote sets by mood and weekday
  chat-bus.ts         In-memory broadcast, rate limit, word filter
  games.ts            Pure game logic (no React), covered by tests
  words.ts            Furdle word lists
public/
  data/               Holiday lists
  sw.js               Service worker (network-first)
test-*.ts             Self-checks run by `npm test`
```

## How the chat works

The chat uses **Server-Sent Events held in memory** — there is no database and messages are never stored. A `POST` to `/api/chat` is validated and pushed to every open `GET` stream, then forgotten.

Limits:

- 120 characters per message
- 1 message every 3 seconds per IP address
- An Indonesian + English profanity filter
- Bubbles disappear after 5 seconds; at most 15 are on screen at once

Because messages live in a single server process's memory, visitors only see each other when their requests reach the same instance. On serverless platforms (including Vercel) streams are also cut after the function's time limit and the client reconnects automatically. That is fine for a small, casual chat, but it is not a guaranteed-delivery system.

## Deployment

The project deploys to [Vercel](https://vercel.com) with no extra configuration: import the repository and deploy. The main page is pre-rendered as a static page; only `/api/chat` runs on the server.

Any host that runs Next.js (`npm run build && npm start`) also works.

## Privacy

- **Chat**: messages are not logged or saved. IP addresses are held in server memory only to enforce the rate limit — never written to disk or logs — and are gone whenever the server process restarts.
- **Settings** (countdown mode, theme, game best scores) are stored in your browser's `localStorage` and never leave your device.
- **Analytics**: the site uses [Vercel Web Analytics](https://vercel.com/docs/analytics), which collects anonymous page-view data without cookies.

## Contributing

Bug reports, ideas, and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Credits

- Indonesian word lists: [geovedi/indonesian-wordlist](https://github.com/geovedi/indonesian-wordlist) (public domain). The answer list is narrowed down using word frequencies from [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) (content licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)).
- Flip clock: [@leenguyen/react-flip-clock-countdown](https://www.npmjs.com/package/@leenguyen/react-flip-clock-countdown) (MIT)
- Globe: [cobe](https://github.com/shuding/cobe) (MIT)
- Confetti: [canvas-confetti](https://github.com/catdad/canvas-confetti) (ISC)
- Theme toggle and text animation adapted from [Magic UI](https://magicui.design) (MIT)
- Fonts: [Audiowide](https://fonts.google.com/specimen/Audiowide) and [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) (SIL Open Font License)

## License

[MIT](LICENSE) © 2026 fathoni-tr
