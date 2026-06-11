/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SchoolRecord } from '../types';
import { Phone, AlertTriangle, XCircle, Clock, FileSpreadsheet, BookOpen, ClipboardCheck } from 'lucide-react';

interface StatsProps {
  records: SchoolRecord[];
  operatorName: string;
  selectedStatus?: string;
  onCardClick?: (status: string) => void;
}

export const Stats: React.FC<StatsProps> = ({ 
  records = [], 
  operatorName,
  selectedStatus = 'all',
  onCardClick
}) => {
  const safeRecords = records || [];
  const total = safeRecords.length;
  
  const kotarmadi = safeRecords.filter(r => r.natija === "Ko'tarmadi").length;
  const ochirilgan = safeRecords.filter(r => r.natija === "O'chirilgan").length;
  const oylabKoradi = safeRecords.filter(r => r.natija === "O'ylab ko'radi").length;
  const maslahatQiladi = safeRecords.filter(r => r.natija === "Maslahat qiladi").length;
  const xatoRaqam = safeRecords.filter(r => r.natija === "Xato raqam").length;
  const oqimaydi = safeRecords.filter(r => r.natija === "O'qimaydi").length;
  const oqiydi = safeRecords.filter(r => r.natija === "O'qiydi").length;
  const shartnomaBerildi = safeRecords.filter(r => r.natija === "Shartnoma berildi").length;
  const kutilmoqda = safeRecords.filter(r => !r.natija).length;

  const handleToggle = (status: string) => {
    if (onCardClick) {
      onCardClick(status);
    }
  };

  const isSelected = (val: string) => selectedStatus === val;

  return (
    <div className="mb-4">
      {/* Informative Label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider select-none animate-pulse">
          🎯 Maslahat: Quyidagi filtirlash kartalarini bosib, jadvalni saralang!
        </span>
      </div>

      {/* Stats Cards Grid - interactive and dynamic */}
      <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-10 gap-2.5">
                  {/* Card 1: Jami mijozlar */}
          <div 
            onClick={() => handleToggle('all')}
            className={`p-3 rounded-xl border shadow-sm flex flex-col justify-between transition-all duration-200 cursor-pointer select-none active:scale-95 ${
              isSelected('all')
                ? 'bg-transparent border-neutral-600 dark:border-neutral-300 border-2 ring-2 ring-neutral-500/10 scale-[1.02]'
                : 'bg-transparent border-neutral-250 dark:border-neutral-800 hover:border-neutral-400 hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-neutral-650 dark:text-neutral-400">Jami mijozlar</span>
              <FileSpreadsheet size={14} className="text-neutral-500" />
            </div>
            <p className="text-lg font-black text-neutral-900 dark:text-neutral-50">{total}</p>
            <div className="w-full bg-neutral-150 dark:bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-neutral-600 dark:bg-neutral-400 h-full w-full"></div>
            </div>
          </div>

          {/* Card 2: Ko'tarmadi */}
          <div 
            onClick={() => handleToggle("Ko'tarmadi")}
            className={`p-3 rounded-xl border shadow-sm flex flex-col justify-between transition-all duration-200 cursor-pointer select-none active:scale-95 ${
              isSelected("Ko'tarmadi")
                ? 'bg-transparent border-orange-550 dark:border-orange-400 border-2 ring-2 ring-orange-400/10 scale-[1.02]'
                : 'bg-transparent border-neutral-250 dark:border-neutral-800 hover:border-orange-400 hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-orange-655 dark:text-orange-400">Ko'tarmadi</span>
              <span className="text-xs">📞</span>
            </div>
            <p className="text-lg font-black text-orange-705 dark:text-orange-400">{kotarmadi}</p>
            <div className="w-full bg-neutral-150 dark:bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-orange-500 h-full" style={{ width: `${total ? (kotarmadi / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Card 3: O'chirilgan */}
          <div 
            onClick={() => handleToggle("O'chirilgan")}
            className={`p-3 rounded-xl border shadow-sm flex flex-col justify-between transition-all duration-200 cursor-pointer select-none active:scale-95 ${
              isSelected("O'chirilgan")
                ? 'bg-transparent border-neutral-550 dark:border-neutral-500 border-2 ring-2 ring-neutral-400/10 scale-[1.02]'
                : 'bg-transparent border-neutral-250 dark:border-neutral-800 hover:border-neutral-400 hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">O'chirilgan</span>
              <span className="text-xs">📴</span>
            </div>
            <p className="text-lg font-black text-neutral-700 dark:text-neutral-300">{ochirilgan}</p>
            <div className="w-full bg-neutral-150 dark:bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-neutral-400 h-full" style={{ width: `${total ? (ochirilgan / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Card 4: O'ylab ko'radi */}
          <div 
            onClick={() => handleToggle("O'ylab ko'radi")}
            className={`p-3 rounded-xl border shadow-sm flex flex-col justify-between transition-all duration-200 cursor-pointer select-none active:scale-95 ${
              isSelected("O'ylab ko'radi")
                ? 'bg-transparent border-yellow-550 dark:border-yellow-405 border-2 ring-2 ring-yellow-400/10 scale-[1.02]'
                : 'bg-transparent border-neutral-250 dark:border-neutral-800 hover:border-yellow-400 hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-yellow-600 dark:text-yellow-405">O'ylab ko'radi</span>
              <span className="text-xs">🤔</span>
            </div>
            <p className="text-lg font-black text-yellow-700 dark:text-yellow-400">{oylabKoradi}</p>
            <div className="w-full bg-neutral-150 dark:bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-yellow-500 h-full" style={{ width: `${total ? (oylabKoradi / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Card 5: Maslahat qiladi */}
          <div 
            onClick={() => handleToggle("Maslahat qiladi")}
            className={`p-3 rounded-xl border shadow-sm flex flex-col justify-between transition-all duration-200 cursor-pointer select-none active:scale-95 ${
              isSelected("Maslahat qiladi")
                ? 'bg-transparent border-sky-500 dark:border-sky-400 border-2 ring-2 ring-sky-400/10 scale-[1.02]'
                : 'bg-transparent border-neutral-250 dark:border-neutral-800 hover:border-sky-400 hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-sky-650 dark:text-sky-400">Maslahat qiladi</span>
              <span className="text-xs">👥</span>
            </div>
            <p className="text-lg font-black text-sky-705 dark:text-sky-400">{maslahatQiladi}</p>
            <div className="w-full bg-neutral-150 dark:bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-sky-500 h-full" style={{ width: `${total ? (maslahatQiladi / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Card 6: Xato raqam */}
          <div 
            onClick={() => handleToggle("Xato raqam")}
            className={`p-3 rounded-xl border shadow-sm flex flex-col justify-between transition-all duration-200 cursor-pointer select-none active:scale-95 ${
              isSelected("Xato raqam")
                ? 'bg-transparent border-rose-500 dark:border-rose-400 border-2 ring-2 ring-rose-400/10 scale-[1.02]'
                : 'bg-transparent border-neutral-250 dark:border-neutral-800 hover:border-rose-400 hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-rose-650 dark:text-rose-400">Xato raqam</span>
              <span className="text-xs">❌</span>
            </div>
            <p className="text-lg font-black text-rose-700 dark:text-rose-400">{xatoRaqam}</p>
            <div className="w-full bg-neutral-150 dark:bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-rose-500 h-full" style={{ width: `${total ? (xatoRaqam / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Card 7: O'qimaydi */}
          <div 
            onClick={() => handleToggle("O'qimaydi")}
            className={`p-3 rounded-xl border shadow-sm flex flex-col justify-between transition-all duration-200 cursor-pointer select-none active:scale-95 ${
              isSelected("O'qimaydi")
                ? 'bg-transparent border-red-500 dark:border-red-400 border-2 ring-2 ring-red-400/10 scale-[1.02]'
                : 'bg-transparent border-neutral-250 dark:border-neutral-800 hover:border-red-400 hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-red-600 dark:text-red-400">O'qimaydi</span>
              <span className="text-xs">🚫</span>
            </div>
            <p className="text-lg font-black text-red-700 dark:text-red-400">{oqimaydi}</p>
            <div className="w-full bg-neutral-150 dark:bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-red-500 h-full" style={{ width: `${total ? (oqimaydi / total) * 105 : 0}%` }}></div>
            </div>
          </div>

          {/* Card 8: O'qiydi */}
          <div 
            onClick={() => handleToggle("O'qiydi")}
            className={`p-3 rounded-xl border shadow-sm flex flex-col justify-between transition-all duration-200 cursor-pointer select-none active:scale-95 ${
              isSelected("O'qiydi")
                ? 'bg-transparent border-indigo-600 dark:border-indigo-400 border-2 ring-2 ring-indigo-400/10 scale-[1.02]'
                : 'bg-transparent border-neutral-250 dark:border-neutral-800 hover:border-indigo-400 hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400">O'qiydi</span>
              <span className="text-xs">🎓</span>
            </div>
            <p className="text-lg font-black text-indigo-700 dark:text-indigo-400">{oqiydi}</p>
            <div className="w-full bg-neutral-150 dark:bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-indigo-500 h-full" style={{ width: `${total ? (oqiydi / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Card 9: Shartnoma berildi */}
          <div 
            onClick={() => handleToggle("Shartnoma berildi")}
            className={`p-3 rounded-xl border shadow-sm flex flex-col justify-between transition-all duration-200 cursor-pointer select-none active:scale-95 ${
              isSelected("Shartnoma berildi")
                ? 'bg-transparent border-emerald-600 dark:border-emerald-500 border-2 ring-2 ring-emerald-400/10 scale-[1.02]'
                : 'bg-transparent border-neutral-250 dark:border-neutral-800 hover:border-emerald-500 hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-650 dark:text-emerald-400">Shartnoma...</span>
              <span className="text-xs">📄</span>
            </div>
            <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{shartnomaBerildi}</p>
            <div className="w-full bg-neutral-150 dark:bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${total ? (shartnomaBerildi / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Card 10: Kutilmoqda */}
          <div 
            onClick={() => handleToggle("")}
            className={`p-3 rounded-xl border shadow-sm flex flex-col justify-between transition-all duration-200 cursor-pointer select-none active:scale-95 ${
              isSelected("")
                ? 'bg-transparent border-neutral-500 dark:border-neutral-450 border-2 ring-2 ring-neutral-400/10 scale-[1.02]'
                : 'bg-transparent border-neutral-250 dark:border-neutral-800 hover:border-neutral-400 hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-neutral-550 dark:text-neutral-450">Kutilmoqda</span>
              <span className="text-xs">⏳</span>
            </div>
            <p className="text-lg font-black text-neutral-700 dark:text-neutral-305">{kutilmoqda}</p>
            <div className="w-full bg-neutral-150 dark:bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-neutral-450 dark:bg-neutral-500 h-full" style={{ width: `${total ? (kutilmoqda / total) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>
    </div>
  );
};
