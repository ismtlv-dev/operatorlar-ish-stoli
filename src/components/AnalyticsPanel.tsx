/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Operator } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  BarChart3, PieChart as PieIcon, TrendingUp, Users, MapPin, 
  Trophy, Target, Star, ChevronRight, Activity, Calendar, ArrowUpRight, Award, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AnalyticsPanelProps {
  operators: Operator[];
}

const TOOLTIP_STYLE_LIGHT = {
  backgroundColor: '#ffffff',
  border: '1px solid #f0f0f0',
  borderRadius: '12px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  color: '#0f172a',
  fontSize: '11px',
  fontWeight: '600',
  padding: '10px 14px',
};

const TOOLTIP_STYLE_DARK = {
  backgroundColor: '#0a0a0a',
  border: '1px solid #262626',
  borderRadius: '12px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  color: '#f5f5f5',
  fontSize: '11px',
  fontWeight: '600',
  padding: '10px 14px',
};

// Beautiful color scheme for status representation matching the user's theme in clear outlines
const STATUS_META: Record<string, { label: string; color: string; border: string; bg: string; text: string }> = {
  "Ko'tarmadi": { label: "Ko'tarmadi", color: '#f97316', border: 'border-orange-500/40', bg: 'bg-orange-500', text: 'text-orange-500' },
  "O'chirilgan": { label: "O'chirilgan", color: '#737373', border: 'border-neutral-500/40', bg: 'bg-neutral-500', text: 'text-neutral-500' },
  "O'ylab ko'radi": { label: "O'ylab ko'radi", color: '#eab308', border: 'border-yellow-500/40', bg: 'bg-yellow-500', text: 'text-yellow-500' },
  "Maslahat qiladi": { label: "Maslahat qiladi", color: '#06b6d4', border: 'border-cyan-500/40', bg: 'bg-cyan-500', text: 'text-cyan-500' },
  "Xato raqam": { label: "Xato raqam", color: '#f43f5e', border: 'border-rose-500/40', bg: 'bg-rose-500', text: 'text-rose-500' },
  "O'qimaydi": { label: "O'qimaydi", color: '#ef4444', border: 'border-red-500/40', bg: 'bg-red-500', text: 'text-red-500' },
  "O'qiydi": { label: "O'qiydi", color: '#6366f1', border: 'border-indigo-500/40', bg: 'bg-indigo-500', text: 'text-indigo-500' },
  "Shartnoma berildi": { label: "Shartnoma berildi", color: '#10b981', border: 'border-emerald-500/40', bg: 'bg-emerald-500', text: 'text-emerald-500' },
  "Kutilmoqda": { label: "Kutilmoqda", color: '#a3a3a3', border: 'border-neutral-400/30', bg: 'bg-neutral-400', text: 'text-neutral-400' },
};

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ operators = [] }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard'>('overview');
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  // ── Calculate Operator statistics & clean metrics ───────────────────────
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
    const kutilmoqda = records.filter(r => !r.natija || r.natija === 'Kutilmoqda' || r.natija === '').length;
    
    const processed = records.length - kutilmoqda;
    const percent = records.length > 0 ? Math.round((processed / records.length) * 100) : 0;

    const nameParts = op.name.split(' ');
    const displayName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[1].charAt(0)}.` : op.name;

    return {
      name: displayName, 
      fullName: op.name,
      "Ko'tarmadi": kotarmadi, 
      "O'chirilgan": ochirilgan,
      "O'ylab ko'radi": oylabKoradi, 
      "Maslahat qiladi": maslahatQiladi,
      "Xato raqam": xatoRaqam, 
      "O'qimaydi": oqimaydi, 
      "O'qiydi": oqiydi, 
      "Shartnoma berildi": shartnomaBerildi, 
      "Kutilmoqda": kutilmoqda,
      total: records.length, 
      processed, 
      percent
    };
  });

  // ── Leaderboard logic ────────────────────────────────────────────────────────
  const leaderboard = [...operatorData].sort((a, b) => {
    // Sort primarily by contract value, then by process percentage
    if (b["Shartnoma berildi"] !== a["Shartnoma berildi"]) {
      return b["Shartnoma berildi"] - a["Shartnoma berildi"];
    }
    return b.percent - a.percent;
  });

  // ── Hududiy / Regional Map calculations ────────────────────────────────────
  const viloyatMap: Record<string, Record<string, number>> = {};
  operators.forEach(op => {
    (op.records || []).forEach(rec => {
      const v = rec.viloyat?.trim() || "Noma'lum";
      if (!viloyatMap[v]) {
        viloyatMap[v] = {
          total: 0,
          "Ko'tarmadi": 0,
          "O'chirilgan": 0,
          "O'ylab ko'radi": 0,
          "Maslahat qiladi": 0,
          "Xato raqam": 0,
          "O'qimaydi": 0,
          "O'qiydi": 0,
          "Shartnoma berildi": 0,
          "Kutilmoqda": 0
        };
      }
      viloyatMap[v].total++;
      if (rec.natija === "Ko'tarmadi") viloyatMap[v]["Ko'tarmadi"]++;
      else if (rec.natija === "O'chirilgan") viloyatMap[v]["O'chirilgan"]++;
      else if (rec.natija === "O'ylab ko'radi") viloyatMap[v]["O'ylab ko'radi"]++;
      else if (rec.natija === "Maslahat qiladi") viloyatMap[v]["Maslahat qiladi"]++;
      else if (rec.natija === "Xato raqam") viloyatMap[v]["Xato raqam"]++;
      else if (rec.natija === "O'qimaydi") viloyatMap[v]["O'qimaydi"]++;
      else if (rec.natija === "O'qiydi") viloyatMap[v]["O'qiydi"]++;
      else if (rec.natija === "Shartnoma berildi") viloyatMap[v]["Shartnoma berildi"]++;
      else viloyatMap[v]["Kutilmoqda"]++;
    });
  });

  const regionalData = Object.entries(viloyatMap)
    .map(([name, s]) => ({
      name,
      total: s.total,
      ...s
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // ── System-wide summaries ──────────────────────────────────────────────────
  let totalCalls = 0;
  let totalKotarmadi = 0;
  let totalOchirilgan = 0;
  let totalOylabKoradi = 0;
  let totalMaslahatQiladi = 0;
  let totalXatoRaqam = 0;
  let totalOqimaydi = 0;
  let totalOqiydi = 0;
  let totalShartnomaBerildi = 0;

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
  const conversionPct = totalProcessed > 0 ? Math.round((totalShartnomaBerildi / totalProcessed) * 100) : 0;

  const donutData = [
    { name: "Ko'tarmadi", value: totalKotarmadi, color: '#f97316' },
    { name: "O'chirilgan", value: totalOchirilgan, color: '#64748b' },
    { name: "O'ylab ko'radi", value: totalOylabKoradi, color: '#eab308' },
    { name: "Maslahat qiladi", value: totalMaslahatQiladi, color: '#06b6d4' },
    { name: "Xato raqam", value: totalXatoRaqam, color: '#f43f5e' },
    { name: "O'qimaydi", value: totalOqimaydi, color: '#ef4444' },
    { name: "O'qiydi", value: totalOqiydi, color: '#6366f1' },
    { name: "Shartnoma berildi", value: totalShartnomaBerildi, color: '#10b981' },
    { name: "Kutilmoqda", value: totalKutilmoqda, color: '#cbd5e1' }
  ].filter(d => d.value > 0);

  const getRankBadge = (idx: number) => {
    switch (idx) {
      case 0:
        return { text: '🥇 Gʻolib', style: 'border-amber-500/60 text-amber-500 bg-amber-500/5' };
      case 1:
        return { text: '🥈 Kuchli', style: 'border-[#94a3b8]/60 text-[#94a3b8] bg-[#94a3b8]/5' };
      case 2:
        return { text: '🥉 Bronza', style: 'border-[#b45309]/60 text-[#b45309] bg-[#b45309]/5' };
      default:
        return { text: `${idx + 1}-oʻrin`, style: 'border-neutral-500/20 text-neutral-400' };
    }
  };

  // Outer container variants for nice stagged enter
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="space-y-6">
      
      {/* ── PREMIUM OUTLINE STATS / HEAD SHELF ────────────────────────────────── */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { 
            icon: <Flame className="w-5 h-5 text-emerald-500 animate-pulse" />, 
            label: "Muvaffaqiyatli Bitim", 
            value: `${totalShartnomaBerildi} ta Shartnoma`, 
            sub: `Konversiya: ${conversionPct}%`, 
            border: 'border-emerald-500/30 hover:border-emerald-500/70' 
          },
          { 
            icon: <Activity className="w-5 h-5 text-indigo-500" />, 
            label: "Jami Bajarilgan Ishlar", 
            value: `${totalProcessed} / ${totalCalls}`, 
            sub: `${overallPct}% Yuklama yakunlandi`, 
            border: 'border-indigo-500/30 hover:border-indigo-500/70' 
          },
          { 
            icon: <Users className="w-5 h-5 text-cyan-500" />, 
            label: "Faol Operatorlar", 
            value: `${operators.length} Operator`, 
            sub: "Onlayn tarmoqda faol", 
            border: 'border-cyan-500/30 hover:border-cyan-500/70' 
          },
          { 
            icon: <MapPin className="w-5 h-5 text-amber-500" />, 
            label: "Hududiy Qamrov", 
            value: `${Object.keys(viloyatMap).length} ta Viloyat`, 
            sub: "Respublika bo'ylab qamrov", 
            border: 'border-amber-500/30 hover:border-amber-500/70' 
          },
        ].map((item, idx) => (
          <motion.div 
            key={idx}
            variants={cardVariants}
            className={`cursor-default bg-transparent backdrop-blur-xs border ${item.border} rounded-2xl p-5 shadow-xs transition-all duration-300 flex items-center justify-between gap-4`}
          >
            <div className="space-y-1">
              <span className="text-[10px] tracking-widest font-black uppercase text-neutral-400 dark:text-neutral-500 block">
                {item.label}
              </span>
              <h3 className="text-xl font-black text-neutral-850 dark:text-neutral-100 tracking-tight">
                {item.value}
              </h3>
              <p className="text-xs font-semibold text-neutral-550 dark:text-neutral-400">
                {item.sub}
              </p>
            </div>
            <div className="p-3 bg-neutral-100/50 dark:bg-neutral-900/50 rounded-xl border border-neutral-200/40 dark:border-neutral-800/40 shadow-2xs shrink-0 flex items-center justify-center">
              {item.icon}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── CENTRAL SEGMENTED CONTROLS & TIMELINE ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 dark:border-neutral-800/80 pb-4 gap-3">
        <div className="inline-flex p-1 bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-800/50 rounded-xl shrink-0 self-start">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2 rounded-lg text-xs font-black tracking-wide transition-all uppercase cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800/60 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-350'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Umumiy Diagnostika
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-5 py-2 rounded-lg text-xs font-black tracking-wide transition-all uppercase cursor-pointer flex items-center gap-2 ${
              activeTab === 'leaderboard'
                ? 'bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800/60 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-350'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Liderlar Reytingi
          </button>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100/50 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-800/60 rounded-lg text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
            <Calendar className="w-3.5 h-3.5 text-neutral-450" />
            <span>Tashkent Timezone:</span>
            <span className="font-mono text-neutral-700 dark:text-neutral-300 font-bold">
              {new Date().toLocaleDateString('uz-UZ')}
            </span>
          </div>
        </div>
      </div>

      {/* ── ANIMATED TAB FRAMES ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Top row - Performance split & status ratio */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Operator performance stacked bar-chart */}
              <div className="bg-transparent border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-5 shadow-2xs lg:col-span-2 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-3 mb-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-450 dark:text-neutral-500">Tahliliy ustunlar</span>
                    <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-violet-500" />
                      Xodimlarning Ish Unumdorligi
                    </h3>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="h-[310px] w-full text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={operatorData} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.08)" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#737373" 
                        tick={{ fontSize: 9, fontWeight: '700' }} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#737373" 
                        tick={{ fontSize: 9, fontWeight: '700' }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={document.documentElement.classList.contains('dark') ? TOOLTIP_STYLE_DARK : TOOLTIP_STYLE_LIGHT} 
                        labelFormatter={(label) => {
                          const op = operatorData.find(o => o.name === label);
                          return op ? op.fullName : label;
                        }}
                      />
                      <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 9, fontWeight: 'bold', paddingTop: '10px' }} />
                      <Bar dataKey="Ko'tarmadi" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="O'chirilgan" stackId="a" fill="#737373" />
                      <Bar dataKey="O'ylab ko'radi" stackId="a" fill="#eab308" />
                      <Bar dataKey="Maslahat qiladi" stackId="a" fill="#06b6d4" />
                      <Bar dataKey="Xato raqam" stackId="a" fill="#f43f5e" />
                      <Bar dataKey="O'qimaydi" stackId="a" fill="#ef4444" />
                      <Bar dataKey="O'qiydi" stackId="a" fill="#6366f1" />
                      <Bar dataKey="Shartnoma berildi" stackId="a" fill="#10b981" />
                      <Bar dataKey="Kutilmoqda" stackId="a" fill="#a3a3a3" stroke="rgba(0,0,0,0.05)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Advanced glass donut ratio map */}
              <div className="bg-transparent border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-3 mb-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-450 dark:text-neutral-500">Foiz ulushi</span>
                    <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                      <PieIcon className="w-4 h-4 text-emerald-500" />
                      Joriy Natija Strukturasi
                    </h3>
                  </div>
                </div>

                <div className="my-2 h-[180px] relative flex items-center justify-center">
                  {donutData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={donutData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={55} 
                          outerRadius={75} 
                          paddingAngle={3} 
                          dataKey="value"
                        >
                          {donutData.map((entry, idx) => (
                            <Cell 
                              key={idx} 
                              fill={entry.color} 
                              stroke="none" 
                              style={{ 
                                outline: hoveredMetric === entry.name ? `2px solid ${entry.color}` : 'none',
                                filter: hoveredMetric && hoveredMetric !== entry.name ? 'opacity(30%)' : 'none',
                                transition: 'all 200ms ease'
                              }}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={document.documentElement.classList.contains('dark') ? TOOLTIP_STYLE_DARK : TOOLTIP_STYLE_LIGHT} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-neutral-400 font-bold italic">Bazada yozuvlar yo'q</div>
                  )}

                  {donutData.length > 0 && (
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-neutral-800 dark:text-neutral-100 tracking-tight">{overallPct}%</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Ishlandi</span>
                    </div>
                  )}
                </div>

                {/* Grid stats labels - beautifully hollowed outlines style */}
                <div className="grid grid-cols-2 gap-1.5 pt-4 border-t border-neutral-100 dark:border-neutral-800/60 max-h-[140px] overflow-y-auto">
                  {donutData.map((entry, idx) => {
                    const meta = STATUS_META[entry.name] || STATUS_META["Kutilmoqda"];
                    return (
                      <div 
                        key={idx} 
                        onMouseEnter={() => setHoveredMetric(entry.name)}
                        onMouseLeave={() => setHoveredMetric(null)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${meta.border} bg-transparent transition-all duration-200 cursor-pointer`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${meta.bg}`} />
                          <span className="text-neutral-600 dark:text-neutral-300 font-bold truncate text-[10px]">{entry.name}</span>
                        </div>
                        <span className={`font-mono font-black text-[10px] pl-1 shrink-0 ${meta.text}`}>
                          {entry.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Regional breakdown table/graphics block */}
            <div className="bg-transparent border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/50 pb-3 mb-4">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-450 dark:text-neutral-500">Hududlar bo'yicha</span>
                  <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-500" />
                    Viloyatlararo Qamrov tahlili (Top 10)
                  </h3>
                </div>
              </div>

              <div className="h-[260px] w-full text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionalData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.08)" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#888888" 
                      tick={{ fontSize: 9, fontWeight: '700' }} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#888888" 
                      tick={{ fontSize: 9, fontWeight: '700' }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip contentStyle={document.documentElement.classList.contains('dark') ? TOOLTIP_STYLE_DARK : TOOLTIP_STYLE_LIGHT} />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 9, fontWeight: 'bold', paddingTop: '10px' }} />
                    <Bar dataKey="Ko'tarmadi" stackId="b" fill="#f97316" />
                    <Bar dataKey="O'chirilgan" stackId="b" fill="#737373" />
                    <Bar dataKey="O'ylab ko'radi" stackId="b" fill="#eab308" />
                    <Bar dataKey="Maslahat qiladi" stackId="b" fill="#06b6d4" />
                    <Bar dataKey="Xato raqam" stackId="b" fill="#f43f5e" />
                    <Bar dataKey="O'qimaydi" stackId="b" fill="#ef4444" />
                    <Bar dataKey="O'qiydi" stackId="b" fill="#6366f1" />
                    <Bar dataKey="Shartnoma berildi" stackId="b" fill="#10b981" />
                    <Bar dataKey="Kutilmoqda" stackId="b" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── LEADERBOARD TAB DETAIL ────────────────────────────────────────── */}
        {activeTab === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800/60 mb-2 gap-3">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-450 dark:text-neutral-500">Natijadorlik bahosi</span>
                <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Muvaffaqiyatli Bitimlar (Shartnomalar) Reytingi
                </h3>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200/50 dark:border-neutral-800/50 bg-neutral-100/30 dark:bg-neutral-900/40 text-[10px] text-neutral-450 font-bold select-none">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Dillar soni + Foiz nisbiy ko'rsatkich
              </div>
            </div>

            {leaderboard.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400 font-bold border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                Bazada hech qanday operator ma'lumotlari topilmadi.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {leaderboard.map((op, i) => {
                  const badge = getRankBadge(i);
                  const shartnomalar = op["Shartnoma berildi"];
                  const processingPerc = op.percent;
                  
                  return (
                    <motion.div
                      key={op.fullName}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className={`group relative p-5 bg-transparent border rounded-2xl transition-all duration-300 hover:shadow-xs overflow-hidden flex flex-col justify-between ${
                        i === 0 
                          ? 'border-amber-400/40 dark:border-amber-500/30 shadow-xs shadow-amber-500/5' 
                          : 'border-neutral-200 dark:border-neutral-800/80'
                      }`}
                    >
                      {/* Glow effect for No1 */}
                      {i === 0 && (
                        <div className="absolute -right-24 -top-24 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
                      )}

                      <div className="space-y-4">
                        {/* Header details */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-neutral-140 dark:bg-neutral-900 flex items-center justify-center font-black text-neutral-800 dark:text-neutral-250 text-sm border border-neutral-200 dark:border-neutral-800 shadow-2xs select-none">
                              {op.name.charAt(0)}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-neutral-900 dark:text-neutral-100 group-hover:text-amber-500 transition-colors truncate">
                                {op.fullName}
                              </h4>
                              <p className="text-[10px] font-bold text-neutral-500 flex items-center gap-1.5 mt-0.5">
                                <span>Barcha satrlar: <strong className="text-neutral-800 dark:text-neutral-300 font-mono font-bold">{op.total} ta</strong></span>
                                <span className="text-neutral-300 dark:text-neutral-800">|</span>
                                <span>Bog'lanildi: <strong className="text-neutral-800 dark:text-neutral-300 font-mono font-bold">{op.processed} ta</strong></span>
                              </p>
                            </div>
                          </div>

                          <span className={`text-[10px] px-2.5 py-1 font-extrabold tracking-wide rounded-lg border ${badge.style}`}>
                            {badge.text}
                          </span>
                        </div>

                        {/* Visual statistics grid - fully outline, transparent back */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="border border-emerald-500/20 py-2.5 rounded-xl">
                            <span className="text-[10px] font-bold text-neutral-450 dark:text-neutral-500 block mb-0.5">Shartnoma</span>
                            <span className="text-sm font-black text-emerald-500 font-mono">{shartnomalar} ta</span>
                          </div>
                          
                          <div className="border border-indigo-500/20 py-2.5 rounded-xl">
                            <span className="text-[10px] font-bold text-neutral-450 dark:text-neutral-500 block mb-0.5">O'qiydi</span>
                            <span className="text-sm font-black text-indigo-500 font-mono">{op["O'qiydi"]} ta</span>
                          </div>

                          <div className="border border-yellow-500/20 py-2.5 rounded-xl">
                            <span className="text-[10px] font-bold text-neutral-450 dark:text-neutral-500 block mb-0.5">O'ylab ko'radi</span>
                            <span className="text-sm font-black text-yellow-500 font-mono">{op["O'ylab ko'radi"]} ta</span>
                          </div>
                        </div>
                      </div>

                      {/* Visual progress bar matching modern outline style */}
                      <div className="space-y-1.5 mt-4">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-neutral-505 dark:text-neutral-450 font-bold flex items-center gap-1">
                            <Activity className="w-3 h-3 text-neutral-400" /> General Progress
                          </span>
                          <span className="font-extrabold text-neutral-805 dark:text-neutral-200 font-mono">{processingPerc}%</span>
                        </div>
                        
                        <div className="h-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${processingPerc}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                              processingPerc >= 80 
                                ? 'bg-emerald-500' 
                                : processingPerc >= 50 
                                ? 'bg-indigo-500' 
                                : 'bg-amber-500'
                            }`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
