
import { DistanceCache } from './distanceCache';

// Access global google object
declare const google: any;

// Mutable state for the API Key (set at runtime via Settings)
let runtimeApiKey: string | null = null;

export const setRuntimeApiKey = (key: string) => {
    runtimeApiKey = key;
};

// Helper for console logging
const logApiCall = (method: string, duration: number, details?: string) => {
    console.debug(`%c[VisOpt API] ${method} took ${duration.toFixed(2)}ms ${details ? `(${details})` : ''}`, 'color: #1a73e8; font-weight: bold;');
};

/**
 * Dynamically injects the Google Maps script into the DOM.
 * Prevents duplicate injection.
 */
export const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!apiKey) {
            reject(new Error("API Key is missing"));
            return;
        }

        // Check if already loaded
        if ((window as any).google && (window as any).google.maps) {
            resolve();
            return;
        }

        // Check if script tag already exists (e.g. loading)
        const existingScript = document.getElementById('google-maps-script');
        if (existingScript) {
            resolve(); 
            return;
        }

        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            resolve();
        };
        
        script.onerror = () => {
            reject(new Error("Failed to load Google Maps script. Check your API Key."));
        };

        document.head.appendChild(script);
    });
};

// Standard Route Data - checks LMOD Cache first
export const getRouteData = async (origin: string, dest: string): Promise<{ distanceKm: number, durationSeconds: number }> => {
  
  // 1. Check LMOD Cache
  const cached = DistanceCache.get(origin, dest);
  if (cached) {
      // console.debug(`[LMOD] Cache hit: ${origin} -> ${dest}`); // Optional: Log cache hits?
      return Promise.resolve(cached);
  }

  // 2. Fetch from API if missing
  return new Promise((resolve, reject) => {
    if (!(window as any).google || !(window as any).google.maps) {
      reject("Google Maps SDK not loaded. Please enter API Key in Settings.");
      return;
    }

    const start = performance.now();
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [origin],
        destinations: [dest],
        travelMode: 'DRIVING',
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response: any, status: string) => {
        const end = performance.now();
        logApiCall('DistanceMatrix (Single)', end - start);

        if (status !== 'OK') return reject(`Matrix API Error: ${status}`);

        const element = response.rows[0].elements[0];
        if (element.status !== 'OK') {
          if (element.status === 'ZERO_RESULTS') return reject(`No driving route found to: ${dest}`);
          return reject(`Route error for ${dest}: ${element.status}`);
        }

        const result = {
            distanceKm: element.distance.value / 1000.0,
            durationSeconds: element.duration.value
        };

        // 3. Save to LMOD Cache
        DistanceCache.set(origin, dest, result);

        resolve(result);
      }
    );
  });
};

// Batch Fetch for Matrix Optimization
// This ensures we have data for all pairs before running TSP
export const ensureMatrixData = async (addresses: string[], onProgress?: (msg: string) => void): Promise<void> => {
    if (!(window as any).google || !(window as any).google.maps) {
        throw new Error("Google Maps SDK not loaded. Check API Key.");
    }

    // 1. Identify missing pairs
    // We need a full N x N matrix ideally, or at least Start->All, All->Start, and Inter-Visit pairs
    // For simplicity and robustness of 2-Opt, we fetch the full square matrix of unique addresses.
    const uniqueAddresses = Array.from(new Set(addresses.map(a => a.trim())));
    
    // Google Matrix API works best when we send a set of Origins and Destinations.
    // Limits: 25 origins max, 25 dests max, 100 elements total per call.
    // e.g. 10 origins x 10 dests = 100 elements.
    
    // We will naively iterate pairs to see if we have high cache coverage, 
    // but the most efficient way to fill the cache for TSP is to batch calls.

    // Let's break uniqueAddresses into chunks of 10 (since 10x10=100 elements max)
    const chunkSize = 10;
    const service = new google.maps.DistanceMatrixService();

    for (let i = 0; i < uniqueAddresses.length; i += chunkSize) {
        for (let j = 0; j < uniqueAddresses.length; j += chunkSize) {
            
            const originsChunk = uniqueAddresses.slice(i, i + chunkSize);
            const destsChunk = uniqueAddresses.slice(j, j + chunkSize);

            // Check if we need to fetch this chunk
            // If we have ALL data in this sub-grid, skip it.
            let needsFetch = false;
            for (const o of originsChunk) {
                for (const d of destsChunk) {
                    if (o === d) continue;
                    if (!DistanceCache.has(o, d)) {
                        needsFetch = true;
                        break;
                    }
                }
                if (needsFetch) break;
            }

            if (!needsFetch) {
                continue;
            }

            if (onProgress) onProgress(`Fetching distance data... (${i + 1}-${Math.min(i+chunkSize, uniqueAddresses.length)} vs ${j + 1}-${Math.min(j+chunkSize, uniqueAddresses.length)})`);

            // Fetch Chunk
            const start = performance.now();
            await new Promise<void>((resolve) => {
                service.getDistanceMatrix(
                    {
                        origins: originsChunk,
                        destinations: destsChunk,
                        travelMode: 'DRIVING',
                        unitSystem: google.maps.UnitSystem.METRIC,
                    },
                    (response: any, status: string) => {
                        const end = performance.now();
                        logApiCall('DistanceMatrix (Batch)', end - start, `${originsChunk.length}x${destsChunk.length}`);

                        if (status !== 'OK') {
                            console.error(`Matrix API Error: ${status}`);
                            // We don't reject here to allow partial success, but TSP might be suboptimal
                            resolve(); 
                            return;
                        }

                        // Process response
                        response.rows.forEach((row: any, rIdx: number) => {
                            const origin = originsChunk[rIdx];
                            row.elements.forEach((element: any, cIdx: number) => {
                                const dest = destsChunk[cIdx];
                                if (element.status === 'OK') {
                                    DistanceCache.set(origin, dest, {
                                        distanceKm: element.distance.value / 1000.0,
                                        durationSeconds: element.duration.value
                                    });
                                }
                            });
                        });
                        resolve();
                    }
                );
            });

            // Brief delay to be nice to the API rate limiter
            await new Promise(r => setTimeout(r, 500));
        }
    }
};


export const validateAddressStrict = async (addressStr: string): Promise<string> => {
  if (!runtimeApiKey) {
      throw new Error("API Key not loaded. Enter Key in Settings.");
  }
  
  const url = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${runtimeApiKey}`;
  const payload = {
    address: { regionCode: "CZ", addressLines: [addressStr] },
    enableUspsCass: false,
  };

  try {
    const start = performance.now();
    const resp = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    const end = performance.now();
    logApiCall('AddressValidation (REST)', end - start);

    if (data.error) throw new Error("Validation API: " + data.error.message);

    const verdict = data.result?.verdict || {};
    const addrObj = data.result?.address || {};

    // Specific logic requested by user in original code
    if (verdict.hasUnconfirmedComponents) throw new Error(`Unconfirmed address components: ${addressStr}`);
    if (verdict.validationGranularity === 'OTHER') throw new Error(`Address too vague (City level): ${addressStr}`);

    return addrObj.formattedAddress || addressStr;
  } catch (err) {
    throw err;
  }
};

// UI Helper for instant validation
export interface ValidationResult {
    isValid: boolean;
    formattedAddress?: string;
    error?: string;
}

export const checkAddress = async (addressStr: string): Promise<ValidationResult> => {
    if (!addressStr || addressStr.trim().length < 3) {
        return { isValid: false, error: 'Address too short' };
    }
    // Early exit if key not loaded
    if (!runtimeApiKey && !(window as any).google) {
        return { isValid: false, error: 'Locked: API Key required' };
    }

    try {
        const formatted = await validateAddressStrict(addressStr);
        return { isValid: true, formattedAddress: formatted };
    } catch (e: any) {
        return { isValid: false, error: e.message || 'Invalid address' };
    }
}
    