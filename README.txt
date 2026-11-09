NTPC SIMHADRI — AREA OWNER GEOTAG  (Installable PWA, satellite map)
===================================================================

WHAT THIS IS
  A web app that opens in ANY phone browser — no login, no app store.
  Shows all 360 custodial assets on a REAL SATELLITE map (Esri World
  Imagery) with marked perimeters, GPS "Where am I?" identification,
  and search by asset / group / OWNER / S.No.

  All asset data (locations, polygons, owners) is embedded in index.html.
  Satellite tiles stream from the internet; revisited areas are cached
  for offline use after the first view.

----------------------------------------------------------------------
PUT IT ONLINE WITH GITHUB PAGES  (free, ~5 minutes, gives a public link)
----------------------------------------------------------------------
  You need a free GitHub account (github.com -> Sign up). Then:

  1. Create a repository
     - Click the "+" (top-right) -> "New repository".
     - Repository name:  area-owner   (any name is fine)
     - Set it to PUBLIC. Tick "Add a README". Click "Create repository".

  2. Upload these files
     - On the repo page click "Add file" -> "Upload files".
     - Drag in ALL files from this folder:
         index.html, manifest.webmanifest, service-worker.js,
         icon-180.png, icon-192.png, icon-512.png,
         icon-192-maskable.png, icon-512-maskable.png
       (README.txt is optional.)
     - Click "Commit changes".

  3. Turn on GitHub Pages
     - Click "Settings" (top of repo) -> "Pages" (left menu).
     - Under "Branch" choose  main  and folder  / (root).  Click "Save".
     - Wait ~1 minute. The page shows a green link like:
         https://YOUR-USERNAME.github.io/area-owner/
     - That is your public app URL. Open it in any phone browser.

  4. Install on the phone (optional, for a home-screen icon)
     - Android Chrome: open the link -> tap "Install app" (or menu -> Install).
     - iPhone Safari: open the link -> Share -> "Add to Home Screen".

  To update data later: replace index.html in the repo (Add file ->
  Upload, overwrite) and bump CACHE in service-worker.js. Done.

----------------------------------------------------------------------
ALTERNATIVE — Netlify Drop (no account, instant)
  Go to  https://app.netlify.com/drop  and drag THIS WHOLE FOLDER onto
  the page. It gives an instant public https:// link. (Free link is
  temporary unless you make a free account.)

ALTERNATIVE — NTPC intranet
  Give this folder to NTPC IT to host on an internal HTTPS web server or
  SharePoint. Needs HTTPS (service worker + GPS won't work over plain http).

----------------------------------------------------------------------
NOTES
  - GPS "Where am I?" needs the browser to allow Location when asked.
    (It failed inside Claude's artifact because that frame blocks GPS —
    a hosted page like GitHub Pages does not.)
  - Satellite imagery needs internet to load. Tap the map icon (bottom-
    right) to switch between Satellite and a plain street map.
  - Data as on 09.11.2026 — 317 precise (polygon) + 43 approximate assets.
