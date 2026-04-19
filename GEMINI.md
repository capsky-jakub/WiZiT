# Project Overview

**visopt-odocalc (WiZiT)** is a React-based frontend application built with Vite and TypeScript. It functions as a smart route optimizer and daily visit planner, likely tailored for field agents, sales reps, or delivery drivers. 

## Key Technologies
- **Frontend Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite (configured with `vite-plugin-singlefile` to bundle the entire app into a single `index.html`)
- **Routing & Maps:** Google Maps API (`services/googleMapsService.ts`)
- **Optimization:** Custom TSP (Traveling Salesperson Problem) solver (`services/tspSolver.ts`)
- **Backend/Cloud Sync:** Firebase (Auth & Firestore) for syncing local state to the cloud (`services/firebaseService.ts`)
- **Data Handling:** LocalStorage for primary state persistence, with Excel import/export capabilities (`services/excelService.ts`)
- **Styling:** Tailwind CSS (inferred from utility classes in UI components)
- **Drag & Drop:** `@dnd-kit` for reorderable lists

## Architecture & State Management
- The app operates primarily offline-first or local-first, storing state (`visits`, `settings`, `clients`, `saved_routes`) in `localStorage`.
- Firebase is used purely for cloud backup and synchronization across devices, handling authentication and pushing/pulling JSON payloads to Firestore.
- Business logic is heavily decoupled into the `services/` directory.
- `App.tsx` serves as the central state orchestrator, managing large UI and data synchronization states.

## Building and Running

Ensure you have Node.js installed.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configuration:**
   - The application relies on Google Maps and Firebase.
   - For local development, set the `GEMINI_API_KEY` (if using AI features) in `.env.local` as per the README.
   - Firebase configuration is hardcoded in `services/firebaseService.ts`, but ensure the corresponding project is accessible.
   - Google Maps API key can be set in the application's UI settings or via `DEFAULT_DEV_API_KEY` in `App.tsx`.

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. **Build for Production:**
   ```bash
   npm run build
   ```
   *Note: This produces a single `index.html` file in the `dist` folder.*

5. **Preview Production Build:**
   ```bash
   npm run start
   ```

## Development Conventions

- **Typing:** Strict TypeScript interfaces are defined in `types.ts` and heavily used throughout components and services.
- **State Management:** Uses React hooks (`useState`, `useEffect`) and lifts state to the highest necessary component (often `App.tsx`).
- **Services:** External API calls (Google Maps, Firebase) and complex logic (TSP solver, scheduling) are encapsulated in standalone service files.
- **Styling:** Uses Tailwind CSS utility classes directly in components.
- **Localization:** Internationalization is handled via a custom `translations.ts` dictionary, supporting English (`en`) and Czech (`cs`).