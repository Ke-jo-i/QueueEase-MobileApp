# QueueEase

QueueEase is an Expo and React Native prototype for managing queues at the University of Mindanao Tagum Campus Registrar's Office. Students can request a service ticket and check its status. Staff can work from an assigned registrar window, call the next eligible ticket, complete it, and review queue history.

## Run the app

Install Node.js and npm, then run:

```bash
npm ci
npm start
```

Expo will show options for a phone, Android emulator, iOS simulator, or web browser. To launch the web version directly, run `npm run web`. Routes are in `src/app/`; queue and session state are in `src/contexts/`.

## Try the queue flow

1. Open **Student Portal** and log in with a student ID. The login screen currently accepts any ID; `2021-00123` is the demo ID when the field is left blank.
2. On **Home**, choose a registrar service and tap **Get Queue Number**. The ticket appears on **Tickets**, and its number also appears on Home. The service determines the registrar window.
3. Log out, open **Staff Portal**, and log in. In **Profile**, set **Window Assignment** to the window shown on the student ticket.
4. In **Queue**, tap **Call Next** when the window is free. Staff must tap **Mark as Done** to complete the current ticket; the app does not automatically call another one.
5. The completed ticket appears in staff **History**. Log out and sign in to Student Portal with the same ID to see it in the student's **Ticket History** and **Alerts**. A different student ID will not show that ticket.

A student can cancel a waiting ticket from **View QR Ticket**. Called tickets cannot be cancelled from that screen.

## Checks and tools

| Tool | What it checks | Command |
| --- | --- | --- |
| ESLint | Code rules and common mistakes | `npm run lint` |
| TypeScript | Type errors without generating files | `npm run typecheck` |
| Playwright | Browser flows at a mobile-sized viewport | `npm run test:e2e` |
| Expo Doctor | Expo package and project configuration compatibility | `npx expo-doctor` |

`eslint.config.js`, `tsconfig.json`, and `playwright.config.ts` configure these checks. `package-lock.json` pins installed dependency versions. Change those files when the checks or dependencies actually need to change.

For the first Playwright run, install its Chromium browser with `npx playwright install chromium`. The test command starts the Expo web server on port 8081 automatically. On Windows PowerShell, if script execution is disabled, use `npm.cmd` and `npx.cmd` in place of `npm` and `npx`. To use an installed Microsoft Edge instead of Playwright's Chromium, set `$env:PLAYWRIGHT_CHANNEL='msedge'` before running the tests.

The automated tests cover ticket booking, cancellation, staff completion, student history, portal switching, logout access, and dark mode. They run in a browser; follow the [manual test plan](docs/manual-test-plan.md) to check native back gestures, safe areas, and the phone layout.

## Current prototype limits

- Login does not verify credentials against a server. The entered student ID only scopes tickets within this running app; it is not secure account authentication.
- Tickets and staff assignments are kept in memory. They can survive switching portals on the same running app, but disappear after an app restart or browser reload and do not sync between devices.
- Alerts reflect local ticket changes. There are no push notifications or live updates from other devices yet.
- Service-to-window routing uses the current local mapping in `src/constants/service-windows.ts`. The final system still needs agreed registrar window rules and a shared database.
