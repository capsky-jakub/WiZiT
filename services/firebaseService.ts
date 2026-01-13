
import { initializeApp, FirebaseApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User, Auth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, Firestore } from "firebase/firestore/lite";
import { BackupData } from "../types";

// --- HARDCODED CONFIGURATION ---
const firebaseConfig = {
  apiKey: "***REMOVED***",
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

// Initialize immediately
try {
    if (getApps().length > 0) {
        app = getApps()[0];
    } else {
        app = initializeApp(firebaseConfig);
    }
    
    auth = getAuth(app);
    db = getFirestore(app, "dbvisopt");
    console.log("[Cloud] Firebase initialized");
} catch (e) {
    console.error("[Cloud] Firebase Initialization Failed. Check services/firebaseService.ts config.", e);
}

export const FirebaseService = {
  
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
