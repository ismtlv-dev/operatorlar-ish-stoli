/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SchoolRecord } from '../types';
import { Phone, AlertTriangle, XCircle, Clock, FileSpreadsheet } from 'lucide-react';

interface StatsProps {
  records: SchoolRecord[];
  operatorName: string;
}

export const Stats: React.FC<StatsProps> = ({ records = [], operatorName }) => {
  const safeRecords = records || [];
  const total = safeRecords.length;
  
  const kotarmadi = safeRecords.filter(r => r.natija === "Ko'tarmadi").length;
  const ochirilgan = safeRecords.filter(r => r.natija === "O'chirilgan").length;
  const oylabKoradi = safeRecords.filter(r => r.natija === "O'ylab ko'radi").length;
  const maslahatQiladi = safeRecords.filter(r => r.natija === "Maslahat qiladi").length;
  const xatoRaqam = safeRecords.filter(r => r.natija === "Xato raqam").length;
  const kerakEmas = safeRecords.filter(r => r.natija === "Kerak emas").length;
  const kutilmoqda = safeRecords.filter(r => !r.natija).length;

  const processed = total - kutilmoqda;
  const progressPerc = total ? Math.round((processed / total) * 100) : 0;

  const maxVal = Math.max(1, kotarmadi, ochirilgan, oylabKoradi, maslahatQiladi, xatoRaqam, kerakEmas, kutilmoqda);
  
  const operatorBars = [
    { label: "Ko'tarmadi", val: kotarmadi, color: 'bg-orange-500', textColor: 'text-orange-500 dark:text-orange-400', emoji: '📞' },
    { label: "O'chirilgan", val: ochirilgan, color: 'bg-neutral-450 dark:bg-neutral-550', textColor: 'text-neutral-500 dark:text-neutral-400', emoji: '📴' },
    { label: "O'ylab ko'radi", val: oylabKoradi, color: 'bg-yellow-450 dark:bg-yellow-500/80', textColor: 'text-yellow-500 dark:text-yellow-400', emoji: '🤔' },
    { label: "Maslahat qiladi", val: maslahatQiladi, color: 'bg-sky-500', textColor: 'text-sky-500 dark:text-sky-400', emoji: '👥' },
    { label: "Xato raqam", val: xatoRaqam, color: 'bg-rose-500', textColor: 'text-rose-500 dark:text-rose-400', emoji: '❌' },
    { label: "Kerak emas", val: kerakEmas, color: 'bg-red-500', textColor: 'text-red-500 dark:text-red-400', emoji: '🚫' },
    { label: "Kutilmoqda", val: kutilmoqda, color: 'bg-neutral-300 dark:bg-neutral-600', textColor: 'text-neutral-400 dark:text-neutral-505', emoji: '⏳' }
  ];

  return (
    <div className="mb-4">
      {/* Stats Cards Grid - full width now */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          
          {/* Card 1: Jami mijozlar */}
          <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Jami mijozlar</span>
              <FileSpreadsheet size={15} className="text-neutral-500" />
            </div>
            <p className="text-xl font-black text-neutral-800 dark:text-neutral-100">{total}</p>
            <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-neutral-500 h-full w-full"></div>
            </div>
          </div>

          {/* Card 2: Ko'tarmadi */}
          <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-orange-100 dark:border-orange-950/30 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-orange-650 dark:text-orange-400">Ko'tarmadi</span>
              <Phone size={15} className="text-orange-500" />
            </div>
            <p className="text-xl font-black text-orange-700 dark:text-orange-400">{kotarmadi}</p>
            <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-orange-500 h-full" style={{ width: `${total ? (kotarmadi / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Card 3: O'chirilgan */}
          <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-250 dark:border-neutral-700 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-550 dark:text-neutral-400">O'chirilgan</span>
              <Phone size={15} className="text-neutral-450" />
            </div>
            <p className="text-xl font-black text-neutral-600 dark:text-neutral-305">{ochirilgan}</p>
            <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-neutral-400 h-full" style={{ width: `${total ? (ochirilgan / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Card 4: O'ylab ko'radi */}
          <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-yellow-100 dark:border-yellow-950/30 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-405">O'ylab ko'radi</span>
              <Clock size={15} className="text-yellow-500" />
            </div>
            <p className="text-xl font-black text-yellow-700 dark:text-yellow-400">{oylabKoradi}</p>
            <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-yellow-400 h-full" style={{ width: `${total ? (oylabKoradi / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Card 5: Maslahat qiladi */}
          <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-sky-100 dark:border-sky-950/30 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-sky-650 dark:text-sky-400">Maslahat qiladi</span>
              <Clock size={15} className="text-sky-500" />
            </div>
            <p className="text-xl font-black text-sky-700 dark:text-sky-400">{maslahatQiladi}</p>
            <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-sky-500 h-full" style={{ width: `${total ? (maslahatQiladi / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Card 6: Xato raqam */}
          <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-rose-100 dark:border-rose-950/30 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-rose-650 dark:text-rose-400">Xato raqam</span>
              <XCircle size={15} className="text-rose-500" />
            </div>
            <p className="text-xl font-black text-rose-700 dark:text-rose-400">{xatoRaqam}</p>
            <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-rose-500 h-full" style={{ width: `${total ? (xatoRaqam / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Card 7: Kerak emas */}
          <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-red-100 dark:border-red-950/30 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">Kerak emas</span>
              <XCircle size={15} className="text-red-500" />
            </div>
            <p className="text-xl font-black text-red-700 dark:text-red-400">{kerakEmas}</p>
            <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-red-500 h-full" style={{ width: `${total ? (kerakEmas / total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Card 8: Kutilmoqda */}
          <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Kutilmoqda</span>
              <Phone size={15} className="text-neutral-450" />
            </div>
            <p className="text-xl font-black text-neutral-600 dark:text-neutral-300">{kutilmoqda}</p>
            <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-neutral-400 dark:bg-neutral-500 h-full" style={{ width: `${total ? (kutilmoqda / total) * 100 : 0}%` }}></div>
            </div>
          </div>

        </div>
    </div>
  );
};
