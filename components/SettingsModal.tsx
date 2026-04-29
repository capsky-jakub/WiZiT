
import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { checkAddress } from '../services/googleMapsService';
import { translations, Language } from '../services/translations';
import { useDraggable } from '../hooks/useDraggable';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [validationStatus, setValidationStatus] = useState<{isValid?: boolean, msg?: string}>({});
  const [isValidating, setIsValidating] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'valid' | 'invalid' | 'unknown'>('unknown');
  const [firebaseKeyStatus, setFirebaseKeyStatus] = useState<'valid' | 'invalid' | 'unknown'>('unknown');
  
  const { nodeRef, handleRef } = useDraggable<HTMLHeadingElement>(isOpen);
  const t = translations[settings.language || 'cs'];

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
        window.addEventListener('keydown', handleEsc);
        setFormData(settings);
        if (settings.isStartValid) {
            setValidationStatus({ isValid: true, msg: t.msgValidationComplete });
        } else {
            setValidationStatus({});
        }

        if (settings.googleApiKey && settings.googleApiKey.startsWith('AIza')) {
            setKeyStatus('valid');
        } else if (settings.googleApiKey) {
            setKeyStatus('invalid');
        } else {
            setKeyStatus('unknown');
        }

        if (settings.firebaseApiKey && settings.firebaseApiKey.startsWith('AIza')) {
            setFirebaseKeyStatus('valid');
        } else if (settings.firebaseApiKey) {
            setFirebaseKeyStatus('invalid');
        } else {
            setFirebaseKeyStatus('unknown');
        }
    }
    
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, settings, onClose, t]);

  if (!isOpen) return null;

  const handleBlur = async () => {
      if (!formData.startAddress) return;
      setIsValidating(true);
      const result = await checkAddress(formData.startAddress);
      setIsValidating(false);

      if (result.isValid) {
          setValidationStatus({ isValid: true, msg: result.formattedAddress });
          setFormData(prev => ({ ...prev, isStartValid: true }));
      } else {
          setValidationStatus({ isValid: false, msg: result.error });
          setFormData(prev => ({ ...prev, isStartValid: false }));
      }
  };

  const handleKeyChange = (val: string) => {
      setFormData(prev => ({ ...prev, googleApiKey: val }));
      if (val.trim().startsWith('AIza')) {
          setKeyStatus('valid');
      } else if (val.trim().length > 0) {
          setKeyStatus('invalid');
      } else {
          setKeyStatus('unknown');
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[130]">
      <div 
        ref={nodeRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 animate-fade-in-up transition-colors max-h-[90vh] overflow-y-auto"
      >
        <h3 ref={handleRef} className="text-xl font-semibold mb-4 text-gray-800 dark:text-white select-none">{t.settingsTitle}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblAddress}</label>
            <div className="relative">
                <textarea 
                rows={2}
                required
                className={`w-full border rounded-md p-2 focus:ring-2 outline-none resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    ${validationStatus.isValid === false ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 dark:border-gray-600 focus:ring-google-blue'}`}
                value={formData.startAddress}
                onChange={e => {
                    setFormData({...formData, startAddress: e.target.value, isStartValid: false});
                    setValidationStatus({}); 
                }}
                onBlur={handleBlur}
                placeholder="e.g. J. Palacha 324, Pardubice"
                />
                {isValidating && (
                    <div className="absolute right-2 top-2">
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

          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblOdometer}</label>
                <input 
                  type="number" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-google-blue focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={formData.currentOdometer}
                  onChange={e => setFormData({...formData, currentOdometer: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblDeparture}</label>
                <input 
                  type="time" 
                  step="1"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-google-blue focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={formData.departureTime}
                  onChange={e => setFormData({...formData, departureTime: e.target.value})}
                />
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblCache}</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-google-blue focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={formData.cacheExpirationDays || 30}
                  onChange={e => setFormData({...formData, cacheExpirationDays: parseInt(e.target.value) || 30})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.lblLanguage}</label>
                <select 
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-google-blue focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={formData.language || 'cs'}
                    onChange={e => setFormData({...formData, language: e.target.value as Language})}
                >
                    <option value="cs">Čeština</option>
                    <option value="en">English</option>
                </select>
              </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                <input 
                type="checkbox" 
                id="strictMode"
                checked={formData.isStrictMode}
                onChange={e => setFormData({...formData, isStrictMode: e.target.checked})}
                className="h-4 w-4 text-google-blue focus:ring-google-blue border-gray-300 dark:border-gray-500 rounded cursor-pointer"
                />
                <label htmlFor="strictMode" className="text-sm text-gray-700 dark:text-gray-200 cursor-pointer select-none">
                {t.lblStrictMode}
                </label>
            </div>

            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                <span className="text-sm text-gray-700 dark:text-gray-200 select-none">{t.lblDarkMode}</span>
                <button
                    type="button"
                    onClick={() => setFormData({...formData, isDarkMode: !formData.isDarkMode})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-google-blue focus:ring-offset-2 ${formData.isDarkMode ? 'bg-google-blue' : 'bg-gray-200'}`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isDarkMode ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                </button>
            </div>
          </div>

          {/* Google Maps API Key - Moved to Bottom */}
          <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                 {t.lblApiKey}
             </label>
             <div className="relative">
                 <input 
                   type="text" 
                   required
                   className={`w-full border rounded-md p-2 focus:ring-2 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm
                      ${keyStatus === 'valid' ? 'border-green-400 focus:ring-green-300' : ''}
                      ${keyStatus === 'invalid' ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 dark:border-gray-600 focus:ring-google-blue'}
                   `}
                   value={formData.googleApiKey || ''}
                   onChange={e => handleKeyChange(e.target.value)}
                   placeholder="AIzaSy..."
                 />
                 <div className="absolute right-2 top-2.5">
                    {keyStatus === 'valid' && (
                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    )}
                    {keyStatus === 'invalid' && (
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                 </div>
             </div>
          </div>

          {/* Firebase API Key */}
          <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                 {t.lblFirebaseApiKey}
             </label>
             <div className="relative">
                 <input 
                   type="text" 
                   required
                   className={`w-full border rounded-md p-2 focus:ring-2 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm
                      ${firebaseKeyStatus === 'valid' ? 'border-green-400 focus:ring-green-300' : ''}
                      ${firebaseKeyStatus === 'invalid' ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 dark:border-gray-600 focus:ring-google-blue'}
                   `}
                   value={formData.firebaseApiKey || ''}
                   onChange={e => {
                       const val = e.target.value;
                       setFormData(prev => ({ ...prev, firebaseApiKey: val }));
                       if (val.trim().startsWith('AIza')) setFirebaseKeyStatus('valid');
                       else if (val.trim().length > 0) setFirebaseKeyStatus('invalid');
                       else setFirebaseKeyStatus('unknown');
                   }}
                   placeholder="AIzaSy..."
                 />
                 <div className="absolute right-2 top-2.5">
                    {firebaseKeyStatus === 'valid' && (
                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    )}
                    {firebaseKeyStatus === 'invalid' && (
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                 </div>
             </div>
          </div>

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
              {t.saveSettings}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
