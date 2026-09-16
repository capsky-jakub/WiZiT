# WiZiT - Smart Route Optimizer & Visit Planner

WiZiT is a privacy-first, offline-capable web application designed for mobile professionals, service technicians, and sales representatives to manage client databases, schedule visits, and optimize multi-stop driving routes. 

---

## 🏗️ Architectural Philosophy & Key Paradigms

WiZiT is built as a single-page React application structured to prioritize efficiency, privacy, and low operating costs.

### 1. Hybrid-BYOK (Bring Your Own Key)
To eliminate central infrastructure costs and preserve user privacy, WiZiT operates on a Bring-Your-Own-Key model:
* **User Keys:** Users can input their own Google Maps API Key and Firebase API Key in the Settings panel. These keys are stored directly in `localStorage` in cleartext (unencrypted, as it runs entirely client-side).
* **System Keys:** Alternatively, if a user signs in via Google Account, the system fetches a shared Google Maps API key from a secure Firestore document (`localstorage/shared`), allowing zero-configuration access for authorized users.

### 2. Single-File Bundling & Edge Deployment
The build system is optimized using [vite-plugin-singlefile](https://github.com/richarddepape/vite-plugin-singlefile) to bundle the entire application—including inlined CSS, SVGs, images, and Javascript—into a single HTML file:
* **Assets Inlining:** `cssCodeSplit: false` and `assetsInlineLimit: 100000000` configuration in [vite.config.ts](file:///home/capsky-jakub/Dev/WebDev/WiZiT/vite.config.ts) ensure that no external network request is required for secondary assets.
* **Benefits:** This single-file output allows rapid edge-deployment, easy offline usage (e.g. running directly via `file://` protocol), and instant page loads.

### 3. Local Matrix Object Data (LMOD) Caching
To prevent expensive, redundant calls to the Google Maps Distance Matrix API, WiZiT implements the **LMOD** caching layer:
* **Mechanism:** Calculated distances (km) and durations (seconds) between address pairs are serialized and saved in `localStorage` under `odocalc_lmod`.
* **TTL Expiration:** Each cache entry has a configurable expiration timeframe (defaults to 30 days), after which it is automatically ignored and refreshed upon the next calculation.

### 4. Offline-First Cloud Synchronization
* All client records, settings, saved routes, and the active session are stored locally in `localStorage` for offline speed.
* When connected and authenticated via Firebase Auth (Google Sign-In), the application performs auto-syncing (Upload/Download) with a Firestore Lite database.

---

## 📂 Directory Structure

Below is the logical breakdown of the repository:

* **[root](file:///home/capsky-jakub/Dev/WebDev/WiZiT/)**: Contains project configuration files (`package.json`, `vite.config.ts`, `tsconfig.json`), environment files, and entry points.
* **[components/](file:///home/capsky-jakub/Dev/WebDev/WiZiT/components/)**: Reusable React UI components and modal views (e.g., MapModal, VisitList, ClientDbModal).
* **[hooks/](file:///home/capsky-jakub/Dev/WebDev/WiZiT/hooks/)**: Custom React hooks (e.g., `useDraggable` for modals).
* **[services/](file:///home/capsky-jakub/Dev/WebDev/WiZiT/services/)**: Logic modules containing API integrators, the TSP solver, database synchronization, translations, and scheduling.
* **[scripts/](file:///home/capsky-jakub/Dev/WebDev/WiZiT/scripts/)**: Automated utility scripts for workspace maintenance.
* **[docs/](file:///home/capsky-jakub/Dev/WebDev/WiZiT/docs/)**: Media and documentation assets.

---

## 🗄️ Detailed Code & Modules Breakdown

### 1. Types & Data Structures
* **[types.ts](file:///home/capsky-jakub/Dev/WebDev/WiZiT/types.ts)**
  Defines the domain model interfaces for the application:
  * `Visit`: Represents an active stop on the route. Contains unique coordinates/address fields, status flags (`isSkipped`, `isAddressValid`), and calculated metrics (`segmentDistance`, `segmentDuration`, `arrivalTime`, `totalOdometer`).
  * `Client`: Persistent client entity containing contact info, default service duration, and `visitRepetition` patterns.
  * `SavedRoute`: A snapshotted list of visits, metadata, and trip endpoints saved for reuse.
  * `AppSettings`: Holds user options, API keys, dark mode toggle, strict address checking, and language selection (`cs` | `en`).

### 2. Services (Logic & Integrations)
* **[services/tspSolver.ts](file:///home/capsky-jakub/Dev/WebDev/WiZiT/services/tspSolver.ts)**
  Implements the Traveling Salesperson Problem (TSP) solver to optimize driving paths:
  1. **Nearest Neighbor:** Starts at the base address and iteratively appends the closest unvisited stop to compile the initial route.
  2. **2-Opt Refinement:** A local search algorithm that iteratively selects two edges, swaps them (reversing the segment in between), and evaluates if the total driving distance is reduced. Iterations are capped at 100 to prevent locking the browser main thread.
* **[services/distanceCache.ts](file:///home/capsky-jakub/Dev/WebDev/WiZiT/services/distanceCache.ts)**
  Implements the LMOD Caching system. Uses key strings format `${origin}::${destination}` to store metrics. Extends TTL checks (`expiresAt`) to invalidate cached segments.
* **[services/googleMapsService.ts](file:///home/capsky-jakub/Dev/WebDev/WiZiT/services/googleMapsService.ts)**
  Manages interaction with Google Maps SDK:
  * **Dynamic Script Injection:** Safely appends the Google Maps SDK script to `document.head` only when an API key is verified, avoiding duplicate script mounts.
  * **Matrix Pruning (`ensureMatrixData`):** Before running the TSP optimization, this function divides the set of addresses into 10x10 chunks, checks LMOD cache, and fetches only the missing pairs in batches, honoring API quotas and reducing network roundtrips.
  * **Address Validation (`validateAddressStrict`):** Calls Google REST Address Validation API to verify correctness, formatting addresses and returning validation verdicts.
* **[services/firebaseService.ts](file:///home/capsky-jakub/Dev/WebDev/WiZiT/services/firebaseService.ts)**
  Wraps Firebase Firestore Lite and Auth. Uses dynamic initialization (`initializeApp`) when the API key becomes available. Implements `syncUp` and `syncDown` to synchronize local data with Firestore using the user's Google Email as the primary document key, allowing seamless cross-device data portability.
* **[services/scheduler.ts](file:///home/capsky-jakub/Dev/WebDev/WiZiT/services/scheduler.ts)**
  Evaluates recurrence configurations (`WEEKLY`, `DATE`, `INTERVAL`) to filter which clients are scheduled for a targeted calendar date:
  * `WEEKLY`: Compares `targetDate.getDay()` against the allowed day array.
  * `DATE`: Direct string match with `YYYY-MM-DD`.
  * `INTERVAL`: Normalizes timestamps to midnight and calculates modulo `intervalDays` from the start date (`diffDays % intervalDays === 0`).
* **[services/translations.ts](file:///home/capsky-jakub/Dev/WebDev/WiZiT/services/translations.ts)**
  Centralized language module holding English (`en`) and Czech (`cs`) locales.

### 3. UI Components & Modals
* **[App.tsx](file:///home/capsky-jakub/Dev/WebDev/WiZiT/App.tsx)**
  The main entry point component. It coordinates global application states (current settings, visits list, client database, map display, sync status). Handles Google script loading triggers, drag-and-drop end callbacks, and Excel reading/writing.
* **[components/VisitList.tsx](file:///home/capsky-jakub/Dev/WebDev/WiZiT/components/VisitList.tsx)**
  Draws the central data grid of scheduled stops. Equipped with `@dnd-kit/core` and `@dnd-kit/sortable` to enable tactile drag-and-drop row reordering. Displays sequential details (arrival times, segment distances, accumulating odometer readings).
* **[components/MapModal.tsx](file:///home/capsky-jakub/Dev/WebDev/WiZiT/components/MapModal.tsx)**
  Overlays the interactive Google Map showing route directions. Integrates markers (numbered dynamically by order) and polylines indicating directions. Highlights specific routes in real-time when hover triggers occur in the visit grid.
* **[components/ClientDbModal.tsx](file:///home/capsky-jakub/Dev/WebDev/WiZiT/components/ClientDbModal.tsx)**
  Tabular client CRM database containing search filtering, column sorting, importing schedules, and options to add selection batch to the active plan.
* **[components/SettingsModal.tsx](file:///home/capsky-jakub/Dev/WebDev/WiZiT/components/SettingsModal.tsx)**
  Controls user-defined metrics, including API keys, strict validation modes, language switches, custom odometer bases, and cache lifespan configurations.

---

## 🛠️ Automated Scripts

* **[scripts/sync-branding.sh](file:///home/capsky-jakub/Dev/WebDev/WiZiT/scripts/sync-branding.sh)**
  A deployment and synchronization script designed to maintain a Single Source of Truth (SSoT) for branding metadata.
  * **Shell Strict Mode:** Executed with `set -euo pipefail` to ensure that any command failure, uninitialized variable reference, or pipeline failure terminates the script immediately, preventing silent corruption.
  * **Jq Integration:** Extracts branding parameters (`author`, `email`, `githubUrl`, `license`, `licenseUrl`, `copyrightStartYear`) from [branding.json](file:///home/capsky-jakub/Dev/WebDev/WiZiT/branding.json).
  * **Race-Condition Safety:** When rewriting [package.json](file:///home/capsky-jakub/Dev/WebDev/WiZiT/package.json), `jq` outputs to a temporary file (`.tmp`) and then atomically replaces the original file using `mv`. This prevents data truncation or corruption in case the process is interrupted.
  * **Inlined Python Script:** Uses Python's `re.sub` with `re.DOTALL` flags to reliably locate and replace the multi-line HTML footer block inside `README.md` without dealing with fragile multi-line `sed`/`awk` command variations.

---

## 🚀 Workflows & Operations

### Developer Setup
1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Environment Configuration:**
   Create a `.env.development.local` to store environment variables during local runs:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   ```
3. **Local Development Server:**
   ```bash
   npm run dev
   ```
4. **Compile Single-File Production Build:**
   ```bash
   npm run build
   ```

### Daily Operator Workflow
1. **Load/Compile Stops:**
   * Upon startup, the app loads today's saved route (e.g. named "monday") if available.
   * If not, it runs the scheduler to check which clients from the database are scheduled for today's date/day and loads them.
   * Fallback: loads the last active session.
2. **Review & Sequence Stops:**
   * Drag-and-drop stops into desired chronological sequence.
   * Skip individual stops temporarily (double-click or right-click to exclude from calculations).
3. **Validate Addresses:**
   * Run the validation script to verify formatting and accuracy of addresses against Google Maps database.
4. **Optimize Sequence:**
   * Click **Optimal (Green)** to run the custom 2-Opt TSP solver. This will re-sequence the visits to minimize total driving distance.
5. **Analyze Map:**
   * Click **Visualize** to open the map overlay and visually inspect the route segments.
6. **Complete Trip & Save:**
   * Save the completed route or export to Excel.

---

## 📝 Coding & Development Guidelines

1. **Idempotency & State Checks:** Keep state mutations predictable. React states must change via immutable updates (e.g., `[...visits]`).
2. **Single-File Bundling Constraints:** All assets (SVGs, icons, CSS files) must be imported directly into the TypeScript files or bundled within index.html. Avoid relying on external runtime folder lookups for secondary assets.
3. **Strict Validation:** When strict mode is enabled, the route calculation will block if any address does not pass validation. Keep address validation checks robust.
4. **Portability of Shell Utilities:** Keep shell helper scripts compatible with standard POSIX or standard Bash configurations (use standard `set -euo pipefail` checks).
5. **No Baseless Guessing:** Do not guess Google Maps API configurations or types. If modifying mapping interfaces, refer to Google Maps SDK JS definitions.
