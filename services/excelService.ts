import { Visit } from '../types';

declare const XLSX: any;

export const parseVisitsExcel = async (file: File): Promise<Omit<Visit, 'id'>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = workbook.Sheets[firstSheetName];
        
        // header: 1 returns array of arrays
        const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        const parsedVisits: Omit<Visit, 'id'>[] = [];

        rawData.forEach((row: any[]) => {
          // Expecting columns: 0=Name, 1=Surname, 2=Addr, 3=Order, 4=Duration(optional)
          if (row.length < 4) return;
          
          const orderVal = parseInt(row[3]);
          const durationVal = row[4] ? parseInt(row[4]) : 0;
          
          // Basic validation to ensure it's a data row, not a header
          if (!isNaN(orderVal)) {
            parsedVisits.push({
              name: String(row[0] || '').trim(),
              surname: String(row[1] || '').trim(),
              address: String(row[2] || '').trim(),
              order: orderVal,
              visitDuration: isNaN(durationVal) ? 0 : durationVal
            });
          }
        });

        if (parsedVisits.length === 0) {
          reject(new Error("No valid visits found in file. Check columns: Name, Surname, Address, Order, Duration."));
        } else {
          resolve(parsedVisits);
        }

      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
};