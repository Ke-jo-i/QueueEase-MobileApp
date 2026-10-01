# Manual test plan

Use a fresh installation or cleared queue storage when a scenario needs the initial demo queue. Restarting now preserves tickets and staff assignments. A fresh dataset starts with a few demo staff tickets; the first new ticket is **R - 106**. Otherwise use the number shown on screen.

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

1. Sign in to Student Portal with no active ticket and request **Student Record Update**.
2. Open **View QR Ticket**, tap **Cancel Queue Ticket**, and confirm. Tickets should move the number to history as **CANCELLED**; Home should say **No ticket yet**; Alerts should show **Ticket cancelled**.
3. Switch to Staff Portal and assign Window 4. The cancelled number should not be in its waiting queue.

## Navigation and appearance

- Log out from both portals. Each logout should go straight to **Select Your Portal**. Android Back, iOS swipe-back, and browser Back should not restore a private screen.
- On a phone with a notch or status bar, inspect Home, Tickets, Alerts, Profile, the QR ticket, and staff screens. Headers and controls should stay inside the safe area, and bottom navigation should remain reachable.
- Toggle dark mode in each Profile screen, then try Classic Blue, Sage, Soft Clay, and Lavender. Check text and buttons for readability in both modes. Restart the app and confirm the selected mode and color theme remain selected.
- In each Profile screen, open **Color Theme** and select a palette. The choices should close after selection. Choose and remove a profile photo, then restart the app to check local persistence.
- Open the staff waiting queue at phone width. Service filters should remain short horizontal pills above the ticket list.

## Queue progress and saved data

1. Request **Academic Records Request** from a fresh queue. Home should show **1 person ahead** at Window 1. Open **View queue progress** to see the current number and ticket activity.
2. Restart the app. Sign in with the same student ID and confirm the ticket still appears. Log out and sign in as staff, call and finish the earlier Window 1 ticket, then call the student's ticket. The student view should now say **Your turn**.
3. Hold the ticket with a reason. On the student side it should show **On hold**, preserve the reason, and prevent a second booking. Return it to the queue from staff History; the earlier hold must remain in ticket activity.
4. Complete the ticket, restart, and sign in as the same student. Expand **View activity** in Ticket History. Creation, calls, hold, return, and completion should remain visible in order.
5. Transfer or reopen a ticket while other tickets are waiting at its destination. It must join the end of that line; the **NEXT** label and people's positions must agree.

Browser automation covers the queue and session flows, but it does not verify native gestures, physical device layout, or native storage behavior. Run the restart and photo checks on a phone too. Separate devices still have separate local queues.
