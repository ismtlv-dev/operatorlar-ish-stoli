import XLSX from 'xlsx';

const wb = XLSX.readFile('Sirdaryo_1500_jadval.xlsx');
console.log('SheetNames:', wb.SheetNames);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
console.log('Rows count:', data.length);
console.log('First 10 rows:');
for (let i = 0; i < Math.min(15, data.length); i++) {
  console.log(`Row ${i}:`, data[i]);
}
