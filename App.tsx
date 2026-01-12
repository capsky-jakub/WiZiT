
import React, { useState, useEffect, useRef } from 'react';
import { Visit, Client, AppSettings, CalculationStatus, ReturnTrip, StartTrip, SavedRoute } from './types';
import { VisitList, ResultMode } from './components/VisitList';
import { VisitModal } from './components/VisitModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { MapSection } from './components/MapModal';
import { SavedRoutesModal } from './components/SavedRoutesModal';
import { ClientDbModal } from './components/ClientDbModal';
import { parseVisitsExcel } from './services/excelService';
import { getRouteData, validateAddressStrict, checkAddress, ensureMatrixData, setRuntimeApiKey, loadGoogleMapsScript } from './services/googleMapsService';
import { solveTSP } from './services/tspSolver';
import { setCacheExpirationDays } from './services/distanceCache';
import { translations } from './services/translations';
import { isClientScheduledForDate, sortVisitsByTime } from './services/scheduler';
import { FirebaseService } from './services/firebaseService';
import { User } from 'firebase/auth';

const DEFAULT_DEV_API_KEY = "AIzaSyAGs1LRYdwFOAxC_jctVh7Lz2evdATfKEk"; 

const uuid = () => Math.random().toString(36).substring(2, 9);
const commercialRound = (num: number) => Math.floor(num + 0.5);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const addSecondsToTime = (timeStr: string, secondsToAdd: number): string => {
    if (!timeStr) return "00:00:00";
    const [h, m, s] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, s, 0);
    date.setSeconds(date.getSeconds() + secondsToAdd);
    
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const ss = date.getSeconds().toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
};

const App: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [clients, setClients] = useState<Client[]>([]); // DB State
  const [startTrip, setStartTrip] = useState<StartTrip | null>(null);
  const [returnTrip, setReturnTrip] = useState<ReturnTrip | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Cloud Sync State
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>({
    startAddress: "Dlouhá 1113, 530 06 Pardubice, Česko",
    currentOdometer: 0,
    departureTime: "08:00:00",
    isStrictMode: false,
    isStartValid: false,
    isDarkMode: true,
    googleApiKey: DEFAULT_DEV_API_KEY,
    cacheExpirationDays: 30,
    language: 'en'
  });

  const t = translations[settings.language];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientDbOpen, setIsClientDbOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isSavedRoutesOpen, setIsSavedRoutesOpen] = useState(false);
  const [compilationInfo, setCompilationInfo] = useState<string | null>(null);
  
  const [editingItem, setEditingItem] = useState<Visit | Client | null>(null);
  const [editMode, setEditMode] = useState<'visit' | 'client'>('visit');

  const [calcStatus, setCalcStatus] = useState<CalculationStatus>(CalculationStatus.IDLE);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [dbDeleteConfirming, setDbDeleteConfirming] = useState(false);
  const [planReloadConfirming, setPlanReloadConfirming] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const [resultMode, setResultMode] = useState<ResultMode>('standard'); 

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importDbInputRef = useRef<HTMLInputElement>(null);

  // --- Auth & Sync Logic ---

  useEffect(() => {
    // Check if hardcoded config is active
    const ready = FirebaseService.isConfigured();
    setIsFirebaseReady(ready);

    if (ready) {
        const unsubscribe = FirebaseService.subscribeAuth((currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Reset permission state on new login
                setPermissionDenied(false); 
                // Initial sync attempt, catch unhandled promise rejection here
                handleSyncFromCloud(currentUser).catch(err => console.error("Unhandled sync error", err));
            } else {
                setPermissionDenied(false);
            }
        });
        return () => unsubscribe();
    }
  }, []);

  const handleSyncFromCloud = async (currentUser: User) => {
    setIsSyncing(true);
    try {
        const result = await FirebaseService.syncDown(currentUser);
        if (result.updated && result.data) {
            // Update React State from Cloud Data
            if (result.data.clients) setClients(result.data.clients);
            if (result.data.settings) {
                setSettings(result.data.settings);
                // Re-apply API key if needed
                if (result.data.settings.googleApiKey) {
                    setRuntimeApiKey(result.data.settings.googleApiKey);
                    loadGoogleMapsScript(result.data.settings.googleApiKey)
                        .then(() => setIsApiReady(true))
                        .catch(() => setIsApiReady(false));
                }
            }
            setCompilationInfo("Configuration synced from Cloud");
            setTimeout(() => setCompilationInfo(null), 3000);
        }
    } catch (e: any) {
        if (e.message === "PERMISSION_DENIED") {
            console.warn("User not authorized for Firestore access.");
            setPermissionDenied(true);
            setCompilationInfo("Sync disabled: Unauthorized");
            setTimeout(() => setCompilationInfo(null), 3000);
        } else {
            console.error("Sync down error", e);
        }
    } finally {
        setIsSyncing(false);
    }
  };

  const handleTriggerSync = async () => {
      if (user) {
          if (permissionDenied) {
              alert("Access Denied: You are not authorized to sync.");
              return;
          }

          setIsSyncing(true);
          try {
              // We try to sync UP first
              await FirebaseService.syncUp(user);
              // Then sync DOWN to ensure consistency (optional, but good for versioning)
              await FirebaseService.syncDown(user);
              
              setCompilationInfo("Sync completed successfully");
              setTimeout(() => setCompilationInfo(null), 2000);
          } catch (e: any) {
              if (e.message === "PERMISSION_DENIED") {
                  setPermissionDenied(true);
                  alert("Access Denied: Your account is not authorized to sync data with the cloud database.");
              } else {
                  console.error("Manual sync failed", e);
                  alert(`Sync failed: ${e.message}`);
              }
          } finally {
              setIsSyncing(false);
          }
      }
  };

  const handleLogin = async () => {
      if (!isFirebaseReady) {
          alert("Firebase is not configured. Please edit services/firebaseService.ts to add your keys.");
          return;
      }
      try {
          await FirebaseService.signIn();
      } catch (e: any) {
          alert(`Login failed: ${e.message}`);
          console.error("Login failed", e);
      }
  };

  const handleLogout = async () => {
      await FirebaseService.signOut();
      setUser(null);
      setPermissionDenied(false);
  };

  // --- Start of Logic ---

  // Helper to get localized day name for auto-load
  const getCurrentDayName = (lang: 'cs' | 'en'): string => {
    const dayIndex = new Date().getDay(); // 0 (Sun) - 6 (Sat)
    if (lang === 'cs') {
      return ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'][dayIndex];
    }
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex];
  };

  // Compile Plan Function (Extracted for re-use)
  const loadDailyPlan = (clientSource: Client[]): Visit[] => {
        console.log("%c[VisOpt] Compiling Daily Plan...", 'color: #1a73e8; font-weight: bold;');
        const today = new Date();
        const compiledVisits: Visit[] = [];

        clientSource.forEach(client => {
            if (isClientScheduledForDate(client, today)) {
                compiledVisits.push({
                    id: uuid(),
                    name: client.name,
                    surname: client.surname,
                    address: client.address,
                    order: 0, // Order will be determined by sort
                    visitDuration: client.defaultDuration,
                    isAddressValid: client.isAddressValid,
                    isSkipped: false,
                    preferredTime: client.visitStartAt // Store preference
                });
            }
        });

        const sortedVisits = sortVisitsByTime(compiledVisits);
        const reindexed = sortedVisits.map((v, idx) => ({...v, order: idx + 1}));
        return reindexed;
  };

  useEffect(() => {
    // 1. Initial Load of Settings
    const savedSettings = localStorage.getItem('odocalc_settings');
    let currentSettings = settings;

    if (savedSettings) {
      try {
        const loaded = JSON.parse(savedSettings);
        if (!loaded.departureTime) loaded.departureTime = "08:00:00";
        if (!loaded.cacheExpirationDays) loaded.cacheExpirationDays = 30;
        if (!loaded.language) loaded.language = 'en';
        if (!loaded.googleApiKey && DEFAULT_DEV_API_KEY) loaded.googleApiKey = DEFAULT_DEV_API_KEY;

        setSettings(loaded);
        currentSettings = loaded;
        setCacheExpirationDays(loaded.cacheExpirationDays);

        if (loaded.googleApiKey) {
            setRuntimeApiKey(loaded.googleApiKey);
            loadGoogleMapsScript(loaded.googleApiKey)
                .then(() => setIsApiReady(true))
                .catch(e => { console.error("API Load Error:", e); setIsApiReady(false); });
        }

      } catch (e) { console.error("Failed to load settings", e); }
    } else {
        if (DEFAULT_DEV_API_KEY) {
            setRuntimeApiKey(DEFAULT_DEV_API_KEY);
            loadGoogleMapsScript(DEFAULT_DEV_API_KEY)
                .then(() => setIsApiReady(true))
                .catch(e => { console.error(e); setIsApiReady(false); });
        }
    }

    // 2. Startup Data Loading Priority:
    // Priority A: Saved Route matching Day Name
    // Priority B: Dynamic compilation from DB
    // Priority C: Last session state (legacy/fallback)

    const savedClientsRaw = localStorage.getItem('odocalc_db_clients');
    let dbClients: Client[] = [];
    if (savedClientsRaw) {
        try { dbClients = JSON.parse(savedClientsRaw); setClients(dbClients); } catch(e) {}
    }

    let routeLoaded = false;
    const currentDayName = getCurrentDayName(currentSettings.language).toLowerCase();
    const savedRoutesRaw = localStorage.getItem('odocalc_saved_routes');

    if (savedRoutesRaw) {
        try {
            const savedRoutes: SavedRoute[] = JSON.parse(savedRoutesRaw);
            // Loose match for user convenience (trim whitespace)
            const dayRoute = savedRoutes.find(r => r.name.trim().toLowerCase() === currentDayName);

            if (dayRoute) {
                console.log(`%c[VisOpt] Priority A: Auto-loading Saved Route: ${dayRoute.name}`, 'color: #d93025; font-weight: bold;');
                setVisits(dayRoute.visits);
                if (dayRoute.startTrip) setStartTrip(dayRoute.startTrip);
                if (dayRoute.returnTrip) setReturnTrip(dayRoute.returnTrip);
                setCompilationInfo(`Auto-loaded saved route: ${dayRoute.name}`);
                setTimeout(() => setCompilationInfo(null), 5000);
                routeLoaded = true;
            }
        } catch (e) { console.error("Failed to check saved routes", e); }
    }

    if (!routeLoaded && dbClients.length > 0) {
        // Priority B: Dynamic
        console.log("%c[VisOpt] Priority B: Dynamic Compilation", 'color: #1a73e8; font-weight: bold;');
        const dailyRoute = loadDailyPlan(dbClients);
        setVisits(dailyRoute);
        if (dailyRoute.length > 0) {
                setCompilationInfo(`${translations[currentSettings.language].msgDailyCompilation}: ${dailyRoute.length}`);
                setTimeout(() => setCompilationInfo(null), 5000);
        }
        routeLoaded = true;
    }

    if (!routeLoaded) {
        // Priority C: Fallback to last session if nothing else
        const savedVisits = localStorage.getItem('odocalc_visits');
        if (savedVisits) {
            try { setVisits(JSON.parse(savedVisits)); } catch (e) {}
        }
    }

    // Load Start/Return (Static trip data) - always load if not set by route
    if (!startTrip) {
        const savedStart = localStorage.getItem('odocalc_start');
        if (savedStart) try { setStartTrip(JSON.parse(savedStart)); } catch (e) {} 
    }
    if (!returnTrip) {
        const savedReturn = localStorage.getItem('odocalc_return');
        if (savedReturn) try { setReturnTrip(JSON.parse(savedReturn)); } catch (e) {} 
    }

  }, []);

  useEffect(() => {
    localStorage.setItem('odocalc_visits', JSON.stringify(visits));
    localStorage.setItem('odocalc_settings', JSON.stringify(settings));
    localStorage.setItem('odocalc_db_clients', JSON.stringify(clients));

    if (startTrip) localStorage.setItem('odocalc_start', JSON.stringify(startTrip));
    else localStorage.removeItem('odocalc_start');
    if (returnTrip) localStorage.setItem('odocalc_return', JSON.stringify(returnTrip));
    else localStorage.removeItem('odocalc_return');

    if (settings.isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [visits, settings, startTrip, returnTrip, clients]);

  useEffect(() => { setDeleteConfirming(false); setPlanReloadConfirming(false); }, [selectedIds]);

  const clearCalculation = (currentList: Visit[] = visits) => {
    const cleared = currentList.map(v => {
        const { segmentDistance, exactDistanceKm, segmentDuration, totalOdometer, arrivalTime, ...rest } = v;
        return rest as Visit;
    });
    setStartTrip(null);
    setReturnTrip(null);
    setCalcStatus(CalculationStatus.IDLE);
    setResultMode('standard'); // Reset mode
    if (isMapOpen) setIsMapOpen(false); 
    return cleared;
  };

  const handleExportDB = () => {
      try {
          const getParsed = (key: string) => {
              const val = localStorage.getItem(key);
              return val ? JSON.parse(val) : null;
          };
          const exportData = {
              visits: getParsed('odocalc_visits'),
              clients: getParsed('odocalc_db_clients'),
              settings: getParsed('odocalc_settings'),
              start: getParsed('odocalc_start'),
              return: getParsed('odocalc_return'),
              lmod: getParsed('odocalc_lmod'),
              saved_routes: getParsed('odocalc_saved_routes'),
              timestamp: new Date().toISOString()
          };
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `odocalc-backup-${new Date().toISOString().slice(0,10)}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          console.log("Database exported successfully.");
      } catch (err: any) { console.error("Export failed:", err.message); }
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const text = event.target?.result as string;
              const data = JSON.parse(text);
              if (!data.visits && !data.settings) throw new Error("Invalid backup file format");
              if (data.lmod) localStorage.setItem('odocalc_lmod', JSON.stringify(data.lmod));
              if (data.saved_routes) localStorage.setItem('odocalc_saved_routes', JSON.stringify(data.saved_routes));
              if (data.settings) setSettings(data.settings);
              if (data.clients) setClients(data.clients);
              if (data.visits) {
                  setVisits(data.visits);
                  setStartTrip(data.start || null);
                  setReturnTrip(data.return || null);
              }
              if (data.settings?.googleApiKey) {
                  setRuntimeApiKey(data.settings.googleApiKey);
                  loadGoogleMapsScript(data.settings.googleApiKey)
                    .then(() => setIsApiReady(true))
                    .catch(() => setIsApiReady(false));
              }
              console.log(t.msgImportSuccess);
              // Trigger sync after manual restore
              handleTriggerSync();
          } catch (err: any) { console.error(t.msgImportFail, err.message); }
      };
      reader.readAsText(file);
      if (importDbInputRef.current) importDbInputRef.current.value = '';
  };

  const handleClearDB = () => {
      if (dbDeleteConfirming) {
          localStorage.removeItem('odocalc_lmod');
          localStorage.removeItem('odocalc_saved_routes');
          localStorage.removeItem('odocalc_db_clients');
          setVisits([]);
          setClients([]);
          setStartTrip(null);
          setReturnTrip(null);
          setSettings({
            startAddress: "Dlouhá 1113, 530 06 Pardubice, Česko",
            currentOdometer: 0,
            departureTime: "08:00:00",
            isStrictMode: false,
            isStartValid: false,
            isDarkMode: true,
            googleApiKey: DEFAULT_DEV_API_KEY,
            cacheExpirationDays: 30,
            language: settings.language
          });
          if (DEFAULT_DEV_API_KEY) { setRuntimeApiKey(DEFAULT_DEV_API_KEY); setIsApiReady(true); } else { setRuntimeApiKey(""); setIsApiReady(false); }
          setCacheExpirationDays(30); 
          setDbDeleteConfirming(false);
          console.log(t.msgDbCleared);
          // Sync clear
          handleTriggerSync();
      } else {
          setDbDeleteConfirming(true);
          setTimeout(() => setDbDeleteConfirming(false), 4000);
      }
  };

  const reindexVisits = (list: Visit[]) => {
    let orderCounter = 1;
    return list.map((v) => {
        if (v.isSkipped) return { ...v, order: 0 };
        return { ...v, order: orderCounter++ };
    });
  };

  const handleReorder = (newVisits: Visit[]) => {
    const cleared = clearCalculation(newVisits);
    setVisits(reindexVisits(cleared));
  };

  const handleToggleSkip = (id: string) => {
      const updated = visits.map(v => v.id === id ? { ...v, isSkipped: !v.isSkipped } : v);
      const cleared = clearCalculation(updated);
      setVisits(reindexVisits(cleared));
  };

  const handleAddVisit = () => { setEditingItem(null); setEditMode('visit'); setIsModalOpen(true); };
  const handleEditVisit = (visit: Visit) => { setEditingItem(visit); setEditMode('visit'); setIsModalOpen(true); };

  const saveItem = (data: any) => {
    // Check if we are saving a Visit or a Client based on editMode
    if (editMode === 'visit') {
        let newList;
        if (editingItem && 'order' in editingItem) { 
            // Editing existing visit
            newList = visits.map(v => v.id === editingItem.id ? { ...v, ...data } : v); 
        } else { 
            // Creating new visit
            const newVisit = { ...data, id: uuid(), order: 0, isSkipped: false }; 
            newList = [...visits, newVisit]; 
        }
        const cleared = clearCalculation(newList);
        setVisits(reindexVisits(cleared));
    } else {
        // Saving a Client to DB
        const newClientData: any = {
            name: data.name,
            surname: data.surname,
            address: data.address,
            defaultDuration: data.visitDuration, // Map from modal's visitDuration
            isAddressValid: data.isAddressValid,
            visitStartAt: data.visitStartAt,
            visitRepetition: data.visitRepetition
        };

        if (editingItem) {
             setClients(prev => prev.map(c => c.id === editingItem.id ? { ...c, ...newClientData } : c));
        } else {
             setClients(prev => [...prev, { ...newClientData, id: uuid() }]);
        }
        // Sync Clients
        setTimeout(handleTriggerSync, 100);
    }
    setIsModalOpen(false);
  };

  // --- Client DB Handlers ---
  const handleAddClient = () => {
      setEditingItem(null);
      setEditMode('client');
      setIsModalOpen(true); // Reusing VisitModal for simplicity, could pass initial data
  };

  const handleEditClient = (client: Client) => {
      setEditingItem(client);
      setEditMode('client');
      setIsModalOpen(true);
  };

  const handleDeleteClient = (id: string) => {
      setClients(prev => prev.filter(c => c.id !== id));
      setTimeout(handleTriggerSync, 100);
  };
  
  const handleBulkDeleteClients = (ids: Set<string>) => {
      setClients(prev => prev.filter(c => !ids.has(c.id)));
      setTimeout(handleTriggerSync, 100);
  };

  const handleBulkValidateClients = async (ids: Set<string>) => {
      if(!isApiReady) { alert(t.msgApiMissing); return; }
      
      const toValidate = ids.size > 0 
        ? clients.filter(c => ids.has(c.id))
        : clients;

      // Optimistic update pattern - or wait for results. Let's wait.
      const updatedClients = [...clients];

      for (const client of toValidate) {
          try {
              const res = await checkAddress(client.address);
              const idx = updatedClients.findIndex(c => c.id === client.id);
              if (idx !== -1) {
                  updatedClients[idx] = { ...updatedClients[idx], isAddressValid: res.isValid };
              }
          } catch(e) {}
      }
      setClients(updatedClients);
      setTimeout(handleTriggerSync, 100);
  };

  const handleAddClientsToRoute = (selectedClients: Client[]) => {
      const newVisits: Visit[] = selectedClients.map(c => ({
          id: uuid(), // Create new ID for the route instance
          name: c.name,
          surname: c.surname,
          address: c.address,
          order: 0, // Will be reindexed
          visitDuration: c.defaultDuration,
          isAddressValid: c.isAddressValid,
          isSkipped: false,
          preferredTime: c.visitStartAt
      }));
      
      const combined = [...visits, ...newVisits];
      const cleared = clearCalculation(combined);
      setVisits(reindexVisits(cleared));
      setIsClientDbOpen(false);
      console.log(`${newVisits.length} ${t.msgAddedToRoute}`);
  };
  
  // Reload Plan Button Handler
  const handleReloadPlan = () => {
      if (planReloadConfirming) {
          // Robustness check: Ensure we have data even if state is delayed/empty
          let sourceClients = clients;
          if (sourceClients.length === 0) {
              const saved = localStorage.getItem('odocalc_db_clients');
              if (saved) try { sourceClients = JSON.parse(saved); } catch (e) {}
          }

          const dailyRoute = loadDailyPlan(sourceClients);
          const cleared = clearCalculation(dailyRoute);
          setVisits(reindexVisits(cleared));
          setCompilationInfo(t.msgPlanReloaded);
          setTimeout(() => setCompilationInfo(null), 3000);
          setPlanReloadConfirming(false);
      } else {
          setPlanReloadConfirming(true);
          setTimeout(() => setPlanReloadConfirming(false), 4000);
      }
  };

  const handleImportClientsExcel = async (file: File) => {
      try {
          const parsed = await parseVisitsExcel(file);
          // Convert parsed visits to Clients
          const newClients: Client[] = await Promise.all(parsed.map(async p => {
             const check = await checkAddress(p.address);
             return {
                 id: uuid(),
                 name: p.name,
                 surname: p.surname,
                 address: p.address,
                 defaultDuration: p.visitDuration,
                 isAddressValid: check.isValid,
                 visitRepetition: { type: 'WEEKLY', daysOfWeek: [] } // Default to none/manual schedule
             };
          }));
          setClients(prev => [...prev, ...newClients]);
          console.log(`${t.msgImportSuccess} (${newClients.length})`);
          setTimeout(handleTriggerSync, 100);
      } catch (e: any) {
          console.error(e);
          alert(e.message);
      }
  };


  const saveSettings = (newSettings: AppSettings) => {
      if (newSettings.startAddress !== settings.startAddress || newSettings.currentOdometer !== settings.currentOdometer || newSettings.departureTime !== settings.departureTime) {
          const cleared = clearCalculation(visits);
          setVisits(cleared);
      }
      if (newSettings.googleApiKey !== settings.googleApiKey) {
          if (newSettings.googleApiKey) {
              setRuntimeApiKey(newSettings.googleApiKey);
              loadGoogleMapsScript(newSettings.googleApiKey)
                .then(() => setIsApiReady(true))
                .catch(e => { console.error(e); setIsApiReady(false); });
          } else { setRuntimeApiKey(""); setIsApiReady(false); }
      }
      if (newSettings.cacheExpirationDays && newSettings.cacheExpirationDays !== settings.cacheExpirationDays) {
          setCacheExpirationDays(newSettings.cacheExpirationDays);
      }
      setSettings(newSettings);
      setTimeout(handleTriggerSync, 100);
  };

  const handleDeleteClick = () => {
    if (deleteConfirming) {
        const remainingVisits = visits.filter(v => !selectedIds.has(v.id));
        const cleared = clearCalculation(remainingVisits);
        setVisits(reindexVisits(cleared));
        setSelectedIds(new Set());
        setDeleteConfirming(false);
        console.log("Bulk delete performed.");
    } else {
        setDeleteConfirming(true);
        setTimeout(() => setDeleteConfirming(false), 4000);
    }
  };

  const handleDeleteRow = (id: string) => {
      const remaining = visits.filter(v => v.id !== id);
      const cleared = clearCalculation(remaining);
      setVisits(reindexVisits(cleared));
      if (selectedIds.has(id)) {
          const newSelected = new Set(selectedIds);
          newSelected.delete(id);
          setSelectedIds(newSelected);
      }
      console.log(`Visit ${id} deleted.`);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseVisitsExcel(file);
      await processAndAddVisits(parsed);
    } catch (err: any) { console.error(`${t.msgImportFail}:`, err.message); } 
    finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleLoadSampleData = async (data: any[]) => {
      try {
          const formatted = data.map(d => ({ name: d.name, surname: d.surname, address: d.address, order: d.order, visitDuration: d.visitDuration }));
          
          // 1. Add to Visits
          const addedVisits = await processAndAddVisits(formatted);

          // 2. Add to Clients DB (Populate)
          const newClients: Client[] = addedVisits.map(v => ({
             id: uuid(),
             name: v.name,
             surname: v.surname,
             address: v.address,
             defaultDuration: v.visitDuration,
             isAddressValid: v.isAddressValid, 
             visitRepetition: { type: 'WEEKLY', daysOfWeek: [] }
          }));

          setClients(prev => {
              // Simple duplicate check by name+surname
              const existingKeys = new Set(prev.map(c => `${c.name}|${c.surname}`));
              const uniqueNew = newClients.filter(c => !existingKeys.has(`${c.name}|${c.surname}`));
              return [...prev, ...uniqueNew];
          });
          
          setTimeout(handleTriggerSync, 100);

      } catch (err: any) { console.error("Sample Load Failed:", err.message); }
  };

  const handleLoadSavedRoute = (route: SavedRoute) => {
    setVisits(route.visits);
    if (route.startTrip) setStartTrip(route.startTrip);
    if (route.returnTrip) setReturnTrip(route.returnTrip);
    console.log(`Route "${route.name}" loaded manually.`);
  };

  const processAndAddVisits = async (newRawVisits: Omit<Visit, 'id'>[]): Promise<Visit[]> => {
      let newVisits = newRawVisits.map(v => ({ ...v, id: uuid(), isSkipped: false }));
      const validatedVisits = await Promise.all(newVisits.map(async (v) => {
          const check = await checkAddress(v.address);
          return { ...v, address: v.address, isAddressValid: check.isValid };
      }));
      const combined = [...visits, ...validatedVisits];
      const sorted = combined.sort((a, b) => a.order - b.order);
      const cleared = clearCalculation(sorted);
      setVisits(reindexVisits(cleared));
      console.log(`${t.msgImportSuccess} (${validatedVisits.length})`);
      return validatedVisits;
  };

  const handleValidate = async () => {
      if (!isApiReady) return;
      
      const targets = selectedIds.size > 0 ? visits.filter(v => selectedIds.has(v.id)) : visits;
      if (targets.length === 0) return;

      setCalcStatus(CalculationStatus.VALIDATING);
      setErrorMsg(null);
      
      const newVisits = [...visits];
      try {
          for (let i = 0; i < targets.length; i++) {
              const v = targets[i];
              setProgress({ current: i + 1, total: targets.length, message: `${t.msgValidating} ${v.surname}...` });
              const res = await checkAddress(v.address);
              // Update item in master list
              const idx = newVisits.findIndex(fv => fv.id === v.id);
              if (idx !== -1) {
                  newVisits[idx] = { ...newVisits[idx], isAddressValid: res.isValid };
              }
              await sleep(20); 
          }
          setVisits(newVisits);
          console.log(`${t.msgValidationComplete} (${targets.length})`);
      } catch (err: any) { console.error(err); setErrorMsg(err.message); } 
      finally { setCalcStatus(CalculationStatus.IDLE); }
  };

  // mode: 'standard' (Commit), 'preview' (No commit, Cyan), 'optimal' (No commit, Green)
  const runCalculation = async (visitsOverride?: Visit[], mode: ResultMode = 'standard') => {
    if (!isApiReady) return;
    const sourceVisits = visitsOverride || visits;
    const activeVisits = sourceVisits.filter(v => !v.isSkipped);
    if (activeVisits.length === 0) return;
    if (!settings.startAddress) return;

    setCalcStatus(CalculationStatus.VALIDATING);
    setErrorMsg(null);
    setStartTrip(null);
    setReturnTrip(null);
    
    setResultMode(mode);
    const commitOdometer = mode === 'standard';

    const processingAllVisits = [...sourceVisits];
    let currentOdo = settings.currentOdometer;
    let currentLoc = settings.startAddress;
    let returnDest = settings.startAddress; 
    let currentClock = settings.departureTime || "08:00:00";

    const initialStartData: StartTrip = { address: settings.startAddress, odometer: settings.currentOdometer };
    const totalSteps = activeVisits.length + (settings.isStrictMode ? activeVisits.length + 1 : 1); 
    let stepCount = 0;
    const updateProgress = (msg: string) => { stepCount++; setProgress({ current: stepCount, total: totalSteps, message: msg }); };

    try {
      if (settings.isStrictMode) {
        if (!settings.isStartValid) {
            updateProgress(`${t.msgValidating} START...`);
            const validStart = await validateAddressStrict(settings.startAddress);
            currentLoc = validStart;
            returnDest = validStart;
        }
        for (let i = 0; i < processingAllVisits.length; i++) {
          if (processingAllVisits[i].isSkipped) continue;
          const v = processingAllVisits[i];
          if (!v.isAddressValid) {
             updateProgress(`${t.msgValidating} ${v.surname}...`);
             await validateAddressStrict(v.address); 
             processingAllVisits[i].isAddressValid = true; 
          }
        }
      }

      setStartTrip(initialStartData);
      setCalcStatus(CalculationStatus.ROUTING);

      for (let i = 0; i < processingAllVisits.length; i++) {
        if (processingAllVisits[i].isSkipped) continue;
        const visit = processingAllVisits[i];
        updateProgress(`${t.msgRouting} ${visit.surname}...`);
        const routeDest = visit.address;
        const { distanceKm, durationSeconds } = await getRouteData(currentLoc, routeDest);
        const roundedDist = commercialRound(distanceKm);
        currentOdo += roundedDist;
        const arrivalTime = addSecondsToTime(currentClock, durationSeconds);
        const visitDurationSeconds = (visit.visitDuration || 0) * 60;
        currentClock = addSecondsToTime(arrivalTime, visitDurationSeconds);
        processingAllVisits[i].segmentDistance = roundedDist;
        processingAllVisits[i].exactDistanceKm = distanceKm; 
        processingAllVisits[i].segmentDuration = durationSeconds;
        processingAllVisits[i].arrivalTime = arrivalTime;
        
        // Use calculated odometer regardless of commit flag to allow preview
        processingAllVisits[i].totalOdometer = currentOdo;
        
        setVisits([...processingAllVisits]); 
        currentLoc = routeDest;
        await sleep(50);
      }

      updateProgress(t.msgCalcReturn);
      const { distanceKm: returnDist, durationSeconds: returnDur } = await getRouteData(currentLoc, returnDest);
      const roundedReturn = commercialRound(returnDist);
      currentOdo += roundedReturn;
      const returnArrivalTime = addSecondsToTime(currentClock, returnDur);

      setReturnTrip({ address: settings.startAddress, segmentDistance: roundedReturn, exactDistanceKm: returnDist, segmentDuration: returnDur, arrivalTime: returnArrivalTime, totalOdometer: currentOdo });
      setCalcStatus(CalculationStatus.COMPLETE);
      
      if (commitOdometer) {
          setSettings(prev => ({ ...prev, currentOdometer: currentOdo }));
      }
      console.log("Route calculation completed successfully.");
    } catch (err: any) { console.error(err); setErrorMsg(err.message || "An unknown error occurred during calculation."); setCalcStatus(CalculationStatus.ERROR); setStartTrip(null); }
  };

  const handleOptimizeRoute = async () => {
      if (!isApiReady) return;

      const activeVisits = visits.filter(v => !v.isSkipped);
      // If less than 2 active visits, no reordering makes sense locally usually, 
      // but strictly speaking a block of 2 needs optimization. 
      // If only 1 visit total, optimize is no-op.
      if (activeVisits.length < 2) return;

      if (!settings.startAddress) return;

      setCalcStatus(CalculationStatus.ROUTING);
      setErrorMsg(null);
      setProgress({ current: 0, total: 100, message: 'Checking cached distances...' });

      try {
          // Prepare matrix for all active points to ensure we have coverage for any permutation
          const allAddresses = [settings.startAddress, ...activeVisits.map(v => v.address)];
          await ensureMatrixData(allAddresses, (msg) => { setProgress(prev => ({ ...prev, message: msg })); });
          
          setProgress({ current: 90, total: 100, message: 'Optimizing route...' });
          await sleep(100);

          // Determine selection: if none selected, treat all as selected (legacy behavior)
          const effectiveSelectedIds = selectedIds.size > 0 ? selectedIds : new Set(activeVisits.map(v => v.id));

          let newActiveVisits = [...activeVisits];
          let i = 0;
          
          while (i < newActiveVisits.length) {
              if (effectiveSelectedIds.has(newActiveVisits[i].id)) {
                  // Found start of a selected block
                  let j = i;
                  while (j < newActiveVisits.length && effectiveSelectedIds.has(newActiveVisits[j].id)) {
                      j++;
                  }
                  // Block is [i ... j-1]
                  const block = newActiveVisits.slice(i, j);
                  
                  if (block.length >= 2) {
                      // Determine context
                      const contextStart = (i === 0) ? settings.startAddress : newActiveVisits[i-1].address;
                      // End context: if at end of list, wrap to start (Round Trip), else next node
                      const contextEnd = (j === newActiveVisits.length) ? settings.startAddress : newActiveVisits[j].address;
                      
                      const optimizedBlock = solveTSP(contextStart, block, contextEnd);
                      
                      // Apply changes
                      for (let k = 0; k < optimizedBlock.length; k++) {
                          newActiveVisits[i + k] = optimizedBlock[k];
                      }
                  }
                  i = j;
              } else {
                  i++;
              }
          }

          const skippedVisits = visits.filter(v => v.isSkipped);
          const finalOrder = [...newActiveVisits, ...skippedVisits];
          
          const reindexed = reindexVisits(clearCalculation(finalOrder));
          setVisits(reindexed);
          
          // Use 'optimal' mode for calculation to show Green results
          await runCalculation(reindexed, 'optimal');
          console.log("Route optimized successfully (Block-based).");
      } catch (err: any) { console.error(err); setErrorMsg(`${t.msgOptFail}: ${err.message}`); setCalcStatus(CalculationStatus.ERROR); }
  };

  const getProgressWidth = () => { if (progress.total === 0) return 0; return Math.min(100, Math.floor((progress.current / progress.total) * 100)); };
  const canVisualize = !!startTrip && visits.some(v => !v.isSkipped && v.segmentDistance !== undefined);
  const shouldDisableActions = settings.isStrictMode && visits.some(v => !v.isSkipped && v.isAddressValid === false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 transition-colors duration-200 font-sans">
      <div className="w-[90%] max-w-none mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="text-google-blue">{t.appTitle}</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
                {t.subTitle}
                {isApiReady ? (
                    <span className="text-green-500 flex items-center" title="API Ready"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg></span>
                ) : (
                    <span className="text-red-500 flex items-center cursor-pointer hover:underline" onClick={() => setIsSettingsOpen(true)} title="API Missing">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        <span className="ml-1">{t.keyMissing}</span>
                    </span>
                )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <input type="file" ref={fileInputRef} accept=".xlsx" className="hidden" onChange={handleExcelUpload} />
             <input type="file" ref={importDbInputRef} accept=".json" className="hidden" onChange={handleImportDB} />
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/50 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
                {/* Auth/Sync Button */}
                {user ? (
                    <div className={`flex items-center gap-1 p-1 rounded-md border ${permissionDenied ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-blue-50 border-blue-100 dark:bg-blue-900/30 dark:border-blue-800'}`}>
                        <button 
                            onClick={handleTriggerSync} 
                            disabled={permissionDenied || isSyncing}
                            className={`p-2 rounded-md transition-colors ${
                                permissionDenied 
                                    ? 'text-red-400 cursor-not-allowed' 
                                    : isSyncing 
                                        ? 'animate-spin text-blue-600' 
                                        : 'text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-800'
                            }`} 
                            title={permissionDenied ? "Sync Disabled: Unauthorized" : "Sync Now"}
                        >
                            {permissionDenied ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            )}
                        </button>
                        <button onClick={handleLogout} className="p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-800 rounded-md transition-colors" title={`Logout ${user.email}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                ) : (
                    <button type="button" onClick={handleLogin} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-all shadow-sm flex items-center gap-1" title="Sign In to Sync">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                        <span className="text-xs font-semibold hidden md:inline">{isFirebaseReady ? 'Sync' : 'Setup Sync'}</span>
                    </button>
                )}
                
                <div className="w-px h-5 bg-gray-300 dark:bg-gray-500 mx-1"></div>

                <button type="button" onClick={handleExportDB} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-all shadow-sm" title={t.exportDb}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </button>
                <button type="button" onClick={() => importDbInputRef.current?.click()} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-all shadow-sm" title={t.importDb}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
                <div className="w-px h-5 bg-gray-300 dark:bg-gray-500 mx-1"></div>
                <button type="button" onClick={handleClearDB} className={`p-2 rounded-md transition-all shadow-sm ${dbDeleteConfirming ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600'}`} title={dbDeleteConfirming ? t.confirmClear : t.clearDb}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
                <div className="w-px h-5 bg-gray-300 dark:bg-gray-500 mx-1"></div>
                <button type="button" onClick={() => setIsSettingsOpen(true)} className={`p-2 rounded-md transition-all shadow-sm ${!isApiReady ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse' : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600'}`} title={t.settingsTitle}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
                <button type="button" onClick={() => setIsHelpOpen(true)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-all shadow-sm" title={t.helpTitle}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
            </div>
          </div>
        </header>

        <div className="space-y-4">
            
            {calcStatus === CalculationStatus.ERROR && errorMsg && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg flex items-center gap-3 animate-fade-in">
                 <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                 <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-2">
                
                {/* Main Action Group (Left) */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Client DB Button - Prominent */}
                    <button type="button" onClick={() => setIsClientDbOpen(true)} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2 shadow-md transform active:scale-95">
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                       <span>{t.clientDb}</span>
                    </button>

                    <button type="button" onClick={handleReloadPlan} className={`px-3 py-2 border rounded-lg font-medium text-sm transition-colors flex items-center gap-2 shadow-sm ${planReloadConfirming ? 'bg-teal-600 text-white border-teal-700 hover:bg-teal-700' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-teal-600 dark:text-teal-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                       <span className="hidden md:inline">{planReloadConfirming ? t.confirm : t.importPlan}</span>
                    </button>
                    
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm transition-colors flex items-center gap-2 shadow-sm">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="hidden md:inline">{t.importExcel}</span>
                    </button>

                    <button type="button" onClick={() => setIsSavedRoutesOpen(true)} className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm transition-colors flex items-center gap-2 shadow-sm" title={t.savedRoutes}>
                        <svg className="w-5 h-5 text-google-blue dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                        <span className="hidden md:inline">{t.savedRoutes}</span>
                    </button>

                    <button type="button" onClick={handleAddVisit} className="px-3 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      <span>{t.newVisit}</span>
                    </button>

                    {selectedIds.size > 0 && (
                        <button type="button" onClick={handleDeleteClick} className={`px-3 py-2 border rounded-lg font-medium text-sm transition-colors shadow-sm ${deleteConfirming ? 'bg-red-600 text-white border-red-700 hover:bg-red-700' : 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`}>
                            {deleteConfirming ? t.confirm : `${t.delete} (${selectedIds.size})`}
                        </button>
                    )}
                </div>
                
                {/* Right Group: Optimization Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button type="button" onClick={handleValidate} disabled={calcStatus === CalculationStatus.ROUTING || calcStatus === CalculationStatus.VALIDATING} className={`px-3 py-2 text-white rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2 ${calcStatus === CalculationStatus.ROUTING || calcStatus === CalculationStatus.VALIDATING ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-700'}`}>
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="hidden md:inline">{selectedIds.size > 0 ? `${t.validate} (${selectedIds.size})` : `${t.validate}`}</span>
                    </button>
                    <button type="button" onClick={() => setIsMapOpen(!isMapOpen)} disabled={!canVisualize} className={`px-3 py-2 text-white rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2 ${!canVisualize ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                        <span className="hidden md:inline">{isMapOpen ? t.hideMap : t.visualize}</span>
                    </button>
                    <button type="button" onClick={handleOptimizeRoute} disabled={calcStatus === CalculationStatus.ROUTING || calcStatus === CalculationStatus.VALIDATING || shouldDisableActions} className={`px-3 py-2 text-white rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2 ${calcStatus === CalculationStatus.ROUTING || calcStatus === CalculationStatus.VALIDATING || shouldDisableActions ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span className="hidden md:inline">{selectedIds.size > 0 ? `${t.optimal} (${selectedIds.size})` : t.optimal}</span>
                    </button>
                    <button type="button" onClick={() => runCalculation(undefined, 'preview')} disabled={calcStatus === CalculationStatus.ROUTING || calcStatus === CalculationStatus.VALIDATING || shouldDisableActions} className={`px-3 py-2 text-white rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2 ${calcStatus === CalculationStatus.ROUTING || calcStatus === CalculationStatus.VALIDATING || shouldDisableActions ? 'bg-gray-400 cursor-not-allowed' : 'bg-google-blue hover:bg-blue-700'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="hidden md:inline">{t.precalc}</span>
                    </button>
                    <button type="button" onClick={() => runCalculation(undefined, 'standard')} disabled={calcStatus === CalculationStatus.ROUTING || calcStatus === CalculationStatus.VALIDATING || shouldDisableActions} className={`px-4 py-2 text-gray-900 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2 ${calcStatus === CalculationStatus.ROUTING || calcStatus === CalculationStatus.VALIDATING || shouldDisableActions ? 'bg-gray-400 cursor-not-allowed' : 'bg-google-yellow hover:bg-yellow-500'}`}>
                      {calcStatus === CalculationStatus.ROUTING ? (
                         <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      )}
                      <span>{t.calculate}</span>
                    </button>
                </div>
            </div>

            <VisitList 
              visits={visits} startTrip={startTrip} returnTrip={returnTrip} selectedIds={selectedIds} onEdit={handleEditVisit} onReorder={handleReorder} onToggleSkip={handleToggleSkip} onDelete={handleDeleteRow}
              onToggleSelect={(id) => { const newSet = new Set(selectedIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet); }}
              onToggleAll={(checked) => { if (checked) setSelectedIds(new Set(visits.map(v => v.id))); else setSelectedIds(new Set()); }}
              lang={settings.language} departureTime={settings.departureTime}
              resultMode={resultMode}
            />

            {compilationInfo && (
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 p-4 rounded-lg flex items-center gap-3 animate-fade-in-down">
                 <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                 <div>
                    <span className="font-bold">{t.msgDailyInfo}</span>
                    <span className="ml-2 text-sm opacity-80">{compilationInfo}</span>
                 </div>
              </div>
            )}

            {(calcStatus === CalculationStatus.VALIDATING || calcStatus === CalculationStatus.ROUTING) && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-blue-100 dark:border-gray-700 animate-fade-in-down mb-4">
                <div className="flex justify-between mb-2">
                   <span className="text-sm font-semibold text-google-blue">{progress.message}</span>
                   <span className="text-xs text-gray-500 dark:text-gray-400">{Math.round(getProgressWidth())}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-google-blue h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${getProgressWidth()}%` }}></div>
                </div>
              </div>
            )}
            <MapSection isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} startTrip={startTrip} visits={visits} lang={settings.language} />
        </div>
      </div>

      <VisitModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={saveItem} initialData={editingItem} lang={settings.language} mode={editMode} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={saveSettings} />
      <SavedRoutesModal 
        isOpen={isSavedRoutesOpen} 
        onClose={() => setIsSavedRoutesOpen(false)} 
        currentVisits={visits} 
        currentStart={startTrip} 
        currentReturn={returnTrip} 
        onLoadRoute={handleLoadSavedRoute} 
        lang={settings.language} 
        onRoutesChanged={handleTriggerSync}
      />
      <ClientDbModal 
          isOpen={isClientDbOpen} 
          onClose={() => setIsClientDbOpen(false)} 
          clients={clients} 
          onAddClient={handleAddClient} 
          onEditClient={handleEditClient} 
          onDeleteClient={handleDeleteClient}
          onDeleteClients={handleBulkDeleteClients}
          onValidateClients={handleBulkValidateClients}
          onAddToRoute={handleAddClientsToRoute} 
          onImportExcel={handleImportClientsExcel} 
          lang={settings.language} 
      />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} lang={settings.language} onLoadSampleData={handleLoadSampleData} />
    </div>
  );
};

export default App;
