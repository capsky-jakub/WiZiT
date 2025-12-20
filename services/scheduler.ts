
import { Client, Visit } from '../types';

/**
 * Checks if a client is scheduled for a specific date based on their repetition strategy.
 */
export const isClientScheduledForDate = (client: Client, targetDate: Date): boolean => {
    // If no repetition is set, we assume they are NOT scheduled automatically
    if (!client.visitRepetition) return false;

    const rep = client.visitRepetition;
    const yyyyMmDd = targetDate.toISOString().slice(0, 10);

    switch (rep.type) {
        case 'WEEKLY':
            if (!rep.daysOfWeek || rep.daysOfWeek.length === 0) return false;
            // getDay(): 0 = Sunday, 1 = Monday...
            return rep.daysOfWeek.includes(targetDate.getDay());

        case 'DATE':
            if (!rep.specificDate) return false;
            return rep.specificDate === yyyyMmDd;

        case 'INTERVAL':
            if (!rep.intervalStart || !rep.intervalDays || rep.intervalDays <= 0) return false;
            
            // Normalize dates to midnight to avoid time issues
            const start = new Date(rep.intervalStart);
            start.setHours(0, 0, 0, 0);
            
            const current = new Date(targetDate);
            current.setHours(0, 0, 0, 0);

            const diffTime = current.getTime() - start.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Must be in the future (or today) relative to start
            if (diffDays < 0) return false;

            return diffDays % rep.intervalDays === 0;

        default:
            return false;
    }
};

/**
 * Sorts visits based on their preferred time.
 * Visits with no time set are placed at the end.
 */
export const sortVisitsByTime = (visits: Visit[]): Visit[] => {
    return [...visits].sort((a, b) => {
        if (!a.preferredTime && !b.preferredTime) return 0;
        if (!a.preferredTime) return 1; // a goes last
        if (!b.preferredTime) return -1; // b goes last
        
        return a.preferredTime.localeCompare(b.preferredTime);
    });
};
