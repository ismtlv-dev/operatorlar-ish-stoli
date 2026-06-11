/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Operator } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp, Users, MapPin, Trophy, Target, Star } from 'lucide-react';

interface AnalyticsPanelProps {
  operators: Operator[];
}

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(15, 15, 15, 0.95)',
  border: '1px solid #333',
  borderRadius: '10px',
  color: '#f0f0f0',
  fontSize: '12px',
};
const GRID_COLOR_LIGHT = '#e5e5e5';
const GRID_COLOR_DARK = '#222';

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ operators = [] }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard'>('overview');

  // ── Operator stats ──────────────────────────────────────────────
  const operatorData = operators.map(op => {
    const records = op.records || [];
    const kotarmadi = records.filter(r => r.natija === "Ko'tarmadi").length;
    const ochirilgan = records.filter(r => r.natija === "O'chirilgan").length;
    const oylabKoradi = records.filter(r => r.natija === "O'ylab ko'radi").length;
    const maslahatQiladi = records.filter(r => r.natija === "Maslahat qiladi").length;
    const xatoRaqam = records.filter(r => r.natija === "Xato raqam").length;
    const oqimaydi = records.filter(r => r.natija === "O'qimaydi").length;
    const oqiydi = records.filter(r => r.natija === "O'qiydi").length;
    const shartnomaBerildi = records.filter(r => r.natija === "Shartnoma berildi").length;
    const kutilmoqda = records.filter(r => !r.natija || r.natija === 'Kutilmoqda').length;
    const processed = records.length - kutilmoqda;
    const percent = records.length > 0 ? Math.round((processed / records.length) * 100) : 0;

    const nameParts = op.name.split(' ');
    const displayName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[1].charAt(0)}.` : op.name;

    return {
      name: displayName, fullName: op.name,
      "Ko'tarmadi": kotarmadi, "O'chirilgan": ochirilgan,
      "O'ylab ko'radi": oylabKoradi, "Maslahat qiladi": maslahatQiladi,
      "Xato raqam": xatoRaqam, "O'qimaydi": oqimaydi, "O'qiydi": oqiydi, "Shartnoma berildi": shartnomaBerildi, "Kutilmoqda": kutilmoqda,
      total: records.length, processed, percent
    };
  });

  // ── Leaderboard (sorted by percent) ────────────────────────────
  const leaderboard = [...operatorData].sort((a, b) => b.percent - a.percent);

  // ── Viloyat data ───────────────────────────────────────────────
  const viloyatDataMap: Record<string, { 
    total: number; 
    kotarmadi: number; 
    ochirilgan: number; 
    oylabKoradi: number; 
    maslahatQiladi: number; 
    xatoRaqam: number; 
    oqimaydi: number;
    oqiydi: number;
    shartnomaBerildi: number;
    kutilmoqda: number;
  }> = {};
  
  operators.forEach(op => {
    (op.records || []).forEach(rec => {
      const viloyat = rec.viloyat?.trim() || "Noma'lum";
      if (!viloyatDataMap[viloyat]) {
        viloyatDataMap[viloyat] = { 
          total: 0, 
          kotarmadi: 0, 
          ochirilgan: 0, 
          oylabKoradi: 0, 
          maslahatQiladi: 0, 
          xatoRaqam: 0, 
          oqimaydi: 0, 
          oqiydi: 0,
          shartnomaBerildi: 0,
          kutilmoqda: 0 
        };
      }
      viloyatDataMap[viloyat].total++;
      if (rec.natija === "Ko'tarmadi") viloyatDataMap[viloyat].kotarmadi++;
      else if (rec.natija === "O'chirilgan") viloyatDataMap[viloyat].ochirilgan++;
      else if (rec.natija === "O'ylab ko'radi") viloyatDataMap[viloyat].oylabKoradi++;
      else if (rec.natija === "Maslahat qiladi") viloyatDataMap[viloyat].maslahatQiladi++;
      else if (rec.natija === "Xato raqam") viloyatDataMap[viloyat].xatoRaqam++;
      else if (rec.natija === "O'qimaydi") viloyatDataMap[viloyat].oqimaydi++;
      else if (rec.natija === "O'qiydi") viloyatDataMap[viloyat].oqiydi++;
      else if (rec.natija === "Shartnoma berildi") viloyatDataMap[viloyat].shartnomaBerildi++;
      else viloyatDataMap[viloyat].kutilmoqda++;
    });
  });

  const districtData = Object.entries(viloyatDataMap).map(([viloyat, s]) => ({
    name: viloyat,
    "Ko'tarmadi": s.kotarmadi, "O'chirilgan": s.ochirilgan,
    "O'ylab ko'radi": s.oylabKoradi, "Maslahat qiladi": s.maslahatQiladi,
    "Xato raqam": s.xatoRaqam, "O'qimaydi": s.oqimaydi, "O'qiydi": s.oqiydi, "Shartnoma berildi": s.shartnomaBerildi, "Kutilmoqda": s.kutilmoqda,
    total: s.total
  })).sort((a, b) => b.total - a.total).slice(0, 15);

  // ── Global totals ───────────────────────────────────────────────
  let totalCalls = 0, totalKotarmadi = 0, totalOchirilgan = 0, totalOylabKoradi = 0, totalMaslahatQiladi = 0, totalXatoRaqam = 0, totalOqimaydi = 0, totalOqiydi = 0, totalShartnomaBerildi = 0;
  operators.forEach(op => {
    const r = op.records || [];
    totalCalls += r.length;
    totalKotarmadi += r.filter(x => x.natija === "Ko'tarmadi").length;
    totalOchirilgan += r.filter(x => x.natija === "O'chirilgan").length;
    totalOylabKoradi += r.filter(x => x.natija === "O'ylab ko'radi").length;
    totalMaslahatQiladi += r.filter(x => x.natija === "Maslahat qiladi").length;
    totalXatoRaqam += r.filter(x => x.natija === "Xato raqam").length;
    totalOqimaydi += r.filter(x => x.natija === "O'qimaydi").length;
    totalOqiydi += r.filter(x => x.natija === "O'qiydi").length;
    totalShartnomaBerildi += r.filter(x => x.natija === "Shartnoma berildi").length;
  });
  const totalKutilmoqda = totalCalls - (totalKotarmadi + totalOchirilgan + totalOylabKoradi + totalMaslahatQiladi + totalXatoRaqam + totalOqimaydi + totalOqiydi + totalShartnomaBerildi);
  const totalProcessed = totalCalls - totalKutilmoqda;
  const overallPct = totalCalls > 0 ? Math.round((totalProcessed / totalCalls) * 100) : 0;

  const overallPieData = [
    { name: "Ko'tarmadi", value: totalKotarmadi, color: '#f97316' },
    { name: "O'chirilgan", value: totalOchirilgan, color: '#737373' },
    { name: "O'ylab ko'radi", value: totalOylabKoradi, color: '#eab308' },
    { name: "Maslahat qiladi", value: totalMaslahatQiladi, color: '#0ea5e9' },
    { name: "Xato raqam", value: totalXatoRaqam, color: '#f43f5e' },
    { name: "O'qimaydi", value: totalOqimaydi, color: '#ef4444' },
    { name: "O'qiydi", value: totalOqiydi, color: '#6366f1' },
    { name: "Shartnoma berildi", value: totalShartnomaBerildi, color: '#10b981' },
    { name: "Kutilmoqda", value: totalKutilmoqda, color: '#a3a3a3' },
  ].filter(d => d.value > 0);

  const medal = (i: number) => {
    if (i === 0) return { icon: '🥇', cls: 'medal-gold text-yellow-400', bg: 'bg-yellow-500/10 dark:bg-yellow-900/20', ring: 'ring-yellow-400/30' };
    if (i === 1) return { icon: '🥈', cls: 'medal-silver text-neutral-400', bg: 'bg-neutral-500/10 dark:bg-neutral-700/20', ring: 'ring-neutral-400/30' };
    if (i === 2) return { icon: '🥉', cls: 'medal-bronze text-orange-600', bg: 'bg-orange-500/10 dark:bg-orange-900/20', ring: 'ring-orange-400/30' };
    return { icon: `${i + 1}`, cls: 'text-neutral-500', bg: 'bg-white dark:bg-neutral-900', ring: 'ring-transparent' };
  };

  const cardClass = "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm";

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: <TrendingUp size={22} />, label: 'Jami qo\'ng\'iroqlar', value: `${totalProcessed} / ${totalCalls}`, sub: `${overallPct}% bajarildi`, color: 'emerald', subColor: 'text-emerald-600 dark:text-emerald-400' },
          { icon: <Users size={22} />, label: 'Operatorlar soni', value: `${operators.length} nafar`, sub: 'Tizimda faol xodimlar', color: 'blue', subColor: 'text-neutral-500' },
          { icon: <MapPin size={22} />, label: 'Viloyatlar soni', value: `${Object.keys(viloyatDataMap).length} ta`, sub: 'Qamrab olingan viloyatlar', color: 'purple', subColor: 'text-neutral-500' },
          { icon: <Target size={22} />, label: 'Mijozlar bilan aloqa', value: `${totalProcessed} ta`, sub: 'Aloqa o\'rnatilganlar', color: 'rose', subColor: 'text-rose-600 dark:text-rose-400' },
        ].map(({ icon, label, value, sub, color, subColor }) => (
          <div key={label} className={`${cardClass} p-4 flex items-center gap-4`}>
            <div className={`p-3 bg-${color}-100 dark:bg-${color}-900/30 rounded-xl text-${color}-600 dark:text-${color}-400 shrink-0`}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider truncate">{label}</p>
              <p className="text-xl font-black text-neutral-900 dark:text-neutral-100">{value}</p>
              <p className={`text-[10px] font-semibold ${subColor}`}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-fit">
        {(['overview', 'leaderboard'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
          >
            {tab === 'overview' ? '📊 Umumiy ko\'rinish' : '🏆 Reyting (Leaderboard)'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Operator Bar Chart */}
            <div className={`${cardClass} p-4 xl:col-span-2`}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Operatorlar bo'yicha ko'rsatkichlar</h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={operatorData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR_LIGHT} />
                    <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#888" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Ko'tarmadi" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="O'chirilgan" stackId="a" fill="#737373" />
                    <Bar dataKey="O'ylab ko'radi" stackId="a" fill="#eab308" />
                    <Bar dataKey="Maslahat qiladi" stackId="a" fill="#0ea5e9" />
                    <Bar dataKey="Xato raqam" stackId="a" fill="#f43f5e" />
                    <Bar dataKey="O'qimaydi" stackId="a" fill="#ef4444" />
                    <Bar dataKey="O'qiydi" stackId="a" fill="#6366f1" />
                    <Bar dataKey="Shartnoma berildi" stackId="a" fill="#10b981" />
                    <Bar dataKey="Kutilmoqda" stackId="a" fill="#a3a3a3" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */}
            <div className={`${cardClass} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <PieIcon size={18} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Umumiy holat</h3>
              </div>
              <div className="h-[200px]">
                {overallPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={overallPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={2} dataKey="value">
                        {overallPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400">
                    Ma'lumot yo'q
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700 text-[10px]">
                {overallPieData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-neutral-600 dark:text-neutral-400 truncate">{entry.name}:</span>
                    <span className="font-bold font-mono text-neutral-900 dark:text-neutral-100">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* District Chart */}
          <div className={`${cardClass} p-4`}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={18} className="text-emerald-500" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Top 15 Viloyatlar bo'yicha qamrov</h3>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtData} margin={{ top: 5, right: 10, left: -25, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR_LIGHT} />
                  <XAxis dataKey="name" stroke="#888" angle={-40} textAnchor="end" interval={0} height={65} tick={{ fontSize: 10 }} />
                  <YAxis stroke="#888" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ top: -8, fontSize: 11 }} />
                  <Bar dataKey="Ko'tarmadi" stackId="a" fill="#f97316" />
                  <Bar dataKey="O'chirilgan" stackId="a" fill="#737373" />
                  <Bar dataKey="O'ylab ko'radi" stackId="a" fill="#eab308" />
                  <Bar dataKey="Maslahat qiladi" stackId="a" fill="#0ea5e9" />
                  <Bar dataKey="Xato raqam" stackId="a" fill="#f43f5e" />
                  <Bar dataKey="O'qimaydi" stackId="a" fill="#ef4444" />
                  <Bar dataKey="O'qiydi" stackId="a" fill="#6366f1" />
                  <Bar dataKey="Shartnoma berildi" stackId="a" fill="#10b981" />
                  <Bar dataKey="Kutilmoqda" stackId="a" fill="#a3a3a3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* 🏆 LEADERBOARD TAB */}
      {activeTab === 'leaderboard' && (
        <div className={`${cardClass} p-5`}>
          <div className="flex items-center gap-2 mb-5">
            <Trophy size={20} className="text-yellow-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Operator Reytingi — % bajarilishi bo'yicha</h3>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 py-10">Hali ma'lumot kiritilmagan</p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((op, i) => {
                const m = medal(i);
                return (
                  <div key={op.fullName} className={`flex items-center gap-4 p-3 rounded-xl ring-1 ${m.bg} ${m.ring} transition-all hover:scale-[1.01]`}>
                    {/* Rank */}
                    <div className={`text-xl font-black w-8 text-center shrink-0 ${m.cls}`}>
                      {m.icon}
                    </div>
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{op.fullName}</p>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {op.processed} ta bajarildi / {op.total} ta jami
                      </p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-36 shrink-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">{op.percent}%</span>
                        <div className="flex gap-0.5">
                          {[0, 1, 2, 3, 4].map(star => (
                            <Star
                              key={star}
                              size={9}
                              className={star < Math.floor(op.percent / 20) ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-300 dark:text-neutral-600'}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            op.percent >= 80 ? 'bg-emerald-500' :
                            op.percent >= 50 ? 'bg-sky-500' :
                            op.percent >= 30 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${op.percent}%` }}
                        />
                      </div>
                    </div>
                    {/* Bajarildi count */}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{op.processed}</p>
                      <p className="text-[9px] text-neutral-500 dark:text-neutral-400">bajarildi</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
