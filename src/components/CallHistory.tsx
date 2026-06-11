/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CallHistoryEntry } from '../types';
import { Search, Calendar, ChevronDown, CheckSquare, Info, Filter, Trash2, Phone, AlertCircle } from 'lucide-react';

interface CallHistoryProps {
  history: CallHistoryEntry[];
  onClearHistory?: () => void;
  isAdmin?: boolean;
}

const RESULT_OPTIONS = [
  { value: 'all', label: 'Barcha holatlar' },
  { value: "Ko'tarmadi", label: "📞 Ko'tarmadi", color: 'bg-orange-100 text-orange-800 border-orange-355 dark:bg-orange-950/40 dark:text-orange-300' },
  { value: "O'chirilgan", label: "📴 O'chirilgan", color: 'bg-neutral-200 text-neutral-800 border-neutral-350 dark:bg-neutral-850 dark:text-neutral-305' },
  { value: "O'ylab ko'radi", label: "🤔 O'ylab ko'radi", color: 'bg-yellow-100 text-yellow-800 border-yellow-350 dark:bg-yellow-950/40 dark:text-yellow-300' },
  { value: "Maslahat qiladi", label: "👥 Maslahat qiladi", color: 'bg-sky-100 text-sky-800 border-sky-350 dark:bg-sky-950/40 dark:text-sky-300' },
  { value: "Xato raqam", label: "❌ Xato raqam", color: 'bg-rose-100 text-rose-800 border-rose-350 dark:bg-rose-950/40 dark:text-rose-300' },
  { value: "O'qimaydi", label: "🚫 O'qimaydi", color: 'bg-rose-200 text-red-800 border-rose-350 dark:bg-rose-950/40 dark:text-rose-300' },
  { value: "O'qiydi", label: "🎓 O'qiydi", color: 'bg-indigo-100 text-indigo-805 border-indigo-350 dark:bg-indigo-950/40 dark:text-indigo-300' },
  { value: "Shartnoma berildi", label: "📄 Shartnoma berildi", color: 'bg-emerald-100 text-emerald-805 border-emerald-350 dark:bg-emerald-950/40 dark:text-emerald-300' },
  { value: '', label: '⏳ Kutilmoqda', color: 'bg-neutral-200 text-neutral-600 border-neutral-350 dark:bg-neutral-800 dark:text-neutral-400' }
];

export const CallHistory: React.FC<CallHistoryProps> = ({
  history = [],
  onClearHistory,
  isAdmin = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Extract all unique dates from history, sorted descending
  const uniqueDates = Array.from(new Set(history.map(item => item.date).filter(Boolean)));
  uniqueDates.sort((a, b) => {
    try {
      const [dayA, monthA, yearA] = a.split('.').map(Number);
      const [dayB, monthB, yearB] = b.split('.').map(Number);
      return new Date(yearB, monthB - 1, dayB).getTime() - new Date(yearA, monthA - 1, dayA).getTime();
    } catch (e) {
      return 0;
    }
  });

  // Default to the latest date if there is one
  const [selectedDate, setSelectedDate] = useState<string>(() => uniqueDates[0] || '');

  // Filter history entries
  const filteredHistory = history.filter(item => {
    const matchesSearch = 
      !searchTerm.trim() ||
      (item.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.clientTel || '').includes(searchTerm) ||
      (item.operatorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.izoh || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.clientViloyat || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const matchesDate = !selectedDate || item.date === selectedDate;

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate stats for the selected date
  const selectedDateEntries = history.filter(item => !selectedDate || item.date === selectedDate);
  const totalCallsForDate = selectedDateEntries.length;

  const statsBreakdown = {
    kotarmadi: selectedDateEntries.filter(r => r.status === "Ko'tarmadi").length,
    ochirilgan: selectedDateEntries.filter(r => r.status === "O'chirilgan").length,
    oylabKoradi: selectedDateEntries.filter(r => r.status === "O'ylab ko'radi").length,
    maslahatQiladi: selectedDateEntries.filter(r => r.status === "Maslahat qiladi").length,
    xatoRaqam: selectedDateEntries.filter(r => r.status === "Xato raqam").length,
    oqimaydi: selectedDateEntries.filter(r => r.status === "O'qimaydi").length,
    oqiydi: selectedDateEntries.filter(r => r.status === "O'qiydi").length,
    shartnomaBerildi: selectedDateEntries.filter(r => r.status === "Shartnoma berildi").length,
    kutilmoqda: selectedDateEntries.filter(r => r.status === "").length,
  };

  return (
    <div className="bg-white dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col h-full animate-fade-in">
      
      {/* Search and Filters Header */}
      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Left Side: Interactive selections */}
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-stretch sm:items-center">
          
          {/* Date Picker */}
          <div className="relative">
            <select
              className="text-xs bg-white dark:bg-slate-900 text-neutral-800 dark:text-neutral-100 pl-8 pr-8 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 focus:outline-none appearance-none cursor-pointer font-bold shrink-0"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              <option value="">Barcha sanalar (Tarix)</option>
              {uniqueDates.map(date => (
                <option key={date} value={date}>📅 {date}</option>
              ))}
            </select>
            <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#00a372] pointer-events-none" />
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              className="text-xs bg-white dark:bg-slate-900 text-neutral-800 dark:text-neutral-100 pl-8 pr-8 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 focus:outline-none appearance-none cursor-pointer font-bold shrink-0"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {RESULT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>

          {/* Text Search */}
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Operator, mijoz ismi, tel..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 rounded-md border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

        </div>

        {/* Clear History Button (Admin only) */}
        {isAdmin && onClearHistory && history.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Barcha qo'ng'iroqlar tarixini butunlay o'chirib tashlamoqchimisiz?")) {
                onClearHistory();
              }
            }}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 self-stretch sm:self-auto transition-colors"
          >
            <Trash2 size={13} />
            Tarixni tozalash
          </button>
        )}
      </div>

      {/* Date History Summary Statistics Counter Panel */}
      {selectedDate && (
        <div className="px-4 py-3 bg-neutral-100/70 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-2 items-center text-xs">
          <span className="font-bold text-neutral-700 dark:text-neutral-300">
            📅 {selectedDate} kunlik qo'ng'iroqlar sarhisobi: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">{totalCallsForDate} ta</span>
          </span>
          <div className="flex flex-wrap gap-1.5 ml-2">
            {statsBreakdown.kotarmadi > 0 && <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-850 dark:bg-orange-950/40 dark:text-orange-300 font-bold border border-orange-200 dark:border-transparent">📞 {statsBreakdown.kotarmadi} tagacha ko'tarmadi</span>}
            {statsBreakdown.ochirilgan > 0 && <span className="px-2 py-0.5 rounded bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 font-bold border border-neutral-300 dark:border-transparent">📴 {statsBreakdown.ochirilgan} ta o'chirilgan</span>}
            {statsBreakdown.oylabKoradi > 0 && <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-850 dark:bg-yellow-950/40 dark:text-yellow-300 font-bold border border-yellow-200 dark:border-transparent">🤔 {statsBreakdown.oylabKoradi} ta o'ylab ko'radi</span>}
            {statsBreakdown.maslahatQiladi > 0 && <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-850 dark:bg-sky-950/40 dark:text-sky-300 font-bold border border-sky-200 dark:border-transparent">👥 {statsBreakdown.maslahatQiladi} ta maslahat qiladi</span>}
            {statsBreakdown.xatoRaqam > 0 && <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-850 dark:bg-rose-950/40 dark:text-rose-300 font-bold border border-rose-200 dark:border-transparent">❌ {statsBreakdown.xatoRaqam} ta xato raqam</span>}
            {statsBreakdown.oqimaydi > 0 && <span className="px-2 py-0.5 rounded bg-rose-200 text-red-800 dark:bg-rose-950/40 dark:text-rose-300 font-bold border border-rose-300 dark:border-transparent">🚫 {statsBreakdown.oqimaydi} ta o'qimaydi</span>}
            {statsBreakdown.oqiydi > 0 && <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-805 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-transparent">🎓 {statsBreakdown.oqiydi} ta o'qiydi</span>}
            {statsBreakdown.shartnomaBerildi > 0 && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-805 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-transparent">📄 {statsBreakdown.shartnomaBerildi} ta shartnoma</span>}
            {statsBreakdown.kutilmoqda > 0 && <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 font-bold border border-neutral-200 dark:border-transparent">⏳ {statsBreakdown.kutilmoqda} ta kutilmoqda</span>}
          </div>
        </div>
      )}

      {/* Main Table Content */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full border-collapse text-left text-xs text-neutral-700 dark:text-neutral-300">
          <thead>
            <tr className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold text-neutral-500 uppercase select-none">
              <th className="p-3 w-12 text-center border-r border-[#eee] dark:border-neutral-800 font-mono">T/r</th>
              <th className="p-3 border-r border-[#eee] dark:border-neutral-800">Qo'ng'iroq vaqti (Soniya)</th>
              <th className="p-3 border-r border-[#eee] dark:border-neutral-800">Mijoz (F.I.Sh)</th>
              <th className="p-3 border-r border-[#eee] dark:border-neutral-800">Telefon raqami</th>
              <th className="p-3 border-r border-[#eee] dark:border-neutral-800">Hudud / Viloyat</th>
              <th className="p-3 border-r border-[#eee] dark:border-neutral-800">Operator</th>
              <th className="p-3 border-r border-[#eee] dark:border-neutral-800">Yangi Holat</th>
              <th className="p-3">IZOH (O'zgarish tafsiloti)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((item, index) => {
                const optColor = RESULT_OPTIONS.find(o => o.value === item.status) || RESULT_OPTIONS[RESULT_OPTIONS.length - 1];

                let rowBgClass = "";
                if (item.status === "O'ylab ko'radi") {
                  rowBgClass = "bg-yellow-50/50 hover:bg-yellow-100/60 dark:bg-yellow-950/10 dark:hover:bg-yellow-900/20";
                } else if (item.status === "Maslahat qiladi") {
                  rowBgClass = "bg-sky-50/50 hover:bg-sky-100/60 dark:bg-sky-950/10 dark:hover:bg-sky-900/20";
                } else if (item.status === "Ko'tarmadi") {
                  rowBgClass = "bg-orange-50/50 hover:bg-orange-100/60 dark:bg-orange-950/10 dark:hover:bg-orange-900/20";
                } else if (item.status === "Xato raqam" || item.status === "O'qimaydi") {
                  rowBgClass = "bg-rose-50/50 hover:bg-rose-100/60 dark:bg-rose-950/10 dark:hover:bg-rose-900/20";
                } else if (item.status === "Shartnoma berildi") {
                  rowBgClass = "bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-950/10 dark:hover:bg-emerald-900/20";
                } else {
                  rowBgClass = index % 2 === 1 
                    ? "bg-neutral-50/50 hover:bg-neutral-100/50 dark:bg-neutral-900/30" 
                    : "bg-white hover:bg-neutral-50 dark:bg-neutral-950";
                }

                return (
                  <tr key={item.id} className={`${rowBgClass} transition-colors duration-105 border-b border-neutral-200 dark:border-neutral-800 font-medium`}>
                    
                    {/* Index */}
                    <td className="p-3 text-center border-r border-neutral-200 dark:border-neutral-800 font-mono text-neutral-400">
                      {index + 1}
                    </td>

                    {/* Exact Timestamp down to Second */}
                    <td className="p-3 border-r border-neutral-200 dark:border-neutral-800 font-mono text-emerald-600 dark:text-emerald-450 font-bold whitespace-nowrap">
                      ⏰ {item.timestamp}
                    </td>

                    {/* Client Name */}
                    <td className="p-3 border-r border-neutral-200 dark:border-neutral-800 font-bold text-neutral-900 dark:text-neutral-100">
                      {item.clientName}
                    </td>

                    {/* Client Phone */}
                    <td className="p-3 border-r border-neutral-200 dark:border-neutral-800 font-mono select-all">
                      {item.clientTel}
                    </td>

                    {/* Client Region */}
                    <td className="p-3 border-r border-neutral-200 dark:border-neutral-800 text-neutral-500 font-semibold">
                      {item.clientViloyat}
                    </td>

                    {/* Operator */}
                    <td className="p-3 border-r border-neutral-200 dark:border-neutral-800 text-amber-600 dark:text-amber-405 font-bold">
                      👤 {item.operatorName}
                    </td>

                    {/* Changed Status */}
                    <td className="p-2 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap select-none">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border border-neutral-250 dark:border-transparent ${optColor.color}`}>
                        {optColor.label}
                      </span>
                    </td>

                    {/* Comment (Izoh / Details of change) */}
                    <td className="p-3 select-all truncate max-w-sm" title={item.izoh}>
                      {item.izoh ? (
                        <span className="text-neutral-800 dark:text-neutral-200 italic">“{item.izoh}”</span>
                      ) : (
                        <span className="text-neutral-400 italic">Izoh yozilmagan</span>
                      )}
                    </td>

                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="p-12 text-center text-neutral-400">
                  <AlertCircle size={24} className="mx-auto text-neutral-300 mb-2" />
                  Konditsiyalarga mos qo'ng'iroqlar tarixi topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer statistics indicator */}
      <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 text-neutral-500 text-[10px] flex items-center justify-between font-mono select-none">
        <span>Qo'ng'iroqlar tarixi oxirgi qilinganlar birinchi navbatda ko'rsatiladi.</span>
        <span>Ko'rsatilmoqda: {filteredHistory.length} ta yozuv (Sana: {selectedDate || 'Barchasi'}, Holat: {selectedStatus === 'all' ? 'Barchasi' : selectedStatus})</span>
      </div>

    </div>
  );
};
