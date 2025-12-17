

interface RouteMetrics {
  distanceKm: number;
  durationSeconds: number;
  expiresAt?: number; // Timestamp in ms
}

const CACHE_KEY = 'odocalc_lmod';
let expirationMs = 30 * 24 * 60 * 60 * 1000; // Default 30 days

export const setCacheExpirationDays = (days: number) => {
    expirationMs = days * 24 * 60 * 60 * 1000;
};

// Helper to generate a unique key for a route segment
// Order matters: A->B is different from B->A
const getKey = (origin: string, dest: string) => `${origin.trim()}::${dest.trim()}`;

export const DistanceCache = {
  get: (origin: string, dest: string): RouteMetrics | null => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      
      const cache = JSON.parse(raw);
      const key = getKey(origin, dest);
      const entry = cache[key];

      if (!entry) return null;
      
      // Check Expiration
      // If expiresAt is present and current time is past it, return null to force refresh
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
          return null;
      }
      
      return entry;
    } catch (e) {
      console.error("LMOD Read Error", e);
      return null;
    }
  },

  set: (origin: string, dest: string, data: RouteMetrics) => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      const cache = raw ? JSON.parse(raw) : {};
      
      const key = getKey(origin, dest);
      
      // Save with expiration date
      cache[key] = {
          ...data,
          expiresAt: Date.now() + expirationMs
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error("LMOD Write Error", e);
    }
  },

  setBatch: (entries: {origin: string, dest: string, data: RouteMetrics}[]) => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      const cache = raw ? JSON.parse(raw) : {};
      
      const currentExpiration = Date.now() + expirationMs;

      entries.forEach(entry => {
        const key = getKey(entry.origin, entry.dest);
        cache[key] = {
            ...entry.data,
            expiresAt: currentExpiration
        };
      });
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error("LMOD Batch Write Error", e);
    }
  },

  has: (origin: string, dest: string): boolean => {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    
    try {
        const cache = JSON.parse(raw);
        const entry = cache[getKey(origin, dest)];

        if (!entry) return false;

        // Check Expiration for "has" check as well
        // This ensures batch pre-fetching logic (ensureMatrixData) knows it needs to re-fetch this pair
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            return false;
        }

        return true;
    } catch (e) {
        return false;
    }
  },

  clear: () => {
    localStorage.removeItem(CACHE_KEY);
  }
};