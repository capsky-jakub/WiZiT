import React, { useState } from 'react';
import { Visit, ReturnTrip, StartTrip, ResultMode } from '../types';
import { translations, Language } from '../services/translations';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface VisitListProps {
  visits: Visit[];
  startTrip: StartTrip | null;
  returnTrip: ReturnTrip | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (selected: boolean) => void;
  onEdit: (visit: Visit) => void;
  onReorder: (newVisits: Visit[]) => void;
  onToggleSkip: (id: string) => void;
  onDelete: (id: string) => void;
  lang: Language;
  departureTime: string; 
  resultMode?: ResultMode; 
}

// Helper format function for duration
const formatDuration = (seconds?: number): string => {
    if (seconds === undefined) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    if (h === 0) {
        return `${m}m`;
    } else {
        return `${h}h ${m.toString().padStart(2, '0')}m`;
    }
};

// Helper format function for exact distance
const formatExactDist = (km?: number): string => {
    if (km === undefined) return '—';
    return km.toFixed(3).replace('.', ',');
};

// Helper to format HH:mm:ss to HH:mm
const formatTime = (timeStr?: string): string => {
    if (!timeStr) return '—';
    return timeStr.slice(0, 5);
};

// Helper to determine text color class based on mode
const getResultColor = (mode: ResultMode = 'standard', isPlaceholder: boolean = false) => {
    if (isPlaceholder) return 'text-gray-300 dark:text-gray-600';
    
    switch (mode) {
        case 'preview': // Precalc -> Blue
            return 'text-google-blue dark:text-blue-400 italic font-bold';
        case 'optimal': // Optimal -> Green
            return 'text-green-600 dark:text-green-400 italic font-bold';
        case 'standard': // Calculate -> White/Black (High Contrast)
        default:
            return 'text-gray-900 dark:text-white font-black'; // Changed from yellow
    }
};

// Helper to calculate pause logic
const calculatePause = (arrivalTime?: string, plannedTime?: string) => {
    if (!arrivalTime || !plannedTime) return null;
    
    const parseMins = (str: string) => {
        const [h, m] = str.split(':').map(Number);
        return (h * 60) + m;
    };

    const arrivalMins = parseMins(arrivalTime); // Usually HH:mm:ss
    const plannedMins = parseMins(plannedTime); // Usually HH:mm

    const diff = plannedMins - arrivalMins; // Positive = Early (Wait/Pause), Negative = Late

    let label = `${diff}m`;
    if (diff > 0) label = `+${diff}m`;
    if (diff === 0) label = `0m`;

    let colorClass = 'text-gray-400 dark:text-gray-500';
    if (diff > 0) colorClass = 'text-green-600 dark:text-green-400 font-bold'; // Early Arrival = Good/Pause
    if (diff < 0) colorClass = 'text-red-600 dark:text-red-400 font-bold'; // Late Arrival = Bad

    return { label, colorClass };
};

// --- Sortable Row Component ---
interface SortableRowProps {
  visit: Visit;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (visit: Visit) => void;
  onToggleSkip: (id: string) => void;
  onDelete: (id: string) => void;
  resultMode?: ResultMode;
}

const SortableRow: React.FC<SortableRowProps> = ({ visit, isSelected, onToggleSelect, onEdit, onToggleSkip, onDelete, resultMode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: visit.id });

  const [deleteConfirming, setDeleteConfirming] = React.useState(false);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: isDragging ? 'relative' as const : 'static' as const,
  };

  const hasCalc = visit.segmentDistance !== undefined && !visit.isSkipped;
  const isSkipped = visit.isSkipped;
  const showOdometer = hasCalc && visit.totalOdometer !== undefined;

  const isInteractiveElement = (target: EventTarget | null) => {
      if (target instanceof HTMLElement) {
          const tagName = target.tagName;
          return ['INPUT', 'BUTTON', 'SVG', 'PATH'].includes(tagName);
      }
      return false;
  };

  // Determine shared color for result columns
  const resultClass = getResultColor(resultMode, !hasCalc);
  const odometerClass = getResultColor(resultMode, !showOdometer);
  
  const pauseData = calculatePause(visit.arrivalTime, visit.preferredTime);

  return (
    <tr 
      ref={setNodeRef} 
      style={style} 
      onClick={(e) => {
          if (!isInteractiveElement(e.target)) onToggleSelect(visit.id);
      }}
      onContextMenu={(e) => {
          if (!isInteractiveElement(e.target)) {
              e.preventDefault();
              onToggleSkip(visit.id);
          }
      }}
      onDoubleClick={(e) => {
          if (!isInteractiveElement(e.target)) onEdit(visit);
      }}
      className={`transition-colors cursor-pointer 
        ${isDragging ? 'bg-blue-50 dark:bg-blue-900/30 shadow-lg' : (isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800')}
        ${isSkipped ? 'opacity-50 grayscale' : 'text-gray-900 dark:text-gray-100'}
      `}
    >
      <td className="px-2 py-1 whitespace-nowrap w-8 text-center">
        <button 
          className="dnd-handle cursor-move text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1 rounded focus:outline-none"
          {...attributes} {...listeners} type="button" onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
        </button>
      </td>
      <td className="px-2 py-1 whitespace-nowrap w-8 text-center">
        <input
          type="checkbox" checked={isSelected} onChange={() => onToggleSelect(visit.id)} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
          className="h-4 w-4 text-google-blue focus:ring-google-blue border-gray-300 dark:border-gray-600 rounded cursor-pointer dark:bg-gray-700"
        />
      </td>
      <td className="px-2 py-1 whitespace-nowrap w-8 text-center">
        <button 
          type="button" onClick={(e) => { e.stopPropagation(); onToggleSkip(visit.id); }} onPointerDown={(e) => e.stopPropagation()}
          className={`p-1 rounded-full transition-colors ${isSkipped ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-300 dark:text-gray-600 hover:text-gray-50 dark:hover:text-gray-400'}`}
        >
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
        </button>
      </td>
      <td {...listeners} className="cursor-move px-2 py-1 whitespace-nowrap text-base text-gray-500 dark:text-gray-400 font-mono text-center touch-manipulation">
        {visit.order > 0 ? visit.order : '-'}
      </td>
      <td {...listeners} className="cursor-move px-2 py-1 whitespace-nowrap text-base font-medium text-gray-900 dark:text-white touch-manipulation">
        {visit.name}
      </td>
      <td {...listeners} className="cursor-move px-2 py-1 whitespace-nowrap text-base text-gray-900 dark:text-gray-200 touch-manipulation">
        {visit.surname}
      </td>
      <td {...listeners} className="cursor-move px-2 py-1 text-base text-gray-500 dark:text-gray-400 touch-manipulation" title={visit.address}>
        <div className="truncate max-w-sm md:max-w-none">{visit.address}</div>
      </td>
      <td className="px-2 py-1 whitespace-nowrap text-center">
        {visit.isAddressValid === true && <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
        {visit.isAddressValid === false && <svg className="w-5 h-5 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
        {visit.isAddressValid === undefined && <span className="text-gray-300 dark:text-gray-600">-</span>}
      </td>
      
      {/* Odometer */}
      <td className={`px-2 py-1 whitespace-nowrap text-base text-right font-mono ${odometerClass}`}>
        {showOdometer ? visit.totalOdometer : '—'}
      </td>
      
      {/* Distance (Formatted: +Xkm /Y) */}
      <td className={`px-2 py-1 whitespace-nowrap text-base text-right font-mono ${resultClass}`}>
        {hasCalc ? (
            <>
                +{visit.segmentDistance}km <span className="text-xs">/{formatExactDist(visit.exactDistanceKm)}</span>
            </>
        ) : '—'}
      </td>
      
      {/* Travel Time */}
      <td className={`px-2 py-1 whitespace-nowrap text-base text-right font-mono ${hasCalc ? resultClass : 'text-gray-300 dark:text-gray-600'}`}>
        {hasCalc ? formatDuration(visit.segmentDuration) : '—'}
      </td>
      
      {/* Arrival Time (Calculated) */}
      <td className={`px-2 py-1 whitespace-nowrap text-base text-right font-mono ${visit.arrivalTime ? resultClass : 'text-gray-300 dark:text-gray-600'}`}>
         {formatTime(visit.arrivalTime)}
      </td>

      {/* Planned Time (Static) */}
      <td className="px-2 py-1 whitespace-nowrap text-base text-right font-mono text-gray-500 dark:text-gray-400">
         {visit.preferredTime || '—'}
      </td>

      {/* Pause (Diff) */}
      <td className={`px-2 py-1 whitespace-nowrap text-base text-right font-mono ${pauseData?.colorClass || 'text-gray-300 dark:text-gray-600'}`}>
         {pauseData ? pauseData.label : '—'}
      </td>
      
      <td className={`px-2 py-1 whitespace-nowrap text-base text-right font-mono ${visit.visitDuration > 0 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}`}>
         {formatDuration((visit.visitDuration || 0) * 60)}
      </td>
      <td className="px-2 py-1 whitespace-nowrap text-right text-base font-medium">
        <div className="flex justify-end items-center gap-2">
            <button 
              type="button" onClick={(e) => { e.stopPropagation(); onEdit(visit); }} onPointerDown={(e) => e.stopPropagation()}
              className="text-google-blue dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button 
              type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  if (deleteConfirming) { onDelete(visit.id); setDeleteConfirming(false); } else { setDeleteConfirming(true); setTimeout(() => setDeleteConfirming(false), 3000); }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`p-1 rounded-full transition-colors ${deleteConfirming ? 'bg-red-600 text-white hover:bg-red-700 shadow-md' : 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30'}`}
            >
              {deleteConfirming ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
            </button>
        </div>
      </td>
    </tr>
  );
};

// --- Main List Component ---
export const VisitList: React.FC<VisitListProps> = ({ 
  visits, startTrip, returnTrip, selectedIds, onToggleSelect, onToggleAll, onEdit, onReorder, onToggleSkip, onDelete, lang, departureTime, resultMode
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Visit, direction: 'asc' | 'desc' } | null>(null);

  const allSelected = visits.length > 0 && selectedIds.size === visits.length;
  const t = translations[lang];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    // If search is active, we disable DnD or warn
    if (searchTerm) return; 

    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = visits.findIndex((v) => v.id === active.id);
      const newIndex = visits.findIndex((v) => v.id === over.id);
      const newOrder = arrayMove(visits, oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  // Sorting Logic: Reorders the actual list
  const handleSort = (key: keyof Visit) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });

      // Perform sort on current visits and trigger update
      // Note: "Order" column (index in array) will change to reflect the new sequence
      const sorted = [...visits].sort((a, b) => {
          let valA: any = a[key];
          let valB: any = b[key];

          // Handle special cases / nulls
          if (valA === undefined || valA === null) valA = '';
          if (valB === undefined || valB === null) valB = '';

          if (typeof valA === 'string') valA = valA.toLowerCase();
          if (typeof valB === 'string') valB = valB.toLowerCase();

          if (valA < valB) return direction === 'asc' ? -1 : 1;
          if (valA > valB) return direction === 'asc' ? 1 : -1;
          return 0;
      });
      
      onReorder(sorted);
  };

  // Filter Logic
  const filteredVisits = visits.filter(v => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
          v.name.toLowerCase().includes(term) ||
          v.surname.toLowerCase().includes(term) ||
          v.address.toLowerCase().includes(term) ||
          (v.preferredTime && v.preferredTime.includes(term))
      );
  });

  const activeVisits = visits.filter(v => !v.isSkipped);
  const totalDistance = activeVisits.reduce((acc, v) => acc + (v.segmentDistance || 0), 0) + (returnTrip?.segmentDistance || 0);
  const totalExactDistance = activeVisits.reduce((acc, v) => acc + (v.exactDistanceKm || 0), 0) + (returnTrip?.exactDistanceKm || 0);
  const totalDuration = activeVisits.reduce((acc, v) => acc + (v.segmentDuration || 0), 0) + (returnTrip?.segmentDuration || 0);
  const totalServiceTime = activeVisits.reduce((acc, v) => acc + (v.visitDuration || 0), 0) * 60; 

  const showTotals = startTrip && (activeVisits.length > 0 || returnTrip);

  // Result classes for Return Trip
  const returnResultClass = getResultColor(resultMode, !returnTrip);
  const returnOdometerClass = getResultColor(resultMode, !returnTrip?.totalOdometer);

  // Theme for Totals Row
  const totalTheme = React.useMemo(() => {
      const commonBorder = "[&>td]:border-t-4 [&>td]:border-double";
      switch (resultMode) {
          case 'preview': // Blue
              return {
                  row: `bg-blue-50 dark:bg-blue-900/20 ${commonBorder} [&>td]:border-google-blue`,
                  label: "text-google-blue dark:text-blue-300",
                  text: "text-google-blue dark:text-blue-400"
              };
          case 'optimal': // Green
              return {
                  row: `bg-green-50 dark:bg-green-900/20 ${commonBorder} [&>td]:border-green-500`,
                  label: "text-green-800 dark:text-green-300",
                  text: "text-green-700 dark:text-green-400"
              };
          case 'standard': // White/Gray (High Contrast)
          default:
              return {
                  row: `bg-white dark:bg-gray-700 ${commonBorder} [&>td]:border-gray-400 dark:[&>td]:border-gray-500`, // Changed from yellow-50
                  label: "text-gray-900 dark:text-white", // Changed from yellow
                  text: "text-gray-900 dark:text-white" // Changed from yellow
              };
      }
  }, [resultMode]);

  // Header Sort Icon
  const SortIcon = ({ column }: { column: keyof Visit }) => {
      if (sortConfig?.key !== column) return <span className="opacity-20 ml-1">⇅</span>;
      return <span className="ml-1 text-google-blue">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const ThSortable = ({ column, label, width, align = 'left', colorClass = '' }: { column: keyof Visit, label: string, width?: string, align?: string, colorClass?: string }) => (
      <th 
        className={`px-2 py-1 text-${align} text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors select-none whitespace-nowrap ${width || ''} ${colorClass}`}
        onClick={() => handleSort(column)}
      >
          {label} <SortIcon column={column} />
      </th>
  );

  return (
    <div className="w-full">
        {/* Search Bar */}
        <div className="mb-2 relative">
            <input 
                type="text" 
                placeholder={t.search}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-google-blue outline-none shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800 w-full transition-colors">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900 transition-colors">
                <tr>
                <th scope="col" className="px-2 py-1 w-8"></th>
                <th scope="col" className="px-2 py-1 text-center w-8">
                    <input type="checkbox" checked={allSelected} onChange={(e) => onToggleAll(e.target.checked)} className="h-4 w-4 text-google-blue focus:ring-google-blue border-gray-300 dark:border-gray-600 rounded cursor-pointer dark:bg-gray-700" />
                </th>
                <th className="px-2 py-1 text-center text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8 whitespace-nowrap">{t.colSkip}</th>
                <ThSortable column="order" label={t.colOrder} width="w-12" align="center" />
                <ThSortable column="name" label={t.colName} />
                <ThSortable column="surname" label={t.colSurname} />
                <ThSortable column="address" label={t.colAddress} />
                <ThSortable column="isAddressValid" label={t.colValid} width="w-12" align="center" />
                <th className="px-2 py-1 text-right text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-gray-800 dark:text-gray-200 whitespace-nowrap">{t.colOdometer}</th>
                <th className="px-2 py-1 text-right text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{t.colDistance}</th>
                <th className="px-2 py-1 text-right text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{t.colTime}</th>
                <th className="px-2 py-1 text-right text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{t.colPlan}</th>
                <ThSortable column="preferredTime" label={t.colPlanned} align="right" />
                <th className="px-2 py-1 text-right text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{t.colPause}</th>
                <ThSortable column="visitDuration" label={t.colDurat} align="right" />
                <th className="px-2 py-1 text-right text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{t.colActions}</th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                
                {startTrip && (
                <tr className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <td></td><td></td><td></td>
                    {/* START/END text disposed */}
                    <td className="px-2 py-1 text-center text-base font-bold text-gray-500 dark:text-gray-400"></td>
                    <td colSpan={2} className="px-2 py-1 text-base font-bold text-gray-500 dark:text-gray-400">{t.departure}</td>
                    <td className="px-2 py-1 text-base text-gray-900 dark:text-gray-100 truncate max-w-sm md:max-w-none" title={startTrip.address}>{startTrip.address}</td>
                    <td className="px-2 py-1 text-center"><svg className="w-5 h-5 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></td>
                    {/* Start Odometer is Fixed Input -> Gray/Black */}
                    <td className="px-2 py-1 text-right text-base font-bold text-gray-900 dark:text-gray-100 font-mono">{startTrip.odometer}</td>
                    <td className="px-2 py-1 text-right text-base font-bold text-gray-300 dark:text-gray-600 font-mono"></td>
                    <td className="px-2 py-1 text-right text-base font-bold text-gray-300 dark:text-gray-600 font-mono"></td>
                    {/* Start Plan is Fixed Input -> Gray/Blue-Gray/Indigo-Gray, keeping neutral or slightly distinct */}
                    <td className="px-2 py-1 text-right text-base font-bold text-gray-600 dark:text-gray-400 font-mono whitespace-nowrap">{formatTime(departureTime)}</td>
                    <td className="px-2 py-1 text-right text-base font-bold text-gray-300 dark:text-gray-600 font-mono"></td>
                    <td className="px-2 py-1 text-right text-base font-bold text-gray-300 dark:text-gray-600 font-mono"></td>
                    <td className="px-2 py-1 text-right text-base font-bold text-gray-300 dark:text-gray-600 font-mono"></td>
                    <td></td>
                </tr>
                )}

                {filteredVisits.length === 0 ? (
                <tr><td colSpan={16} className="px-6 py-10 text-center text-base text-gray-500 dark:text-gray-400 italic">{visits.length === 0 ? t.noVisits : "No matching visits found."}</td></tr>
                ) : (
                <SortableContext items={filteredVisits.map(v => v.id)} strategy={verticalListSortingStrategy}>
                    {filteredVisits.map((visit) => (
                    <SortableRow 
                        key={visit.id} visit={visit} isSelected={selectedIds.has(visit.id)}
                        onToggleSelect={onToggleSelect} onEdit={onEdit} onToggleSkip={onToggleSkip} onDelete={onDelete}
                        resultMode={resultMode}
                    />
                    ))}
                </SortableContext>
                )}
                
                {returnTrip && visits.length > 0 && (
                <tr className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <td colSpan={3}></td>
                    {/* START/END text disposed */}
                    <td className="px-2 py-1 text-center text-base font-bold text-gray-500 dark:text-gray-400"></td>
                    <td colSpan={2} className="px-2 py-1 text-base font-bold text-gray-500 dark:text-gray-400">{t.return}</td>
                    <td className="px-2 py-1 text-base text-gray-900 dark:text-gray-100 truncate max-w-sm md:max-w-none" title={returnTrip.address}>{returnTrip.address}</td>
                    <td className="px-2 py-1 text-center"><svg className="w-5 h-5 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></td>
                    
                    <td className={`px-2 py-1 text-right text-base font-mono ${returnOdometerClass}`}>
                        {returnTrip.totalOdometer !== undefined ? returnTrip.totalOdometer : '—'}
                    </td>
                    <td className={`px-2 py-1 whitespace-nowrap text-right text-base font-mono ${returnResultClass}`}>
                        +{returnTrip.segmentDistance}km <span className="text-xs">/{formatExactDist(returnTrip.exactDistanceKm)}</span>
                    </td>
                    <td className={`px-2 py-1 text-right text-base font-mono ${returnResultClass}`}>{formatDuration(returnTrip.segmentDuration)}</td>
                    <td className={`px-2 py-1 text-right text-base font-mono ${returnResultClass}`}>{formatTime(returnTrip.arrivalTime)}</td>
                    <td className="px-2 py-1 text-right text-base font-bold text-gray-300 dark:text-gray-600 font-mono"></td>
                    <td className="px-2 py-1 text-right text-base font-bold text-gray-300 dark:text-gray-600 font-mono"></td>
                    <td className="px-2 py-1 text-right text-base font-bold text-gray-300 dark:text-gray-600 font-mono"></td>
                    <td></td>
                </tr>
                )}
                
                {showTotals && (
                <tr className={totalTheme.row}>
                    <td colSpan={3}></td>
                    <td className={`px-2 py-2 text-center text-lg font-black uppercase ${totalTheme.label}`}>{t.total}</td>
                    <td colSpan={4}></td>
                    <td className={`px-2 py-2 text-right text-lg font-bold font-mono ${totalTheme.text}`}></td>
                    <td className={`px-2 py-2 whitespace-nowrap text-right text-lg font-black font-mono text-base ${totalTheme.text}`}>
                        {totalDistance}km <span className="text-xs">/{formatExactDist(totalExactDistance)}</span>
                    </td>
                    <td className={`px-2 py-2 text-right text-lg font-black font-mono text-base whitespace-nowrap ${totalTheme.text}`}>{formatDuration(totalDuration)}</td>
                    <td className={`px-2 py-2 text-right text-lg font-black font-mono text-base whitespace-nowrap ${totalTheme.text}`}>{formatTime(returnTrip?.arrivalTime)}</td>
                    <td className={`px-2 py-2 text-right text-lg font-black font-mono text-base whitespace-nowrap ${totalTheme.text}`}></td>
                    <td className={`px-2 py-2 text-right text-lg font-black font-mono text-base whitespace-nowrap ${totalTheme.text}`}></td>
                    <td className={`px-2 py-2 text-right text-lg font-black font-mono text-base whitespace-nowrap ${totalTheme.text}`}>{formatDuration(totalServiceTime)}</td>
                    <td></td>
                </tr>
                )}
            </tbody>
            </table>
        </DndContext>
        </div>
    </div>
  );
};