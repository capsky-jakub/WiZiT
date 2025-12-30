
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { BackupData, Client, AppSettings, SavedRoute } from "../types";

const firebaseConfig = {
  apiKey: "***REMOVED***",
  authDomain: "proj-visopt.firebaseapp.com",
  projectId: "proj-visopt",
  storageBucket: "proj-visopt.firebasestorage.app",
  messagingSenderId: "1048476373474",
  appId: "1:1048476373474:web:f629e9f83179f98970e9bb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const COLLECTION = "localstorage";

export const FirebaseService = {
  
  signIn: async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Firebase Sign In Error", error);
      throw error;
    }
  },

  signOut: async () => {
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
    if (!user || !user.email) return;

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
    }
  },

  /**
   * Syncs Cloud data to Local (Download)
   * Returns true if data was updated, false otherwise.
   */
  syncDown: async (user: User): Promise<{ updated: boolean, data?: BackupData }> => {
    if (!user || !user.email) return { updated: false };

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
    }
    return { updated: false };
  }
};
