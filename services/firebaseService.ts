





import { initializeApp, FirebaseApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User, Auth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, Firestore } from "firebase/firestore/lite";
import { BackupData, SessionData, SyncCategory } from "../types";

// --- CONFIGURATION ---
const firebaseConfigBase = {
  authDomain: "proj-visopt.firebaseapp.com",
  projectId: "proj-visopt",
  storageBucket: "proj-visopt.firebasestorage.app",
  messagingSenderId: "1048476373474",
  appId: "1:1048476373474:web:f629e9f83179f98970e9bb"
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

const COLLECTION = "localstorage";

export const FirebaseService = {
  
  initialize: (apiKey: string) => {
      if (!apiKey || apiKey.length < 10) return false;
      try {
          if (getApps().length > 0) {
              const currentApp = getApps()[0];
              if (currentApp.options.apiKey === apiKey) {
                  return true;
              }
              console.warn("[Cloud] Firebase key changed. Reloading page.");
              window.location.reload();
              return false;
          }
          
          app = initializeApp({ ...firebaseConfigBase, apiKey });
          auth = getAuth(app);
          db = getFirestore(app, "dbvisopt");
          console.log("[Cloud] Firebase initialized dynamically");
          return true;
      } catch (e) {
          console.error("[Cloud] Firebase Initialization Failed.", e);
          return false;
      }
  },

  isConfigured: () => {
      return !!auth && !!db;
  },

  /**
   * Subscribe to auth state changes safely.
   */
  subscribeAuth: (callback: (user: User | null) => void) => {
      if (!auth) {
          console.warn("[Cloud] Subscribe attempted before initialization or invalid config");
          return () => {};
      }
      return onAuthStateChanged(auth, callback);
  },

  signIn: async () => {
    if (!auth) throw new Error("Firebase not initialized. Check console for errors.");
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Firebase Sign In Error", error);
      throw new Error(error.message || "Sign in failed");
    }
  },

  signOut: async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Firebase Sign Out Error", error);
    }
  },

  /**
   * Syncs local data to Firestore (Upload).
   * Supports Partial Updates via `categories`.
   */
  syncUp: async (user: User, categories?: SyncCategory[]) => {
    if (!user || !user.email || !db) return;

    try {
      const payload: Partial<BackupData> = {
          timestamp: Date.now()
      };

      // Helper to check if a category should be included
      const shouldInclude = (cat: SyncCategory) => !categories || categories.includes(cat);

      if (shouldInclude('clients')) {
          payload.clients = JSON.parse(localStorage.getItem('odocalc_db_clients') || '[]');
      }

      if (shouldInclude('settings')) {
          payload.settings = JSON.parse(localStorage.getItem('odocalc_settings') || '{}');
      }

      if (shouldInclude('savedRoutes')) {
          payload.savedRoutes = JSON.parse(localStorage.getItem('odocalc_saved_routes') || '[]');
      }

      if (shouldInclude('lmod')) {
          payload.lmod = JSON.parse(localStorage.getItem('odocalc_lmod') || '{}');
      }

      if (shouldInclude('visits')) {
          // Load raw visits data - this is now a SessionData object in localStorage
          const visitsRaw = localStorage.getItem('odocalc_visits');
          let sessionData: SessionData | any[] = [];
          
          if (visitsRaw) {
              try {
                  sessionData = JSON.parse(visitsRaw);
              } catch(e) {
                  sessionData = [];
              }
          }
          
          // Fallback for legacy localstorage structure migration
          if (Array.isArray(sessionData)) {
              const start = JSON.parse(localStorage.getItem('odocalc_start') || 'null');
              const ret = JSON.parse(localStorage.getItem('odocalc_return') || 'null');
              sessionData = {
                  stops: sessionData,
                  start: start,
                  return: ret
              };
          }
          payload.visits = sessionData;
      }

      // Merge: true allows partial updates (only fields present in payload are updated)
      await setDoc(doc(db, COLLECTION, user.email), payload, { merge: true });
      
      // Update local tracking timestamp
      localStorage.setItem('odocalc_last_modified', payload.timestamp!.toString());
      
      const mode = categories ? `PARTIAL [${categories.join(', ')}]` : "FULL";
      console.log(`[Cloud] Synced UP (${mode}) successfully for ${user.email}`);
    } catch (e: any) {
      console.error("[Cloud] Sync UP failed", e);
      const msg = e.message || '';
      if (
          e.code === 'permission-denied' || 
          msg.includes('permission-denied') || 
          msg.includes('Missing or insufficient permissions') ||
          msg.includes('insufficient permissions')
      ) {
          throw new Error("PERMISSION_DENIED");
      }
      throw e;
    }
  },

  /**
   * Syncs Cloud data to Local (Download)
   * Returns true if data was updated, false otherwise.
   * Scenario 1: ALWAYS downloads full dataset when newer.
   */
  syncDown: async (user: User): Promise<{ updated: boolean, data?: BackupData, synced?: boolean }> => {
    if (!user || !user.email || !db) return { updated: false };

    try {
      const docRef = doc(db, COLLECTION, user.email);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const cloudData = docSnap.data() as BackupData;
        const localTs = parseInt(localStorage.getItem('odocalc_last_modified') || '0');

        console.log(`[Cloud] Timestamp Check - Local: ${localTs}, Cloud: ${cloudData.timestamp}`);

        if (cloudData.timestamp > localTs) {
          if (cloudData.clients) localStorage.setItem('odocalc_db_clients', JSON.stringify(cloudData.clients));
          if (cloudData.settings) localStorage.setItem('odocalc_settings', JSON.stringify(cloudData.settings));
          if (cloudData.savedRoutes) localStorage.setItem('odocalc_saved_routes', JSON.stringify(cloudData.savedRoutes));
          if (cloudData.lmod) localStorage.setItem('odocalc_lmod', JSON.stringify(cloudData.lmod));
          
          // Restore Session Data (Handle New Object vs Old Array)
          if (cloudData.visits) {
              // If it's the new format (Object with stops/start/return)
              if (!Array.isArray(cloudData.visits) && 'stops' in cloudData.visits) {
                  localStorage.setItem('odocalc_visits', JSON.stringify(cloudData.visits));
                  // Clean up legacy keys
                  localStorage.removeItem('odocalc_start');
                  localStorage.removeItem('odocalc_return');
              } 
              // Legacy Array format from Cloud
              else if (Array.isArray(cloudData.visits)) {
                  // Construct new format locally to enforce migration
                  const sessionData: SessionData = {
                      stops: cloudData.visits as any[],
                      start: cloudData.start || null,
                      return: cloudData.return || null
                  };
                  localStorage.setItem('odocalc_visits', JSON.stringify(sessionData));
                  localStorage.removeItem('odocalc_start');
                  localStorage.removeItem('odocalc_return');
              }
          }

          localStorage.setItem('odocalc_last_modified', cloudData.timestamp.toString());
          
          console.log(`[Cloud] Synced DOWN successfully. Local updated.`);
          return { updated: true, data: cloudData };
        } else if (cloudData.timestamp === localTs) {
            console.log(`[Cloud] Timestamps equal. No sync needed.`);
            return { updated: false, synced: true };
        }
      }
    } catch (e: any) {
      console.error("[Cloud] Sync DOWN failed", e);
      const msg = e.message || '';
      if (
          e.code === 'permission-denied' || 
          msg.includes('permission-denied') || 
          msg.includes('Missing or insufficient permissions') ||
          msg.includes('insufficient permissions')
      ) {
          throw new Error("PERMISSION_DENIED");
      }
      throw e;
    }
    return { updated: false };
  }
};