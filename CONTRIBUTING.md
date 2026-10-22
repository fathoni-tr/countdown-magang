# Contributing

Thanks for wanting to make Intern Countdown better. Bug reports, ideas, fixes, new quotes, and new games are all welcome — you don't need to be an intern to help.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Report a bug** — open an issue with what you did, what you expected, what happened instead, and your browser and device (for example "Chrome 130 on Android"). A screenshot helps a lot for layout problems.
- **Suggest an idea** — open an issue first and describe the problem it solves. For anything bigger than a small fix, please wait for a reply before writing code so your work doesn't go to waste.
- **Fix a holiday date** — holiday lists are in `public/data/holidays-<year>.json`. Please link the official source (the government's SKB on national holidays and *cuti bersama*) in your pull request.
- **Add quotes** — quotes live in `lib/quotes.ts`, grouped by mood (`pagi`, `kerja`, `siang`, `pulang`, `libur`). Keep them short, friendly, original, and in Bahasa Indonesia. Don't paste text you don't have the right to share.
- **Improve the code or design** — see below.

## Setting up

You need **Node.js 20.9 or newer**.

```bash
git clone https://github.com/<your-username>/countdown-magang.git
cd countdown-magang
npm install
npm run dev
```

The site runs at <http://localhost:3000>.

> **Tip:** the service worker caches files. If a change doesn't show up in the browser, open DevTools → Application → Service workers → **Unregister**, then reload.

## Making a change

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b fix/minesweeper-timer
   ```
2. Make your change. Keep each pull request focused on one thing.
3. Check it before you push:
   ```bash
   npm test         # must pass
   npx tsc --noEmit # no type errors
   npm run lint     # don't add new warnings or errors
   npm run build    # must succeed
   ```
4. Test it on a **phone-sized screen** too (DevTools device mode is fine). Many visitors open the site on their phones.
5. Commit, push, and open a pull request against `main`.

### Pull request checklist

- [ ] Describes **what** changed and **why**
- [ ] `npm test` and `npm run build` pass
- [ ] Works on mobile and desktop, in both light and dark themes
- [ ] Screenshot or short clip included for visual changes
- [ ] New game logic has tests in `test-games.ts`

## Code guidelines

- **Follow the existing style.** Code comments and UI text are in **Bahasa Indonesia**; please keep it that way so the project reads consistently.
- **Keep logic separate from UI.** Game rules go in `lib/games.ts` as pure functions with no React, so they can be tested. Components in `components/games/` only handle display and input.
- **Add a test for new logic.** Tests are plain TypeScript files using `node:assert` — no framework. Look at `test-games.ts` for the pattern.
- **Prefer no new dependencies.** The site is intentionally small (7 runtime packages). If you think a library is needed, explain why in the issue first.
- **Use the theme variables** (`--fg`, `--bg`, `--card`, `--accent`, `--line`, `--dim`, and `--bb-1` … `--bb-6`) instead of hard-coded colours, so both themes keep working.
- **Accessibility matters.** Buttons need labels, everything should be usable by keyboard, and touch targets should be comfortably large.
- **Dates and working hours** belong in `lib/config.ts`, not scattered across components.

## Commit messages

Short, in the imperative mood, in English or Indonesian. [Conventional Commits](https://www.conventionalcommits.org) prefixes are encouraged:

```
feat: add combo effect to Block Blast
fix: start the Minesweeper timer from zero
docs: explain how to change the target date
```

## Security issues

Please **don't** open a public issue for security problems (for example, a way to bypass the chat rate limit or word filter). Email the maintainer at **fathonitr@gmail.com** instead, and allow some time for a fix before sharing details publicly.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
