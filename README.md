# Queue Ease

An Expo / React Native registrar queue application with a shared Node.js API and SQLite database. Students book and track tickets; staff call and serve them; administrators manage access, services and queue availability. The six service categories follow the approved UM Tagum proposal.

## Run on your laptop and phones

Use Node.js **24.14 or newer** and npm. From the project folder:

```powershell
npm ci
npm run server:setup
npm run server
```

First-time setup creates an empty queue and three accounts with randomly generated passwords. Open **`.local/demo-accounts.txt`** locally to see the student, staff and administrator credentials. Setup never overwrites existing accounts or queue records. `.local/`, credentials, SQLite files and backups are ignored by Git.

Keep that terminal open. In a second terminal:

```powershell
npm start
```

Connect the laptop and phones to the same private Wi-Fi or hotspot. Open the Expo QR with Expo Go. The app normally discovers the API on the Expo host at port **4100**. The API terminal prints your laptop's LAN address. If needed, set it explicitly before starting Expo:

```powershell
$env:EXPO_PUBLIC_API_URL='http://YOUR-LAPTOP-IP:4100'
npm start
```

The URL is public configuration, never a password or token. Allow Node through Windows Firewall on the private network if prompted. Check `http://YOUR-LAPTOP-IP:4100/health` from the phone browser; it should return `ok: true`. A network that isolates clients will prevent phone-to-laptop access; use your own hotspot instead. Keep the laptop awake. Expo tunnel does not tunnel this separate API.

For a browser, run `npm run web` while the API is running. The default browser API address uses the page's hostname and port 4100. Sessions are held in memory: a reload requires signing in again, but database records remain.

If PowerShell blocks npm scripts, use `npm.cmd` / `npx.cmd` instead of `npm` / `npx`.

## Demonstrate the complete flow

1. Sign into Student Portal with the generated student account, or register a new synthetic student.
2. Request **Academic Records Request**. It initially routes to Window 1. Show the ticket, QR and live status.
3. On another device/session, sign into Staff Portal. New staff receive the first unassigned window, beginning at Window 1. Profile permits changing to an available window.
4. Press **Call Next**. The student's app updates within the polling interval while connected.
5. Use **Scan / verify ticket**, confirm the called student's number and arrival, then serve the student.
6. Press **Mark as Done**. Both accounts retain the ticket in history. Calling another student remains a separate action.
7. Sign into Staff Portal using the administrator account to pause bookings, configure services, create/disable staff accounts, reset passwords and inspect records.

Held tickets remain active. Transfers and reopened exception tickets join the line's tail. Students can cancel waiting tickets. The QR identifies a ticket; staff still verify student identity. It does not allow queue jumping or automatic completion.

## Data and recovery

- Shared data: `.local/queueease.sqlite`, managed by the API. See [schema](server/schema.sql).
- Device preferences: appearance, profile photo and local-alert preference.
- Back up with `npm run server:backup`. This uses SQLite's backup API and is safe while the server is running. Backups are in `.local/backups/`.
- To inspect a backup safely, stop the API and set `QUEUE_DB_PATH` to that backup's full path before starting it. Preserve the original database. Do not delete a database to resolve login problems.
- Forgot a password: an administrator verifies the person's identity and resets it from Accounts. Users can change their own password in Profile. No recovery email is falsely reported as sent.
- The prior device-local prototype queue is left untouched in AsyncStorage; it is not imported into authenticated accounts. New shared queues start empty.

## Quick login for testing

In Expo Go or development mode, tap **Quick login as Student** in Student Portal, or **Quick login as Staff** / **Quick login as Admin** in Staff Portal. Leave the ID and password fields empty: the buttons sign in immediately to the existing demonstration accounts through the API.

The local server reads the credentials created by `npm run server:setup` from ignored `.local/demo-accounts.txt`; no client credential configuration is required and passwords are not bundled into the app. Restart `npm run server` after updating the server code. Changed passwords and disabled accounts still prevent sign-in. Use these accounts only for the private-network demonstration. Release builds hide the buttons; `NODE_ENV=production` or `QUEUE_DEMO_LOGIN=0` disables the server endpoint.

## Checks

```powershell
npm run typecheck
npm run lint
npm run test:server
npm run test:native
npx playwright install chromium
npm run test:e2e
```

Playwright starts Expo web on port 8081 by default and uses isolated in-memory test APIs with synthetic credentials. Tests do not change the demonstration database. Set `PLAYWRIGHT_PORT` to another port if necessary. Set `PLAYWRIGHT_CHANNEL=msedge` to use installed Edge. Native-camera, notification, Back and animation checks are in the [defense rehearsal guide](docs/defense-guide.md).

## Deployment scope

This setup supports a supervised private-network demonstration with synthetic data. It is not an authorized public university deployment. Public use still requires HTTPS hosting, institutional account verification, a retention/privacy policy, load testing, dependency review and broader phone testing.

Queue updates use polling roughly every two seconds while the app is active. Optional turn alerts appear as in-app pop-ups in Expo Go. Installed development/release builds use local device notifications with permission. Both require an open, connected app; closed-app remote push is not implemented. Reanimated motion respects Reduce Motion. Photos do not sync between devices. Ticket numbering is continuous, without a midnight reset. Service/window assignments are project settings, not verified UM Tagum office policy.

Useful handoff files: [defense guide](docs/defense-guide.md), [paper working draft](docs/final-paper-working-draft.md), [database schema](server/schema.sql).
