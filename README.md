# Clock Maths

Clock Maths is a responsive arithmetic practice game built with React, TypeScript, and Vite. Solve 12 questions arranged around a clock, track your time and accuracy, and try to beat your best time.

Follow the link to play now!

[Play Clock Maths](https://robdunbar.github.io/maths-games/)

## Playing

1. Choose addition, subtraction, multiplication, or division.
2. Select a number range or times table and start the clock.
3. Enter each answer and press Enter or the check button. On desktop, Tab checks the answer and moves to the next unanswered box; clicking away also checks it.
4. Finish all 12 questions to see your time and accuracy. Play again or choose a different challenge.

On portrait phones, select a question on the clock and use the shared answer field. Best times are stored in the browser's local storage for each operation and level; they can be reset in settings.

## Getting Started

Node.js 24 and npm are recommended, matching the deployment workflow.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The application is served under `/maths-games/`.

## Development

```sh
npm test             # Run unit and component tests
npm run lint         # Run ESLint
npm run build        # Type-check and create the production build in dist/
```

Browser tests use Playwright and Chromium. Install the browser once, then run the suite:

```sh
npx playwright install chromium
npm run test:e2e
```

Playwright starts the development server automatically, or reuses one already running on its configured port.

## PWA And Deployment

The app is configured as an installable progressive web app. Its service worker caches the application assets for offline use after they have been loaded; installation and service worker availability depend on browser support and a secure context.

The GitHub Actions workflow builds and deploys to GitHub Pages on pushes to `main` and can also be run manually. Vite's base path is `/maths-games/`; update it in `vite.config.ts` if deploying under a different path.

## Licence

MIT. See [LICENSE](LICENSE).