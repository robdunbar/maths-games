# Agent instructions

## Project

Clock Maths is a React and TypeScript web app built with Vite and configured as a PWA.

## Commands

- `npm run dev` — start the development server
- `npm run build` — type-check and build
- `npm run lint` — run ESLint
- `npm test` — run the Vitest test suite

## UI and responsive behavior

- Support viewport widths down to 320px. Preserve the responsive layouts and breakpoints in `src/styles.css`, including the narrow and portrait-phone cases.
- When changing UI, check narrow portrait, wider mobile, and desktop layouts. Pay particular attention to overflow, orientation changes, and the on-screen keyboard during portrait-phone gameplay.
- Respect the existing reduced-motion handling.
- For relevant UI changes, verify the app in the browser at representative viewport sizes and run relevant tests.

## Changes

- Follow the existing React, TypeScript, and CSS patterns.
- Add or update tests for behavior changes, then run the checks relevant to the change.
