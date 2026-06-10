/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Operator, SchoolRecord } from '../types';
import { UploadCloud, CheckCircle2, FileSpreadsheet, AlertTriangle, Play, HelpCircle, X } from 'lucide-react';

interface ExcelImportProps {
  operators: Operator[];
  onImportRecords: (operatorId: string, records: Omit<SchoolRecord, 'id'>[]) => void;
}

export const ExcelImport: React.FC<ExcelImportProps> = ({ operators = [], onImportRecords }) => {
  const [selectedOpId, setSelectedOpId] = useState<string>(operators[0]?.id || '1');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{ [key: string]: number }>({
    viloyat: -1, fish: -1, tugulganSana: -1, tel: -1, telQoshimcha: -1
  });
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (rawJson.length === 0) { alert("Excel fayli bo'sh!"); return; }

        const headerRow = rawJson[0] || [];
        const headerStrings = headerRow.map((h, index) => h ? String(h).trim() : `Ustun ${index + 1}`);
        setHeaders(headerStrings);
        setParsedRows(rawJson.slice(1));

        const newMapping: { [key: string]: number } = { viloyat: -1, fish: -1, tugulganSana: -1, tel: -1, telQoshimcha: -1 };
        headerStrings.forEach((hdr, idx) => {
          const l = hdr.toLowerCase();
          if (l.includes('viloyat') || l.includes('tuman') || l.includes('hudud') || l.includes('region')) newMapping.viloyat = idx;
          else if (l.includes('familiya') || l.includes('ism') || l.includes('f.i.sh') || l.includes('fish') || l.includes('name') || l.includes('sharif')) newMapping.fish = idx;
          else if (l.includes('tugulgan') || l.includes('sana') || l.includes('birth') || l.includes('date')) newMapping.tugulganSana = idx;
          else if (l.includes('qoshimcha') || l.includes('qo\'shimcha') || l.includes('extra') || l.includes('second')) newMapping.telQoshimcha = idx;
          else if (l.includes('tel') || l.includes('raqam') || l.includes('telefon') || l.includes('phone')) {
            if (l.includes('qoshimcha') || l.includes('qo\'shimcha')) {
              newMapping.telQoshimcha = idx;
            } else {
              newMapping.tel = idx;
            }
          }
        });
        setMapping(newMapping);
      } catch (err: any) {
        alert("Faylni o'qishda xatolik: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleMapChange = (key: string, colIdx: number) => {
    setMapping(prev => ({ ...prev, [key]: colIdx }));
  };

  const getPreviewRecords = (): Omit<SchoolRecord, 'id'>[] => {
    return parsedRows.slice(0, 5).map((row, index) => {
      const getVal = (key: string) => {
        const idx = mapping[key];
        return idx !== undefined && idx >= 0 && row[idx] !== undefined ? String(row[idx]).trim() : '';
      };
      return { 
        no: index + 1, 
        viloyat: getVal('viloyat'), 
        fish: getVal('fish'), 
        tugulganSana: getVal('tugulganSana') || 'Kiritilmagan', 
        tel: getVal('tel'), 
        telQoshimcha: getVal('telQoshimcha'), 
        natija: '', 
        izoh: '' 
      };
    });
  };

  const handleImportSubmit = () => {
    if (mapping.viloyat === -1 || mapping.fish === -1 || mapping.tel === -1) {
      alert("Iltimos, asosiy maydonlarni (Viloyat, F.I.Sh va Telefon) Excel ustunlariga moslang!");
      return;
    }
    const targetOp = operators.find(op => op.id === selectedOpId);
    if (!targetOp) return;

    const formattedRecords: Omit<SchoolRecord, 'id'>[] = parsedRows.map((row, index) => {
      const getVal = (key: string) => {
        const idx = mapping[key];
        return idx !== undefined && idx >= 0 && row[idx] !== undefined ? String(row[idx]).trim() : '';
      };
      return { 
        no: index + 1, 
        viloyat: getVal('viloyat') || 'Kiritilmagan', 
        fish: getVal('fish') || 'Kiritilmagan', 
        tugulganSana: getVal('tugulganSana') || 'Kiritilmagan', 
        tel: getVal('tel') || 'Kiritilmagan', 
        telQoshimcha: getVal('telQoshimcha') || 'Kiritilmagan', 
        natija: '', 
        izoh: '' 
      };
    });

    if (window.confirm(`"${targetOp.name}" operatoriga ${formattedRecords.length} ta ma'lumot yuklanadi. Davom etasizmi?`)) {
      onImportRecords(selectedOpId, formattedRecords);
      setFileName(''); setParsedRows([]); setHeaders([]);
    }
  };

  const previewRecords = getPreviewRecords();
  const requiredMapped = mapping.viloyat >= 0 && mapping.fish >= 0 && mapping.tel >= 0;

  const selectClass = "w-full bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 p-1.5 rounded border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs";

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 md:p-6 shadow-sm max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
          <FileSpreadsheet className="text-emerald-600 dark:text-emerald-400" size={20} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Excel / CSV fayldan operator jadvallarini yuklash</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Faylni yuklang, ustunlarni moslang va import qiling</p>
        </div>
      </div>

      {/* Operator selector */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
          📋 Yuklash uchun operator tanlang:
        </label>
        <select
          className="w-full text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          value={selectedOpId}
          onChange={(e) => setSelectedOpId(e.target.value)}
        >
          {operators.map(op => (
            <option key={op.id} value={op.id}>{op.name} — {op.records?.length || 0} ta ma'lumot</option>
          ))}
        </select>
      </div>

      {/* Dropzone */}
      {!fileName ? (
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
          }`}
          onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
          <UploadCloud className={`mx-auto mb-3 transition-colors ${dragActive ? 'text-emerald-500' : 'text-neutral-400 dark:text-neutral-500'}`} size={44} />
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Faylni bu yerga sudrab tashlang yoki bosing</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Qo'llab-quvvatlanadi: .xlsx, .xls, .csv</p>
        </div>
      ) : (
        <div className="space-y-5 animate-fade-in-up">
          {/* File indicator */}
          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 truncate">{fileName}</span>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 shrink-0">({parsedRows.length} qator)</span>
            </div>
            <button
              onClick={() => { setFileName(''); setParsedRows([]); setHeaders([]); }}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0 ml-2"
              title="Faylni o'chirish"
            >
              <X size={16} />
            </button>
          </div>

          {/* Column Mapping */}
          <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 tracking-wider mb-3 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-emerald-500" /> Ustunlarni moslash (Column Mapping)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {[
                { key: 'viloyat', label: 'Viloyati', required: true },
                { key: 'fish', label: 'Familiya Ism Sharif', required: true },
                { key: 'tel', label: 'Telefon raqami', required: true },
                { key: 'tugulganSana', label: 'Tugulgan sanasi', required: false },
                { key: 'telQoshimcha', label: 'Qo\'shimcha telefon', required: false },
              ].map(({ key, label, required }) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                    {mapping[key] >= 0 && <span className="ml-1 text-emerald-500">✓</span>}
                  </label>
                  <select
                    value={mapping[key]}
                    onChange={(e) => handleMapChange(key, parseInt(e.target.value))}
                    className={`${selectClass} ${mapping[key] >= 0 ? 'border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400/30' : ''}`}
                  >
                    <option value={-1}>{required ? '-- Tanlang *' : '-- Avtomatik --'}</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {!requiredMapped && (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle size={12} /> Majburiy (*) maydonlarni moslang
              </p>
            )}
          </div>

          {/* Preview */}
          {previewRecords.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-2">
                👁 Namuna (Dastlabki 5 ta qator):
              </h3>
              <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 text-left">
                      {['No', 'Viloyati', 'Familiya Ism Sharif', 'Tugulgan sanasi', 'Telefon raqami', 'Qo\'shimcha telefon'].map(h => (
                        <th key={h} className="p-2 font-semibold text-neutral-600 dark:text-neutral-300">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRecords.map((rec, i) => (
                      <tr key={i} className={`border-b border-neutral-100 dark:border-neutral-800 ${i % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-neutral-800'} hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors`}>
                        <td className="p-2 font-mono text-neutral-500 dark:text-neutral-400">{i + 1}</td>
                        <td className="p-2 text-neutral-700 dark:text-neutral-300 max-w-[150px] truncate">{rec.viloyat || <span className="text-red-500 dark:text-red-400">⚠ Yo'q</span>}</td>
                        <td className="p-2 font-semibold text-emerald-700 dark:text-emerald-400 max-w-[200px] truncate">{rec.fish || <span className="text-red-500 dark:text-red-400">⚠ Yo'q</span>}</td>
                        <td className="p-2 text-neutral-700 dark:text-neutral-300">{rec.tugulganSana || <span className="text-red-500 dark:text-red-400">⚠ Yo'q</span>}</td>
                        <td className="p-2 font-mono text-neutral-700 dark:text-neutral-300">{rec.tel || <span className="text-red-500 dark:text-red-400">⚠ Yo'q</span>}</td>
                        <td className="p-2 font-mono text-neutral-700 dark:text-neutral-300">{rec.telQoshimcha}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-amber-500" />
              Barcha yangi ma'lumotlarning holati "Kutilmoqda" bo'ladi
            </span>
            <button
              onClick={handleImportSubmit}
              disabled={!requiredMapped}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <Play size={13} />
              Yuklashni boshlash ({parsedRows.length} ta)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
