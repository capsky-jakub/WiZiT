
import { initializeApp, FirebaseApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User, Auth, onAuthStateChanged } from "firebase/auth";
// Switched to firestore/lite for REST-only communication (No WebSockets/WebChannel)
import { getFirestore, doc, setDoc, getDoc, Firestore } from "firebase/firestore/lite";
import { BackupData } from "../types";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

const COLLECTION = "localstorage";

export const FirebaseService = {
  
  /**
   * Initialize Firebase with a dynamic configuration string.
   * Returns true if successful.
   */
  initialize: (configStr: string): boolean => {
      try {
          if (!configStr || configStr.trim() === '') return false;
          
          const config = JSON.parse(configStr);
          
          // Prevent re-initialization if already active to avoid duplicate app errors
          if (getApps().length > 0) {
              app = getApps()[0];
          } else {
              app = initializeApp(config);
          }
          
          auth = getAuth(app);
          // Initialize Firestore Lite
          db = getFirestore(app);
          console.log("[Cloud] Firebase initialized successfully (Lite Mode)");
          return true;
      } catch (e) {
          console.error("[Cloud] Firebase Init Failed. Check your JSON config.", e);
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
          console.warn("[Cloud] Subscribe attempted before initialization");
          return () => {};
      }
      return onAuthStateChanged(auth, callback);
  },

  signIn: async () => {
    if (!auth) throw new Error("Firebase not configured. Please enter your configuration JSON in Settings.");
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
   * Syncs local data to Firestore (Upload)
   */
  syncUp: async (user: User) => {
    if (!user || !user.email || !db) return;

    try {
      const clients = JSON.parse(localStorage.getItem('odocalc_db_clients') || '[]');
      const settings = JSON.parse(localStorage.getItem('odocalc_settings') || '{}');
      const savedRoutes = JSON.parse(localStorage.getItem('odocalc_saved_routes') || '[]');
      const lmod = JSON.parse(localStorage.getItem('odocalc_lmod') || '{}');
      
      const payload: BackupData = {
        clients,
        settings,
        savedRoutes,
        lmod,
        timestamp: Date.now()
      };

      await setDoc(doc(db, COLLECTION, user.email), payload);
      
      // Update local tracking timestamp
      localStorage.setItem('odocalc_last_modified', payload.timestamp.toString());
      
      console.log(`[Cloud] Synced UP successfully for ${user.email}`);
    } catch (e) {
      console.error("[Cloud] Sync UP failed", e);
      throw e;
    }
  },

  /**
   * Syncs Cloud data to Local (Download)
   * Returns true if data was updated, false otherwise.
   */
  syncDown: async (user: User): Promise<{ updated: boolean, data?: BackupData }> => {
    if (!user || !user.email || !db) return { updated: false };

    try {
      const docRef = doc(db, COLLECTION, user.email);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const cloudData = docSnap.data() as BackupData;
        const localTs = parseInt(localStorage.getItem('odocalc_last_modified') || '0');

        console.log(`[Cloud] Timestamp Check - Local: ${localTs}, Cloud: ${cloudData.timestamp}`);

        // If Cloud is newer than Local, overwrite Local
        if (cloudData.timestamp > localTs) {
          localStorage.setItem('odocalc_db_clients', JSON.stringify(cloudData.clients || []));
          localStorage.setItem('odocalc_settings', JSON.stringify(cloudData.settings || {}));
          localStorage.setItem('odocalc_saved_routes', JSON.stringify(cloudData.savedRoutes || []));
          localStorage.setItem('odocalc_lmod', JSON.stringify(cloudData.lmod || {}));
          localStorage.setItem('odocalc_last_modified', cloudData.timestamp.toString());
          
          console.log(`[Cloud] Synced DOWN successfully. Local updated.`);
          return { updated: true, data: cloudData };
        }
      }
    } catch (e) {
      console.error("[Cloud] Sync DOWN failed", e);
      throw e;
    }
    return { updated: false };
  }
};
