# Queue Ease

A registrar queue app for the UM Tagum project, available on **Android/iOS through Expo** and as a **website**. Both versions share the Node.js API and SQLite database. Students book and track tickets, staff call and serve students, and administrators manage accounts, services and queue availability.

## Start the mobile app

Install **Node.js 24.14 or newer**, npm and Expo Go on the phone. From the project folder, run:

```powershell
npm ci
npm run server:setup
npm run server
```

Keep that terminal open. In a second terminal:

```powershell
npm start
```

Connect the laptop and phones to the same Wi-Fi or hotspot, then scan the Expo QR with Expo Go. The API runs on **port 4100**; its terminal prints the laptop's LAN address. The app normally discovers it automatically. If it says “Cannot reach Queue Ease,” check `http://YOUR-LAPTOP-IP:4100/health` in the phone browser and set the address explicitly before restarting Expo:

```powershell
$env:EXPO_PUBLIC_API_URL='http://YOUR-LAPTOP-IP:4100'
npm start -- --clear
```

Allow Node through Windows Firewall on the private network and keep the laptop awake. If the Wi-Fi isolates devices, use your own hotspot. If PowerShell blocks npm, use `npm.cmd` instead.

## Demo accounts

Fresh setup creates these accounts with **random passwords**:

| Role | ID | Email |
| --- | --- | --- |
| Student | `2026-00001` | `2026-00001@queueease.test` |
| Staff | `staff1` | `staff1@queueease.test` |
| Administrator | `admin` | `admin@queueease.test` |

Read the passwords in **`.local/demo-accounts.txt`** on your laptop. There is no universal default password. Setup preserves existing accounts and records. Credentials and database files are ignored by Git.

Use Student Portal for students and Staff Portal for staff **and administrators**. In development, the **Quick login as…** buttons sign in directly without filling the form; the API must be running.

### Hide or retire demo accounts for presentation

To hide quick-login buttons while keeping normal sign-in, stop and restart the API with:

```powershell
$env:QUEUE_DEMO_LOGIN='0'
npm run server
```

In the Expo terminal, restart with:

```powershell
$env:EXPO_PUBLIC_DEMO_LOGIN='0'
npm start -- --clear
```

These settings disable the shortcut, **not the accounts**. To retire the demo student/staff accounts, first register your presentation student and create a staff account under **Administration → Accounts**, then disable the old demo accounts there. Keep an administrator account available. Do not delete the database: that also removes ticket history.

To restore development shortcuts, remove these two environment variables from their respective terminals with `Remove-Item Env:QUEUE_DEMO_LOGIN` and `Remove-Item Env:EXPO_PUBLIC_DEMO_LOGIN`, then restart both processes.

## Website version

For development, keep the API running and run `npm run web` in another terminal.

For a standalone website without Expo Go:

```powershell
npm run build:web
npm run serve:web
```

**Stop any existing `npm run server` first:** `serve:web` runs the website and API together on port **4100**, using the same database. Open `http://localhost:4100` on the laptop or `http://YOUR-LAPTOP-IP:4100` on another device. Run `build:web` again after app changes. Quick-login shortcuts are automatically disabled in this version; use account IDs/emails and passwords.

Staff can verify arrival by entering the ticket number in the browser; camera QR scanning is available in the mobile app. Reloading either version requires signing in again, while ticket records remain in the database.

## Expo tunnel fallback

If the phone cannot reach the Expo development server, install its tunnel helper once:

```powershell
npm install -g @expo/ngrok
```

Keep the API running. Replace `npm start` with:

```powershell
$env:EXPO_PUBLIC_API_URL='http://YOUR-LAPTOP-IP:4100'
npm run start:tunnel
```

**Expo's tunnel carries the app bundle, not the queue API.** The phone still needs access to port 4100. Both devices need internet for the Expo tunnel. See [Expo tunnel instructions](https://docs.expo.dev/more/expo-cli/#tunneling).

If phone-to-laptop access also fails, an optional temporary API tunnel is available after [installing Cloudflare's `cloudflared`](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/): disable server quick login with `QUEUE_DEMO_LOGIN=0`, then run this in another terminal:

```powershell
cloudflared tunnel --url http://localhost:4100
```

Copy the printed `https://…trycloudflare.com` address into `EXPO_PUBLIC_API_URL` in the Expo terminal, then restart `npm run start:tunnel`. The temporary address changes on restart. Use synthetic demonstration data: this exposes the API publicly. When running `serve:web`, the same tunnel also provides an HTTPS website address.

## Rehearse and back up

Student: request **Academic Records Request** → show ticket/QR. Staff at Window 1: **Call Next** → **Scan / verify ticket** → confirm arrival → **Mark as Done**. Check history in both accounts. Calling the next student is a separate staff action; QR verification does not skip the line.

Data lives in `.local/queueease.sqlite`; see the [database schema](server/schema.sql). Run `npm run server:backup` to save a backup under `.local/backups/`, even while the server is running. Administrators can reset forgotten passwords from Accounts.

```powershell
npm run typecheck
npm run lint
npm run test:server
npm run test:native
npx playwright install chromium
npm run test:e2e
npm run test:web
```

Browser tests use isolated databases. `test:web` builds and checks the standalone website without Expo. Set `PLAYWRIGHT_PORT` if port 8081 is occupied, or `PLAYWRIGHT_CHANNEL=msedge` to use installed Edge. Queue updates require a connected app; closed-app remote push is not implemented. Service/window assignments are project settings, not verified university office policy.

## Expo and Android development

Expo builds on React Native to develop native Android/iOS apps. **Expo Go is a preview app**, not your own installable APK. Android Studio supplies the IDE/emulator, and the Android SDK/JDK supply the build tools. With those installed, `npx expo run:android` builds and runs locally; [EAS Build](https://docs.expo.dev/build-reference/android-builds/) offers a cloud build alternative. See [Expo's local build guide](https://docs.expo.dev/guides/local-app-overview/). The website is an extra target; confirm whether the course specifically requires an APK or Java/Kotlin implementation.
