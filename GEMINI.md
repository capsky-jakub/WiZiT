# WiZiT (wizit-odocalc) - Project Documentation

## Project Overview
WiZiT is a smart route optimizer and visit planner designed for mobile professionals. It allows users to manage a database of clients, schedule recurring visits, and calculate optimal driving routes between multiple locations using advanced algorithms and real-time mapping data.

### Main Technologies
- **Frontend:** React 18 (TypeScript), Vite
- **Styling:** Vanilla CSS
- **State Management:** React Hooks (useState, useEffect, useRef)
- **Mapping & Routing:** Google Maps Platform (Distance Matrix, Places, Address Validation)
- **Optimization:** Custom TSP (Traveling Salesperson Problem) solver (Nearest Neighbor + 2-OPT refinement)
- **Backend & Sync:** Firebase (Authentication & Firestore)
- **Drag & Drop:** `@dnd-kit`
- **Excel Support:** Custom parser for client and visit data imports/exports

## Architecture
The application follows a modular React architecture:
- `App.tsx`: The central orchestrator managing global state, orchestration of calculations, and modal visibility.
- `services/`: Encapsulates business logic and external API integrations.
    - `googleMapsService.ts`: Handles geocoding, distance matrix calculations (including batch processing), and address validation.
    - `tspSolver.ts`: Contains the optimization logic for route sequencing.
    - `firebaseService.ts`: Manages cloud synchronization and user authentication.
    - `distanceCache.ts`: Implements "LMOD" (Local Matrix Object Data), a persistent localStorage cache for distance data to minimize API costs and latency.
    - `scheduler.ts`: Logic for determining which clients are due for a visit based on recurrence patterns.
- `components/`: UI components organized by feature (Modals, Tables, Map views).
- `types.ts`: Centralized TypeScript definitions for core entities like `Visit`, `Client`, `SavedRoute`, and `AppSettings`.

## Building and Running

### Development
```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

### Production Build
```bash
# Build the project using Vite
npm run build
```

### Deployment
The project includes a custom deployment pipeline in `compile_deploy/deploy.sh`. This script handles:
1. Cleaning the `dist` folder.
2. Running the build.
3. Version injection.
4. API key sanitization (wiping dev keys and protecting specific production keys).
5. Deploying to Google Cloud Storage (GCS).

```bash
# Example deployment command
./compile_deploy/deploy.sh build-deploy
```

## Development Conventions
- **Type Safety:** Strict TypeScript usage is encouraged. All shared interfaces are defined in `types.ts`.
- **API Optimization:** Always prefer using `DistanceCache` (LMOD) to avoid redundant Google Maps API calls. Batch operations in `googleMapsService.ts` should be used for large sets of addresses.
- **Localization:** Use the `translations.ts` service for UI text. Support is currently provided for English (`en`) and Czech (`cs`).
- **Idempotency:** Data mutations in `App.tsx` should ensure state consistency, especially when syncing with Firebase.

## Key Files
- `App.tsx`: Main entry point and state container.
- `types.ts`: Data models and application state interfaces.
- `services/tspSolver.ts`: Core optimization algorithm.
- `services/distanceCache.ts`: Performance optimization via persistence.
- `compile_deploy/deploy.sh`: Production lifecycle management.
