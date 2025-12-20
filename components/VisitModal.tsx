import React, { useState, useEffect } from 'react';
import { Visit, Client, RepetitionType } from '../types';
import { checkAddress } from '../services/googleMapsService';
import { translations, Language } from '../services/translations';
import { useDraggable } from '../hooks/useDraggable';

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: Visit | Client | null;
  lang: Language;
  mode?: 'visit' | 'client';
}

export const VisitModal: React.FC<VisitModalProps> = ({ isOpen, onClose, onSave, initialData, lang, mode = 'visit' }) => {
  const t = translations[lang];
  const { nodeRef, handleRef } = useDraggable<HTMLHeadingElement>(isOpen);
  
  const [formData, setFormData] = useState<any>({
    name: '',
    surname: '',
    address: '',
    order: 0,
    visitDuration: 0,
    isAddressValid: false,
    // Client specific
    visitStartAt: '',
    visitRepetition: { type: 'WEEKLY', daysOfWeek: [], specificDate: '', intervalStart: '', intervalDays: 0 }
  });

  const [validationStatus, setValidationStatus] = useState<{isValid?: boolean, msg?: string}>({});
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      if (initialData) {
        // Handle both Client (defaultDuration) and Visit (visitDuration)
        const duration = 'visitDuration' in initialData ? initialData.visitDuration : (initialData as any).defaultDuration;
        const isClient = mode === 'client';
        const clientData = isClient ? (initialData as Client) : null;

        setFormData({
            name: initialData.name,
            surname: initialData.surname,
            address: initialData.address,
            order: 'order' in initialData ? initialData.order : 0,
            visitDuration: duration || 0,
            isAddressValid: initialData.isAddressValid || false,
            // Client specific fields
            visitStartAt: clientData?.visitStartAt || '',
            visitRepetition: clientData?.visitRepetition || { type: 'WEEKLY', daysOfWeek: [], specificDate: '', intervalStart: '', intervalDays: 3 }
        });

        if (initialData.isAddressValid) {
            setValidationStatus({ isValid: true, msg: t.msgValidationComplete });
        } else {
            setValidationStatus({});
        }
      } else {
        setFormData({ 
            name: '', surname: '', address: '', order: 0, visitDuration: 0, isAddressValid: false,
            visitStartAt: '',
            visitRepetition: { type: 'WEEKLY', daysOfWeek: [], specificDate: '', intervalStart: new Date().toISOString().slice(0,10), intervalDays: 3 }
        });
        setValidationStatus({});
      }
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, initialData, onClose, t, mode]);

  if (!isOpen) return null;

  const handleBlur = async () => {
      if (!formData.address) return;
      setIsValidating(true);
      const result = await checkAddress(formData.address);
      setIsValidating(false);
      if (result.isValid) {
          setValidationStatus({ isValid: true, msg: result.formattedAddress });
          setFormData((prev: any) => ({ ...prev, isAddressValid: true }));
      } else {
          setValidationStatus({ isValid: false, msg: result.error });
          setFormData((prev: any) => ({ ...prev, isAddressValid: false }));
      }
  };

  const handleRepetitionChange = (field: string, value: any) => {
      setFormData((prev: any) => ({
          ...prev,
          visitRepetition: { ...prev.visitRepetition, [field]: value }
      }));
  };

  const toggleDay = (dayIndex: number) => {
      const currentDays = formData.visitRepetition.daysOfWeek || [];
      const newDays = currentDays.includes(dayIndex) 
        ? currentDays.filter((d: number) => d !== dayIndex)
        : [...currentDays, dayIndex];
      handleRepetitionChange('daysOfWeek', newDays);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a copy to modify before saving
    const submissionData = { ...formData };

    // Sanitize Client Repetition Data: Only keep fields relevant to the selected Type
    if (mode === 'client' && submissionData.visitRepetition) {
        const activeType = submissionData.visitRepetition.type;
        const cleanRepetition: any = { type: activeType };

        if (activeType === 'WEEKLY') {
            cleanRepetition.daysOfWeek = submissionData.visitRepetition.daysOfWeek || [];
        } else if (activeType === 'DATE') {
            cleanRepetition.specificDate = submissionData.visitRepetition.specificDate || '';
        } else if (activeType === 'INTERVAL') {
            cleanRepetition.intervalStart = submissionData.visitRepetition.intervalStart || '';
            cleanRepetition.intervalDays = submissionData.visitRepetition.intervalDays || 0;
        }

        submissionData.visitRepetition = cleanRepetition;
    }

    onSave(submissionData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120] p-4">
      <div 
        ref={nodeRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 animate-fade-in-up transition-colors max-h-[90vh] overflow-y-auto"
      >
        <h3 ref={handleRef} className="text-xl font-semibold mb-4 text-gray-800 dark:text-white select-none">
          {initialData 
            ? (mode === 'client' ? t.editClient : t.editVisit) 
            : (mode === 'client' ? t.createClient : t.createVisit)
          }
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblName}</label>
              <input 
                type="text" required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-google-blue focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblSurname}</label>
              <input 
                type="text" required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-google-blue focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={formData.surname}
                onChange={e => setFormData({...formData, surname: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblVisitAddr}</label>
            <div className="relative">
                <input 
                type="text" required
                className={`w-full border rounded-md p-2 focus:ring-2 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${validationStatus.isValid === false ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 dark:border-gray-600 focus:ring-google-blue'}`}
                value={formData.address}
                onChange={e => {
                    setFormData({...formData, address: e.target.value, isAddressValid: false});
                    setValidationStatus({});
                }}
                onBlur={handleBlur}
                />
                {isValidating && (
                    <div className="absolute right-2 top-2.5">
                        <div className="animate-spin h-4 w-4 border-2 border-google-blue border-t-transparent rounded-full"></div>
                    </div>
                )}
            </div>
            {validationStatus.isValid !== undefined && (
                <div className={`mt-1 text-xs flex items-center gap-1 ${validationStatus.isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    <span>{validationStatus.msg}</span>
                </div>
            )}
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblDuration}</label>
              <input 
                type="number" min="0"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-google-blue focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={formData.visitDuration}
                onChange={e => setFormData({...formData, visitDuration: parseInt(e.target.value) || 0})}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.lblDurationDesc}</p>
          </div>

          {/* Scheduling Section - Only for Clients */}
          {mode === 'client' && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {t.lblScheduleTitle}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblVisitStartAt}</label>
                          <input 
                            type="time"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-google-blue outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={formData.visitStartAt}
                            onChange={e => setFormData({...formData, visitStartAt: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblRepetitionType}</label>
                          <select 
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-google-blue outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={formData.visitRepetition.type}
                            onChange={e => handleRepetitionChange('type', e.target.value as RepetitionType)}
                          >
                              <option value="WEEKLY">{t.optWeekly}</option>
                              <option value="DATE">{t.optDate}</option>
                              <option value="INTERVAL">{t.optInterval}</option>
                          </select>
                      </div>
                  </div>

                  {/* Conditional Scheduling Inputs */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md border border-gray-100 dark:border-gray-600">
                      {formData.visitRepetition.type === 'WEEKLY' && (
                          <div>
                              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase">{t.lblDaysOfWeek}</label>
                              <div className="flex flex-wrap gap-2">
                                  {t.days.map((dayName: string, idx: number) => {
                                      const isSelected = formData.visitRepetition.daysOfWeek?.includes(idx);
                                      return (
                                          <button
                                            type="button"
                                            key={idx}
                                            onClick={() => toggleDay(idx)}
                                            className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${isSelected ? 'bg-google-blue text-white shadow-sm' : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500'}`}
                                          >
                                              {dayName}
                                          </button>
                                      );
                                  })}
                              </div>
                          </div>
                      )}

                      {formData.visitRepetition.type === 'DATE' && (
                          <div>
                               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblSpecificDate}</label>
                               <input 
                                 type="date"
                                 className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-google-blue outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                 value={formData.visitRepetition.specificDate || ''}
                                 onChange={e => handleRepetitionChange('specificDate', e.target.value)}
                               />
                          </div>
                      )}

                      {formData.visitRepetition.type === 'INTERVAL' && (
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblIntervalStart}</label>
                                  <input 
                                    type="date"
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-google-blue outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    value={formData.visitRepetition.intervalStart || ''}
                                    onChange={e => handleRepetitionChange('intervalStart', e.target.value)}
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblIntervalDays}</label>
                                  <input 
                                    type="number" min="1"
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-google-blue outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    value={formData.visitRepetition.intervalDays || ''}
                                    onChange={e => handleRepetitionChange('intervalDays', parseInt(e.target.value) || 0)}
                                  />
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {mode === 'visit' && (
             <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">{t.lblDragHint}</div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md font-medium transition-colors"
            >
              {t.cancel}
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-white bg-google-blue hover:bg-blue-700 rounded-md font-medium transition-colors shadow-sm"
            >
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};