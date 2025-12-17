
import { Visit } from '../types';
import { DistanceCache } from './distanceCache';

// Helper to get distance from cache (assumes cache is primed)
const getDist = (a: string, b: string): number => {
    // If same address, distance is 0
    if (a.trim() === b.trim()) return 0;
    
    const cached = DistanceCache.get(a, b);
    // If not in cache, fallback to a high number to discourage taking this path
    // (In practice, we will ensure cache is primed before running this)
    return cached ? cached.distanceKm : 99999;
};

// Calculate total path distance for a given sequence of visits
const calculateTotalDistance = (startAddr: string, sequence: Visit[]): number => {
    if (sequence.length === 0) return 0;

    let total = getDist(startAddr, sequence[0].address);
    for (let i = 0; i < sequence.length - 1; i++) {
        total += getDist(sequence[i].address, sequence[i+1].address);
    }
    // Return to start
    total += getDist(sequence[sequence.length - 1].address, startAddr);
    return total;
};

export const solveTSP = (startAddress: string, visits: Visit[]): Visit[] => {
    if (visits.length <= 1) return visits;

    // 1. NEAREST NEIGHBOR (Initial Solution)
    // Start at base
    let currentAddr = startAddress;
    let unvisited = [...visits];
    let path: Visit[] = [];

    while (unvisited.length > 0) {
        let nearestIdx = -1;
        let minDist = Infinity;

        for (let i = 0; i < unvisited.length; i++) {
            const d = getDist(currentAddr, unvisited[i].address);
            if (d < minDist) {
                minDist = d;
                nearestIdx = i;
            }
        }

        // Move to nearest
        const nextVisit = unvisited[nearestIdx];
        path.push(nextVisit);
        currentAddr = nextVisit.address;
        unvisited.splice(nearestIdx, 1);
    }

    // 2. 2-OPT OPTIMIZATION (Refinement)
    // Try to swap edges to remove crossings
    // Limit iterations to prevent UI freeze on large lists (though N is usually small)
    let improved = true;
    let iterations = 0;
    const maxIterations = 100; // Sufficient for < 50 items

    while (improved && iterations < maxIterations) {
        improved = false;
        iterations++;

        // The path array represents the sequence of visits.
        // We simulate the full loop: Start -> Path[0]...Path[N] -> Start
        
        for (let i = 0; i < path.length - 1; i++) {
            for (let k = i + 1; k < path.length; k++) {
                // Current logic checks swapping segment i..k
                // We compare current cost vs new cost if we reverse the sub-segment
                
                const currentSeq = [...path];
                
                // Create a new sequence with the sub-segment reversed
                // 2-opt swap: reverse sequence between i and k
                const newSeq = [
                    ...path.slice(0, i),
                    ...path.slice(i, k + 1).reverse(),
                    ...path.slice(k + 1)
                ];

                const currentCost = calculateTotalDistance(startAddress, currentSeq);
                const newCost = calculateTotalDistance(startAddress, newSeq);

                if (newCost < currentCost) {
                    path = newSeq;
                    improved = true;
                    // Restart search after improvement (standard 2-opt)
                    // Or continue (faster variation). Here we break to restart loop to ensure stability.
                    break; 
                }
            }
            if (improved) break;
        }
    }

    return path;
};
