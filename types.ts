
export interface Visit {
  id: string; // Unique ID for React keys and selection tracking
  name: string;
  surname: string;
  address: string;
  order: number;
  visitDuration: number; // Duration of the visit in minutes (service time)
  isSkipped?: boolean; // New field to exclude from calculation
  isAddressValid?: boolean; // New field for instant validation status
  // Calculated fields (optional)
  segmentDistance?: number;
  exactDistanceKm?: number; // Unrounded distance
  segmentDuration?: number; // seconds
  arrivalTime?: string; // Calculated time of arrival (HH:mm:ss)
  totalOdometer?: number;
}

// Persistent Storage for Routes
export interface SavedRoute {
  id: string;
  name: string;
  createdAt: string; // ISO Date string
  visits: Visit[];
  startAddress?: string; // Optional: save start address with route
  startTrip?: StartTrip | null;
  returnTrip?: ReturnTrip | null;
}

// Start trip data (Start of the journey)
export interface StartTrip {
  address: string;
  odometer: number;
}

// Return trip data (End of the journey)
export interface ReturnTrip {
  address: string;
  segmentDistance: number;
  exactDistanceKm?: number; // Unrounded distance
  segmentDuration: number;
  arrivalTime?: string; // Calculated time of arrival back at base
  totalOdometer?: number;
}

export interface AppSettings {
  startAddress: string;
  currentOdometer: number;
  departureTime: string; // HH:mm:ss
  isStrictMode: boolean;
  isStartValid?: boolean; // Track if start address is validated
  isDarkMode: boolean; // Dark mode toggle
  googleApiKey?: string; // User provided API Key (Unencrypted)
  cacheExpirationDays?: number; // Cache expiration in days
  language: 'cs' | 'en'; // Display language
}

export enum CalculationStatus {
  IDLE = 'IDLE',
  VALIDATING = 'VALIDATING',
  ROUTING = 'ROUTING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
