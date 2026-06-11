/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Percent, BookOpen, Share2, Check, Filter } from 'lucide-react';

interface PriceRow {
  id: number;
  direction: string; // Yo'nalish nomi
  degree: string;    // Darajasi
  form: string;      // Ta'lim shakli
  language: string;  // Tili
  price: number;     // Narxi (so'm)
  duration: string;  // Muddati
}

// Flat structure corresponding directly to the PDF data format
const UNIVERSITY_PRICES: PriceRow[] = [
  // 1. Kompyuter injiniringi
  { id: 1, direction: "Kompyuter injiniringi (IT, Tizimlar, Tarmoqlar)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 18000000, duration: "4 yil" },
  { id: 2, direction: "Kompyuter injiniringi (IT, Tizimlar, Tarmoqlar)", degree: "Bakalavr", form: "Sirtqi", language: "O'zbek / Rus", price: 12000000, duration: "5 yil" },
  { id: 3, direction: "Kompyuter injiniringi (IT, Tizimlar, Tarmoqlar)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 14000000, duration: "4 yil" },
  
  // 2. Dasturiy injiniring
  { id: 4, direction: "Dasturiy injiniring (Software Engineering)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 18000000, duration: "4 yil" },
  { id: 5, direction: "Dasturiy injiniring (Software Engineering)", degree: "Bakalavr", form: "Sirtqi", language: "O'zbek / Rus", price: 12000000, duration: "5 yil" },
  { id: 6, direction: "Dasturiy injiniring (Software Engineering)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 14000000, duration: "4 yil" },

  // 3. Moliya va moliyaviy texnologiyalar
  { id: 7, direction: "Moliya va moliyaviy texnologiyalar (FinTech)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 16000000, duration: "4 yil" },
  { id: 8, direction: "Moliya va moliyaviy texnologiyalar (FinTech)", degree: "Bakalavr", form: "Sirtqi", language: "O'zbek / Rus", price: 10000000, duration: "5 yil" },
  { id: 9, direction: "Moliya va moliyaviy texnologiyalar (FinTech)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 12000000, duration: "4 yil" },

  // 4. Iqtisodiyot
  { id: 10, direction: "Iqtisodiyot (Tarmoqlar va sohalar bo'yicha)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 16000000, duration: "4 yil" },
  { id: 11, direction: "Iqtisodiyot (Tarmoqlar va sohalar bo'yicha)", degree: "Bakalavr", form: "Sirtqi", language: "O'zbek / Rus", price: 10000000, duration: "5 yil" },
  { id: 12, direction: "Iqtisodiyot (Tarmoqlar va sohalar bo'yicha)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 12000000, duration: "4 yil" },

  // 5. Buxgalteriya hisobi va audit
  { id: 13, direction: "Buxgalteriya hisobi va audit (Barcha sohalar)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 15000000, duration: "4 yil" },
  { id: 14, direction: "Buxgalteriya hisobi va audit (Barcha sohalar)", degree: "Bakalavr", form: "Sirtqi", language: "O'zbek / Rus", price: 10500000, duration: "5 yil" },
  { id: 15, direction: "Buxgalteriya hisobi va audit (Barcha sohalar)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 12000000, duration: "4 yil" },

  // 6. Yurisprudensiya
  { id: 16, direction: "Yurisprudensiya (Huquqshunoslik)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 22000000, duration: "4 yil" },
  { id: 17, direction: "Yurisprudensiya (Huquqshunoslik)", degree: "Bakalavr", form: "Sirtqi", language: "O'zbek / Rus", price: 15000000, duration: "5 yil" },
  { id: 18, direction: "Yurisprudensiya (Huquqshunoslik)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 17000000, duration: "4 yil" },

  // 7. Boshlang'ich ta'lim
  { id: 19, direction: "Boshlang'ich ta'lim (Metodika va nazariya)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 13000000, duration: "4 yil" },
  { id: 20, direction: "Boshlang'ich ta'lim (Metodika va nazariya)", degree: "Bakalavr", form: "Sirtqi", language: "O'zbek / Rus", price: 9000000, duration: "5 yil" },
  { id: 21, direction: "Boshlang'ich ta'lim (Metodika va nazariya)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 10500000, duration: "4 yil" },

  // 8. Maktabgacha ta'lim
  { id: 22, direction: "Maktabgacha ta'lim (Pedagogika)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 12000000, duration: "4 yil" },
  { id: 23, direction: "Maktabgacha ta'lim (Pedagogika)", degree: "Bakalavr", form: "Sirtqi", language: "O'zbek / Rus", price: 8500000, duration: "5 yil" },
  { id: 24, direction: "Maktabgacha ta'lim (Pedagogika)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 10000000, duration: "4 yil" },

  // 9. Pedagogika va psixologiya
  { id: 25, direction: "Pedagogika va psixologiya (Amaliy psixologiya)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 13500000, duration: "4 yil" },
  { id: 26, direction: "Pedagogika va psixologiya (Amaliy psixologiya)", degree: "Bakalavr", form: "Sirtqi", language: "O'zbek / Rus", price: 9500000, duration: "5 yil" },
  { id: 27, direction: "Pedagogika va psixologiya (Amaliy psixologiya)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 10500000, duration: "4 yil" },

  // 10. Ingliz tili va adabiyoti
  { id: 28, direction: "Ingliz tili va adabiyoti (Filologiya)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 14000000, duration: "4 yil" },
  { id: 29, direction: "Ingliz tili va adabiyoti (Filologiya)", degree: "Bakalavr", form: "Sirtqi", language: "O'zbek / Rus", price: 9000000, duration: "5 yil" },
  { id: 30, direction: "Ingliz tili va adabiyoti (Filologiya)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 11000000, duration: "4 yil" },

  // 11. Koreys tili va adabiyoti
  { id: 31, direction: "Koreys tili va adabiyoti (Sharq filologiyasi)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 15000000, duration: "4 yil" },
  { id: 32, direction: "Koreys tili va adabiyoti (Sharq filologiyasi)", degree: "Bakalavr", form: "Sirtqi", language: "O'zbek / Rus", price: 10000000, duration: "5 yil" },
  { id: 33, direction: "Koreys tili va adabiyoti (Sharq filologiyasi)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 12000000, duration: "4 yil" },

  // 12. Turizm va mehmondo'stlik
  { id: 34, direction: "Turizm va mehmondo'stlik (Tourism & Hospitality)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 14500000, duration: "4 yil" },
  { id: 35, direction: "Turizm va mehmondo'stlik (Tourism & Hospitality)", degree: "Bakalavr", form: "Sirtqi", language: "O'zbek / Rus", price: 10000000, duration: "5 yil" },
  { id: 36, direction: "Turizm va mehmondo'stlik (Tourism & Hospitality)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 11500000, duration: "4 yil" },

  // 13. Tarix
  { id: 37, direction: "Tarix (Mamlakatlar va yo'nalishlar bo'yicha)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 13000000, duration: "4 yil" },
  { id: 38, direction: "Tarix (Mamlakatlar va yo'nalishlar bo'yicha)", degree: "Bakalavr", form: "Sirtqi", language: "O'zbek / Rus", price: 9000000, duration: "5 yil" },
  { id: 39, direction: "Tarix (Mamlakatlar va yo'nalishlar bo'yicha)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 10500000, duration: "4 yil" },

  // 14. Menejment
  { id: 40, direction: "Menejment (Biznes boshqaruvi va boshqaruv)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 15000000, duration: "4 yil" },
  { id: 41, direction: "Menejment (Biznes boshqaruvi va boshqaruv)", degree: "Bakalavr", form: "Sirtqi", language: "O'zbek / Rus", price: 10000000, duration: "5 yil" },
  { id: 42, direction: "Menejment (Biznes boshqaruvi va boshqaruv)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 11500000, duration: "4 yil" },

  // 15. Farmatsiya
  { id: 43, direction: "Farmatsiya (Klinik va sanoat farmatsiyasi)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 20000000, duration: "5 yil" },
  { id: 44, direction: "Farmatsiya (Klinik va sanoat farmatsiyasi)", degree: "Bakalavr", form: "Kechki", language: "O'zbek / Rus", price: 16000000, duration: "5 yil" },

  // 16. Davolash ishi
  { id: 45, direction: "Davolash ishi (Meditsina / Terapiya)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 24000000, duration: "6 yil" },

  // 17. Stomatologiya
  { id: 46, direction: "Stomatologiya (Mijozlar stomatologiyasi)", degree: "Bakalavr", form: "Kunduzgi", language: "O'zbek / Rus", price: 26000000, duration: "5 yil" }
];

export const PricesPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<number | null>(null);

  const formatCost = (val: number) => {
    return `${val.toLocaleString('uz-UZ')} so'm`;
  };

  const handleCopyValue = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyShare = (row: PriceRow) => {
    const text = `Yo'nalish: ${row.direction}\nDarajasi: ${row.degree}\nTa'lim shakli: ${row.form}\nTili: ${row.language}\nNarxi: ${formatCost(row.price)}\nMuddati: ${row.duration}`;
    navigator.clipboard.writeText(text);
    setCopiedShareId(row.id);
    setTimeout(() => setCopiedShareId(null), 2000);
  };

  // Filter prices dynamically
  const filteredPrices = UNIVERSITY_PRICES.filter(row => {
    const matchesSearch = 
      row.direction.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.degree.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.duration.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesForm = selectedForm === 'all' || row.form === selectedForm;
    const matchesLanguage = selectedLanguage === 'all' || row.language.includes(selectedLanguage);

    return matchesSearch && matchesForm && matchesLanguage;
  });

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col h-full animate-fade-in" id="prices-panel-main">
      
      {/* Visual Header Banner */}
      <div className="p-4 bg-emerald-605/10 bg-opacity-10 dark:bg-emerald-950/20 border-b border-neutral-150 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
            <BookOpen size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
              Ta'lim Yo'nalishlari va Narxlari
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
              Faqat so'ralgan yo'nalishlar, darajasi, ta'lim shakllari, o'qitish tillari va kontrakt narxlari ro'yxati
            </p>
          </div>
        </div>

        {/* Promo notification badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/30 rounded-xl text-[10px] text-amber-800 dark:text-amber-300 font-bold">
          <Percent size={13} className="text-amber-550 shrink-0" />
          <span>Ta'lim krediti imkoniyati mavjud!</span>
        </div>
      </div>

      {/* Control Actions Area (Search & Form / Language Filters) */}
      <div className="p-4 border-b border-neutral-150 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-col lg:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            <Search size={14} />
          </span>
          <input
            id="prices-search-input"
            type="text"
            placeholder="Yo'nalish nomi yoki darajasi bo'yicha qidirish..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-neutral-800 dark:text-neutral-100"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 animate-fade-in" id="prices-filters-wrapper">
          {/* Ta'lim shakli Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-550 whitespace-nowrap">Shakli:</span>
            <select
              id="form-filter-select"
              value={selectedForm}
              onChange={(e) => setSelectedForm(e.target.value)}
              className="text-xs py-1.5 px-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-705 dark:text-neutral-200 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 min-w-[100px]"
            >
              <option value="all">Barchasi</option>
              <option value="Kunduzgi">Kunduzgi</option>
              <option value="Sirtqi">Sirtqi</option>
              <option value="Kechki">Kechki</option>
            </select>
          </div>

          {/* Tili Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-550 whitespace-nowrap">Tili:</span>
            <select
              id="language-filter-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="text-xs py-1.5 px-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-705 dark:text-neutral-200 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 min-w-[100px]"
            >
              <option value="all">Barchasi</option>
              <option value="O'zbek">O'zbek tili</option>
              <option value="Rus">Rus tili</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Tabular / List Grid Section */}
      <div className="flex-1 overflow-auto p-4 max-h-[580px] custom-scrollbar" id="prices-table-container">
        {filteredPrices.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center select-none border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/10" id="prices-no-data">
            <span className="text-3xl mb-1">🔍</span>
            <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Ma'lumot topilmadi</h4>
            <p className="text-[10px] text-neutral-450 max-w-xs mt-1">
              Qidiruv shartlariga mos keladigan ta'lim yo'nalishi topilmadi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs" id="prices-table-wrapper">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 select-none font-mono text-[10px] font-black uppercase text-neutral-500 dark:text-neutral-450">
                  <th className="p-3 w-10 text-center border-r border-neutral-205 dark:border-neutral-800">#</th>
                  <th className="p-3 border-r border-neutral-205 dark:border-neutral-800">Yo'nalish nomi</th>
                  <th className="p-3 border-r border-neutral-205 dark:border-neutral-800 text-center">Darajasi</th>
                  <th className="p-3 border-r border-neutral-205 dark:border-neutral-800 text-center">Ta'lim shakli</th>
                  <th className="p-3 border-r border-neutral-205 dark:border-neutral-800 text-center">Tili</th>
                  <th className="p-3 border-r border-neutral-205 dark:border-neutral-800 text-center">Narxi (so'm)</th>
                  <th className="p-3 text-center">Muddati</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredPrices.map((row, index) => {
                  const isCopied = copiedId === row.id;
                  const isCopiedShare = copiedShareId === row.id;
                  
                  return (
                    <tr 
                      key={row.id}
                      id={`price-row-${row.id}`}
                      className="transition-colors group"
                    >
                      {/* Index */}
                      <td className="p-2.5 text-center border-r border-neutral-150 dark:border-neutral-800 font-mono text-[10px] font-bold text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
                        {index + 1}
                      </td>

                      {/* Heading: Yo'nalish nomi */}
                      <td className="p-2.5 border-r border-neutral-150 dark:border-neutral-800 font-semibold text-neutral-800 dark:text-neutral-100">
                        <div className="flex flex-col gap-0.5">
                          <span className="select-all break-words leading-tight">{row.direction}</span>
                          <span className="text-[9px] text-neutral-400 group-hover:text-emerald-600 transition-colors cursor-pointer select-none font-bold" onClick={() => handleCopyShare(row)}>
                            {isCopiedShare ? "✓ Ma'lumot nusxalandi!" : "📋 Ma'lumotlarni nusxalash"}
                          </span>
                        </div>
                      </td>

                      {/* Field: Darajasi */}
                      <td className="p-2.5 border-r border-neutral-150 dark:border-neutral-800 text-center text-neutral-750 dark:text-neutral-300 font-bold">
                        <span className="px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] uppercase font-mono tracking-wider">
                          {row.degree}
                        </span>
                      </td>

                      {/* Field: Ta'lim shakli */}
                      <td className="p-2.5 border-r border-neutral-150 dark:border-neutral-800 text-center font-extrabold">
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                          row.form === 'Kunduzgi' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' 
                            : row.form === 'Sirtqi' 
                              ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400'
                              : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400'
                        }`}>
                          {row.form}
                        </span>
                      </td>

                      {/* Field: Tili */}
                      <td className="p-2.5 border-r border-neutral-150 dark:border-neutral-800 text-center font-medium text-neutral-700 dark:text-neutral-300">
                        {row.language}
                      </td>

                      {/* Field: Narxi (so'm) */}
                      <td 
                        onClick={() => handleCopyValue(row.price.toString(), row.id)}
                        className="p-2.5 border-r border-neutral-150 dark:border-neutral-800 text-center font-mono font-black text-xs text-neutral-800 dark:text-neutral-100 hover:bg-emerald-500/10 hover:text-emerald-605 cursor-pointer transition-all active:scale-95"
                        title="Qiymatning o'zini nusxalash uchun bosing"
                      >
                        <div className="flex items-center justify-center gap-1 flex-nowrap">
                          <span className="text-emerald-700 dark:text-emerald-405">{formatCost(row.price)}</span>
                          {isCopied && (
                            <span className="text-[9px] font-sans font-black text-emerald-500 animate-pulse shrink-0">✓</span>
                          )}
                        </div>
                      </td>

                      {/* Field: Muddati */}
                      <td className="p-2.5 text-center font-bold text-neutral-600 dark:text-neutral-450 font-mono text-[10px]">
                        {row.duration}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Footer Summary */}
      <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-500 font-mono text-center select-none flex flex-wrap items-center justify-center gap-4" id="prices-panel-footer">
        <span>🔹 Narx ustunidagi qiymatni shunchaki **bir marta bosib** miqdorni nusxalashingiz mumkin!</span>
        <span>🔹 Jami ta'lim yo'nalishlari soni: <strong>{UNIVERSITY_PRICES.length} ta</strong></span>
      </div>

    </div>
  );
};
