import React, { useEffect } from 'react';
import { translations, Language } from '../services/translations';
import { useDraggable } from '../hooks/useDraggable';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onLoadSampleData: (data: any[]) => void;
}

// --- Button Graphics Helper ---
type ButtonVariant = 'teal-outline' | 'orange' | 'google-blue' | 'green' | 'yellow' | 'teal-solid' | 'gray' | 'white-border' | 'standard-white';

const ButtonBadge: React.FC<{ variant: ButtonVariant, icon?: React.ReactNode, text: string }> = ({ variant, icon, text }) => {
  let classes = "inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium shadow-sm select-none mx-1 align-middle my-1";
  
  switch (variant) {
    case 'teal-outline':
      classes += " bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-teal-600 dark:text-teal-400";
      break;
    case 'white-border':
      classes += " bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200";
      break;
    case 'orange':
      classes += " bg-orange-500 text-white";
      break;
    case 'google-blue':
      classes += " bg-google-blue text-white";
      break;
    case 'green':
      classes += " bg-green-600 text-white";
      break;
    case 'yellow': // Deprecated style, mapped to standard
    case 'standard-white':
      classes += " bg-white border border-gray-300 text-gray-900 dark:bg-gray-100";
      break;
    case 'teal-solid':
      classes += " bg-teal-600 text-white";
      break;
    case 'gray':
      classes += " bg-gray-600 text-white";
      break;
  }

  return (
    <span className={classes}>
       {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
       <span className="whitespace-nowrap">{text}</span>
    </span>
  );
};

// Icons extracted for re-use
const Icons = {
  importPlan: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  clients: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  savedRoutes: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>,
  precalc: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  optimal: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  calculate: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  validate: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  visualize: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
};


export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, lang, onLoadSampleData }) => {
  const t = translations[lang];
  const { nodeRef, handleRef } = useDraggable<HTMLHeadingElement>(isOpen);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleCheckUpdates = () => {
    // Append a timestamp parameter to force a fresh request to the server, bypassing cache
    const url = new URL(window.location.href);
    url.searchParams.set('v', Date.now().toString());
    window.location.href = url.toString();
  };

  if (!isOpen) return null;

  const excelData1 = [
    { n: 'Jakub', s: 'Rákosníček', a: 'Zámecká 67, 357 33 Loket', o: '1', d: '30' },
    { n: 'Karel', s: 'Rarášek', a: 'Zvíkovské Podhradí 1, 397 01 Zvíkovské Podhradí', o: '2', d: '30' },
    { n: 'Antonín', s: 'Křemílek', a: 'Svojanov 1, 569 73 Svojanov', o: '3', d: '30' },
    { n: 'Jan', s: 'Vochomůrka', a: 'Husovo nám. 1201, 549 01 Nové Město nad Metují', o: '4', d: '30' },
    { n: 'Václav', s: 'Rumcajs', a: 'Valdštejnovo nám. 1, 506 01 Jičín', o: '5', d: '30' },
    { n: 'Eliška', s: 'Šebestová', a: 'Doubská 356, 460 06 Liberec', o: '6', d: '30' },
    { n: 'Růžena', s: 'Šípková', a: 'Grabštejn 21, 463 34 Hrádek nad Nisou', o: '7', d: '30' },
  ];

  const excelData2 = [
    { n: 'Rostislav', s: 'Rosice', a: 'Oskara Brázdy 554, 533 51 Pardubice VII', o: '1', d: '30' },
    { n: 'Tonislava', s: 'Trnová', a: 'Poděbradská 335, 530 09 Pardubice VII', o: '3', d: '60' },
    { n: 'Dušek', s: 'Dubina', a: 'Jana Zajíce 982, 530 12 Pardubice III', o: '5', d: '90' },
    { n: 'Pravoslav', s: 'Pardubičky', a: 'Průmyslová 462, 530 03 Pardubice IV-Pardubičky', o: '7', d: '120' },
    { n: 'Drahomíra', s: 'Dukla', a: 'Chrudimská 1315, 530 02 Pardubice V-Zelené Předměstí', o: '8', d: '150' },
    { n: 'Filip', s: 'Fajn', a: 'Žižkova 770, 530 06 Pardubice VI', o: '6', d: '100' },
    { n: 'Jakub', s: 'Kubík', a: 'Kostnická 495, 530 06 Pardubice VI-Svítkov', o: '4', d: '90' },
    { n: 'Petr', s: 'Pilař', a: 'Žižkova 23, 530 06 Pardubice VI', o: '2', d: '45' },
  ];

  const formatForView = (data: any[]) => data.map(d => ({...d, a: d.a.length > 30 ? d.a.substring(0, 30) + '...' : d.a}));

  const visualData1 = formatForView(excelData1);
  const visualData2 = formatForView(excelData2);

  const handleTestClick = (dataset: typeof excelData1) => {
    const mappedData = dataset.map(row => ({
      name: row.n,
      surname: row.s,
      address: row.a,
      order: parseInt(row.o),
      visitDuration: parseInt(row.d)
    }));
    onLoadSampleData(mappedData);
    onClose();
  };

  const renderPreviewTable = (data: any[]) => (
    <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden bg-white dark:bg-gray-900 shadow-sm relative">
        <div className="bg-[#217346] text-white px-3 py-1 text-xs font-bold flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            Excel Structure (Flexible)
        </div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    <th className="p-1 border-r border-b border-gray-300 dark:border-gray-600 w-8 text-center bg-gray-200 dark:bg-gray-700"></th> 
                    <th className="p-1 border-r border-b border-gray-300 dark:border-gray-600 font-normal w-24 text-center">A</th>
                    <th className="p-1 border-r border-b border-gray-300 dark:border-gray-600 font-normal w-24 text-center">B</th>
                    <th className="p-1 border-r border-b border-gray-300 dark:border-gray-600 font-normal text-center">C</th>
                    <th className="p-1 border-r border-b border-gray-300 dark:border-gray-600 font-normal w-16 text-center text-gray-400">D (Opt)</th>
                    <th className="p-1 border-b border-gray-300 dark:border-gray-600 font-normal w-16 text-center text-gray-400">E (Opt)</th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                <tr>
                    <td className="p-1 border-r border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-center text-gray-500">1</td>
                    <td className="p-1 border-r border-b border-gray-300 dark:border-gray-600 font-bold bg-gray-50 dark:bg-gray-800/50">Name</td>
                    <td className="p-1 border-r border-b border-gray-300 dark:border-gray-600 font-bold bg-gray-50 dark:bg-gray-800/50">Surname</td>
                    <td className="p-1 border-r border-b border-gray-300 dark:border-gray-600 font-bold bg-gray-50 dark:bg-gray-800/50">Address</td>
                    <td className="p-1 border-r border-b border-gray-300 dark:border-gray-600 font-bold bg-gray-50/50 dark:bg-gray-800/30 text-right text-gray-500">Order</td>
                    <td className="p-1 border-b border-gray-300 dark:border-gray-600 font-bold bg-gray-50/50 dark:bg-gray-800/30 text-right text-gray-500">Duration</td>
                </tr>
                {data.map((row, i) => (
                    <tr key={i}>
                        <td className="p-1 border-r border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-center text-gray-500">{i + 2}</td>
                        <td className="p-1 border-r border-b border-gray-300 dark:border-gray-600">{row.n}</td>
                        <td className="p-1 border-r border-b border-gray-300 dark:border-gray-600">{row.s}</td>
                        <td className="p-1 border-r border-b border-gray-300 dark:border-gray-600 truncate max-w-[150px]" title={row.a}>{row.a}</td>
                        <td className="p-1 border-r border-b border-gray-300 dark:border-gray-600 text-right text-gray-500">{row.o}</td>
                        <td className="p-1 border-b border-gray-300 dark:border-gray-600 text-right text-gray-500">{row.d}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4">
      {/* 2x Wider Modal: Increased max-width */}
      <div 
        ref={nodeRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-[95vw] md:max-w-[85vw] max-h-[90vh] overflow-y-auto animate-fade-in-up transition-colors p-6 relative flex flex-col"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 z-10">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 ref={handleRef} className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2 border-b dark:border-gray-700 pb-2 select-none">
            <span className="text-google-blue">{t.appTitle}</span> - {t.helpTitle}
        </h2>

        <div className="space-y-8 text-gray-700 dark:text-gray-300 flex-grow">
            
            {/* Prerequisites */}
            <section className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {t.helpPrereqTitle}
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-sm mb-4">
                    <li><strong>Google API:</strong> {t.helpPrereqApiKey}</li>
                    <li><strong>Excel:</strong> {t.helpPrereqExcel}</li>
                </ul>
                
                <div className="flex flex-col md:flex-row gap-6 mt-6">
                  {/* Example 1 */}
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t.btnExample1}</span>
                      <button 
                        onClick={() => handleTestClick(excelData1)}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded shadow-sm text-xs flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                      >
                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         {t.btnTryIt}
                      </button>
                    </div>
                    {renderPreviewTable(visualData1)}
                  </div>

                  {/* Example 2 */}
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t.btnExample2}</span>
                       <button 
                        onClick={() => handleTestClick(excelData2)}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-1 px-3 rounded shadow-sm text-xs flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                      >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {t.btnTryIt}
                      </button>
                    </div>
                    {renderPreviewTable(visualData2)}
                  </div>
                </div>
            </section>

            {/* Vertical Stack Layout */}
            <div className="flex flex-col gap-6">
                
                {/* Core Logic */}
                <section>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-l-4 border-orange-500 pl-3">
                        {t.helpLogicTitle}
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-sm space-y-4">
                         
                         <div className="flex items-start gap-2">
                            <div className="mt-1"><ButtonBadge variant="orange" icon={Icons.clients} text={t.clientDb} /></div>
                            <div className="mt-2 text-gray-600 dark:text-gray-400">{t.helpLogicClients}</div>
                         </div>
                         
                         <div className="flex items-start gap-2">
                            <div className="mt-1"><ButtonBadge variant="teal-outline" icon={Icons.importPlan} text={t.importPlan} /></div>
                            <div className="mt-2 text-gray-600 dark:text-gray-400">{t.helpLogicImportPlan}</div>
                         </div>

                         <div className="pl-2 pt-2 border-t dark:border-gray-600">
                             <ul className="list-disc pl-4 space-y-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                                {(t.helpLogicStartup as string[]).map((line, i) => (
                                    <li key={i}>{line}</li>
                                ))}
                             </ul>
                         </div>
                    </div>
                </section>

                {/* Calculation Modes */}
                <section>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-l-4 border-gray-500 pl-3">
                        {t.helpCalcTitle}
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-sm space-y-4">
                         
                         <div className="flex items-start gap-2">
                            <div className="mt-1"><ButtonBadge variant="google-blue" icon={Icons.precalc} text={t.precalc} /></div>
                            <div className="mt-2 text-gray-600 dark:text-gray-400">{t.helpCalcPrecalc}</div>
                         </div>

                         <div className="flex items-start gap-2">
                            <div className="mt-1"><ButtonBadge variant="green" icon={Icons.optimal} text={t.optimal} /></div>
                            <div className="mt-2 text-gray-600 dark:text-gray-400">{t.helpCalcOptimal}</div>
                         </div>

                         <div className="flex items-start gap-2">
                            <div className="mt-1"><ButtonBadge variant="standard-white" icon={Icons.calculate} text={t.calculate} /></div>
                            <div className="mt-2 text-gray-600 dark:text-gray-400">{t.helpCalcCalculate}</div>
                         </div>

                         <div className="flex items-start gap-2">
                            <div className="mt-1"><ButtonBadge variant="gray" icon={Icons.validate} text={t.validate} /></div>
                            <div className="mt-2 text-gray-600 dark:text-gray-400">{t.helpCalcValidate}</div>
                         </div>
                    </div>
                </section>

                {/* Mouse Controls */}
                <section>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-l-4 border-purple-500 pl-3">
                        {t.helpMouseTitle}
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-sm">
                         <ul className="list-disc pl-4 space-y-2 text-gray-600 dark:text-gray-400 leading-relaxed">
                            {(t.helpMouseContent as string[]).map((line, i) => (
                                <li key={i}>{line}</li>
                            ))}
                         </ul>
                    </div>
                </section>

                {/* Features Expansion */}
                <section>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-l-4 border-google-blue pl-3">
                        {t.helpFeaturesTitle}
                    </h3>
                    <div className="space-y-4 text-sm">
                        
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex items-start gap-3">
                            <div className="mt-0.5"><ButtonBadge variant="teal-solid" icon={Icons.visualize} text={t.visualize} /></div>
                            <p className="text-gray-600 dark:text-gray-400 pt-1.5">{t.helpFeatVisualize}</p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex items-start gap-3">
                            <div className="mt-0.5"><ButtonBadge variant="white-border" icon={Icons.savedRoutes} text={t.savedRoutes} /></div>
                            <p className="text-gray-600 dark:text-gray-400 pt-1.5">{t.helpFeatRoutes}</p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                            <span className="font-bold text-green-600 block mb-1">LMOD Cache</span>
                            <p className="text-gray-600 dark:text-gray-400">{t.helpFeatCache}</p>
                        </div>

                         <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                            <span className="font-bold text-red-600 block mb-1">Factory Reset / Validation</span>
                            <p className="text-gray-600 dark:text-gray-400">{t.helpFeatReset}</p>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">{t.helpFeatValidation}</p>
                        </div>
                    </div>
                </section>
            </div>

             {/* Tips */}
             <section className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-100 dark:border-green-800">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    {t.helpTipsTitle}
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                    <li><strong>Backup/Restore:</strong> {t.helpTipExport}</li>
                    <li><strong>Economy:</strong> {t.helpTipLmod}</li>
                </ul>
            </section>
        </div>

        <div className="mt-8 flex flex-col md:flex-row justify-between items-center border-t dark:border-gray-700 pt-4 gap-4">
            <div className="flex items-center gap-3 w-full md:w-1/3 justify-center md:justify-start">
                <span className="text-xs text-gray-400 font-mono italic">{t.footerBrand}</span>
                <button 
                    onClick={handleCheckUpdates} 
                    className="px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded transition-colors shadow-sm"
                >
                    {t.btnCheckUpdates}
                </button>
            </div>
            
            <div className="flex flex-col items-center text-sm text-gray-400 font-mono italic text-center w-full md:w-1/3">
                <span>Copyright © 2025 - {new Date().getFullYear()} <a href="mailto:capsky.jakub@gmail.com" className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors">capsky.jakub@gmail.com</a></span>
                <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" className="hover:text-google-blue transition-colors mt-0.5">
                    Licensed under GNU AGPLv3
                </a>
            </div>

            <div className="w-full md:w-1/3 flex justify-center md:justify-end">
                <button onClick={onClose} className="px-8 py-2 bg-google-blue hover:bg-blue-700 text-white rounded-lg font-bold transition-all shadow-md transform hover:scale-105 active:scale-95">
                  {t.close}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};