<div align="center">
  <img src="logo/logo_dark.png" alt="WiZiT Logo" width="200"/>
  <h1>Smart Route Optimizer & Visit Planner</h1>
  <p><strong>Plan, Optimize, Visit...</strong></p>
  
  [![Live Demo](https://img.shields.io/badge/Live_App-wizit.web.app-blue?style=for-the-badge&logo=googlechrome)](https://wizit.web.app)
  [![License](https://img.shields.io/badge/License-AGPLv3-green.svg?style=for-the-badge)](https://www.gnu.org/licenses/agpl-3.0.html)
  [![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)](https://cloud.google.com/)
  [![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com/)
</div>

<br/>

**WiZiT** is a powerful, privacy-first web application designed for mobile professionals, sales representatives, and service technicians. It seamlessly blends robust client management, smart scheduling, and advanced Route Optimization (TSP) via the Google Maps Platform.

🔗 **Try it live:** [https://wizit.web.app](https://wizit.web.app)

---

## 📸 Demo & Screenshots

Here is a brief recording of the application in action, demonstrating sample data loading, the TSP Optimization algorithm, interactive map visualization, and the Client Database:

<div align="center">
  <img src="docs/demo.webp" alt="WiZiT App Demo" width="100%" />
</div>

---

## ✨ Key Features

### 🛡️ Hybrid-BYOK (Bring Your Own Key)
You have total control. Bring your own Google Maps API Key directly into the Settings panel for private, unmetered usage. Don't have one? Just sign in securely with your Google account, and WiZiT will automatically provision a system-managed shared key for you.

### ☁️ Hybrid Cloud Sync
Work entirely offline with lightning-fast `localStorage`. Once you establish a connection and sign in, your data (Clients, Routes, and Settings) automatically syncs back and forth with Firebase Firestore, allowing you to seamlessly pick up where you left off on any device.

### 🧠 Smart Caching (LMOD)
WiZiT incorporates **LMOD** (Local Matrix Object Data)—a powerful caching layer that securely stores calculated distance and duration matrices in your browser. This drastically minimizes redundant API calls to Google Maps, making the app much cheaper to operate.

### 🚀 Advanced Route Optimization
Under the hood, WiZiT utilizes a custom TSP (Traveling Salesperson Problem) solver powered by Nearest Neighbor and 2-OPT refinement algorithms to guarantee the most efficient route for your multi-stop trips.

### 📊 Excel Import/Export
Migrating from spreadsheets? Easily import your daily plans directly from Excel. The application handles flexible data structures seamlessly.

---

## 🎯 Usage Scenarios

WiZiT is the perfect companion for anyone spending their workday on the road:

* **Sales Representatives:** Manage your CRM of clients, set up recurring visitation schedules (e.g., "Every 30 days" or "Every Tuesday"), and let the app automatically compile your optimal driving plan for the morning.
* **Service Technicians:** Import a chaotic list of broken equipment locations from an Excel dispatch sheet and let WiZiT instantly sequence them into the most fuel-efficient and time-saving route.
* **Delivery Drivers:** Rapidly add ad-hoc stops, re-order your list on the fly using intuitive Drag-and-Drop, and immediately visualize your exact path on the interactive map.

---

## 🛠️ Technology Stack

* **Frontend:** React 18, TypeScript, Vite
* **Styling:** Vanilla CSS (Light / Dark Mode support)
* **Drag & Drop:** `@dnd-kit` (Core, Sortable, Utilities)
* **Cloud & Auth:** Firebase (Authentication, Firestore Lite)
* **Mapping:** Google Maps Platform (Distance Matrix, Places Autocomplete, Maps JS API)
* **Deployment:** `vite-plugin-singlefile` (Compiles the app to a unified artifact for rapid edge-deployment)

---

## 💻 Getting Started (For Developers)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/WiZiT.git
cd WiZiT
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.development.local` file in the root directory and add your development API keys:
```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
```

### 4. Run the Dev Server
```bash
npm run dev
```

### 5. Production Build
```bash
npm run build
```

---

## 📄 License
This project is licensed under the **GNU AGPLv3**. See the `LICENSE` file for more details.

---

## 🏷️ Keywords & Topics

`Driver log book` • `Odometer calculator` • `Route Optimization` • `Traveling Salesperson Problem (TSP)` • `Visit Planner` • `Sales Representative Tool` • `Logistics Optimizer` • `Google Maps Distance Matrix` • `Firebase Sync` • `React` • `TypeScript` • `Vite` • `LMOD Caching` • `BYOK (Bring Your Own Key)` • `Privacy-First` • `Excel Data Import` • `Mobile Professional Workflow` • `CRM Companion` • `Smart Scheduling` • `Multi-stop Route Planner` • `Itinerary Planning` • `Journey Mapping` • `Navigation` • `Fleet Management` • `Road Network Optimization` • `Commute Optimization` • `Field Service Management` • `Last-mile Delivery` • `Mileage Tracking` • `Geocoding` • `Distance Estimation` • `Odo-calc` • `Digital Logbook` • `Expensing Tool` • `Tax Deduction Helper` • `Automated Logging` • `Territory Management` • `Stop Sequence Optimizer` • `Dynamic Routing` • `Professional Route Planner` • `Offline Data Persistence` • `Progressive Web App (PWA)` • `Audit-ready Logs` • `Interactive Route Editor` • `Map Visualization` • `Geospatial Data Processing` • `Account Management Routing` • `Workday Logistics` • `Smart Dispatching` • `Efficient Driving Paths`.

---
<!-- FOOTER_START -->
<div align="center">
  Copyright © 2025-2026 | <a href="mailto:capsky.jakub@gmail.com">CAPS.IT</a> | <a href="https://github.com/capsky-jakub/WiZiT">GitHub</a>
</div>
<!-- FOOTER_END -->

