
import React, { useState, useEffect, useRef } from 'react';
import { Client } from '../types';
import { translations, Language } from '../services/translations';
import { useDraggable } from '../hooks/useDraggable';

interface ClientDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onAddClient: (data: Omit<Client, 'id'>) => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onDeleteClients: (ids: Set<string>) => void;
  onValidateClients: (ids: Set<string>) => void;
  onAddToRoute: (selectedClients: Client[]) => void;
  onImportExcel: (file: File) => Promise<void>;
  lang: Language;
}

export const ClientDbModal: React.FC<ClientDbModalProps> = ({ 
  isOpen, onClose, clients, onAddClient, onEditClient, onDeleteClient, onDeleteClients, onValidateClients, onAddToRoute, onImportExcel, lang 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: keyof Client | 'repetition', direction: 'asc' | 'desc' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];
  const { nodeRef, handleRef } = useDraggable<HTMLDivElement>(isOpen);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Reset bulk delete state when selection changes
  useEffect(() => {
      setBulkDeleteConfirm(false);
  }, [selectedIds]);

  // Helper to format Repetition string
  const formatRepetition = (c: Client) => {
      const rep = c.visitRepetition;
      if (!rep) return '—';
      if (rep.type === 'WEEKLY') {
          if (!rep.daysOfWeek || rep.daysOfWeek.length === 0) return t.optWeekly;
          const daysShort = rep.daysOfWeek.sort().map(d => t.days[d]).join(', ');
          return `${t.optWeekly}: ${daysShort}`;
      }
      if (rep.type === 'DATE') {
          return `${t.optDate}: ${rep.specificDate || '?'}`;
      }
      if (rep.type === 'INTERVAL') {
          return `${t.optInterval}: ${rep.intervalDays || '?'} days`;
      }
      return '—';
  };

  // Sorting Logic
  const handleSort = (key: keyof Client | 'repetition') => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const getSortedClients = () => {
      if (!sortConfig) return clients;
      
      return [...clients].sort((a, b) => {
          let valA: any = '';
          let valB: any = '';

          if (sortConfig.key === 'repetition') {
              valA = formatRepetition(a);
              valB = formatRepetition(b);
          } else {
              valA = a[sortConfig.key];
              valB = b[sortConfig.key];
          }

          if (valA === undefined || valA === null) valA = '';
          if (valB === undefined || valB === null) valB = '';

          if (typeof valA === 'string') valA = valA.toLowerCase();
          if (typeof valB === 'string') valB = valB.toLowerCase();

          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
  };

  // Filter Logic (Search across all columns)
  const filteredClients = getSortedClients().filter(c => {
      const search = searchTerm.toLowerCase();
      const repString = formatRepetition(c).toLowerCase();
      
      return (
        (c.name && c.name.toLowerCase().includes(search)) || 
        (c.surname && c.surname.toLowerCase().includes(search)) || 
        (c.address && c.address.toLowerCase().includes(search)) ||
        (c.visitStartAt && c.visitStartAt.toLowerCase().includes(search)) ||
        (c.defaultDuration && c.defaultDuration.toString().includes(search)) ||
        repString.includes(search)
      );
  });

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(filteredClients.map(c => c.id)));
    else setSelectedIds(new Set());
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteConfirmId === id) {
        onDeleteClient(id);
        setDeleteConfirmId(null);
    } else {
        setDeleteConfirmId(id);
        setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleBulkDelete = () => {
      if (bulkDeleteConfirm) {
          onDeleteClients(selectedIds);
          setSelectedIds(new Set());
          setBulkDeleteConfirm(false);
      } else {
          setBulkDeleteConfirm(true);
          setTimeout(() => setBulkDeleteConfirm(false), 4000);
      }
  };

  const handleBulkValidate = () => {
      onValidateClients(selectedIds);
  };

  const handleExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          await onImportExcel(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  // Safe default for new client
  const handleAddNew = () => {
      onAddClient({
          name: '', 
          surname: '', 
          address: '', 
          defaultDuration: 30,
          visitRepetition: { type: 'WEEKLY', daysOfWeek: [] }
      });
  };

  // Header Sort Icon
  const SortIcon = ({ column }: { column: keyof Client | 'repetition' }) => {
      if (sortConfig?.key !== column) return <span className="opacity-20 ml-1">⇅</span>;
      return <span className="ml-1 text-google-blue">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const ThSortable = ({ column, label, width }: { column: keyof Client | 'repetition', label: string, width?: string }) => (
      <th 
        className={`px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors select-none ${width || ''}`}
        onClick={() => handleSort(column)}
      >
          {label} <SortIcon column={column} />
      </th>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4">
      {/* Increased max-width to 7xl for wider view */}
      <div 
        ref={nodeRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-[90vw] md:max-w-7xl h-[85vh] flex flex-col animate-fade-in-up transition-colors"
      >
        
        {/* Header */}
        <div ref={handleRef} className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-lg select-none">
           <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
             <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
             {t.dbTitle}
           </h3>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
            
            {/* Buttons Row (Top) */}
            <div className="flex flex-wrap gap-2 items-center">
                <button onClick={handleAddNew} className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm whitespace-nowrap">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                   {t.dbAddManual}
                </button>

                <input type="file" ref={fileInputRef} accept=".xlsx" className="hidden" onChange={handleExcelChange} />
                <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm font-medium whitespace-nowrap">
                   <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                   {t.importExcel}
                </button>
                
                <button onClick={handleBulkValidate} className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm whitespace-nowrap">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {selectedIds.size > 0 ? `${t.validate} (${selectedIds.size})` : `${t.validate}`}
                </button>

                {selectedIds.size > 0 && (
                    <button onClick={handleBulkDelete} className={`px-3 py-2 border rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm whitespace-nowrap ${bulkDeleteConfirm ? 'bg-red-600 text-white border-red-700' : 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 border-gray-300 dark:border-gray-600'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        {bulkDeleteConfirm ? t.confirm : `${t.delete} (${selectedIds.size})`}
                    </button>
                )}
            </div>

            {/* Search Row (Bottom) */}
            <div className="relative w-full">
                <input 
                   type="text" 
                   placeholder={t.search}
                   className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-google-blue outline-none"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
        </div>

        {/* Table */}
        <div className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-4 py-3 w-8">
                             <input type="checkbox" onChange={e => handleToggleAll(e.target.checked)} className="rounded text-google-blue focus:ring-google-blue cursor-pointer" />
                        </th>
                        <ThSortable column="name" label={t.colName} />
                        <ThSortable column="surname" label={t.colSurname} />
                        <ThSortable column="address" label={t.colAddress} width="w-1/4" />
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.colValid}</th>
                        <ThSortable column="visitStartAt" label={t.colPrefTime} />
                        <ThSortable column="repetition" label={t.colRepetition} />
                        <ThSortable column="defaultDuration" label={t.colDurat} />
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.colActions}</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredClients.length === 0 ? (
                        <tr><td colSpan={9} className="text-center py-10 text-gray-500 dark:text-gray-400 italic">{t.dbNoClients}</td></tr>
                    ) : filteredClients.map(client => (
                        <tr 
                          key={client.id} 
                          onDoubleClick={() => onEditClient(client)}
                          onClick={() => handleToggleSelect(client.id)}
                          className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
                        >
                            <td className="px-4 py-1 text-center" onClick={e => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedIds.has(client.id)}
                                  onChange={() => handleToggleSelect(client.id)}
                                  className="rounded text-google-blue focus:ring-google-blue cursor-pointer"
                                />
                            </td>
                            <td className="px-4 py-1 text-sm text-gray-900 dark:text-gray-100 font-medium">{client.name}</td>
                            <td className="px-4 py-1 text-sm text-gray-900 dark:text-gray-100">{client.surname}</td>
                            <td className="px-4 py-1 text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs" title={client.address}>{client.address}</td>
                            <td className="px-4 py-1 text-center">
                                {client.isAddressValid === true && <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                {client.isAddressValid === false && <svg className="w-5 h-5 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                            </td>
                            <td className="px-4 py-1 text-center text-sm text-indigo-600 dark:text-indigo-400 font-mono">
                                {client.visitStartAt || '—'}
                            </td>
                            <td className="px-4 py-1 text-sm text-gray-600 dark:text-gray-300">
                                {formatRepetition(client)}
                            </td>
                            <td className="px-4 py-1 text-right text-sm text-gray-900 dark:text-gray-100 font-mono">{client.defaultDuration} m</td>
                            <td className="px-4 py-1 text-right flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                <button onClick={() => onEditClient(client)} className="text-blue-600 hover:bg-blue-100 p-1.5 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                <button onClick={(e) => handleDeleteClick(e, client.id)} className={`p-1.5 rounded-full ${deleteConfirmId === client.id ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-red-100'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
                {selectedIds.size} {t.dbSelected}
            </div>
            <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">{t.close}</button>
                <button 
                  onClick={() => {
                      const selected = clients.filter(c => selectedIds.has(c.id));
                      onAddToRoute(selected);
                  }}
                  disabled={selectedIds.size === 0}
                  className={`px-6 py-2 rounded-lg font-bold shadow-md transition-colors ${selectedIds.size > 0 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                >
                    {t.addToRoute}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
