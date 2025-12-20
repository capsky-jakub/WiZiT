import React, { useEffect } from 'react';
import { translations, Language } from '../services/translations';
import { useDraggable } from '../hooks/useDraggable';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onLoadSampleData: (data: any[]) => void;
}

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
    { n: 'Jakub', s: 'Rákosníček', a: 'Oskara Brázdy 554, 533 51 Pardubice VII', o: '1', d: '30' },
    { n: 'Antonín', s: 'Křemílek', a: 'Poděbradská 335, 530 09 Pardubice VII', o: '3', d: '60' },
    { n: 'Jan', s: 'Vochomůrka', a: 'Jana Zajíce 982, 530 12 Pardubice III', o: '4', d: '90' },
    { n: 'Eliška', s: 'Šebestová', a: 'Průmyslová 462, 530 03 Pardubice IV-Pardubičky', o: '6', d: '120' },
    { n: 'Růžena', s: 'Šípková', a: 'Chrudimská 1315, 530 02 Pardubice V-Zelené Předměstí', o: '7', d: '150' },
  ];

  const visualData = excelData1.map(d => ({...d, a: d.a.length > 30 ? d.a.substring(0, 30) + '...' : d.a}));

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4">
      <div 
        ref={nodeRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in-up transition-colors p-6 relative flex flex-col"
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
                
                <div className="mt-4 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden bg-white dark:bg-gray-900 shadow-sm relative">
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
                            {visualData.map((row, i) => (
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
                  
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 border-t border-gray-300 dark:border-gray-600 flex flex-col md:flex-row gap-2 justify-center items-center">
                      <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mr-2">{t.btnTestIt}</span>
                      <button 
                        onClick={() => handleTestClick(excelData1)}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-4 rounded shadow-sm text-xs flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                      >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {t.btnExample1}
                      </button>
                      <button 
                        onClick={() => handleTestClick(excelData2)}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-1.5 px-4 rounded shadow-sm text-xs flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                      >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {t.btnExample2}
                      </button>
                  </div>
                </div>
            </section>

            {/* Features Expansion */}
            <section>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2 border-l-4 border-google-blue pl-3">
                    {t.helpFeaturesTitle}
                </h3>
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2 text-google-blue">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                             <h4 className="font-bold text-base">{t.savedRoutesTitle}</h4>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{t.helpFeatRoutes}</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2 text-orange-500">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             <h4 className="font-bold text-base">Auto-loader</h4>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{t.helpFeatAutoLoad}</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2 text-green-600">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                             <h4 className="font-bold text-base">LMOD Cache</h4>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{t.helpFeatCache}</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2 text-teal-600">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                             <h4 className="font-bold text-base">Visualizer</h4>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{t.helpFeatVisualize}</p>
                    </div>
                </div>
            </section>

             {/* Tips */}
             <section className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-100 dark:border-green-800">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    {t.helpTipsTitle}
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                    <li><strong>Backup/Restore:</strong> {t.helpTipExport}</li>
                    <li><strong>Economy:</strong> {t.helpTipLmod}</li>
                    <li><strong>Workflow:</strong> {t.helpTipSkip}</li>
                </ul>
            </section>
        </div>

        <div className="mt-8 flex justify-between items-center border-t dark:border-gray-700 pt-4">
            <span className="text-xs text-gray-400 font-mono italic">{t.footerBrand}</span>
            <button onClick={onClose} className="px-8 py-2 bg-google-blue hover:bg-blue-700 text-white rounded-lg font-bold transition-all shadow-md transform hover:scale-105 active:scale-95">
              {t.close}
            </button>
        </div>
      </div>
    </div>
  );
};