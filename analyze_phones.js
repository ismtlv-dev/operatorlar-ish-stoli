import XLSX from 'xlsx';

function normalizeTel(raw) {
  let t = String(raw || '').replace(/[^0-9]/g, '').trim();
  if (!t) return '';
  if (t.length === 9) t = '998' + t;
  if (t.length === 11 && t.startsWith('8')) t = '998' + t.slice(1);
  if (t.length === 12 && t.startsWith('998')) return t;
  return t;
}

const wb = XLSX.readFile('Sirdaryo_1500_jadval.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

const phoneCounts = {};
const duplicates = [];
const uniqueRecords = [];

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  const telRaw = row[3];
  const tel = normalizeTel(telRaw);
  if (!tel) continue;
  
  phoneCounts[tel] = (phoneCounts[tel] || 0) + 1;
  if (phoneCounts[tel] === 1) {
    uniqueRecords.push({
      no: i,
      viloyat: row[1],
      tugulganSana: row[2],
      tel: tel,
      izoh: row[4]
    });
  } else {
    duplicates.push({ row: i, tel: tel, original: telRaw });
  }
}

console.log('Total Rows (excluding header):', data.length - 1);
console.log('Total Unique Phones:', uniqueRecords.length);
console.log('Duplicate Phones found:', duplicates.length);
if (duplicates.length > 0) {
  console.log('First 5 duplicates:', duplicates.slice(0, 5));
}
