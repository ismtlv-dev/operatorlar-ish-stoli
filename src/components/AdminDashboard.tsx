/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useMemo } from 'react';
import { Operator, EditLog, SchoolRecord } from '../types';
import { ExcelImport } from './ExcelImport';
import { AnalyticsPanel } from './AnalyticsPanel';
import { 
  Users, Activity, Trophy, Sliders, AlertTriangle, ArrowUpRight, 
  Trash2, Edit2, Send, Calendar, SlidersHorizontal, FolderInput,
  Clock, ShieldAlert, BadgeInfo, CheckCircle2, ChevronUp, ChevronDown,
  Lock, Settings, Search, Download, Share2, Clipboard, ShieldCheck,
  HelpCircle, FileJson, Upload, Eye, RefreshCw, Award, Flame, 
  Sparkles, Filter, X, UserCheck, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

interface AdminDashboardProps {
  operators: Operator[];
  activeAdminTab: string;
  setActiveAdminTab: (tab: string) => void;
  isAdminLoggedIn: boolean;
  setIsAdminLoggedIn: (val: boolean) => void;
  currentView: string;
  setCurrentView: (view: 'admin' | 'operator') => void;
  triggerNotification: (msg: string) => void;
  
  // Handlers and states from App.tsx
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  bulkDataInput: string;
  setBulkDataInput: (val: string) => void;
  handleBulkRefillOperator: () => void;
  adminLogSearch: string;
  setAdminLogSearch: (val: string) => void;
  filteredLogs: EditLog[];
  handleAddNewOperatorSubmit: (e: React.FormEvent) => void;
  newOpNameInput: string;
  setNewOpNameInput: (val: string) => void;
  bulkSanaInput: string;
  setBulkSanaInput: (val: string) => void;
  handleBulkUpdateDate: () => void;
  handleClearAllProgress: () => void;
  handleClearChatMessages: () => void;
  handleClearAllSchoolRecords: () => void;
  handleAddNewOperator: (name: string) => void;
  handleRenameOperator: (id: string, name: string) => void;
  handleSetOperatorPassword: (id: string, pass: string) => void;
  handleDeleteOperator: (id: string) => void;
  handleReorderOperators: (fromIndex: number, toIndex: number) => void;
  
  tgBotToken: string;
  setTgBotToken: (val: string) => void;
  tgChannelId: string;
  setTgChannelId: (val: string) => void;
  tgAdminChatId: string;
  setTgAdminChatId: (val: string) => void;
  handleSaveTelegramConfigs: (token: string, channel: string, admin: string) => void;
  handleTestTelegramDelivery: (token: string, channel: string, admin: string) => void;
  tgTestingState: 'idle' | 'sending' | 'success' | 'error';
  tgTestErrorMessage: string;
  handleImportRecords: (records: SchoolRecord[]) => void;
  
  theme: 'light' | 'dark';
}

const convertToDateInputValue = (uzDateStr: string) => {
  if (!uzDateStr) return '';
  const parts = uzDateStr.split('.');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return '';
};

const convertFromDateInputValue = (dateInputStr: string) => {
  if (!dateInputStr) return '';
  const parts = dateInputStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${day}.${month}.${year}`;
  }
  return '';
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  operators,
  activeAdminTab,
  setActiveAdminTab,
  isAdminLoggedIn,
  setIsAdminLoggedIn,
  currentView,
  setCurrentView,
  triggerNotification,
  handleFileUpload,
  bulkDataInput,
  setBulkDataInput,
  handleBulkRefillOperator,
  adminLogSearch,
  setAdminLogSearch,
  filteredLogs,
  handleAddNewOperatorSubmit,
  newOpNameInput,
  setNewOpNameInput,
  bulkSanaInput,
  setBulkSanaInput,
  handleBulkUpdateDate,
  handleClearAllProgress,
  handleClearChatMessages,
  handleClearAllSchoolRecords,
  handleAddNewOperator,
  handleRenameOperator,
  handleSetOperatorPassword,
  handleDeleteOperator,
  handleReorderOperators,
  tgBotToken,
  setTgBotToken,
  tgChannelId,
  setTgChannelId,
  tgAdminChatId,
  setTgAdminChatId,
  handleSaveTelegramConfigs,
  handleTestTelegramDelivery,
  tgTestingState,
  tgTestErrorMessage,
  handleImportRecords,
  theme
}) => {
  
  // ── LOCAL INTERACTIVE STATES ───────────────────────────────────────
  const [opSearchQuery, setOpSearchQuery] = useState('');
  const [opSortBy, setOpSortBy] = useState<'name' | 'checked' | 'total' | 'contracts'>('contracts');
  const [selectedDetailOpId, setSelectedDetailOpId] = useState<string | null>(null);
  const [opDetailSearch, setOpDetailSearch] = useState('');
  const [opDetailStatusFilter, setOpDetailStatusFilter] = useState('ALL');
  
  // Timeline audit log states
  const [logOperatorFilter, setLogOperatorFilter] = useState('ALL');
  const [logTypeFilter, setLogTypeFilter] = useState('ALL');
  
  // Quick JSON state backup
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success'>('idle');

  // Telegram Live Simulator state
  const [simOperatorName, setSimOperatorName] = useState('Anvarov Sanjar');
  const [simSchoolName, setSimSchoolName] = useState('Yunusobod tumanidagi 52-maktab');
  const [simResult, setSimResult] = useState('Shartnoma berildi');
  const [simComments, setSimComments] = useState('Sinf xonalari sharoitlari tahlil qilindi, taklif qabul qilindi: qabul.bui.uz/req-209');

  // ── EXCELLENT BRANDED MENU META ───────────────────────────────────
  const adminTabsMeta = [
    { id: 'stats', label: "Faollik Monitoringi", desc: "Xodimlar unumdorligi", icon: <Activity className="w-4 h-4" /> },
    { id: 'analytics', label: "Grafik Tahlillar", desc: "Vizual tahlil paneli", icon: <Trophy className="w-4 h-4" /> },
    { id: 'topup', label: "Balans To'ldirish", desc: "40 talik maktab taqsimoti", icon: <ArrowUpRight className="w-4 h-4" /> },
    { id: 'logs', label: "Tahrirlar Jurnali", desc: "Soniyama-soniy audit", icon: <Clock className="w-4 h-4" /> },
    { id: 'operators_list', label: "Operatorlar Sozlamalari", desc: "Xodimlar va parollar", icon: <Users className="w-4 h-4" /> },
    { id: 'tg_settings', label: "Telegram Integratsiyasi", desc: "Bot va guruh monitoringi", icon: <Send className="w-4 h-4" /> },
    { id: 'excel_import', label: "Excel Hujjat Yuklash", desc: "Ommaviy maktablar bazasi", icon: <FolderInput className="w-4 h-4" /> },
    { id: 'settings', label: "Tizim Sozlamalari", desc: "Zaxiralash va tozalash", icon: <Settings className="w-4 h-4" /> },
  ];

  // ── OPERATOR STATS CALCULATOR ─────────────────────────────────────
  const computedOperators = useMemo(() => {
    return operators.map(op => {
      const recs = op.records || [];
      const total = recs.length;
      
      const kotarmadi = recs.filter(r => r.natija === "Ko'tarmadi").length;
      const ochirilgan = recs.filter(r => r.natija === "O'chirilgan").length;
      const oylabKoradi = recs.filter(r => r.natija === "O'ylab ko'radi").length;
      const maslahatQiladi = recs.filter(r => r.natija === "Maslahat qiladi").length;
      const xatoRaqam = recs.filter(r => r.natija === "Xato raqam").length;
      const oqimaydi = recs.filter(r => r.natija === "O'qimaydi").length;
      const oqiydi = recs.filter(r => r.natija === "O'qiydi").length;
      const shartnomaBerildi = recs.filter(r => r.natija === "Shartnoma berildi").length;
      const kutilmoqda = recs.filter(r => !r.natija || r.natija === 'Kutilmoqda' || r.natija === '').length;
      
      const processed = total - kutilmoqda;
      const completionRate = total ? Math.round((processed / total) * 100) : 0;

      return {
        ...op,
        metrics: {
          total,
          kotarmadi,
          ochirilgan,
          oylabKoradi,
          maslahatQiladi,
          xatoRaqam,
          oqimaydi,
          oqiydi,
          shartnomaBerildi,
          kutilmoqda,
          processed,
          completionRate
        }
      };
    });
  }, [operators]);

  // ── FILTER AND SORT OPERATOR CARDS ──────────────────────────────
  const sortedAndFilteredOperators = useMemo(() => {
    let list = computedOperators.filter(op => 
      op.name.toLowerCase().includes(opSearchQuery.toLowerCase())
    );

    if (opSortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (opSortBy === 'checked') {
      list.sort((a, b) => b.metrics.completionRate - a.metrics.completionRate);
    } else if (opSortBy === 'total') {
      list.sort((a, b) => b.metrics.total - a.metrics.total);
    } else if (opSortBy === 'contracts') {
      list.sort((a, b) => b.metrics.shartnomaBerildi - a.metrics.shartnomaBerildi);
    }

    return list;
  }, [computedOperators, opSearchQuery, opSortBy]);

  // ── EXPORT ENTIRE EXCEL/CSV KPI REPORT ────────────────────────────
  const exportFullKPIReportCSV = () => {
    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "ID,Operator F.I.Sh,Jami,Ishlandi,Kutilmoqda,Completion %,Shartnoma,O'qiydi,O'ylab Ko'radi,Maslahat,Ko'tarmadi,Xato raqam,O'qimaydi,O'chirilgan\n";
      
      computedOperators.forEach(op => {
        const m = op.metrics;
        const row = [
          op.id,
          `"${op.name.replace(/"/g, '""')}"`,
          m.total,
          m.processed,
          m.kutilmoqda,
          `${m.completionRate}%`,
          m.shartnomaBerildi,
          m.oqiydi,
          m.oylabKoradi,
          m.maslahatQiladi,
          m.kotarmadi,
          m.xatoRaqam,
          m.oqimaydi,
          m.ochirilgan
        ].join(",");
        csvContent += row + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Operatorlar_Unumdorlik_KPI_Hisoboti_${new Date().toLocaleDateString('uz-UZ')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerNotification("Premium KPI hisoboti muvaffaqiyatli yuklab olindi! (CSV formati)");
    } catch (e) {
      triggerNotification("Kechirasiz, eksport qilishda xatolik yuz berdi.");
    }
  };

  // ── DETAILED VIEWER FOR INDIVIDUAL OPERATOR ───────────────────────
  const activeDetailOp = useMemo(() => {
    if (!selectedDetailOpId) return null;
    return computedOperators.find(op => op.id === selectedDetailOpId) || null;
  }, [computedOperators, selectedDetailOpId]);

  const filteredOpDetailRecords = useMemo(() => {
    if (!activeDetailOp) return [];
    let list = activeDetailOp.records || [];
    
    if (opDetailSearch) {
      const q = opDetailSearch.toLowerCase();
      list = list.filter(r => 
        (r.maktabNomi || '').toLowerCase().includes(q) ||
        (r.tuman || '').toLowerCase().includes(q) ||
        (r.direktor || '').toLowerCase().includes(q) ||
        (r.telefon || '').toLowerCase().includes(q) ||
        (r.izoh || '').toLowerCase().includes(q)
      );
    }

    if (opDetailStatusFilter !== 'ALL') {
      if (opDetailStatusFilter === 'Kutilmoqda') {
        list = list.filter(r => !r.natija || r.natija === 'Kutilmoqda' || r.natija === '');
      } else {
        list = list.filter(r => r.natija === opDetailStatusFilter);
      }
    }

    return list;
  }, [activeDetailOp, opDetailSearch, opDetailStatusFilter]);

  // ── BALANCED QUEUE FORECAST CALCULATIONS ─────────────────────────
  const distributionForecast = useMemo(() => {
    if (!bulkDataInput.trim()) return null;
    const lines = bulkDataInput.split('\n').filter(l => l.trim() !== '');
    const itemsCount = lines.length;
    
    // Sort operators currently lacking 40 files
    const lowQueueOps = computedOperators.map(op => {
      const currentKutilmoqda = op.metrics.kutilmoqda;
      const deficit = Math.max(0, 40 - currentKutilmoqda);
      return { id: op.id, name: op.name, currentKutilmoqda, deficit };
    });

    let remaining = itemsCount;
    const allocation: Record<string, { name: string; allocated: number; finalKutilmoqda: number }> = {};
    
    // Initialize
    lowQueueOps.forEach(op => {
      allocation[op.id] = { name: op.name, allocated: 0, finalKutilmoqda: op.currentKutilmoqda };
    });

    // Step 1: Fill up to 40
    let loopProtect = 0;
    while (remaining > 0 && loopProtect < 1000) {
      loopProtect++;
      // Find operators who are below 40 and have the minimum kutilmoqda
      const candidates = lowQueueOps
        .filter(op => allocation[op.id].finalKutilmoqda < 40)
        .sort((a, b) => allocation[a.id].finalKutilmoqda - allocation[b.id].finalKutilmoqda);

      if (candidates.length === 0) break; // All at 40 or more

      // Allocate 1 item to the one with the least kutilmoqda
      const target = candidates[0];
      allocation[target.id].allocated += 1;
      allocation[target.id].finalKutilmoqda += 1;
      remaining--;
    }

    // Step 2: Split remaining evenly
    if (remaining > 0) {
      const opIds = computedOperators.map(o => o.id);
      const baseShare = Math.floor(remaining / opIds.length);
      const extraShare = remaining % opIds.length;

      opIds.forEach((id, idx) => {
        const extra = idx < extraShare ? 1 : 0;
        allocation[id].allocated += baseShare + extra;
        allocation[id].finalKutilmoqda += baseShare + extra;
      });
    }

    return {
      totalInput: itemsCount,
      allocationList: Object.values(allocation)
    };
  }, [bulkDataInput, computedOperators]);

  // ── BACKUP DATA UTILITIES ─────────────────────────────────────────
  const downloadJSONBackup = () => {
    try {
      const backupObj = {
        exportedAt: new Date().toISOString(),
        operators: operators.map(op => ({
          id: op.id,
          name: op.name,
          password: op.password,
          records: op.records
        }))
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `School_App_Baza_Zaxira_Nusxa_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      setBackupStatus('success');
      setTimeout(() => setBackupStatus('idle'), 4000);
      triggerNotification("Tizimning to'liq JSON zaxira nusxasi kompyuterga yuklandi!");
    } catch(err) {
      triggerNotification("Xatolik: Rezerv nusxa saqlanmadi.");
    }
  };

  const handleRestoreJSONBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.operators)) {
          // Re-inject records
          const rebuiltOps: SchoolRecord[] = [];
          parsed.operators.forEach((op: any) => {
            if (Array.isArray(op.records)) {
              rebuiltOps.push(...op.records);
            }
          });

          if (rebuiltOps.length > 0) {
            handleImportRecords(rebuiltOps);
            // Also let's re-save structural adjustments if any
            triggerNotification(`Zaxira fayli muvaffaqiyatli tiklandi! ${rebuiltOps.length} ta maktab yuklandi.`);
          } else {
            triggerNotification("Zaxira nusxasi ichidan muassasalar topilmadi.");
          }
        } else {
          triggerNotification("Noto'g'ri zaxira fayl formati! (Operators massivi yo'q)");
        }
      } catch (err) {
        triggerNotification("JSON faylni o'qishda xatolik yuz berdi. Iltimos tekshiring.");
      }
    };
    fileReader.readAsText(files[0]);
  };

  // ── MOCK TELEGRAM PREVIEW RENDERER ───────────────────────────────
  const renderSimulatedTelegramMessage = () => {
    const timeStr = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    const hasSpecialLink = simComments.toLowerCase().includes('qabul.bui.uz') || simResult === 'Shartnoma berildi';
    
    return (
      <div className="bg-[#17212b] rounded-2xl p-4 text-white font-sans max-w-sm shadow-xl space-y-3.5 border border-[#24303f]">
        <div className="flex items-center gap-2 border-b border-[#24303f] pb-2">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs">
            📢
          </div>
          <div className="text-xs leading-none">
            <h5 className="font-bold text-white">Monitoring Jurnali Bot</h5>
            <span className="text-[10px] text-neutral-400">guruhga ulangan (onlayn)</span>
          </div>
        </div>

        {/* Regular Message Segment */}
        <div className="space-y-1.5 text-[11px] leading-relaxed select-none">
          <p className="text-emerald-400 font-bold">📝 TIZIM ISH JURNALI</p>
          <p>👤 <b>Operator:</b> {simOperatorName} (#{simOperatorName.toLowerCase().split(' ')[0]})</p>
          <p>👤 <b>Mijoz:</b> {simSchoolName} (Toshkent)</p>
          <p>🔧 <b>O'zgarish:</b> Natija tahriri</p>
          <p>🔹 <b>Eski qiymat:</b> Kutilmoqda</p>
          <p>🔸 <b>Yangi qiymat:</b> <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-sm font-semibold">{simResult}</span></p>
          <p className="text-neutral-400 text-[10px] mt-1">⏰ Toshkent vaqti: Bugun, {timeStr}</p>
        </div>

        {/* Alert Segment if conditions are met */}
        {hasSpecialLink && (
          <div className="border-t border-[#24303f] pt-3 mt-2 space-y-1.5 text-[11px] bg-emerald-950/20 p-2.5 rounded-lg">
            <p className="text-amber-400 font-bold flex items-center gap-1">🚀 DETAL ALERTI FAOL!</p>
            <p>👤 <b>Mijoz:</b> <b>52-maktab (Yunusobod)</b></p>
            <p>📞 <b>Telefoni:</b> +99890XXXXXXX</p>
            <p className="text-neutral-300 italic">"Xodim hamkorlik linkini yaratib berdi:"</p>
            <p className="bg-[#101921] p-1.5 rounded-md font-mono text-[9.5px] text-teal-300 select-all overflow-x-auto">
              {simResult === 'Shartnoma berildi' ? 'https://qabul.bui.uz/generated-contract-id-52' : 'https://qabul.bui.uz/req-209'}
            </p>
          </div>
        )}
      </div>
    );
  };

  // ── AUDIT LOG FILTERED SELECTION ──────────────────────────────────
  const uniqueOperatorsInLogs = useMemo(() => {
    const list = new Set<string>();
    filteredLogs.forEach(l => {
      if (l.operatorName) list.add(l.operatorName);
    });
    return Array.from(list);
  }, [filteredLogs]);

  const auditFilteredLogs = useMemo(() => {
    let list = filteredLogs;
    
    if (logOperatorFilter !== 'ALL') {
      list = list.filter(l => l.operatorName === logOperatorFilter);
    }
    
    if (logTypeFilter !== 'ALL') {
      list = list.filter(l => l.field === logTypeFilter);
    }

    return list;
  }, [filteredLogs, logOperatorFilter, logTypeFilter]);

  // Handle direct operator mock authentication toggle
  const handleEmulatedOperatorLogin = (opId: string, name: string) => {
    try {
      localStorage.setItem('school_operators_current_op', opId);
      triggerNotification(`Simulyatsiya rejimi muvaffaqiyatli yoqildi: Hozir siz operator ${name} sifatida kirdingiz!`);
      // Automatically refresh to apply view
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch(err) {
      triggerNotification("Ulanish xatosi.");
    }
  };

  return (
    <div className="bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-xs transition-all duration-300">
      
      {/* ── HEADER DESIGN: ULTRA MODERN BANNER ───────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-5 mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500 to-indigo-600 opacity-60 blur-xs group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative bg-white dark:bg-neutral-950 p-2.5 rounded-full border border-neutral-200 dark:border-neutral-800">
              <Shield className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-1 px-2.5 text-white bg-indigo-600 rounded-full text-[9px] font-black tracking-widest uppercase shadow-sm">
                BOSHQARUV MARKAZI
              </span>
              <span className="p-1 px-2 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-500"/> Nazorat Panel Faol
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white tracking-tight mt-1 flex items-center gap-2">
              Tizim Boshqaruv & Strategik Audit Platformasi
            </h2>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider font-mono">
              Operativ Seans Kaliti: <span className="bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-600 dark:text-neutral-300 font-bold border border-neutral-200/50 dark:border-neutral-800">OP-ADM-SYS-2026</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsAdminLoggedIn(false);
            setCurrentView('operator');
            localStorage.removeItem('school_operators_admin_status');
            triggerNotification("Admin rejimi yopildi.");
          }}
          className="px-4 py-2.5 bg-rose-650/10 hover:bg-rose-650/20 text-rose-600 dark:text-rose-450 border border-rose-500/20 rounded-xl text-xs font-black tracking-wide transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 shrink-0"
        >
          <span>Ekranni Yopish</span>
          <span className="text-sm">🚪</span>
        </button>
      </div>

      {/* ── MAIN DOUBLE ROW GRID LAYOUT ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sidebar Menu Menu Column */}
        <div className="lg:col-span-3 space-y-1.5 bg-neutral-100/40 dark:bg-neutral-950/30 p-3 rounded-3xl border border-neutral-250/30 dark:border-neutral-800/50">
          <span className="text-[9px] uppercase tracking-widest font-black text-neutral-400 pl-3 block mb-2 select-none">Bajaruvchi Bo'limlar</span>
          {adminTabsMeta.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveAdminTab(tab.id);
                // Reset detail modal if tab switches
                setSelectedDetailOpId(null);
              }}
              className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-300 cursor-pointer flex flex-col gap-0.5 group relative ${
                activeAdminTab === tab.id
                  ? 'bg-white dark:bg-neutral-900 border border-neutral-250/80 dark:border-neutral-800 shadow-md scale-[1.01]'
                  : 'hover:bg-neutral-200/40 dark:hover:bg-neutral-900/40 border border-transparent'
              }`}
            >
              {activeAdminTab === tab.id && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-500 rounded-full" />
              )}
              <div className="flex items-center gap-3">
                <span className={`p-1.5 rounded-xl border transition-colors ${
                  activeAdminTab === tab.id
                    ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                    : 'border-transparent text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 bg-transparent'
                }`}>
                  {tab.icon}
                </span>
                <span className={`text-xs font-black leading-none tracking-tight ${
                    activeAdminTab === tab.id
                      ? 'text-neutral-900 dark:text-white'
                      : 'text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-neutral-100'
                }`}>
                  {tab.label}
                </span>
              </div>
              <span className="text-[9.5px] text-neutral-400 dark:text-neutral-550 font-semibold pl-8 group-hover:text-neutral-500 transition-colors mt-0.5">
                {tab.desc}
              </span>
            </button>
          ))}
          
          <div className="pt-3 mt-4 border-t border-neutral-250/20 dark:border-neutral-800/40 px-3 flex flex-col gap-1 text-[10px] text-neutral-400">
            <span className="font-bold flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-500" /> Tizim ko'rsatkichi: </span>
            <span className="font-mono mt-0.5 font-semibold text-neutral-500">Operators count: {operators.length}</span>
            <span className="font-mono font-semibold text-neutral-500">Last backup: {new Date().toLocaleDateString('uz-UZ')}</span>
          </div>
        </div>

        {/* Right Active View Workspace Panel Column */}
        <div className="lg:col-span-9 p-5 border border-neutral-250/60 dark:border-neutral-800 rounded-3xl bg-white/20 dark:bg-neutral-950/20 backdrop-blur-md min-h-[500px] transition-colors shadow-2xs">
          <AnimatePresence mode="wait">
            
            {/* TAB CONTENT: Activity Monitoring / Stats */}
            {activeAdminTab === 'stats' && !selectedDetailOpId && (
              <motion.div
                key="stats_main"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Visual Head Search and Options */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4 gap-3">
                  <div>
                    <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-500" />
                      Xodimlar Ish Unumdorligi Paneli
                    </h3>
                    <p className="text-[10px] text-neutral-400 font-bold mt-0.5">
                      Operator xodimlarning yakuniy samaradorligi, qo'ng'iroqlar va tuzilgan shartnomalari
                    </p>
                  </div>
                  
                  {/* KPI Report Exporter button */}
                  <button
                    onClick={exportFullKPIReportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer shadow-3xs"
                    title="CSV shaklida eksport"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>KPI Hisobot Export (CSV)</span>
                  </button>
                </div>

                {/* Sub-filters for managing operators listing inside stats */}
                <div className="bg-neutral-100/50 dark:bg-neutral-900/30 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-grow sm:max-w-xs relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Operatorlarni qidirish..."
                      value={opSearchQuery}
                      onChange={(e) => setOpSearchQuery(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-250 dark:border-neutral-800 pl-9 pr-3 py-1.5 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-shadow font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-neutral-400 uppercase font-black flex items-center gap-1">
                      <SlidersHorizontal className="w-3 h-3" /> Saralash:
                    </span>
                    <select
                      value={opSortBy}
                      onChange={(e) => setOpSortBy(e.target.value as any)}
                      className="bg-white dark:bg-neutral-950 border border-neutral-250 dark:border-neutral-800 px-3 py-1.5 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-400 font-bold"
                    >
                      <option value="contracts">🏆 Shartnomalar unumdorligi</option>
                      <option value="checked">📈 Ishlash foizi (%)</option>
                      <option value="total">📁 Maktab yuklamalari jami</option>
                      <option value="name">👤 Operator ism-familiyasi</option>
                    </select>
                  </div>
                </div>

                {/* Grid layout of Operator cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {sortedAndFilteredOperators.map((op, idx) => {
                    const m = op.metrics;
                    
                    // Render premium visual rank colors for top 3
                    const getTierBorder = () => {
                      if (opSortBy === 'contracts') {
                        if (idx === 0 && m.shartnomaBerildi > 0) return 'border-amber-400 dark:border-amber-500 shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/10';
                        if (idx === 1 && m.shartnomaBerildi > 0) return 'border-neutral-400 dark:border-neutral-400';
                        if (idx === 2 && m.shartnomaBerildi > 0) return 'border-amber-700/60 dark:border-amber-600/40';
                      }
                      return 'border-neutral-200 dark:border-neutral-800/80 hover:border-neutral-350 dark:hover:border-neutral-700';
                    };

                    const getTierIcon = () => {
                      if (opSortBy === 'contracts') {
                        if (idx === 0 && m.shartnomaBerildi > 0) return <Award className="w-4 h-4 text-amber-500" />;
                        if (idx === 1 && m.shartnomaBerildi > 0) return <Award className="w-4 h-4 text-neutral-400" />;
                        if (idx === 2 && m.shartnomaBerildi > 0) return <Award className="w-4 h-4 text-amber-700" />;
                      }
                      return null;
                    };

                    return (
                      <motion.div 
                        key={op.id} 
                        layoutId={`op-card-${op.id}`}
                        onClick={() => setSelectedDetailOpId(op.id)}
                        className={`group p-4.5 rounded-2xl border ${getTierBorder()} bg-transparent flex flex-col justify-between cursor-pointer hover:shadow-md transition-all duration-300 relative overflow-hidden`}
                      >
                        {/* Background glow overlay on top operator */}
                        {opSortBy === 'contracts' && idx === 0 && m.shartnomaBerildi > 0 && (
                          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-3.5">
                            <span className="font-black text-xs text-neutral-850 dark:text-neutral-100 truncate flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-black text-xs border border-neutral-200/50 dark:border-neutral-800 select-none group-hover:bg-indigo-650/10 group-hover:text-indigo-650 transition-colors">
                                {op.name.charAt(0)}
                              </span>
                              <div className="flex flex-col">
                                <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-xs">{op.name}</span>
                                <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">ID: {op.id}</span>
                              </div>
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {getTierIcon()}
                              <span className="text-[10px] font-mono font-black text-emerald-600 bg-emerald-500/5 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                {m.completionRate}% ishlandi
                              </span>
                            </div>
                          </div>
                          
                          {/* Visual progress track bar */}
                          <div className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/30 dark:border-neutral-800/80 h-2.5 rounded-full overflow-hidden mb-3.5">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                m.completionRate >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                                m.completionRate >= 40 ? 'bg-gradient-to-r from-indigo-500 to-indigo-400' :
                                'bg-gradient-to-r from-amber-500 to-yellow-400'
                              }`} 
                              style={{ width: `${m.completionRate}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500 dark:text-neutral-450 mb-3.5 bg-neutral-100/50 dark:bg-neutral-900/50 px-2.5 py-2 rounded-xl select-none border border-neutral-200/40 dark:border-neutral-800/40">
                            <span>Jami: <strong className="text-neutral-800 dark:text-neutral-200 font-black">{m.total} ta</strong></span>
                            <span>Yuklama: <strong className="text-indigo-500 dark:text-indigo-400 font-black">{m.processed} ta</strong></span>
                            <span>Kutilmoqda: <strong className="text-amber-500 font-bold">{m.kutilmoqda} ta</strong></span>
                          </div>

                          {/* Stat KPI tags - compact visual structure */}
                          <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
                            {[
                              { label: "Shartnoma", val: m.shartnomaBerildi, badge: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-extrabold' },
                              { label: "O'qiydi", val: m.oqiydi, badge: 'border-indigo-500/20 text-indigo-550 dark:text-indigo-400' },
                              { label: "O'ylab ko'radi", val: m.oylabKoradi, badge: 'border-yellow-500/30 text-yellow-600 dark:text-yellow-400' },
                              { label: "Maslahat", val: m.maslahatQiladi, badge: 'border-cyan-500/30 text-cyan-600 dark:text-cyan-405' },
                              { label: "Ko'tarmadi", val: m.kotarmadi, badge: 'border-orange-500/30 text-orange-600 dark:text-orange-400' },
                              { label: "Xato raqam", val: m.xatoRaqam, badge: 'border-rose-500/30 text-rose-600 dark:text-rose-450' },
                              { label: "O'qimaydi", val: m.oqimaydi, badge: 'border-red-500/30 text-red-600 dark:text-red-405' },
                              { label: "O'chirilgan", val: m.ochirilgan, badge: 'border-neutral-505/30 text-neutral-450' },
                            ].map((st, sidx) => (
                              <div key={sidx} className={`border ${st.badge} p-1.5 rounded-lg flex items-center justify-between gap-1`}>
                                <span className="opacity-80 truncate pr-1 font-bold">{st.label}</span>
                                <span className="font-mono font-black">{st.val} ta</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-1 text-[9.5px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 select-none">
                          <span>Maktablarni tahlil qilish</span>
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {sortedAndFilteredOperators.length === 0 && (
                  <div className="py-16 text-center text-xs text-neutral-400 font-bold border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl">
                    Siz yozgan qidiruv kalit so'zi bo'yicha operator xodim topilmadi.
                  </div>
                )}

                {/* Overall status distribution Bar Chart */}
                <div className="p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                      <h4 className="text-xs font-black text-neutral-850 dark:text-neutral-100 uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUpIcon className="w-4 h-4 text-emerald-500" />
                        Platformaning Jamlangan Status Grafigi
                      </h4>
                      <p className="text-[10px] text-neutral-450 font-bold mt-0.5">Barcha operator xodimlarning zaxiradagi va operatsiyalardagi umumiy ko'rsatkichlari</p>
                    </div>
                  </div>

                  <div className="h-68 sm:h-76 w-full text-[10px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={[
                          { name: "Ko'tarmadi", soni: operators.reduce((acc, op) => acc + (op.records || []).filter(r => r.natija === "Ko'tarmadi").length, 0), fill: '#f97316' },
                          { name: "O'chirilgan", soni: operators.reduce((acc, op) => acc + (op.records || []).filter(r => r.natija === "O'chirilgan").length, 0), fill: '#737373' },
                          { name: "O'ylab ko'radi", soni: operators.reduce((acc, op) => acc + (op.records || []).filter(r => r.natija === "O'ylab ko'radi").length, 0), fill: '#eab308' },
                          { name: "Maslahat", soni: operators.reduce((acc, op) => acc + (op.records || []).filter(r => r.natija === "Maslahat qiladi").length, 0), fill: '#0ea5e9' },
                          { name: "Xato raqam", soni: operators.reduce((acc, op) => acc + (op.records || []).filter(r => r.natija === "Xato raqam").length, 0), fill: '#f43f5e' },
                          { name: "O'qimaydi", soni: operators.reduce((acc, op) => acc + (op.records || []).filter(r => r.natija === "O'qimaydi").length, 0), fill: '#ef4444' },
                          { name: "O'qiydi", soni: operators.reduce((acc, op) => acc + (op.records || []).filter(r => r.natija === "O'qiydi").length, 0), fill: '#6366f1' },
                          { name: "Shartnoma", soni: operators.reduce((acc, op) => acc + (op.records || []).filter(r => r.natija === "Shartnoma berildi").length, 0), fill: '#10b981' },
                          { name: "Kutilmoqda", soni: operators.reduce((acc, op) => acc + (op.records || []).filter(r => !r.natija || r.natija === '' || r.natija === 'Kutilmoqda').length, 0), fill: '#a3a3a3' }
                        ]} 
                        margin={{ top: 20, right: 10, left: -25, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#262626' : '#e5e5e5'} vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#888888" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke="#888888" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: theme === 'dark' ? '#0a0a0a' : '#ffffff', 
                            borderColor: theme === 'dark' ? '#262626' : '#f0f0f0',
                            borderRadius: '12px',
                            color: theme === 'dark' ? '#ffffff' : '#000000',
                            fontWeight: '700',
                            fontSize: '11px'
                          }}
                          cursor={{ fill: 'rgba(100,116,139,0.05)' }}
                        />
                        <Bar dataKey="soni" radius={[6, 6, 0, 0]} barSize={28}>
                          <LabelList dataKey="soni" position="top" fill={theme === 'dark' ? '#e5e5e5' : '#171717'} fontSize={10} fontWeight="black" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}

            {/* NESTED DETAILED SCREEN FOR SELECTED OPERATOR SCHOOL RECORDS */}
            {selectedDetailOpId && activeDetailOp && (
              <motion.div
                key="stats_operator_detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedDetailOpId(null)}
                      className="p-1 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-850 rounded-xl text-neutral-600 dark:text-neutral-350 border border-neutral-250/60 dark:border-neutral-800 cursor-pointer font-black text-xs flex items-center gap-1 active:scale-95 transition-all shadow-3xs"
                    >
                      <ChevronDown className="w-4 h-4 rotate-90" />
                      Orqaga
                    </button>
                    <div>
                      <h4 className="text-sm font-black text-neutral-950 dark:text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        {activeDetailOp.name} — Jadvallar Ro'yxati
                      </h4>
                      <p className="text-[10px] text-neutral-400 font-bold">Operatorga biriktirilgan maktablarning joriy tarkibi va to'liq auditi</p>
                    </div>
                  </div>

                  {/* Mock Simulate operator login directly */}
                  <button
                    onClick={() => handleEmulatedOperatorLogin(activeDetailOp.id, activeDetailOp.name)}
                    className="px-3.5 py-1.5 bg-indigo-650/10 hover:bg-indigo-650/20 text-indigo-650 dark:text-indigo-405 border border-indigo-500/20 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Xodim Rejimida Kirish 👥</span>
                  </button>
                </div>

                {/* Local search indicators for assigned schools list */}
                <div className="bg-neutral-100/50 dark:bg-neutral-900/30 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800/60 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 w-full md:max-w-md relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Ushbu operatorning maktablarini qidirish..."
                      value={opDetailSearch}
                      onChange={(e) => setOpDetailSearch(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-250 dark:border-neutral-800 pl-9 pr-3 py-1.5 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                    <span className="text-[10px] text-neutral-400 uppercase font-black flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Status Filtr:
                    </span>
                    <select
                      value={opDetailStatusFilter}
                      onChange={(e) => setOpDetailStatusFilter(e.target.value)}
                      className="bg-white dark:bg-neutral-950 border border-neutral-250 dark:border-neutral-800 px-3 py-1.5 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 font-bold focus:outline-none focus:ring-1"
                    >
                      <option value="ALL">Barchasi ({activeDetailOp.metrics.total} ta)</option>
                      <option value="Kutilmoqda">Kutilmoqda ({activeDetailOp.metrics.kutilmoqda})</option>
                      <option value="Shartnoma berildi">Shartnoma ({activeDetailOp.metrics.shartnomaBerildi})</option>
                      <option value="O'qiydi">O'qiydi ({activeDetailOp.metrics.oqiydi})</option>
                      <option value="Maslahat qiladi">Maslahat qiladi ({activeDetailOp.metrics.maslahatQiladi})</option>
                      <option value="O'ylab ko'radi">O'ylab ko'radi ({activeDetailOp.metrics.oylabKoradi})</option>
                      <option value="Ko'tarmadi">Ko'tarmadi ({activeDetailOp.metrics.kotarmadi})</option>
                      <option value="Xato raqam">Xato raqam ({activeDetailOp.metrics.xatoRaqam})</option>
                      <option value="O'qimaydi">O'qimaydi ({activeDetailOp.metrics.oqimaydi})</option>
                      <option value="O'chirilgan">O'chirilgan ({activeDetailOp.metrics.ochirilgan})</option>
                    </select>
                  </div>
                </div>

                {/* Records Table for Operator */}
                <div className="border border-neutral-200 dark:border-neutral-800/80 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-neutral-100/50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800/80 text-neutral-400 text-[10.5px] uppercase font-bold select-none">
                        <th className="p-3 w-10">T/r</th>
                        <th className="p-3 w-36">Viloyat / Tuman</th>
                        <th className="p-3">Muassasa nomi</th>
                        <th className="p-3 w-40">Direktor / Telefoni</th>
                        <th className="p-3 w-40">Natija (Holat)</th>
                        <th className="p-3 max-w-[150px]">Yozilgan Izoh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-850">
                      {filteredOpDetailRecords.length > 0 ? (
                        filteredOpDetailRecords.map((rec, rIdx) => {
                          const getPillStyle = (res: string) => {
                            switch (res) {
                              case 'Shartnoma berildi':
                                return 'bg-transparent border border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold';
                              case "O'qiydi":
                                return 'bg-transparent border border-indigo-500 text-indigo-650 dark:text-indigo-400 font-bold';
                              case "Maslahat qiladi":
                                return 'bg-transparent border border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold';
                              case "O'ylab ko'radi":
                                return 'bg-transparent border border-yellow-500 text-yellow-600 dark:text-yellow-405 font-bold';
                              case "Ko'tarmadi":
                                return 'bg-transparent border border-orange-500 text-orange-600 dark:text-orange-400 font-bold';
                              case "Xato raqam":
                                return 'bg-transparent border border-rose-500 text-rose-600 dark:text-rose-450 font-bold';
                              case "O'qimaydi":
                                return 'bg-transparent border border-red-500 text-red-600 dark:text-red-405 font-bold';
                              case "O'chirilgan":
                                return 'bg-transparent border border-neutral-400 text-neutral-500 font-bold';
                              default:
                                return 'bg-transparent border border-neutral-200 dark:border-neutral-800 text-neutral-400';
                            }
                          };

                          return (
                            <tr key={rec.id} className="hover:bg-neutral-500/5 transition-colors text-[11px]">
                              <td className="p-3 font-mono text-neutral-400">{rIdx + 1}</td>
                              <td className="p-3">
                                <p className="font-extrabold text-neutral-800 dark:text-neutral-200">{rec.viloyat || "Kiritilmagan"}</p>
                                <p className="text-[10px] text-neutral-400 font-bold">{rec.tuman}</p>
                              </td>
                              <td className="p-3 font-bold text-neutral-905 dark:text-neutral-100 max-w-[150px] truncate" title={rec.maktabNomi}>
                                {rec.maktabNomi}
                              </td>
                              <td className="p-3">
                                <p className="font-bold text-neutral-700 dark:text-neutral-300 truncate max-w-[110px]">{rec.direktor || "bo'sh"}</p>
                                <p className="font-mono text-[9.5px] font-black text-neutral-500">{rec.telefon || 'noma\'lum'}</p>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider block text-center ${getPillStyle(rec.natija || '')}`}>
                                  {rec.natija || 'Kutilmoqda'}
                                </span>
                              </td>
                              <td className="p-3 italic text-neutral-500 dark:text-neutral-400 truncate max-w-[150px]" title={rec.izoh}>
                                {rec.izoh || <span className="opacity-40">izohsiz</span>}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-10 text-center text-neutral-400 italic font-bold">
                            Hech qanday maktab yozuvi kriteriylarga mos kelmadi.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end p-1">
                  <span className="text-[10px] font-bold text-neutral-500 font-mono">
                    Jami ko'rinayotgan: {filteredOpDetailRecords.length} ta yozuv
                  </span>
                </div>
              </motion.div>
            )}

            {/* TAB CONTENT: Interactive Analytics Panel */}
            {activeAdminTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="border-b border-neutral-150 dark:border-neutral-800 pb-3 mb-6">
                  <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-violet-500" />
                    Grafik va Sotsiologik Tahlillar Markazi
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-bold mt-0.5">Shartnomalar konversiyasi va muassasalarning hududiy taqsimot ko'rsatkichi</p>
                </div>
                <AnalyticsPanel operators={operators} />
              </motion.div>
            )}

            {/* TAB CONTENT: Google Sheets copy-paste and balancing */}
            {activeAdminTab === 'topup' && (
              <motion.div
                key="topup"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6 text-xs"
              >
                <div className="border-b border-neutral-150 dark:border-neutral-800 pb-3">
                  <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    Balans To'ldirish & Taqsimlash Konsoli
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-bold mt-0.5">Operatorlar jadvallari "Kutilmoqda" statusi maktablarini taqsimoti</p>
                </div>

                <div className="p-4 bg-indigo-650/5 border border-indigo-500/20 rounded-2xl leading-relaxed text-neutral-700 dark:text-neutral-300">
                  <p className="font-extrabold flex items-center gap-1 text-indigo-700 dark:text-indigo-400 text-[11.5px] mb-1">
                    <BadgeInfo className="w-4 h-4 shrink-0" />
                    Teng taqsim Lash algoritmi (40 talik zaxira balansi):
                  </p>
                  <span>
                    Barcha {operators.length} ta operatorning jadvallaridagi "Kutilmoqda" statusidagi maktablar soni aynan 
                    <strong className="text-emerald-500 font-extrabold px-1">40 ta bo'lguncha</strong> 
                    tizim zaxiradan olib aqlli ravishda to'ldiradi. Bir marta yuklangan maktablar ortiq takroran qo'shilmaydi!
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-5 border border-dashed border-neutral-250 dark:border-neutral-800 rounded-3xl flex flex-col justify-between gap-4">
                    <div>
                      <h4 className="font-black text-neutral-850 dark:text-neutral-100 flex items-center gap-2 text-xs">
                        <FolderInput className="w-4 h-4 text-emerald-500" />
                        Excel / CSV Faylni Yuklash
                      </h4>
                      <p className="text-[10px] text-neutral-400 mt-1 mb-4 leading-relaxed font-bold uppercase">
                        Xodimlar taqsimoti uchun xls, csv, tsv yoki oddiy matnli fayllardan foydalanish
                      </p>
                      
                      <div className="relative border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/40 rounded-2xl p-6 text-center cursor-pointer transition-colors group">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv,.tsv,.json,text/plain"
                          onChange={handleFileUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                        />
                        <Upload className="w-8 h-8 text-neutral-405 group-hover:text-emerald-500 transition-colors mx-auto mb-2" />
                        <span className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 block mb-0.5">Kompyuterdan fayl tanlang</span>
                        <span className="text-[9.5px] text-neutral-450">Excel, CSV, TSV formati</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-neutral-450 leading-normal italic font-medium">
                      Barcha yuklanayotgan yozuvlarning takorlanmaslik xususiyati global kalit bilan tekshiriladi.
                    </span>
                  </div>

                  <div className="p-5 border border-neutral-200 dark:border-neutral-800 rounded-3xl space-y-3 bg-transparent">
                    <h4 className="font-black text-neutral-850 dark:text-neutral-100 flex items-center gap-2 text-xs">
                      <Clipboard className="w-4 h-4 text-indigo-500" />
                      Google Sheets / Excel Buferidan Nusxa Qo'shish
                    </h4>
                    <p className="text-[10px] text-neutral-400 leading-normal font-bold">
                      Format: Viloyat [TAB] Tuman [TAB] Maktab nomi [TAB] Direktor [TAB] Telefon. Har bir qator alohida maktab.
                    </p>
                    <textarea
                      className="w-full h-28 p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-2xl font-mono text-[10px] focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-neutral-405 font-bold"
                      placeholder="Toshkent	Yunusobod	9-maktab	Aliyev K.	998901234567&#10;Samarqand	Urgut	15-maktab	Karimov F.	998917654321"
                      value={bulkDataInput}
                      onChange={(e) => setBulkDataInput(e.target.value)}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[9.5px] text-neutral-450 font-bold tracking-tight">
                        Taqdimot qatorlari: {bulkDataInput.split('\n').filter(l => l.trim() !== '').length} ta
                      </span>
                      <button
                        onClick={handleBulkRefillOperator}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs transition-colors cursor-pointer active:scale-95 shadow-3xs"
                      >
                        Matndan Taqsimlash ⚡
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Allocator Forecast Block - NEW FEATURE */}
                {distributionForecast && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 border border-emerald-500/25 bg-emerald-500/5 rounded-3xl space-y-3"
                  >
                    <div className="flex items-center gap-1.5 border-b border-emerald-500/10 pb-2 mb-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <h5 className="font-black text-emerald-600 dark:text-emerald-400 text-xs">Aqliy Taqsimot Bashorati (Forecast Allocation)</h5>
                    </div>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold">
                      Tizim kiritilgan jami <b>{distributionForecast.totalInput} ta</b> unikal maktabni quyidagicha taqsimlab, operatorlarning o'rtacha yuklamasini 40 taga yetkazishni prognoz qilmoqda:
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-2.5 pt-1.5">
                      {distributionForecast.allocationList.map((al, alIdx) => (
                        <div key={alIdx} className="bg-white/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-emerald-500/10 flex flex-col justify-between">
                          <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block text-[10px]" title={al.name}>{al.name}</span>
                          <div className="flex items-end justify-between mt-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/40">
                            <span className="text-[9px] text-neutral-400">Ajratiladi:</span>
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">+{al.allocated} ta</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* TAB CONTENT: Real-time tahrir logs feed */}
            {activeAdminTab === 'logs' && (
              <motion.div
                key="logs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-150 dark:border-neutral-800 pb-3 gap-3">
                  <div>
                    <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      Soniyama-soniy Tizim Harakatlari Jurnali (Audit Timeline)
                    </h3>
                    <p className="text-[10px] text-neutral-400 font-bold mt-0.5">Xodimlarning barcha jurnallardagi tahrirlash operatsiyalari va tizim jurnallari</p>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Jurnaldan qidiruv..."
                      className="pl-8 pr-3 py-1.5 bg-neutral-100/50 dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-xl text-xs w-52 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                      value={adminLogSearch}
                      onChange={(e) => setAdminLogSearch(e.target.value)}
                    />
                    <SlidersHorizontal size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  </div>
                </div>

                {/* Audit Custom filters row - NEW FEATURE */}
                <div className="bg-neutral-100/40 dark:bg-neutral-900/20 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800/60 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-black uppercase text-neutral-450">Kim bo'yicha:</span>
                    <select
                      value={logOperatorFilter}
                      onChange={(e) => setLogOperatorFilter(e.target.value)}
                      className="bg-white dark:bg-neutral-950 border border-neutral-250 dark:border-neutral-800 px-2 py-1 rounded-lg text-[10.5px] font-bold focus:outline-none"
                    >
                      <option value="ALL">Barcha operatorlar</option>
                      {uniqueOperatorsInLogs.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-black uppercase text-neutral-450">Turi:</span>
                    <select
                      value={logTypeFilter}
                      onChange={(e) => setLogTypeFilter(e.target.value)}
                      className="bg-white dark:bg-neutral-950 border border-neutral-250 dark:border-neutral-800 px-2 py-1 rounded-lg text-[10.5px] font-semibold focus:outline-none"
                    >
                      <option value="ALL">Barchasi (Status & Izoh)</option>
                      <option value="Natija tahriri">Faqat statuslar</option>
                      <option value="Izoh kiritildi">Faqat izohlar</option>
                    </select>
                  </div>

                  <div className="ml-auto flex gap-2">
                    <button 
                      onClick={() => {
                        try {
                          const logTxt = auditFilteredLogs.map(l => `[${l.timestamp}] Operator: ${l.operatorName} | School: ${l.schoolName} | Filed: ${l.field} | NewValue: ${l.newValue}`).join('\n');
                          navigator.clipboard.writeText(logTxt);
                          triggerNotification("Barcha ko'rinayotgan loglar nusxa olindi!");
                        } catch(e) {}
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Copiar logs 📋
                    </button>
                  </div>
                </div>

                <div className="bg-transparent rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-[460px] overflow-y-auto">
                  <table className="w-full border-collapse text-left text-[10.5px] font-mono whitespace-nowrap">
                    <thead>
                      <tr className="bg-neutral-100/50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-400">
                        <th className="p-3 font-bold w-36">Audit Vaqti</th>
                        <th className="p-3 font-bold w-40">Responsable xodim</th>
                        <th className="p-3 font-bold w-44">Tahrirlangan Muassasa</th>
                        <th className="p-3 font-bold w-20">Tur</th>
                        <th className="p-3 font-bold text-orange-500/80">Eski Qiymat</th>
                        <th className="p-3 font-bold text-emerald-500">Yangi Qiymat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-divide-800">
                      {auditFilteredLogs.length > 0 ? (
                        auditFilteredLogs.map(log => (
                          <tr key={log.id} className="hover:bg-neutral-550/5 transition-colors">
                            <td className="p-3 text-indigo-600 dark:text-indigo-400 font-bold">{log.timestamp}</td>
                            <td className="p-3 font-black text-neutral-850 dark:text-neutral-100">{log.operatorName}</td>
                            <td className="p-3 text-neutral-500 dark:text-neutral-400 font-medium truncate max-w-[120px]" title={log.schoolName}>{log.schoolName}</td>
                            <td className="p-3 text-indigo-500 dark:text-indigo-400 font-bold">{log.field}</td>
                            <td className="p-3 truncate max-w-[120px] text-neutral-450 italic">{log.oldValue || 'bo\'sh'}</td>
                            <td className="p-3 font-bold text-neutral-900 dark:text-white truncate max-w-[150px]">{log.newValue}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-10 text-center text-neutral-450 italic font-bold">
                            Hech qanday tahrirlash jurnali filtrlarga mos kelmadi.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB CONTENT: Global parameters, Add Operator, Bulk change date */}
            {activeAdminTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 text-xs"
              >
                <div className="border-b border-neutral-150 dark:border-neutral-800 pb-3">
                  <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <Settings className="w-4 h-4 text-violet-500" />
                    Tizim Global Parametrlari va Backup Manager
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-bold mt-0.5">Xodimlarni ro'yxatdan o'tkazish, sanalar monitoringi va unikal zaxira tizimi</p>
                </div>

                {/* Database Backup & Restore center - ADVANCED ORM PROTECTION FEATURE */}
                <div className="p-5 border border-neutral-200 dark:border-neutral-800 rounded-3xl space-y-4 bg-gradient-to-r from-indigo-500/5 to-emerald-500/5 relative overflow-hidden">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-5 h-5 text-indigo-500" />
                    <h4 className="font-extrabold text-neutral-850 dark:text-neutral-100 text-xs">
                      🔄 Tizim Ma'lumotlari zaxirasi (Offline Database Sync Manager)
                    </h4>
                  </div>
                  <p className="text-neutral-400 leading-relaxed font-semibold">
                    Ma'lumotlar yo'qolishining oldini olish uchun joriy tizimning to'liq "Snapshot" JSON nusxasini yuklab qo'ying. Istalgan vaqtda ushbu snapshotni yuklab, o'sha sessiyadagi holatga to'liq qaytishingiz mumkin.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={downloadJSONBackup}
                      className="w-full sm:w-auto px-4.5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white font-black rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-3xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Snapshot JSON yuklash</span>
                    </button>

                    <div className="relative w-full sm:w-auto overflow-hidden">
                      <button className="w-full sm:w-auto px-4.5 py-2 bg-white hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 active:scale-95">
                        <Upload className="w-3.5 h-3.5 text-neutral-405" />
                        <span>Snapshotni tiklash (.json)</span>
                      </button>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestoreJSONBackup}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full"
                      />
                    </div>
                  </div>
                  {backupStatus === 'success' && (
                    <p className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] animate-pulse">
                      ✓ Snapshot fayl yaratildi va yuklashga tayyorlandi!
                    </p>
                  )}
                </div>

                {/* Adding operator */}
                <div className="p-5 border border-neutral-200 dark:border-neutral-800 rounded-3xl space-y-3 bg-transparent">
                  <h4 className="font-bold text-neutral-850 dark:text-neutral-100 flex items-center gap-2 text-xs">
                    <Users className="w-4 h-4 text-emerald-500" />
                    Yangi Operator Xodim Qo'shish
                  </h4>
                  <p className="text-neutral-405 mb-3 leading-relaxed">
                    Yozmoqchi bo'lgan xodimingiz tizimga dastlabki kirish paroli <b>'12345'</b> bilan yaratiladi. So'ngra u uni o'zi o'zgartirishi mumkin.
                  </p>
                  <form onSubmit={handleAddNewOperatorSubmit} className="flex flex-col sm:flex-row items-center gap-2.5 max-w-md">
                    <input
                      type="text"
                      required
                      placeholder="Operator Ism Familiyasi..."
                      className="w-full sm:flex-1 px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                      value={newOpNameInput}
                      onChange={(e) => setNewOpNameInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all shrink-0 cursor-pointer active:scale-95"
                    >
                      Xodimni Qo'shish
                    </button>
                  </form>
                </div>

                {/* Bulk Date changer */}
                <div className="p-5 border border-neutral-200 dark:border-neutral-800 rounded-3xl space-y-3 bg-transparent">
                  <h4 className="font-bold text-neutral-850 dark:text-neutral-100 flex items-center gap-2 text-xs">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    Sanalarni Ommaviy Bir xillashtirish (Global Date Controller)
                  </h4>
                  <p className="text-neutral-405 mb-3 leading-relaxed">
                    Biror bir operatorning maktablarida yangi sana belgilanmagan bo'lsa, barcha operatorlarning jadvallaridagi barcha sanalarni ommaviy tahrirlang:
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-2.5 max-w-md">
                    <input
                      type="date"
                      className="w-full sm:flex-1 px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                      value={convertToDateInputValue(bulkSanaInput)}
                      onChange={(e) => {
                        const converted = convertFromDateInputValue(e.target.value);
                        if (converted) setBulkSanaInput(converted);
                      }}
                    />
                    <button
                      onClick={handleBulkUpdateDate}
                      className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-black rounded-xl text-xs transition-colors shrink-0 cursor-pointer active:scale-95"
                    >
                      Barchasini Yangilash
                    </button>
                  </div>
                </div>

                {/* Danger zone actions */}
                <div className="p-5 border border-rose-500/25 bg-rose-500/5 rounded-3xl space-y-4">
                  <h4 className="font-black text-rose-600 dark:text-rose-450 uppercase tracking-widest text-xs flex items-center gap-2 border-b border-rose-500/10 pb-2">
                    <ShieldAlert className="w-5 h-5 text-rose-500" />
                    XAVFLI STATUS MARKA "ZONA" — TOZALASH AMALLARI
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col justify-between">
                      <div>
                        <h5 className="font-black text-neutral-800 dark:text-neutral-200 leading-tight">Progresslarni tozalash</h5>
                        <p className="text-[10px] text-neutral-450 mt-1 mb-4 leading-normal font-bold">
                          Kiritilgan barcha natijalar ("Ko'tarmadi", "Shartnoma" va h.k.) va izohlarni nollashtirib, "Kutilmoqda" holatiga qaytaradi.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm("Barcha xodimlarning ishlash progressi, natijalari o'chiriladi. Rozimisiz?")) {
                            handleClearAllProgress();
                          }
                        }}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Nollash (Clear Data)
                      </button>
                    </div>

                    <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col justify-between">
                      <div>
                        <h5 className="font-black text-neutral-800 dark:text-neutral-200 leading-tight">Chatni o'chirish</h5>
                        <p className="text-[10px] text-neutral-450 mt-1 mb-4 leading-normal font-bold">
                          Operatorlar jamoat suhbat xatidagi barcha tezkor xabarlarni bitta tugma bilan yo'q qiladi.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm("Barcha chat xabarlari bazadan o'chiriladi. Rozimisiz?")) {
                            handleClearChatMessages();
                          }
                        }}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Suhbatni tozalash
                      </button>
                    </div>

                    <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col justify-between">
                      <div>
                        <h5 className="font-black text-neutral-800 dark:text-neutral-200 leading-tight">Barcha bazani tozalash</h5>
                        <p className="text-[10px] text-neutral-450 mt-1 mb-4 leading-normal font-bold">
                          Operatorlardagi mavjud barcha 40 talik jadvallarni va maktablarni bazadan tamoman yo'q qiladi. Jadvallar bo'sh qoladi.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm("DIQQAT! Barcha biriktirilgan maktablar butunlay yo'q qilinadi va qayta tiklanmaydi! Davom etasizmi?")) {
                            handleClearAllSchoolRecords();
                          }
                        }}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Hujjatlarni O'chirish
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB CONTENT: Operator management / Rename list - check 3 / check 4 */}
            {activeAdminTab === 'operators_list' && (
              <motion.div
                key="operators_list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4 text-xs"
              >
                <div className="flex flex-col sm:flex-row items-center justify-between border-b border-neutral-150 dark:border-neutral-800 pb-3 gap-3">
                  <div>
                    <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-500" />
                      Operatorlar Boshqaruvi va Shaxsiy Ma'lumotlari
                    </h3>
                    <p className="text-[10px] text-neutral-400 font-bold mt-0.5">Xodimlarning ism-familiyalari, parollari va ularning zaxira jurnallaridagi tartibi</p>
                  </div>
                  <button
                    onClick={() => {
                      const val = prompt("Yangi operator xodim ismini kiriting:");
                      if (val && val.trim()) {
                        handleAddNewOperator(val.trim());
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs cursor-pointer transition-colors active:scale-95 flex items-center gap-1.5 shadow-3xs"
                  >
                    <span>Operator Qo'shish</span>
                    <span>➕</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {operators.map((op, idx) => (
                    <div key={op.id} className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between gap-3 shadow-2xs bg-white/40 dark:bg-neutral-950/20">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-2">
                          <span className="text-[9px] text-neutral-400 font-black uppercase tracking-wider">ID: {op.id}</span>
                          <span className="text-[9.5px] text-indigo-600 dark:text-indigo-405 font-bold">Maktablari: {op.records.length} ta</span>
                        </div>
                        
                        <div>
                          <label className="text-[9px] text-neutral-400 font-black uppercase tracking-wider block mb-1">Xodim F.I.Sh:</label>
                          <input
                            type="text"
                            defaultValue={op.name}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && val !== op.name) {
                                handleRenameOperator(op.id, val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val && val !== op.name) {
                                  handleRenameOperator(op.id, val);
                                  (e.target as HTMLInputElement).blur();
                                }
                              }
                            }}
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-xl text-xs text-neutral-850 dark:text-neutral-150 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-neutral-400 font-black uppercase tracking-wider block mb-1">Kirish paroli:</label>
                          <input
                            type="text"
                            defaultValue={op.password || '12345'}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && val !== op.password) {
                                handleSetOperatorPassword(op.id, val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val && val !== op.password) {
                                  handleSetOperatorPassword(op.id, val);
                                  (e.target as HTMLInputElement).blur();
                                }
                              }
                            }}
                            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-xl text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-900 pt-2.5 mt-1.5">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              if (idx > 0) handleReorderOperators(idx, idx - 1);
                            }}
                            disabled={idx === 0}
                            className="p-1.5 border border-neutral-205 dark:border-neutral-800 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-30 flex items-center justify-center cursor-pointer"
                            title="Yuqoriga surish"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (idx < operators.length - 1) handleReorderOperators(idx, idx + 1);
                            }}
                            disabled={idx === operators.length - 1}
                            className="p-1.5 border border-neutral-205 dark:border-neutral-800 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-30 flex items-center justify-center cursor-pointer"
                            title="Pastga surish"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEmulatedOperatorLogin(op.id, op.name)}
                            className="px-2 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-350 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                            title="Emulyatsiya"
                          >
                            Mock Login 👥
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Haqiqatan ham operator ${op.name}ni o'chirmoqchimisiz?`)) {
                                handleDeleteOperator(op.id);
                              }
                            }}
                            className="p-1.5 border border-rose-500/10 hover:border-rose-500/35 bg-rose-500/5 text-rose-500 rounded-lg hover:bg-rose-500/15 cursor-pointer transition-colors flex items-center justify-center"
                            title="Xodimni o'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TAB CONTENT: Chat and Telegram channel Bot notifications */}
            {activeAdminTab === 'tg_settings' && (
              <motion.div
                key="tg_settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4 text-xs"
              >
                <div className="border-b border-neutral-150 dark:border-neutral-800 pb-3">
                  <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-500" />
                    Telegram Kanal Integratsiyasi & Alert Tizimi
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-bold mt-0.5">Mijozlar bilan ishlash natijalarini Telegram kanallarga avtomatik ko'zgu qilish sozlamalari</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="p-5 border border-neutral-200 dark:border-neutral-800 rounded-3xl space-y-3 bg-transparent">
                      <div>
                        <label className="text-[9px] uppercase font-black text-neutral-400 block mb-1">🤖 Telegram Bot Token</label>
                        <input
                          type="text"
                          value={tgBotToken}
                          onChange={(e) => setTgBotToken(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-xl text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="API boti tokeni (BotFather dan @...)"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] uppercase font-black text-neutral-400 block mb-1">📊 Guruh yoki Kanal ID (Masalan: -100xxxxxxxxxx)</label>
                        <input
                          type="text"
                          value={tgChannelId}
                          onChange={(e) => setTgChannelId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-xl text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="Har bir qo'ng'iroq logi kelib tushadigan kanal manzili"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] uppercase font-black text-neutral-400 block mb-1">👑 Admin Telegram Chat ID (Tezkor signal signali)</label>
                        <input
                          type="text"
                          value={tgAdminChatId}
                          onChange={(e) => setTgAdminChatId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-xl text-xs font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="Maxsus qabul.bui.uz linklari bormoqchi bo'lgan shaxsiy chat ID"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveTelegramConfigs(tgBotToken, tgChannelId, tgAdminChatId)}
                        className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs cursor-pointer transition-colors active:scale-95 shadow-3xs"
                      >
                        Sozlamalarni Saqlash
                      </button>

                      <button
                        onClick={() => handleTestTelegramDelivery(tgBotToken, tgChannelId, tgAdminChatId)}
                        disabled={tgTestingState === 'sending'}
                        className="px-4.5 py-2.5 border border-neutral-250 dark:border-neutral-800 bg-white hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl text-xs cursor-pointer transition-colors active:scale-95"
                      >
                        {tgTestingState === 'sending' ? 'Yuborilmoqda...' : 'Test Xabar Yuborish 📨'}
                      </button>
                    </div>

                    {tgTestingState !== 'idle' && (
                      <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                        tgTestingState === 'success'
                          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 font-bold'
                          : tgTestingState === 'error'
                          ? 'border-rose-500/20 bg-rose-500/5 text-rose-800 dark:text-rose-300 font-semibold'
                          : 'border-neutral-300 bg-neutral-50 dark:bg-neutral-900 font-bold'
                      }`}>
                        {tgTestingState === 'success' ? "✓ Muvaffaqiyatli: Telegram monitoring kanali orqali tezkor ulanish o'rnatildi va xabar borib tegdi!" : `Xatolik: ${tgTestErrorMessage || 'guruh yoki bot ID konfiguratsiyasida xatolik.'}`}
                      </div>
                    )}
                  </div>

                  {/* Simulated interactive message view preview - NEW LIVE CUSTOM SIMULATOR */}
                  <div className="lg:col-span-5 flex flex-col gap-3">
                    <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Xabar Shabloni Real-time Simulatori:</span>
                    {renderSimulatedTelegramMessage()}
                    
                    <div className="p-3 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-100/30 dark:bg-neutral-950/20 text-[10.5px] leading-relaxed text-neutral-500">
                      Telegram tahrir formati HTML orqali boyitilgan. Bitim shartnomasi kiritilganda dillar alohida tezkor signal xabari bilan admin darchasiga jo'natiladi.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB CONTENT: Excel File Import */}
            {activeAdminTab === 'excel_import' && (
              <motion.div
                key="excel_import"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="border-b border-neutral-150 dark:border-neutral-800 pb-3">
                  <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <FolderInput className="w-4 h-4 text-emerald-500" />
                    Excel fayl orqali yozuvlar yuklash (XLSX, XLS parser)
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-bold mt-0.5">Ommaviy kadrlar bazasini excel va csv jadvallaridan kiritish moduli</p>
                </div>
                <ExcelImport operators={operators} onImportRecords={handleImportRecords} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
};

// Simple visual decoration icons inline
const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);
