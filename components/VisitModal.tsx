
import React, { useState, useEffect } from 'react';
import { Visit } from '../types';
import { checkAddress } from '../services/googleMapsService';
import { translations, Language } from '../services/translations';

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (visit: Omit<Visit, 'id'>) => void;
  initialData?: Visit | null;
  lang: Language;
}

export const VisitModal: React.FC<VisitModalProps> = ({ isOpen, onClose, onSave, initialData, lang }) => {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    address: '',
    order: 0,
    visitDuration: 0,
    isAddressValid: false
  });

  const t = translations[lang];
  const [validationStatus, setValidationStatus] = useState<{isValid?: boolean, msg?: string}>({});
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      if (initialData) {
        setFormData({
            name: initialData.name,
            surname: initialData.surname,
            address: initialData.address,
            order: initialData.order,
            visitDuration: initialData.visitDuration || 0,
            isAddressValid: initialData.isAddressValid || false
        });
        if (initialData.isAddressValid) {
            setValidationStatus({ isValid: true, msg: t.msgValidationComplete });
        } else {
            setValidationStatus({});
        }
      } else {
        setFormData({ name: '', surname: '', address: '', order: 0, visitDuration: 0, isAddressValid: false });
        setValidationStatus({});
      }
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, initialData, onClose, t]);

  if (!isOpen) return null;

  const handleBlur = async () => {
      if (!formData.address) return;
      setIsValidating(true);
      const result = await checkAddress(formData.address);
      setIsValidating(false);
      if (result.isValid) {
          setValidationStatus({ isValid: true, msg: result.formattedAddress });
          setFormData(prev => ({ ...prev, isAddressValid: true }));
      } else {
          setValidationStatus({ isValid: false, msg: result.error });
          setFormData(prev => ({ ...prev, isAddressValid: false }));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 animate-fade-in-up transition-colors">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          {initialData ? t.editVisit : t.createVisit}
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

          <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">{t.lblDragHint}</div>

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
