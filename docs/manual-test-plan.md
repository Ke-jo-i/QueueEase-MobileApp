# Manual test plan

Use a fresh app launch for each scenario. The app begins with a few demo staff tickets; a new student's first ticket is normally **R - 106**. If you have already used the queue during this launch, use the ticket number shown on screen instead.

## Student ticket completed by staff

1. Open **Student Portal**. Enter `2021-00123` as the student ID and log in.
2. On Home, choose **Student Record Update**, then tap **Get Queue Number**. Confirm that Tickets shows the new number and **Window 4 - Registrar**. Home should show the same number.
3. Log out. Confirm **Select Your Portal** appears immediately, and Back does not reopen the student screens.
4. Open **Staff Portal**, log in, open Profile, and select **Window 4 - Registrar**. Confirm Queue shows one waiting ticket for that window.
5. Tap **Call Next**. Confirm the student's number is now serving. Tap **Mark as Done** and confirm the action. The window should show no current ticket until staff calls another one.
6. Open staff **History** and confirm the number is marked **COMPLETED**.
7. Log out and sign in to Student Portal again with `2021-00123`. Tickets should show no active ticket and the same number under **Ticket History** as **COMPLETED**. Alerts should show **Ticket completed**.
8. Log out and sign in with `2021-00999`. The first student's ticket should not appear in this student's Tickets or Alerts.

## Student cancels a waiting ticket

1. Start a fresh app launch, sign in to Student Portal, and request **Student Record Update**.
2. Open **View QR Ticket**, tap **Cancel Queue Ticket**, and confirm. Tickets should move the number to history as **CANCELLED**; Home should say **No ticket yet**; Alerts should show **Ticket cancelled**.
3. Switch to Staff Portal and assign Window 4. The cancelled number should not be in its waiting queue.

## Navigation and appearance

- Log out from both portals. Each logout should go straight to **Select Your Portal**. Android Back, iOS swipe-back, and browser Back should not restore a private screen.
- On a phone with a notch or status bar, inspect Home, Tickets, Alerts, Profile, the QR ticket, and staff screens. Headers and controls should stay inside the safe area, and bottom navigation should remain reachable.
- Toggle dark mode in each Profile screen, then try Classic Blue, Sage, Soft Clay, and Lavender. Check text and buttons for readability in both modes. Restart the app and confirm the selected mode and color theme remain selected.
- In each Profile screen, open **Color Theme** and select a palette. The choices should close after selection. Choose and remove a profile photo, then restart the app to check local persistence.
- Open the staff waiting queue at phone width. Service filters should remain short horizontal pills above the ticket list.

Browser automation covers the queue and session flows, but it does not verify native gestures or physical device layout. Queue data is in memory, so restart the app only between scenarios, not during the student-to-staff handoff.
