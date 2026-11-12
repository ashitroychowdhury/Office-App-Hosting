NTPC SIMHADRI — AREA OWNER FINDER  (PWA with live admin updates)
================================================================

WHAT THIS APP DOES
  - Shows all 360 custodial assets on a real SATELLITE map.
  - Each asset shows its AREA OWNER: name, designation, department,
    employee ID, mobile and email.
  - TAP the mobile number  -> phone dialer opens (direct call).
  - TAP the email          -> Outlook/Mail opens a new mail to the owner.
  - "My Location" button    -> GPS; tells you which asset you are inside.
  - "Directions (in-app)"   -> draws the route from your location to the
                               asset ON the map, with distance & time.
  - ADMIN LOGIN             -> edit an owner's details; add / edit / delete
                               any location. Saved changes go LIVE for every
                               user instantly (via the online database).
  - Opens in ANY phone browser (no Claude login), installable as an app.

====================================================================
PART A — ONE-TIME FIREBASE SETUP  (free; needed for live admin updates)
====================================================================
This gives the app a shared online database so an admin's edits appear
for everyone instantly. ~15 minutes, no cost (free "Spark" plan).

  1. Go to  https://console.firebase.google.com  and sign in with a
     Google account. Click "Create a project".
     - Name it e.g. "simhadri-area-owner". Accept defaults. (You can
       DISABLE Google Analytics — not needed.) Click Create.

  2. Create the database:
     - Left menu -> "Build" -> "Firestore Database" -> "Create database".
     - Choose "Start in PRODUCTION mode" -> pick region "asia-south1
       (Mumbai)" -> Enable.

  3. Set the security rules (so everyone can read, and the app can write):
     - In Firestore -> "Rules" tab, replace everything with:

         rules_version = '2';
         service cloud.firestore {
           match /databases/{database}/documents {
             match /assets/{doc} {
               allow read: if true;
               allow write: if true;
             }
           }
         }
     - Click "Publish".
     (Note: write is open because admin access is guarded by the app
      password. For tighter security later, ask me about Firebase Auth.)

  4. Register the web app & copy the config:
     - Project Overview (home) -> click the "</>" (Web) icon.
     - App nickname: "area-owner-web" -> Register app.
     - It shows a "firebaseConfig = { ... }" block with 6 values
       (apiKey, authDomain, projectId, storageBucket,
        messagingSenderId, appId). Keep this screen open.

  5. Paste the config into the app:
     - Open  index.html  in a text editor (Notepad / any editor).
     - Near the bottom find:  const FIREBASE_CONFIG = { ... }
       with "PASTE_HERE" placeholders.
     - Replace each "PASTE_HERE" with the matching value from step 4.
     - Just below it, set your admin password:
         const ADMIN_PASSWORD = "Simhadri@2026";
       Change "Simhadri@2026" to whatever password you want admins to use.
     - Save index.html.

  That's it. The FIRST time the app opens with a working config, it
  automatically loads all 360 assets into your Firestore database.
  After that, the database is the single source of truth.

====================================================================
PART B — HOST IT FREE  (GitHub Pages)
====================================================================
  1. github.com -> sign in -> "+" -> New repository (PUBLIC), e.g.
     "area-owner". Tick "Add a README". Create.
  2. "Add file" -> "Upload files". Drag in ALL files from this folder:
       index.html, app.js, manifest.webmanifest, service-worker.js,
       and all icon-*.png  (README.txt optional).
     IMPORTANT: upload the FILES, so index.html sits at the repo root.
     Commit changes.
  3. Settings -> Pages -> Branch "main", folder "/ (root)" -> Save.
     After ~1 minute you get:  https://YOUR-USERNAME.github.io/area-owner/
  4. Open that link on any phone -> Share/Menu -> "Add to Home Screen"
     for the installed app icon.

  (Alternative: netlify.com/drop — drag this whole folder for an instant
   link, or hand the folder to NTPC IT for intranet hosting. Needs HTTPS.)

====================================================================
HOW LIVE ADMIN UPDATES WORK  (your main requirement)
====================================================================
  - All asset/owner data lives in the Firestore database (online).
  - Any user opening the app reads live from that database.
  - When an admin logs in (tap "Admin", enter password) and edits /
    adds / deletes a location and taps Save, the change is written to
    Firestore and pushed to every open app within a second — no
    re-upload, no re-hosting. The hosted files (on GitHub) only hold
    the app code, not the data, so you rarely touch GitHub again.
  - To change the DATA you use the Admin screen, not GitHub.
  - To change the APP CODE (new feature), re-upload files to GitHub and
    bump CACHE in service-worker.js.

NOTES
  - Without a Firebase config, the app still runs from the built-in 360
    assets, but admin edits are local to that one device only.
  - "Directions" uses an online router for the real road path; with no
    internet it falls back to a straight line + distance.
  - Satellite tiles need internet; viewed areas are cached for offline.
  - Data as on 12.11.2026 — 317 precise + 43 approximate assets, 360
    owner contacts.
