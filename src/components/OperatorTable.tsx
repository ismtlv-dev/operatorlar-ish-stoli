/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SchoolRecord } from '../types';
import { Search, AlertCircle, Copy, Check, Send, Plus, ArrowUpDown } from 'lucide-react';

interface OperatorTableProps {
  records: SchoolRecord[];
  onUpdateRecord: (id: string, field: 'viloyat' | 'fish' | 'tugulganSana' | 'tel' | 'telQoshimcha' | 'natija' | 'izoh', value: string) => void;
  onDeleteRecord?: (id: string) => void;
  onAddRecord?: (record: Omit<SchoolRecord, 'id'>) => void;
  isAdmin?: boolean;
  highlightTerm?: string;
}

const RESULT_OPTIONS = [
  { value: 'all', label: 'Barcha holatlar' },
  { value: "Ko'tarmadi", label: "📞 Ko'tarmadi", color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300' },
  { value: "O'chirilgan", label: "📴 O'chirilgan", color: 'bg-neutral-200 text-neutral-800 border-neutral-350 dark:bg-neutral-850 dark:text-neutral-300' },
  { value: "O'ylab ko'radi", label: "🤔 O'ylab ko'radi", color: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300' },
  { value: "Maslahat qiladi", label: "👥 Maslahat qiladi", color: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300' },
  { value: "Xato raqam", label: "❌ Xato raqam", color: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300' },
  { value: "Kerak emas", label: "🚫 Kerak emas", color: 'bg-rose-200 text-red-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300' },
  { value: '', label: '⏳ Kutilmoqda', color: 'bg-neutral-100 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400' }
];

/* Custom search highlight helper */
const highlightText = (text: string, search: string) => {
  if (!text) return "";
  if (!search || !search.trim()) return <>{text}</>;
  
  const cleanSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${cleanSearch})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-neutral-900 dark:text-neutral-50 px-0.5 rounded font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export const OperatorTable: React.FC<OperatorTableProps> = ({
  records = [],
  onUpdateRecord,
  onDeleteRecord,
  onAddRecord,
  isAdmin = false,
  highlightTerm = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viloyatFilter, setViloyatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Sorting setup
  const [sortField, setSortField] = useState<'no' | 'viloyat' | 'fish' | 'tugulganSana'>('no');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Add record dialog state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newViloyat, setNewViloyat] = useState('');
  const [newFish, setNewFish] = useState('');
  const [newTugulganSana, setNewTugulganSana] = useState('');
  const [newTel, setNewTel] = useState('');
  const [newTelQoshimcha, setNewTelQoshimcha] = useState('');

  // Handle Sort
  const handleSort = (field: 'no' | 'viloyat' | 'fish' | 'tugulganSana') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Extract unique regions (Viloyat) for filtering
  const allViloyats = Array.from(new Set(records.map(r => r.viloyat).filter(Boolean)));

  // Combine search string
  const activeSearch = searchTerm.trim() || highlightTerm.trim();

  // Filter records
  const filteredRecords = records.filter(record => {
    const matchesSearch = !activeSearch || 
      (record.fish || '').toLowerCase().includes(activeSearch.toLowerCase()) ||
      (record.viloyat || '').toLowerCase().includes(activeSearch.toLowerCase()) ||
      (record.tel || '').includes(activeSearch) ||
      (record.telQoshimcha || '').includes(activeSearch) ||
      record.no.toString().includes(activeSearch) ||
      (record.tugulganSana || '').includes(activeSearch);

    const matchesViloyat = !viloyatFilter || record.viloyat === viloyatFilter;
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = record.natija === statusFilter;
    }

    return matchesSearch && matchesViloyat && matchesStatus;
  });

  // Sort records
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }

    const strA = String(valA || '').toLowerCase();
    const strB = String(valB || '').toLowerCase();

    if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
    if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Copy phone helper
  const handleCopyPhone = (id: string, phone: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    navigator.clipboard.writeText(cleanPhone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Submit new record
  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViloyat || !newFish || !newTel) {
      alert("Iltimos, asosiy maydonlarni (Viloyat, F.I.Sh va Telefon) to'ldiring!");
      return;
    }

    if (onAddRecord) {
      const nextNo = records.length > 0 ? Math.max(...records.map(r => r.no)) + 1 : 1;
      onAddRecord({
        no: nextNo,
        viloyat: newViloyat,
        fish: newFish,
        tugulganSana: newTugulganSana || 'Kiritilmagan',
        tel: newTel,
        telQoshimcha: newTelQoshimcha || 'Kiritilmagan',
        natija: '',
        izoh: ''
      });
      // clear
      setNewViloyat('');
      setNewFish('');
      setNewTugulganSana('');
      setNewTel('');
      setNewTelQoshimcha('');
      setShowAddForm(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
      
      {/* Table Controllers */}
      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-stretch sm:items-center">
          {/* Detailed Search input */}
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Ism, viloyat yoki tel..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 rounded-md border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Viloyat filter dropdown */}
          <select
            className="text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 focus:outline-none"
            value={viloyatFilter}
            onChange={(e) => setViloyatFilter(e.target.value)}
          >
            <option value="">Barcha viloyatlar</option>
            {allViloyats.map(viloyat => (
              <option key={viloyat} value={viloyat}>{viloyat}</option>
            ))}
          </select>

          {/* Status color coded filter */}
          <select
            className="text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {RESULT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Add Record Button */}
        {onAddRecord && isAdmin && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 self-stretch sm:self-auto transition-colors"
          >
            <Plus size={14} />
            Yangi ma'lumot qo'shish
          </button>
        )}
      </div>

      {/* Add Record Form Inline Modal */}
      {showAddForm && (
        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 animate-fade-in-up">
          <form onSubmit={handleCreateRecord} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Viloyat *</label>
              <input
                type="text"
                required
                placeholder="Buxoro viloyati..."
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-neutral-850 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={newViloyat}
                onChange={(e) => setNewViloyat(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Familiya Ism Sharif *</label>
              <input
                type="text"
                required
                placeholder="Adizova Nozanin..."
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-neutral-850 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={newFish}
                onChange={(e) => setNewFish(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Tugulgan sanasi</label>
              <input
                type="text"
                placeholder="DD.MM.YYYY"
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-neutral-850 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={newTugulganSana}
                onChange={(e) => setNewTugulganSana(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Telefon raqami *</label>
              <input
                type="text"
                required
                placeholder="507718335"
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-neutral-850 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={newTel}
                onChange={(e) => setNewTel(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Qo'shimcha telefon</label>
              <input
                type="text"
                placeholder="Qo'shimcha telefon..."
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-neutral-850 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={newTelQoshimcha}
                onChange={(e) => setNewTelQoshimcha(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 md:col-span-5 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded"
              >
                Saqlash
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main spreadsheet rendering */}
      <div className="overflow-x-auto border-t border-neutral-200 dark:border-neutral-800">
        <table className="w-full border-collapse text-left text-xs text-neutral-700 dark:text-neutral-300">
          <thead>
            {/* 1. Columns letters row (Google Sheets Style) */}
            <tr className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 select-none">
              <th className="bg-neutral-150/70 dark:bg-neutral-900 w-10 text-center text-[10px] font-bold text-neutral-450 dark:text-neutral-500 border-r border-b border-neutral-200 dark:border-neutral-800 p-1 font-mono">
                {/* empty top left corner */}
              </th>
              {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((letter) => (
                <th 
                  key={letter} 
                  className="bg-neutral-150/70 dark:bg-neutral-900 text-center text-[10px] font-bold text-neutral-500 dark:text-neutral-450 border-r border-b border-neutral-200 dark:border-neutral-800 p-1 font-mono"
                >
                  {letter}
                </th>
              ))}
            </tr>

            {/* 2. Spreadsheet Row 1 (Header titles) */}
            <tr className="bg-neutral-50 dark:bg-neutral-900/60 select-none">
              {/* Row Number 1 cell */}
              <td className="bg-neutral-150/70 dark:bg-neutral-900 text-center text-[10px] font-bold text-neutral-550 dark:text-neutral-450 border-r border-b border-neutral-200 dark:border-neutral-800 p-1.5 font-mono select-none">
                1
              </td>
              
              <th 
                className="p-2 font-bold text-neutral-600 dark:text-neutral-350 border-r border-b border-neutral-200 dark:border-neutral-800 cursor-pointer hover:bg-neutral-150 dark:hover:bg-neutral-800 text-center"
                onClick={() => handleSort('viloyat')}
              >
                <div className="flex items-center justify-center gap-1">
                  Viloyati <ArrowUpDown size={10} className="opacity-60" />
                </div>
              </th>

              <th 
                className="p-2 font-bold text-neutral-600 dark:text-neutral-350 border-r border-b border-neutral-200 dark:border-neutral-800 cursor-pointer hover:bg-neutral-150 dark:hover:bg-neutral-800 text-center"
                onClick={() => handleSort('fish')}
              >
                <div className="flex items-center justify-center gap-1">
                  Familiya Ism Sharif <ArrowUpDown size={10} className="opacity-60" />
                </div>
              </th>

              <th 
                className="p-2 font-bold text-neutral-600 dark:text-neutral-350 border-r border-b border-neutral-200 dark:border-neutral-800 cursor-pointer hover:bg-neutral-150 dark:hover:bg-neutral-800 text-center w-36"
                onClick={() => handleSort('tugulganSana')}
              >
                <div className="flex items-center justify-center gap-1">
                  Tugulgan sanasi <ArrowUpDown size={10} className="opacity-60" />
                </div>
              </th>

              <th className="p-2 font-bold text-neutral-600 dark:text-neutral-350 border-r border-b border-neutral-200 dark:border-neutral-800 text-center w-48">Telefon raqami</th>
              <th className="p-2 font-bold text-neutral-600 dark:text-neutral-350 border-r border-b border-neutral-200 dark:border-neutral-800 text-center w-48">Qo'shimcha telefon</th>
              <th className="p-2 font-bold text-neutral-600 dark:text-neutral-350 border-r border-b border-neutral-200 dark:border-neutral-800 text-center w-44">Natija (Holat)</th>
              <th className="p-2 font-bold text-neutral-600 dark:text-neutral-350 border-b border-neutral-200 dark:border-neutral-800 text-center w-64">IZOH</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {sortedRecords.length > 0 ? (
              sortedRecords.map((record, index) => {
                const rowNumber = index + 2; // Rows start at 2 since Row 1 is header
                const selectedOption = RESULT_OPTIONS.find(o => o.value === record.natija) || RESULT_OPTIONS[5];

                // Dynamically get spreadsheet row bg based on status
                let rowBgClass = "";
                let inputTxtClass = "text-neutral-800 dark:text-neutral-100";
                
                if (record.natija === "O'ylab ko'radi") {
                  // Beautiful soft yellow background - exactly like the user's screenshot yellow row!
                  rowBgClass = "bg-yellow-100/80 hover:bg-yellow-200/80 dark:bg-yellow-950/30 dark:hover:bg-yellow-900/40";
                  inputTxtClass = "text-yellow-900 dark:text-yellow-300 font-semibold";
                } else if (record.natija === "Maslahat qiladi") {
                  rowBgClass = "bg-sky-50/70 hover:bg-sky-100 dark:bg-sky-950/20 dark:hover:bg-sky-900/30";
                  inputTxtClass = "text-sky-900 dark:text-sky-300 font-semibold";
                } else if (record.natija === "Ko'tarmadi") {
                  rowBgClass = "bg-orange-50/70 hover:bg-orange-100/70 dark:bg-orange-950/20 dark:hover:bg-orange-900/30";
                  inputTxtClass = "text-orange-900 dark:text-orange-300 font-semibold";
                } else if (record.natija === "Xato raqam" || record.natija === "Kerak emas") {
                  rowBgClass = "bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30";
                  inputTxtClass = "text-rose-900 dark:text-rose-300 font-semibold";
                } else if (record.natija === "O'chirilgan") {
                  rowBgClass = "bg-neutral-100/50 hover:bg-neutral-150 dark:bg-neutral-900/10 dark:hover:bg-neutral-850/20";
                  inputTxtClass = "text-neutral-500 dark:text-neutral-400 font-semibold";
                } else {
                  // Default striped / clean background
                  rowBgClass = index % 2 === 1 
                    ? "bg-neutral-50/50 hover:bg-neutral-100/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900/50" 
                    : "bg-white hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900/50";
                }

                return (
                  <tr 
                    key={record.id} 
                    className={`${rowBgClass} transition-colors duration-100 group border-b border-neutral-200 dark:border-neutral-800`}
                  >
                    {/* Row Index Number Column */}
                    <td className="bg-neutral-150/70 dark:bg-neutral-900 text-center text-[10px] font-bold text-neutral-500 dark:text-neutral-450 border-r border-neutral-200 dark:border-neutral-800 p-1.5 font-mono select-none">
                      {rowNumber}
                    </td>

                    {/* Column A: Viloyati */}
                    <td className="p-0 border-r border-neutral-200 dark:border-neutral-800">
                      <input
                        type="text"
                        className={`w-full text-xs bg-transparent focus:bg-white focus:dark:bg-[#151515] px-2.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${inputTxtClass}`}
                        value={record.viloyat}
                        onChange={(e) => onUpdateRecord(record.id, 'viloyat', e.target.value)}
                      />
                    </td>

                    {/* Column B: Familiya Ism Sharif */}
                    <td className="p-0 border-r border-neutral-200 dark:border-neutral-800">
                      <input
                        type="text"
                        className={`w-full text-xs bg-transparent focus:bg-white focus:dark:bg-[#151515] px-2.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-bold ${inputTxtClass}`}
                        value={record.fish}
                        onChange={(e) => onUpdateRecord(record.id, 'fish', e.target.value)}
                      />
                    </td>

                    {/* Column C: Tugulgan sanasi */}
                    <td className="p-0 border-r border-neutral-200 dark:border-neutral-800">
                      <input
                        type="text"
                        className="w-full text-xs bg-transparent focus:bg-white focus:dark:bg-[#151515] px-2.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-mono text-neutral-800 dark:text-neutral-100"
                        value={record.tugulganSana}
                        onChange={(e) => onUpdateRecord(record.id, 'tugulganSana', e.target.value)}
                      />
                    </td>

                    {/* Column D: Telefon raqami */}
                    <td className="p-0 border-r border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center justify-between group/cell relative pr-1">
                        <input
                          type="text"
                          className="flex-1 text-xs bg-transparent focus:bg-white focus:dark:bg-[#151515] px-2.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-mono text-neutral-800 dark:text-neutral-100"
                          value={record.tel}
                          onChange={(e) => onUpdateRecord(record.id, 'tel', e.target.value)}
                        />
                        <div className="flex items-center shrink-0 ml-1">
                          <button
                            onClick={() => handleCopyPhone(record.id, record.tel)}
                            className="p-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-500 hover:text-emerald-600 hover:bg-neutral-300 dark:hover:bg-neutral-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            title="Nusxa olish"
                          >
                            {copiedId === record.id ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                          </button>
                          {(() => {
                            const cleanPhone = record.tel.replace(/[^0-9]/g, '');
                            const tgPhone = cleanPhone.length === 9 ? `998${cleanPhone}` : cleanPhone;
                            return (
                              <a
                                href={`https://t.me/+${tgPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-500 hover:text-sky-550 hover:bg-neutral-300 dark:hover:bg-neutral-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ml-1 flex items-center justify-center"
                                title="Telegram orqali bog'lanish"
                              >
                                <Send size={10} />
                              </a>
                            );
                          })()}
                        </div>
                      </div>
                    </td>

                    {/* Column E: Qo'shimcha telefon */}
                    <td className="p-0 border-r border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center justify-between group/cell relative pr-1">
                        <input
                          type="text"
                          className="flex-1 text-xs bg-transparent focus:bg-white focus:dark:bg-[#151515] px-2.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-mono text-neutral-800 dark:text-neutral-100"
                          value={record.telQoshimcha}
                          onChange={(e) => onUpdateRecord(record.id, 'telQoshimcha', e.target.value)}
                        />
                        <div className="flex items-center shrink-0 ml-1">
                          <button
                            onClick={() => handleCopyPhone(record.id + "_q", record.telQoshimcha)}
                            className="p-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-500 hover:text-emerald-600 hover:bg-neutral-300 dark:hover:bg-neutral-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            title="Nusxa olish"
                          >
                            {copiedId === record.id + "_q" ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                          </button>
                          {(() => {
                            const cleanPhone = record.telQoshimcha.replace(/[^0-9]/g, '');
                            if (!cleanPhone) return null;
                            const tgPhone = cleanPhone.length === 9 ? `998${cleanPhone}` : cleanPhone;
                            return (
                              <a
                                href={`https://t.me/+${tgPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-500 hover:text-sky-550 hover:bg-neutral-300 dark:hover:bg-neutral-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ml-1 flex items-center justify-center"
                                title="Telegram orqali bog'lanish"
                              >
                                <Send size={10} />
                              </a>
                            );
                          })()}
                        </div>
                      </div>
                    </td>

                    {/* Column F: Natija (Holat) */}
                    <td className="p-1 border-r border-neutral-200 dark:border-neutral-800">
                      <select
                        className={`w-full text-xs font-semibold py-1.5 px-2 rounded border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${selectedOption.color || 'bg-white text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100'}`}
                        value={record.natija}
                        onChange={(e) => onUpdateRecord(record.id, 'natija', e.target.value)}
                      >
                        <option value="">-- Kutilmoqda --</option>
                        <option value="Ko'tarmadi">📞 Ko'tarmadi</option>
                        <option value="O'chirilgan">📴 O'chirilgan</option>
                        <option value="O'ylab ko'radi">🤔 O'ylab ko'radi</option>
                        <option value="Maslahat qiladi">👥 Maslahat qiladi</option>
                        <option value="Xato raqam">❌ Xato raqam</option>
                        <option value="Kerak emas">🚫 Kerak emas</option>
                      </select>
                    </td>

                    {/* Column G: IZOH */}
                    <td className="p-0">
                      <input
                        type="text"
                        placeholder="Izoh yozishingiz mumkin..."
                        className="w-full text-xs bg-transparent focus:bg-white focus:dark:bg-neutral-800 px-2.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600"
                        value={record.izoh}
                        onChange={(e) => onUpdateRecord(record.id, 'izoh', e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="p-8 text-center text-neutral-400">
                  <AlertCircle size={24} className="mx-auto text-neutral-300 mb-2" />
                  Ushbu shartlarga mos keladigan ma'lumotlar topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Grid footer */}
      <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 text-neutral-500 text-[10px] flex items-center justify-between font-mono select-none">
        <span>Sarlavhadan saralash uchun xonalarni bosing.</span>
        <span>Ko'rsatilmoqda: {sortedRecords.length} tadan {records.length} ta yozuv</span>
      </div>
    </div>
  );
};
