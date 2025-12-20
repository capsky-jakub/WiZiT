
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

        rawData.forEach((row: any[], index: number) => {
          // Always skip the first row (Header)
          if (index === 0) return;

          // Expecting columns: 0=Name, 1=Surname, 2=Addr | Optional: 3=Order, 4=Duration
          // Allow minimum 3 columns
          if (row.length < 3) return;
          
          const name = String(row[0] || '').trim();
          const surname = String(row[1] || '').trim();
          const address = String(row[2] || '').trim();

          // Skip empty rows where address is missing
          if (!address) return;

          // Parse Optional Order (Col 3)
          let orderVal = 0;
          if (row.length > 3) {
              const pOrder = parseInt(row[3]);
              if (!isNaN(pOrder)) orderVal = pOrder;
          }

          // Parse Optional Duration (Col 4)
          let durationVal = 0;
          if (row.length > 4) {
              const pDuration = row[4] ? parseInt(row[4]) : 0;
              if (!isNaN(pDuration)) durationVal = pDuration;
          }
          
          parsedVisits.push({
            name,
            surname,
            address,
            order: orderVal,
            visitDuration: durationVal
          });
        });

        if (parsedVisits.length === 0) {
          reject(new Error("No valid visits found. File must contain a header row and at least one data row with: Name, Surname, Address."));
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