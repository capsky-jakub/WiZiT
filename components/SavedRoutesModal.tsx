

import React, { useState, useEffect } from 'react';
import { SavedRoute, Visit, StartTrip, ReturnTrip } from '../types';
import { translations, Language } from '../services/translations';

interface SavedRoutesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVisits: Visit[];
  currentStart: StartTrip | null;
  currentReturn: ReturnTrip | null;
  onLoadRoute: (route: SavedRoute) => void;
  lang: Language;
}

export const SavedRoutesModal: React.FC<SavedRoutesModalProps> = ({ 
  isOpen, onClose, currentVisits, currentStart, currentReturn, onLoadRoute, lang 
}) => {
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [newRouteName, setNewRouteName] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'save'>('list');
  const t = translations[lang];

  useEffect(() => {
    if (isOpen) {
      loadRoutesFromStorage();
      setViewMode('list');
      setNewRouteName('');
    }
  }, [isOpen]);

  const loadRoutesFromStorage = () => {
    try {
      const raw = localStorage.getItem('odocalc_saved_routes');
      if (raw) {
        setSavedRoutes(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Failed to load saved routes", e);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteName.trim()) return;

    const newRoute: SavedRoute = {
      id: Math.random().toString(36).substring(2, 9),
      name: newRouteName.trim(),
      createdAt: new Date().toISOString(),
      visits: currentVisits,
      startTrip: currentStart,
      returnTrip: currentReturn
    };

    const updatedRoutes = [...savedRoutes, newRoute];
    localStorage.setItem('odocalc_saved_routes', JSON.stringify(updatedRoutes));
    setSavedRoutes(updatedRoutes);
    setNewRouteName('');
    setViewMode('list');
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t.confirmDeleteRoute)) return;
    const updatedRoutes = savedRoutes.filter(r => r.id !== id);
    localStorage.setItem('odocalc_saved_routes', JSON.stringify(updatedRoutes));
    setSavedRoutes(updatedRoutes);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 animate-fade-in-up transition-colors max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                {viewMode === 'list' ? t.savedRoutesTitle : t.saveRouteTitle}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {viewMode === 'list' && (
          <div className="flex-grow overflow-y-auto min-h-[300px]">
            <div className="flex justify-between items-center mb-4">
               <p className="text-sm text-gray-500 dark:text-gray-400">
                   {savedRoutes.length === 0 ? t.noSavedRoutes : `${savedRoutes.length} ${t.routesFound}`}
               </p>
               <button 
                  onClick={() => setViewMode('save')}
                  disabled={currentVisits.length === 0}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${currentVisits.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
               >
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                   {t.btnSaveCurrent}
               </button>
            </div>

            <div className="space-y-2">
                {savedRoutes.map(route => (
                    <div key={route.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-google-blue dark:hover:border-blue-500 transition-colors flex justify-between items-center group">
                        <div onClick={() => { onLoadRoute(route); onClose(); }} className="cursor-pointer flex-grow">
                            <h4 className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-google-blue dark:group-hover:text-blue-400">{route.name}</h4>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                                <span>{new Date(route.createdAt).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{route.visits.length} {t.stops}</span>
                                {route.startTrip?.odometer && (
                                    <>
                                        <span>•</span>
                                        <span>{route.startTrip.odometer} km</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => { onLoadRoute(route); onClose(); }}
                                className="p-2 text-google-blue hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full" 
                                title={t.load}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            </button>
                            <button 
                                onClick={() => handleDelete(route.id)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full"
                                title={t.delete}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {viewMode === 'save' && (
            <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblRouteName}</label>
                    <input 
                        type="text" 
                        required
                        autoFocus
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-google-blue outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        value={newRouteName}
                        onChange={e => setNewRouteName(e.target.value)}
                        placeholder="e.g. Pondělí - Hradec"
                    />
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-gray-600 dark:text-gray-300">
                    <p>{t.saveRouteDesc}</p>
                    <ul className="list-disc pl-5 mt-1 text-xs">
                        <li>{currentVisits.length} {t.stops}</li>
                        <li>{t.start}: {currentStart?.address || 'N/A'}</li>
                    </ul>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                    <button 
                        type="button" 
                        onClick={() => setViewMode('list')}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                        {t.cancel}
                    </button>
                    <button 
                        type="submit"
                        className="px-4 py-2 bg-google-blue hover:bg-blue-700 text-white rounded-md font-medium shadow-sm"
                    >
                        {t.save}
                    </button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
};