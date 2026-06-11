/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { db } from './firebase';
import { collection, writeBatch, getDocs } from 'firebase/firestore';
import { initialOperators } from './data';
import { Operator, SchoolRecord, EditLog } from './types';
import { Stats } from './components/Stats';
import { OperatorTable } from './components/OperatorTable';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { ExcelImport } from './components/ExcelImport';
import { LiveChat } from './components/LiveChat';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  Moon, 
  Sun, 
  CheckSquare, 
  Info,
  Layers,
  Search,
  BookOpen,
  PieChart,
  UserCheck,
  Lock,
  Unlock,
  Calendar,
  Layers3,
  ClipboardCheck,
  ClipboardCopy,
  PlusCircle,
  Clock,
  LogOut,
  Sliders,
  AlertTriangle
} from 'lucide-react';

// Recharts components list for visual stats
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

// Date translation utilities
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

const convertFromDateInputValue = (htmlDateStr: string) => {
  if (!htmlDateStr) return '';
  const parts = htmlDateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${day}.${month}.${year}`;
  }
  return '';
};

// Transliterate operator name to perfect English hashtag slug matching #yakubova_feruza
const nameToHashtag = (name: string): string => {
  if (!name) return '#operator';
  
  const cyrToLat: { [key: string]: string } = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j', 'з': 'z', 'и': 'i',
    'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ы': 'y', 'ь': '',
    'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': 'o', 'қ': 'q', 'ғ': 'g', 'ҳ': 'h'
  };

  let clean = name.toLowerCase();
  
  // Cyrillic mapping if any Cyrillic letters are active
  let trans = '';
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    trans += cyrToLat[char] !== undefined ? cyrToLat[char] : char;
  }

  return '#' + trans
    .replace(/o'|o’|o`|oʻ/g, 'o')
    .replace(/g'|g’|g`|gʻ/g, 'g')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
};

// Dispatch asynchronous logging messages to Telegram Channel & Admin Alert Chat IDs
const sendTelegramNotification = async (
  log: EditLog,
  schoolNo: number = 0,
  tel: string = '',
  viloyat: string = ''
) => {
  const token = localStorage.getItem('school_operators_tg_token') || (import.meta as any).env.VITE_TELEGRAM_BOT_TOKEN || '';
  const channelId = localStorage.getItem('school_operators_tg_channel') || (import.meta as any).env.VITE_TELEGRAM_CHAT_ID || '';
  const adminId = localStorage.getItem('school_operators_tg_admin') || (import.meta as any).env.VITE_TELEGRAM_ADMIN_CHAT_ID || '';

  if (!token) return;

  const hashtag = nameToHashtag(log.operatorName);

  // 1. Regular log sending to Telegram Channel
  if (channelId) {
    const esc = (text: string) => (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const opNameStr = esc(log.operatorName);
    const schoolNameStr = esc(log.schoolName);
    const fieldStr = esc(log.field);
    const oldValStr = esc(log.oldValue);
    const newValStr = esc(log.newValue);
    const timestampStr = esc(log.timestamp);
    const viloyatStr = viloyat ? ` (${esc(viloyat)})` : '';

    const regularMessage = `📝 <b>TIZIM ISH JURNALI</b>\n\n` +
      `👤 <b>Operator:</b> ${opNameStr} (${hashtag})\n` +
      `👤 <b>Mijoz:</b> ${schoolNameStr}${viloyatStr}\n` +
      `🔧 <b>O'zgarish:</b> ${fieldStr}\n` +
      `🔹 <b>Eski qiymat:</b> ${oldValStr}\n` +
      `🔸 <b>Yangi qiymat:</b> ${newValStr}\n` +
      `⏰ <b>Toshkent vaqti:</b> ${timestampStr}`;

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text: regularMessage,
          parse_mode: 'HTML'
        })
      });
    } catch (e) {
      console.warn("Telegram channel delivery failed:", e);
    }
  }

  // 2. Alert sending to Admin if newValue/comments contain "qabul.bui.uz"
  const lowerNewVal = String(log.newValue || '').toLowerCase();
  const hasSpecialLink = lowerNewVal.includes('qabul.bui.uz');

  if (hasSpecialLink && adminId) {
    const esc = (text: string) => (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const opEscStr = esc(log.operatorName);
    const schoolEscStr = schoolNo ? `<b>${schoolNo}-mijoz</b>` : `<b>${esc(log.schoolName)}</b>`;
    const viloyatEscStr = viloyat ? ` (${esc(viloyat)})` : '';
    const valEscStr = esc(log.newValue);
    const stampEscStr = esc(log.timestamp);
    const telEscStr = tel ? esc(tel) : 'Kiritilmagan';

    const adminMessage = `🚀 <b>YANGI HAMKORLIK LINKI!</b>\n\n` +
      `👤 <b>Operator:</b> ${opEscStr} (${hashtag})\n` +
      `👤 <b>Mijoz:</b> ${schoolEscStr}${viloyatEscStr}\n` +
      `📞 <b>Telefoni:</b> ${telEscStr}\n\n` +
      `<b>Ushbu operator (${opEscStr}) mazkur mijozga hamkorlik linkini yaratib berdi:</b>\n\n` +
      `🔗 <code>${valEscStr}</code>\n\n` +
      `⏰ <b>Vaqt:</b> ${stampEscStr}`;

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminId,
          text: adminMessage,
          parse_mode: 'HTML'
        })
      });
    } catch (e) {
      console.warn("Telegram admin alert failed:", e);
    }
  }
};

// Runs fully offline with localStorage

export default function App() {
  const [operators, setOperators] = useState<Operator[]>(initialOperators);
  const [selectedOpId, setSelectedOpId] = useState<string>('1');

  // Operator login (har operator o'z nomi + paroli bilan kiradi)
  const [loggedInOpId, setLoggedInOpId] = useState<string | null>(() => {
    return localStorage.getItem('school_operators_current_op') || null;
  });
  const [loginOpId, setLoginOpId] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [newOpNameInput, setNewOpNameInput] = useState('');

  const [globalSearch, setGlobalSearch] = useState('');
  const [showGlobalStats, setShowGlobalStats] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Theme support
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('school_operators_theme') as 'light' | 'dark') || 'dark';
  });

  // Tashkent Running Clock state
  const [tashkentTime, setTashkentTime] = useState('');
  const [tashkentDate, setTashkentDate] = useState('');

  // Admin states
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('school_operators_admin_status') === 'true';
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'stats' | 'topup' | 'logs' | 'settings' | 'operators_list' | 'tg_settings' | 'analytics' | 'excel_import'>('stats');

  // Activity log logs state
  const [activityLogs, setActivityLogs] = useState<EditLog[]>([]);

  // Date controller input
  const [bulkSanaInput, setBulkSanaInput] = useState('04.06.2026');

  // Bulk data paste input for refilling
  const [bulkDataInput, setBulkDataInput] = useState('');
  const [bulkTargetOpId, setBulkTargetOpId] = useState('1');

  // Search filter inside admin logs
  const [adminLogSearch, setAdminLogSearch] = useState('');

  // Saving indicator states
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const savingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Navigation & Dropup view states
  const [currentView, setCurrentView] = useState<'operator' | 'admin'>('operator');
  const [showDropup, setShowDropup] = useState(false);
  const [operatorViewMode, setOperatorViewMode] = useState<'table' | 'charts'>('table');

  // Telegram integration states
  const [tgBotToken, setTgBotToken] = useState(() => localStorage.getItem('school_operators_tg_token') || '');
  const [tgChannelId, setTgChannelId] = useState(() => localStorage.getItem('school_operators_tg_channel') || '');
  const [tgAdminChatId, setTgAdminChatId] = useState(() => localStorage.getItem('school_operators_tg_admin') || '');
  const [tgTestingState, setTgTestingState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [tgTestErrorMessage, setTgTestErrorMessage] = useState('');

  // Cleanup pending saving timeouts on unmount
  useEffect(() => {
    return () => {
      if (savingTimeoutRef.current) {
        clearTimeout(savingTimeoutRef.current);
      }
    };
  }, []);

  // ===== LOKAL XOTIRA (localStorage) — ASOSIY MANBA =====
  // Firestore faqat bir martalik import uchun ishlatiladi (lokal bo'sh bo'lsa).
  const LS_DATA_KEY = 'school_operators_data_backup';
  const LS_LOGS_KEY = 'school_operators_logs';

  const ensureRecordDates = (records: SchoolRecord[]): SchoolRecord[] => {
    return (records || []).map(r => {
      if ((r.natija || r.izoh) && !r.sana) {
        return { ...r, sana: '11.06.2026' }; // Boshlang'ich sana
      }
      return r;
    });
  };

  const loadLocalOperators = (): Operator[] | null => {
    try {
      const raw = localStorage.getItem(LS_DATA_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Operator[];
      if (!Array.isArray(parsed) || parsed.length === 0) return null;
      return parsed.map(op => ({
        ...op,
        name: op.name || 'Noma\'lum operator',
        password: op.password || '123456',
        records: ensureRecordDates(op.records || [])
      }));
    } catch (e) {
      console.warn('localStorage o\'qishda xato:', e);
      return null;
    }
  };

  // Firestore'dan bir martalik import (onSnapshot emas — faqat getDocs)
  const importFromFirestore = async (): Promise<Operator[] | null> => {
    try {
      const snapshot = await getDocs(collection(db, 'operators'));
      if (snapshot.empty) return null;
      const loadedOps: Operator[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedOps.push({
          ...data,
          id: docSnap.id,
          name: data.name || 'Noma\'lum operator',
          password: data.password || '123456',
          order: data.order ?? 999,
          records: ensureRecordDates(data.records || [])
        } as Operator);
      });
      loadedOps.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      return loadedOps;
    } catch (err) {
      console.warn("Firestore'dan import bo'lmadi (offline yoki ruxsat yo'q):", err);
      return null;
    }
  };

  // Dastlabki yuklash tartibi: localStorage -> Firestore (bir marta) -> initialOperators
  useEffect(() => {
    let cancelled = false;

    const localOps = loadLocalOperators();
    if (localOps) {
      setOperators(localOps);
    } else {
      importFromFirestore().then(remoteOps => {
        if (cancelled) return;
        const ops = remoteOps || initialOperators;
        if (remoteOps) {
          console.log(`Firestore'dan ${remoteOps.length} ta operator import qilindi`);
        }
        setOperators(ops);
        try { localStorage.setItem(LS_DATA_KEY, JSON.stringify(ops)); } catch (e) { /* ignore */ }
      });
    }

    // Ish jurnalini localStorage'dan yuklash
    try {
      const rawLogs = localStorage.getItem(LS_LOGS_KEY);
      if (rawLogs) {
        const parsedLogs = JSON.parse(rawLogs) as EditLog[];
        if (Array.isArray(parsedLogs)) setActivityLogs(parsedLogs.slice(0, 500));
      }
    } catch (e) { /* ignore */ }

    return () => { cancelled = true; };
  }, []);

  // Theme effect hook
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('school_operators_theme', theme);
  }, [theme]);

  // URL Path & Hash routing listener for '/Operadminz' / '#Operadminz'
  useEffect(() => {
    const checkAdminRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      
      if (path.includes('operadminz') || hash.includes('operadminz')) {
        if (!isAdminLoggedIn) {
          setShowAdminLoginModal(true);
        }
      }
    };

    checkAdminRoute();
    window.addEventListener('hashchange', checkAdminRoute);
    window.addEventListener('popstate', checkAdminRoute);
    return () => {
      window.removeEventListener('hashchange', checkAdminRoute);
      window.removeEventListener('popstate', checkAdminRoute);
    };
  }, [isAdminLoggedIn]);

  // Clock effect ticking live every second in Asia/Tashkent timezone
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // Time format down to exact hours, minutes, seconds using Asia/Tashkent time-zone
      const formatterTime = new Intl.DateTimeFormat('uz-UZ', {
        timeZone: 'Asia/Tashkent',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const formatterDate = new Intl.DateTimeFormat('uz-UZ', {
        timeZone: 'Asia/Tashkent',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      setTashkentTime(formatterTime.format(now));
      setTashkentDate(formatterDate.format(now));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Database migration helper to automatically add new operators and delete old ones
  useEffect(() => {
    if (operators.length === 0) return;
    
    // Check if ID '9' (Hoshimova Mahsuma) exists in active state
    const hasOldOperator = operators.some(op => op.id === '9');
    
    // Check if new operators are missing
    const hasOldPasswords = operators.some(o => o.password === '12345');
    const newOpIds = ['11', '12', '13', '14', '15', '16'];
    const missingNewOperators = initialOperators.filter(op => newOpIds.includes(op.id) && !operators.some(o => o.id === op.id));
    
    if (hasOldOperator || missingNewOperators.length > 0 || hasOldPasswords) {
      console.log("Operator ro'yxati eskirgan. Lokal migratsiya bajarilmoqda...");
      const migrated = operators
        .filter(op => op.id !== '9') // Hoshimova Mahsuma (ID 9) o'chirilgan
        .map(op => op.password === '12345' ? { ...op, password: '123456' } : op)
        .concat(missingNewOperators);
      saveToLocalStorage(migrated);
    }
  }, [operators]);

  // Saqlangan login endi mavjud bo'lmagan operatorga tegishli bo'lsa - chiqarib yuborish
  useEffect(() => {
    if (operators.length > 0 && loggedInOpId && !operators.some(op => op.id === loggedInOpId)) {
      setLoggedInOpId(null);
      localStorage.removeItem('school_operators_current_op');
    }
  }, [operators, loggedInOpId]);

  // Logged-in operator (not admin) is locked to their own sheet
  useEffect(() => {
    if (loggedInOpId && !isAdminLoggedIn) {
      setSelectedOpId(loggedInOpId);
    }
  }, [loggedInOpId, isAdminLoggedIn]);

  // Toast notifier
  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Log action with exact Tashkent time locally
  const logActivityLocal = (opId: string, opName: string, schoolName: string, field: string, oldValue: string, newValue: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour12: false });
    const dateStr = now.toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' });
    const formattedTimestamp = `${dateStr} ${timeStr}`;

    const newLog: EditLog = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      operatorId: opId,
      operatorName: opName,
      schoolName: schoolName,
      field,
      oldValue: oldValue || 'Kutilmoqda',
      newValue: newValue || 'Kutilmoqda',
      timestamp: formattedTimestamp
    };

    const updatedLogs = [newLog, ...activityLogs].slice(0, 500);
    return updatedLogs;
  };

  // O'zgarishlarni saqlash — localStorage asosiy xotira
  const saveToLocalStorage = (updated: Operator[], newLogs?: EditLog[]) => {
    // 1. Avval React state — UI darhol yangilanadi
    setOperators(updated);
    if (newLogs) {
      setActivityLogs(newLogs);
    }

    setSavingState('saving');
    if (savingTimeoutRef.current) {
      clearTimeout(savingTimeoutRef.current);
    }

    // 2. localStorage'ga yozish
    try {
      localStorage.setItem(LS_DATA_KEY, JSON.stringify(updated));
      if (newLogs) {
        localStorage.setItem(LS_LOGS_KEY, JSON.stringify(newLogs.slice(0, 500)));
      }
      savingTimeoutRef.current = setTimeout(() => {
        setSavingState('saved');
        savingTimeoutRef.current = setTimeout(() => {
          setSavingState('idle');
        }, 1500);
      }, 400);
    } catch (err) {
      console.error('localStorage saqlashda xato:', err);
      setSavingState('idle');
      triggerNotification("Saqlashda xatolik! Brauzer xotirasi to'lgan bo'lishi mumkin ⚠️");
    }
  };

  // Update record fields (Natija, Izoh, Viloyat, Fish, etc.) with robust dual mode
  const handleUpdateRecord = async (
    recordId: string, 
    field: 'viloyat' | 'fish' | 'tugulganSana' | 'tel' | 'telQoshimcha' | 'natija' | 'izoh', 
    value: string
  ) => {
    let oldVal = '';
    let schoolN = '';
    let opId = '';
    let opName = '';

    const targetOp = operators.find(op => op.records.some(r => r.id === recordId));
    if (!targetOp) return;

    opId = targetOp.id;
    opName = targetOp.name;

    const updatedRecords = targetOp.records.map(r => {
      if (r.id === recordId) {
        oldVal = String(r[field] ?? '');
        schoolN = r.fish;
        const updatedRec = { ...r, [field]: value } as any;

        // Natija yoki izoh o'zgarganda, sanani o'rnatish
        if (field === 'natija' || field === 'izoh') {
          if (!updatedRec.natija && !updatedRec.izoh) {
            updatedRec.sana = '';
          } else {
            const now = new Date();
            const formatterDate = new Intl.DateTimeFormat('uz-UZ', {
              timeZone: 'Asia/Tashkent',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            updatedRec.sana = formatterDate.format(now);
          }
        }
        return updatedRec;
      }
      return r;
    });

    const updatedOperatorDoc = {
      ...targetOp,
      records: updatedRecords
    };

    const updatedOperators = operators.map(op => op.id === opId ? updatedOperatorDoc : op);

    if (oldVal !== value) {
      const labelMap: Record<string, string> = {
        viloyat: 'Viloyat',
        fish: 'Familiya Ism Sharif',
        tugulganSana: 'Tugulgan sanasi',
        tel: 'Telefon raqami',
        telQoshimcha: "Qo'shimcha telefon",
        natija: 'Natija (Holat)',
        izoh: 'Izoh'
      };
      const label = labelMap[field] || field;
      
      const freshLogs = logActivityLocal(opId, opName, schoolN, label, oldVal, value);
      saveToLocalStorage(updatedOperators, freshLogs);
      triggerNotification("Ma'lumotlar saqlandi! 💾");

      // Telegram sending asynchronously (yangilangan yozuvdan o'qiladi)
      const lastCreatedLog = freshLogs[0];
      if (lastCreatedLog) {
        const targetRec = updatedRecords.find(r => r.id === recordId);
        const schoolNo = targetRec ? targetRec.no : 0;
        const schoolTel = targetRec ? targetRec.tel : '';
        const schoolViloyat = targetRec ? targetRec.viloyat : '';
        sendTelegramNotification(lastCreatedLog, schoolNo, schoolTel, schoolViloyat);
      }
    }
  };

  // Add individual record to selected operator with robust dual mode (Admin only)
  const handleAddRecord = async (newRec: Omit<SchoolRecord, 'id'>) => {
    const targetOp = operators.find(o => o.id === selectedOpId);
    if (!targetOp) return;

    const newId = `${targetOp.id}_${newRec.no}_${Date.now()}`;
    const updatedOperatorDoc = {
      ...targetOp,
      records: [
        ...targetOp.records,
        { ...newRec, id: newId }
      ]
    };

    const updatedOperators = operators.map(op => op.id === selectedOpId ? updatedOperatorDoc : op);
    const freshLogs = logActivityLocal(selectedOpId, targetOp.name, newRec.fish, 'Yangi mijoz qo\'shildi', '', 'Mijoz qo\'shildi');
    saveToLocalStorage(updatedOperators, freshLogs);
    triggerNotification("Yangi mijoz muvaffaqiyatli qo'shildi!");

    // Telegram sending asynchronously
    const lastCreatedLog = freshLogs[0];
    if (lastCreatedLog) {
      sendTelegramNotification(lastCreatedLog, newRec.no, newRec.tel, newRec.viloyat);
    }
  };

  // Delete record from selected operator with robust dual mode (Admin only)
  const handleDeleteRecord = async (recordId: string) => {
    const targetOp = operators.find(op => op.records.some(r => r.id === recordId));
    if (!targetOp) return;

    const deletedRecord = targetOp.records.find(r => r.id === recordId);
    if (!deletedRecord) return;

    const updatedOperatorDoc = {
      ...targetOp,
      records: targetOp.records.filter(r => r.id !== recordId)
    };

    const updatedOperators = operators.map(op => op.id === targetOp.id ? updatedOperatorDoc : op);
    const freshLogs = logActivityLocal(targetOp.id, targetOp.name, deletedRecord.fish, 'Mijoz o\'chirildi', deletedRecord.fish, 'O\'chirildi');
    saveToLocalStorage(updatedOperators, freshLogs);
    triggerNotification("Mijoz ro'yxatdan o'chirildi.");

    // Telegram sending asynchronously
    const lastCreatedLog = freshLogs[0];
    if (lastCreatedLog) {
      sendTelegramNotification(lastCreatedLog, deletedRecord.no, deletedRecord.tel, deletedRecord.viloyat);
    }
  };

  // Import batch of records from Excel (Admin only)
  const handleImportRecords = (operatorId: string, newRecords: Omit<SchoolRecord, 'id'>[]) => {
    const targetOp = operators.find(op => op.id === operatorId);
    if (!targetOp) return;

    const startingNo = targetOp.records.length > 0 ? Math.max(...targetOp.records.map(r => r.no)) + 1 : 1;
    
    const formatted = newRecords.map((rec, idx) => ({
      ...rec,
      no: startingNo + idx,
      id: `${operatorId}_${startingNo + idx}_${Date.now()}_${idx}`
    }));

    const updatedOperatorDoc = {
      ...targetOp,
      records: [...targetOp.records, ...formatted]
    };

    const updatedOperators = operators.map(op => op.id === operatorId ? updatedOperatorDoc : op);
    const freshLogs = logActivityLocal(
      operatorId, 
      targetOp.name, 
      `${newRecords.length} ta mijoz`, 
      'Excel import', 
      '', 
      `${newRecords.length} ta mijoz qo'shildi`
    );
    saveToLocalStorage(updatedOperators, freshLogs);
    triggerNotification(`${newRecords.length} ta mijoz muvaffaqiyatli yuklandi!`);
  };

  // Firestore'dan qo'lda import (lokal ma'lumotlar o'rniga yuklaydi)
  const handleImportFromFirestore = async () => {
    if (!window.confirm("Firestore'dagi ma'lumotlar hozirgi LOKAL ma'lumotlar O'RNIGA yuklanadi. Lokal kiritilgan natijalar yo'qolishi mumkin. Davom etasizmi?")) {
      return;
    }
    setSavingState('saving');
    const remoteOps = await importFromFirestore();
    if (remoteOps) {
      saveToLocalStorage(remoteOps);
      triggerNotification(`Firestore'dan ${remoteOps.length} ta operator import qilindi! ☁️`);
    } else {
      setSavingState('idle');
      alert("Firestore'dan ma'lumot olib bo'lmadi (baza bo'sh yoki ulanish xatosi). Lokal ma'lumotlar o'zgarmadi.");
    }
  };

  // Reset database state in LocalStorage
  const handleResetDatabase = async () => {
    if (window.confirm("Barcha kiritilgan o'zgarishlar o'chib ketadi va boshlang'ich operator ma'lumotlari holatiga qaytariladi. Tasdiqlaysizmi?")) {
      saveToLocalStorage(initialOperators, []);
      triggerNotification("Ma'lumotlar bazasi dastlabki holatga muvaffaqiyatli qaytarildi.");
    }
  };

  // Administrator Operator Control Actions
  const handleRenameOperator = (opId: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = operators.map(op => op.id === opId ? { ...op, name: newName } : op);
    saveToLocalStorage(updated);
    triggerNotification(`Operator nomi "${newName}" qilib o'zgartirildi.`);
  };

  const handleDeleteOperator = (opId: string) => {
    if (operators.length <= 1) {
      alert("Kamida bitta operator bo'lishi shart!");
      return;
    }
    const op = operators.find(o => o.id === opId);
    if (!op) return;

    if (window.confirm(`Haqiqatan ham "${op.name}" operatorini jadvallari va barcha ${op.records.length} ta maktab ma'lumotlari bilan birga butunlay o'chirib tashlamoqchimisiz? Ushbu amal ortga qaytarilmaydi!`)) {
      const updated = operators.filter(o => o.id !== opId);
      saveToLocalStorage(updated);
      if (selectedOpId === opId) {
        setSelectedOpId(updated[0].id);
      }
      triggerNotification(`"${op.name}" o'chirib tashlandi.`);
    }
  };

  const handleReorderOperators = (indexA: number, indexB: number) => {
    if (indexA < 0 || indexA >= operators.length || indexB < 0 || indexB >= operators.length) return;
    const list = [...operators];
    const temp = list[indexA];
    list[indexA] = list[indexB];
    list[indexB] = temp;
    saveToLocalStorage(list);
    triggerNotification("Operatorlar tartibi almashtirildi.");
  };

  const handleAddNewOperator = (name: string) => {
    if (!name.trim()) return;
    const newOpId = `${Date.now()}`;
    const newOp: Operator = {
      id: newOpId,
      name: name,
      password: '123456',
      records: []
    };
    const updated = [...operators, newOp];
    saveToLocalStorage(updated);
    setSelectedOpId(newOpId);
    triggerNotification(`Yangi operator: "${name}" qo'shildi.`);
  };

  const handleAddNewOperatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpNameInput.trim()) return;
    handleAddNewOperator(newOpNameInput.trim());
    setNewOpNameInput('');
  };

  const handleDropOperator = (draggedId: string, targetId: string) => {
    const fromIndex = operators.findIndex(op => op.id === draggedId);
    const toIndex = operators.findIndex(op => op.id === targetId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const list = [...operators];
    const [removed] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, removed);
    saveToLocalStorage(list);
    triggerNotification("Operatorlar tartiblandi.");
  };

  const handleSaveTelegramConfigs = (token: string, chanId: string, admId: string) => {
    localStorage.setItem('school_operators_tg_token', token.trim());
    localStorage.setItem('school_operators_tg_channel', chanId.trim());
    localStorage.setItem('school_operators_tg_admin', admId.trim());
    setTgBotToken(token.trim());
    setTgChannelId(chanId.trim());
    setTgAdminChatId(admId.trim());
    triggerNotification("Telegram sozlamalari muvaffaqiyatli saqlandi!");
  };

  const handleTestTelegramDelivery = async (token: string, chanId: string, admId: string) => {
    if (!token.trim()) {
      setTgTestingState('error');
      setTgTestErrorMessage("Bot Token kiritilmagan!");
      return;
    }
    setTgTestingState('sending');
    setTgTestErrorMessage('');
    
    try {
      const targetId = chanId.trim() || admId.trim();
      if (!targetId) {
        setTgTestingState('error');
        setTgTestErrorMessage("Kanal/Guruh ID hamda Admin ID'laridan kamida bittasini to'g'ri kiritishingiz shart!");
        return;
      }

      const testMsg = `🔔 <b>TELEGRAM INTEGRATSIYA TEKSHIRUVI</b>\n\n` +
        `✅ Ushbu xabar ulanish sozlamalari to'g'riligini tasdiqlaydi.\n\n` +
        `⚙️ <b>Bot Token:</b> <code>${token.substring(0, 10)}...</code>\n` +
        `📊 <b>Kanal ID:</b> <code>${chanId || 'Kiritilmagan'}</code>\n` +
        `👑 <b>Admin ID:</b> <code>${admId || 'Kiritilmagan'}</code>\n\n` +
        `🕒 Toshkent vaqti: <b>${tashkentTime || new Date().toLocaleTimeString()}</b>`;

      const res = await fetch(`https://api.telegram.org/bot${token.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetId,
          text: testMsg,
          parse_mode: 'HTML'
        })
      });

      const data = await res.json();
      if (data.ok) {
        setTgTestingState('success');
        triggerNotification("Test xabari Telegramga muvaffaqiyatli yuborildi!");
      } else {
        setTgTestingState('error');
        setTgTestErrorMessage(`API Xatosi: ${data.description || 'Noma\'lum xatolik'}`);
      }
    } catch (err: any) {
      setTgTestingState('error');
      setTgTestErrorMessage(`Tarmoq xatosi: ${err.message || err}`);
    }
  };

  // Google Sheets Export logic - Direct Copy Tab-Separated string to clipboard for beautiful instant paste
  const handleCopyForGoogleSheets = () => {
    let sheetsData = "Operator\tNo\tViloyati\tFamiliya Ism Sharif\tTugulgan sanasi\tTelefon raqami\tQo'shimcha telefon\tNatija\tIZOH\n";

    operators.forEach(op => {
      op.records.forEach(rec => {
        const cleanViloyat = (rec.viloyat || '').replace(/\t|\n/g, ' ');
        const cleanFish = (rec.fish || '').replace(/\t|\n/g, ' ');
        const cleanTugulganSana = (rec.tugulganSana || '').replace(/\t|\n/g, ' ');
        const cleanTel = (rec.tel || '').replace(/[^0-9+]/g, '');
        const cleanTelQoshimcha = (rec.telQoshimcha || '').replace(/[^0-9+]/g, '');
        const cleanNatija = (rec.natija || 'Kutilmoqda');
        const cleanIzoh = (rec.izoh || '').replace(/\t|\n/g, ' ');

        sheetsData += `${op.name}\t${rec.no}\t${cleanViloyat}\t${cleanFish}\t${cleanTugulganSana}\t${cleanTel}\t${cleanTelQoshimcha}\t${cleanNatija}\t${cleanIzoh}\n`;
      });
    });

    navigator.clipboard.writeText(sheetsData).then(() => {
      triggerNotification("Google Sheets uchun clipboard o'rnatildi! Endi Google Sheets-ni ochib Ctrl+V ni bosing.");
      alert("Muvaffaqiyatli nusxalandi!\n\nKo'rsatma:\n1. Google Sheets sahifasini ochasiz.\n2. Birinchi katakchani (A1) tanlaysiz.\n3. Klaviaturada Ctrl + V (yoki CMD + V) tugmasini bosing.\n4. Barcha 10 operatorning 400 tagacha ma'lumoti jadvallarga avtomat ajralib tushadi.");
    }).catch(() => {
      triggerNotification("Clipboardga yozish taqiqlandi!");
    });
  };

  // Google Sheets Optimized CSV Downloader
  const handleDownloadGoogleSheetsCSV = () => {
    // Generate Google Sheets and Excel optimized tab-separated CSV/TSV
    let tsvContent = "\uFEFF"; // UTF-8 BOM representation
    tsvContent += "Operator\tNo\tViloyati\tFamiliya Ism Sharif\tTugulgan sanasi\tTelefon raqami\tQo'shimcha telefon\tNatija\tIZOH\n";

    operators.forEach(op => {
      op.records.forEach(rec => {
        const cleanViloyat = (rec.viloyat || '').replace(/\t/g, ' ');
        const cleanFish = (rec.fish || '').replace(/\t/g, ' ');
        const cleanTugulganSana = (rec.tugulganSana || '').replace(/\t/g, ' ');
        const cleanTel = (rec.tel || '').replace(/[^0-9+]/g, '');
        const cleanTelQoshimcha = (rec.telQoshimcha || '').replace(/[^0-9+]/g, '');
        const cleanNatija = (rec.natija || 'Kutilmoqda');
        const cleanIzoh = (rec.izoh || '').replace(/\t/g, ' ');

        tsvContent += `${op.name}\t${rec.no}\t${cleanViloyat}\t${cleanFish}\t${cleanTugulganSana}\t${cleanTel}\t${cleanTelQoshimcha}\t${cleanNatija}\t${cleanIzoh}\n`;
      });
    });

    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `google_sheets_uzun_baza_${tashkentDate.replace(/\./g, '_')}.tsv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification("Google Sheets mos tsv fayli yuklab olindi!");
  };

  // Admin sets/changes an operator's login password
  const handleSetOperatorPassword = (opId: string, newPassword: string) => {
    const pwd = newPassword.trim();
    if (!pwd) {
      alert("Parol bo'sh bo'lishi mumkin emas!");
      return;
    }
    const updated = operators.map(op => op.id === opId ? { ...op, password: pwd } : op);
    saveToLocalStorage(updated);
    const op = operators.find(o => o.id === opId);
    triggerNotification(`${op ? op.name : 'Operator'} paroli yangilandi.`);
  };

  // Operator login: o'z ismini tanlab, parolini kiritadi
  const handleOperatorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const op = operators.find(o => o.id === loginOpId);
    if (!op) {
      setLoginError("Iltimos, ismingizni ro'yxatdan tanlang.");
      return;
    }
    const correct = op.password || '123456';
    if (loginPassword === correct) {
      setLoggedInOpId(op.id);
      setSelectedOpId(op.id);
      localStorage.setItem('school_operators_current_op', op.id);
      setLoginPassword('');
      setLoginError('');
      triggerNotification(`Xush kelibsiz, ${op.name}! 👋`);
    } else {
      setLoginError("Parol xato! Qaytadan urinib ko'ring.");
      setLoginPassword('');
    }
  };

  // Operator logout
  const handleOperatorLogout = () => {
    setLoggedInOpId(null);
    setLoginOpId('');
    setLoginPassword('');
    localStorage.removeItem('school_operators_current_op');
    triggerNotification("Tizimdan chiqdingiz.");
  };

  // Password verification for Admin "Oper35Tm9WjDM"
  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === 'Oper35Tm9WjDM') {
      setIsAdminLoggedIn(true);
      setCurrentView('admin');
      localStorage.setItem('school_operators_admin_status', 'true');
      setShowAdminLoginModal(false);
      setAdminPasswordInput('');
      window.location.hash = ''; // Clear secret hash token
      triggerNotification("Tizimga Admin sifatida kirdingiz! 🛡️");
    } else {
      alert("Xato parol kiritdingiz! Kirish rad etildi.");
      setAdminPasswordInput('');
    }
  };

  // Global Date changer (Sanasini o'zgartirish) for all operators in one batch Click!
  const handleBulkUpdateDate = async () => {
    if (!bulkSanaInput.trim()) {
      alert("Sana qiymatini to'g'ri kiriting!");
      return;
    }

    if (window.confirm(`Haqiqatan ham barcha ${operators.reduce((acc, o) => acc + o.records.length, 0)} ta maktabning sanasini "${bulkSanaInput}" ga o'zgartirmoqchimisiz?`)) {
      const updated = operators.map(op => ({
        ...op,
        records: op.records.map(rec => ({
          ...rec,
          sana: bulkSanaInput
        }))
      }));

      const freshLogs = logActivityLocal('ADMIN', 'Tizim Ma\'muri', 'Barcha Maktablar', 'Sana', 'Turli', bulkSanaInput);
      saveToLocalStorage(updated, freshLogs);
      triggerNotification(`Barcha sanalar "${bulkSanaInput}" ga o'zgartirildi!`);
    }
  };

  // Admin panel barcha operatorlar statistikasini (natija va izohlarini) tozalash (Nolga qaytarish)
  const handleClearAllProgress = () => {
    const confirmation = window.confirm("Diqqat! Barcha operatorlarning barcha mijozlar bo'yicha kiritgan natijalari (Ko'tarmadi, O'chirilgan, va h.k.) va izohlari butunlay O'CHIRIB TASHALADI va tizim nolga qaytariladi.\n\nHaqiqatan ham barcha statistikalarni tozalamoqchimisiz?");
    if (!confirmation) return;

    const doubleCheck = window.confirm("Ushbu harakatni ortga qaytarib bo'lmaydi! Ishonchingiz komilmi? Barcha hisobotlar o'chib ketadi.");
    if (!doubleCheck) return;

    const updated = operators.map(op => ({
      ...op,
      records: op.records.map(rec => ({
        ...rec,
        natija: '', // "Ko'tarmadi" | "O'chirilgan" | "O'ylab ko'radi" | "Maslahat qiladi" | "Xato raqam" | "O'qimaydi" | "O'qiydi" | "Shartnoma berildi" | ""
        izoh: ''
      }))
    }));

    const freshLogs = logActivityLocal('ADMIN', 'Tizim Ma\'muri', 'Barcha Operatorlar', 'Statistika', 'Mavjud', 'Tozalandi (Nolga qaytarildi)');
    saveToLocalStorage(updated, freshLogs);
    triggerNotification("Barcha operatorlar progresslari muvaffaqiyatli tozalandi! 🧹");
  };

  // Admin panel barcha chat xabarlarini o'chirish
  const handleClearChatMessages = async () => {
    if (!window.confirm("Barcha chat xabarlarini butunlay o'chirib tashlamoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi!")) {
      return;
    }
    setSavingState('saving');
    try {
      const querySnapshot = await getDocs(collection(db, 'messages'));
      const batch = writeBatch(db);
      querySnapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      setSavingState('saved');
      setTimeout(() => setSavingState('idle'), 1500);
      triggerNotification("Barcha chat xabarlari muvaffaqiyatli o'chirildi! 💬");
    } catch (err) {
      console.error("Failed to delete chat messages:", err);
      setSavingState('idle');
      triggerNotification("Chatni tozalashda xatolik yuz berdi! ⚠️");
    }
  };

  // Admin panel barcha maktab/muassasa ma'lumotlarini (jadvallarni) butunlay o'chirish
  const handleClearAllSchoolRecords = async () => {
    if (!window.confirm("DIQQAT! Barcha operatorlarning jadvallaridagi barcha maktab/muassasa ma'lumotlarini butunlay o'chirib tashlamoqchimisiz? Jadvallar bo'm-bo'sh holatga keladi!")) {
      return;
    }
    const doubleCheck = window.confirm("Ushbu amal barcha operator jadvallarini butunlay tozalaydi. Haqiqatan ham barcha maktablarni o'chirasizmi?");
    if (!doubleCheck) return;

    const updated = operators.map(op => ({
      ...op,
      records: []
    }));

    const freshLogs = logActivityLocal('ADMIN', 'Tizim Ma\'muri', 'Barcha Operatorlar', 'Jadvallarni tozalash', 'Mavjud', 'Barcha maktablar o\'chirildi');
    saveToLocalStorage(updated, freshLogs);
    triggerNotification("Barcha operatorlar jadvallari butunlay tozalandi! 🗑️");
  };

  // Helper to parse CSV/TSV/JSV plain text
  const parseTextRows = (text: string): any[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const result: any[] = [];

    lines.forEach(line => {
      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          result.push(JSON.parse(line));
          return;
        } catch(e) {}
      }

      let cols: string[] = [];
      if (line.includes('\t')) {
        cols = line.split('\t');
      } else if (line.includes('|')) {
        cols = line.split('|');
      } else if (line.includes(';')) {
        cols = line.split(';');
      } else {
        cols = line.split(',');
      }
      result.push(cols.map(c => c.trim()));
    });
    return result;
  };

  // Process and standardize raw rows from spreadsheet
  const processImportData = (rawRows: any[]) => {
    if (!rawRows || rawRows.length === 0) {
      alert("Hujjatdan hech qanday ma'lumot topilmadi.");
      return;
    }

    const interpretedSchools: Omit<SchoolRecord, 'id'>[] = [];

    rawRows.forEach((row, idx) => {
      let viloyat = '';
      let fish = '';
      let tugulganSana = '';
      let tel = '';
      let telQoshimcha = '';
      let izoh = '';

      if (Array.isArray(row)) {
        const firstColVal = String(row[0] || '').toLowerCase();
        if (idx === 0 && (firstColVal.includes('viloyat') || firstColVal.includes('hudud') || firstColVal.includes('rayon') || firstColVal.includes('tuman'))) {
          return;
        }
        viloyat = row[0] ? String(row[0]).trim() : '';
        fish = row[1] ? String(row[1]).trim() : '';
        tugulganSana = row[2] ? String(row[2]).trim() : '';
        tel = row[3] ? String(row[3]).trim() : '';
        telQoshimcha = row[4] ? String(row[4]).trim() : '';
        izoh = row[5] ? String(row[5]).trim() : '';
      } else if (typeof row === 'object') {
        const keys = Object.keys(row);
        const findKey = (subStrings: string[]) => {
          const found = keys.find(k => subStrings.some(sub => k.toLowerCase().includes(sub)));
          return found ? String(row[found]).trim() : '';
        };

        viloyat = findKey(['viloyat', 'hudud', 'rayon', 'tuman', 'city', 'location', 'district', 'index_0']);
        fish = findKey(['fish', 'familiya', 'ism', 'sharif', 'name', 'direktor', 'dir', 'boss', 'f.i.sh', 'index_1']);
        tugulganSana = findKey(['tugulgan', 'sana', 'date', 'birth', 'index_2']);
        tel = findKey(['tel', 'phone', 'raqam', 'number', 'telfon', 'mobile', 'index_3']);
        telQoshimcha = findKey(['qoshimcha', 'extra', 'second', 'alt', 'index_4']);
        izoh = findKey(['izoh', 'note', 'comment', 'description', 'index_5']);

        if (!viloyat && keys[0]) viloyat = String(row[keys[0]]).trim();
        if (!fish && keys[1]) fish = String(row[keys[1]]).trim();
        if (!tugulganSana && keys[2]) tugulganSana = String(row[keys[2]]).trim();
        if (!tel && keys[3]) tel = String(row[keys[3]]).trim();
        if (!telQoshimcha && keys[4]) telQoshimcha = String(row[keys[4]]).trim();
        if (!izoh && keys[5]) izoh = String(row[keys[5]]).trim();
      }

      if (viloyat || fish || tel) {
        interpretedSchools.push({
          no: 0,
          viloyat: viloyat || 'Noma\'lum viloyat',
          fish: fish || 'Noma\'lum mijoz',
          tugulganSana: tugulganSana || 'Kiritilmagan',
          tel: tel || 'Kiritilmagan',
          telQoshimcha: telQoshimcha || 'Kiritilmagan',
          natija: '',
          izoh: izoh || ''
        });
      }
    });

    if (interpretedSchools.length === 0) {
      alert("Format aniqlanmadi. Kamida Viloyat yoki Familiya Ism Sharif bo'lishi kerak.");
      return;
    }

    smartDistribute(interpretedSchools);
  };

  // Smart deduplication and Fair distribution to all 10 operators using Firestore syncing
  const smartDistribute = async (incomingSchools: Omit<SchoolRecord, 'id'>[]) => {
    const dbFingerprints = new Set<string>();
    const dbPhones = new Set<string>();

    const getFingerprint = (viloyat: string, fish: string) => {
      return (String(viloyat || '').toLowerCase().trim() + "||" + String(fish || '').toLowerCase().trim())
        .replace(/[^a-z0-9]/ig, '');
    };

    const getCleanPhone = (phone: string) => {
      return String(phone || '').replace(/[^0-9]/g, '');
    };

    operators.forEach(op => {
      op.records.forEach(rec => {
        dbFingerprints.add(getFingerprint(rec.viloyat, rec.fish));
        const ph = getCleanPhone(rec.tel);
        if (ph && ph.length >= 7) {
          dbPhones.add(ph);
        }
        const ph2 = getCleanPhone(rec.telQoshimcha);
        if (ph2 && ph2.length >= 7) {
          dbPhones.add(ph2);
        }
      });
    });

    const uniqueIncoming: Omit<SchoolRecord, 'id'>[] = [];
    const internalFingerprints = new Set<string>();
    const internalPhones = new Set<string>();

    let duplicateDbCount = 0;
    let duplicateFileCount = 0;

    incomingSchools.forEach(sch => {
      const fprint = getFingerprint(sch.viloyat, sch.fish);
      const ph = getCleanPhone(sch.tel);

      const isDbDuplicate = dbFingerprints.has(fprint) || (ph && ph.length >= 7 && dbPhones.has(ph));
      
      if (isDbDuplicate) {
        duplicateDbCount++;
        return;
      }

      const isInternalDuplicate = internalFingerprints.has(fprint) || (ph && ph.length >= 7 && internalPhones.has(ph));
      if (isInternalDuplicate) {
        duplicateFileCount++;
        return;
      }

      internalFingerprints.add(fprint);
      if (ph && ph.length >= 7) {
        internalPhones.add(ph);
      }

      uniqueIncoming.push(sch);
    });

    if (uniqueIncoming.length === 0) {
      alert(`Yuklash to'xtatildi! Siz yuklagan ma'lumotlar (Bazada takrorlangan: ${duplicateDbCount}, Fayldagi takrorlar: ${duplicateFileCount}) bazada allaqachon mavjud! Eng muhimi - takroriy ma'lumot kiritilishining oldi olindi! 🛡️`);
      return;
    }

    let poolIndex = 0;
    const distributionReport: { opName: string, addedCount: number, currentTotal: number }[] = [];

    const finalOperators = operators.map(op => {
      const targetCount = 40;
      const needCount = Math.max(0, targetCount - (op.records || []).length);

      const toAdd: SchoolRecord[] = [];
      const assignedCount = Math.min(needCount, uniqueIncoming.length - poolIndex);

      for (let i = 0; i < assignedCount; i++) {
        const item = uniqueIncoming[poolIndex + i];
        toAdd.push({
          id: `${op.id}_import_${Date.now()}_${poolIndex + i}`,
          no: 0,
          viloyat: item.viloyat,
          fish: item.fish,
          tugulganSana: item.tugulganSana,
          tel: item.tel,
          telQoshimcha: item.telQoshimcha,
          natija: '',
          izoh: item.izoh || ''
        });
      }

      poolIndex += assignedCount;

      const combined = [...(op.records || []), ...toAdd];
      const mapped = combined.map((rec, idx) => ({
        ...rec,
        no: idx + 1
      }));

      distributionReport.push({
        opName: op.name,
        addedCount: assignedCount,
        currentTotal: mapped.length
      });

      return {
        ...op,
        records: mapped
      };
    });

    const logMsg = `Fayl/Matn importi joriy etildi: Jami yuklangan ${incomingSchools.length} tadan unikal ${uniqueIncoming.length} ta mijoz uchun operator jadvallari 40 tadan to'ldirildi.`;

    const freshLogs = logActivityLocal('ADMIN', 'Tizim Ma\'muri', 'Barcha operatorlar', 'Smart Import', '', logMsg);
    saveToLocalStorage(finalOperators, freshLogs);
    triggerNotification("Ma'lumotlar jadvallarga muvaffaqiyatli yuklandi!");
    
    const reportStr = distributionReport
      .map(r => `• ${r.opName}: +${r.addedCount} ta mijoz yuklandi (Jami: ${r.currentTotal} ta)`)
      .join('\n');

    alert(`MUVAFFAQIYATLI YUKLASH Yakunlandi! 🎯\n\n` +
          `Sarhisob:\n` +
          `  - Kiruvchi qatorlar soni: ${incomingSchools.length} ta\n` +
          `  - Tizimda mavjud tushgan yozuvlar (tozalangan): ${duplicateDbCount} ta\n` +
          `  - Haqiqiy yangi unikal mijozlar: ${uniqueIncoming.length} ta\n` +
          `  - Operatorlar o'rtasida takroriy taqsimlash taqiqi: 100% bajarildi\n\n` +
          `Har bir operator hisoboti:\n` + reportStr);
    setBulkDataInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (evt) => {
      try {
        const resultText = evt.target?.result;
        if (!resultText) return;

        let parsedData: any[] = [];

        if (extension === 'json') {
          const json = JSON.parse(resultText as string);
          parsedData = Array.isArray(json) ? json : [json];
        } else if (extension === 'xlsx' || extension === 'xls') {
          const data = new Uint8Array(resultText as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        } else {
          const text = resultText as string;
          parsedData = parseTextRows(text);
        }

        processImportData(parsedData);
      } catch (err: any) {
        alert("Faylni o'qishda xatolik yuz berdi: " + err.message);
      }
    };

    if (extension === 'xlsx' || extension === 'xls') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Textarea input top-up trigger
  const handleBulkRefillOperator = () => {
    if (!bulkDataInput.trim()) {
      alert("Iltimos, katakka ma'lumotlarni nusxalab kiriting yoki yuqoridagi fayl tanlash tugmasidan foydalaning!");
      return;
    }
    const rows = parseTextRows(bulkDataInput);
    processImportData(rows);
  };

  // Global search implementation across all 10 operator sheets
  const getGlobalSearchResults = () => {
    if (!globalSearch.trim()) return [];
    
    const results: { operatorName: string, opId: string, record: SchoolRecord }[] = [];
    operators.forEach(op => {
      op.records.forEach(rec => {
        const matches = 
          (rec.fish || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
          (rec.viloyat || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
          (rec.tel || '').includes(globalSearch) ||
          (rec.telQoshimcha || '').includes(globalSearch) ||
          (rec.izoh || '').toLowerCase().includes(globalSearch.toLowerCase());
        
        if (matches) {
          results.push({ operatorName: op.name, opId: op.id, record: rec });
        }
      });
    });
    return results;
  };

  const globalResults = getGlobalSearchResults();
  const activeOperator = operators.find(op => op.id === selectedOpId);

  // Admin barcha operatorlarni ko'radi; oddiy operator faqat o'zini ko'radi
  const visibleOperators = isAdminLoggedIn ? operators : operators.filter(op => op.id === loggedInOpId);
  const loggedInOperator = operators.find(op => op.id === loggedInOpId);

  // General database stats calculation
  const totalSchools = operators.reduce((acc, op) => acc + op.records.length, 0);
  const totalCompleted = operators.reduce((acc, op) => {
    return acc + op.records.filter(r => r.natija && r.natija !== '').length;
  }, 0);
  const totalProgressPercentage = totalSchools ? Math.round((totalCompleted / totalSchools) * 100) : 0;

  // Filter logs based on search string
  const filteredLogs = activityLogs.filter(log => {
    const term = adminLogSearch.toLowerCase();
    return (
      log.operatorName.toLowerCase().includes(term) ||
      log.schoolName.toLowerCase().includes(term) ||
      log.field.toLowerCase().includes(term) ||
      log.newValue.toLowerCase().includes(term) ||
      log.oldValue.toLowerCase().includes(term)
    );
  });

  // ===== Operator Login Gate =====
  // Admin emas va biror operator kirmagan bo'lsa — login ekrani ko'rsatiladi.
  const showLoginGate = !isAdminLoggedIn && !loggedInOpId;
  if (showLoginGate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 text-neutral-100 p-4 font-sans">
        {notification && (
          <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
            <CheckSquare size={16} />
            {notification}
          </div>
        )}

        <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-6">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="p-3 bg-emerald-600 rounded-xl text-white mb-3">
              <UserCheck size={26} />
            </div>
            <h1 className="text-base font-black tracking-tight text-white">OPERATORLAR ISH STOLI</h1>
            <p className="text-[11px] text-neutral-400 mt-1">Ismingizni tanlang va parolingizni kiriting</p>
          </div>

          <form onSubmit={handleOperatorLogin} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">Operator (Ismingiz)</label>
              <select
                value={loginOpId}
                onChange={(e) => { setLoginOpId(e.target.value); setLoginError(''); }}
                className="w-full px-3 py-2.5 text-sm bg-neutral-900 text-neutral-100 rounded-lg border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">— Ismingizni tanlang —</option>
                {operators.map(op => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">Parol</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                <input
                  type="password"
                  placeholder="Parolingizni kiriting..."
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-neutral-900 text-neutral-100 rounded-lg border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
            </div>

            {loginError && (
              <div className="text-[11px] font-semibold text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-md px-3 py-2 flex items-center gap-1.5">
                <AlertTriangle size={13} /> {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md"
            >
              <Unlock size={15} /> Kirish
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-neutral-800 text-center">
            <button
              onClick={() => setShowAdminLoginModal(true)}
              className="text-[10px] text-neutral-500 hover:text-emerald-400 font-semibold transition-colors"
            >
              🛡️ Administrator sifatida kirish
            </button>
          </div>
        </div>

        {/* Admin login modal (gate ustida) */}
        {showAdminLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 max-w-sm w-full shadow-2xl">
              <h3 className="text-sm font-black text-white flex items-center gap-1 mb-2">
                <Lock size={16} className="text-red-500" />
                Tizim Administratori Kirishi
              </h3>
              <p className="text-[11px] text-neutral-400 mb-4">
                Faqat boshqaruvchi administratorlar uchun. Iltimos parolni kiriting:
              </p>
              <form onSubmit={handleAdminVerify} className="space-y-3.5">
                <input
                  type="password"
                  placeholder="Xavfsizlik paroli..."
                  className="w-full p-2 text-xs bg-neutral-850 text-neutral-100 rounded-lg border border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2 text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowAdminLoginModal(false); setAdminPasswordInput(''); window.location.hash = ''; }}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded font-semibold text-neutral-300"
                  >
                    Yopish
                  </button>
                  <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-xs">
                    Tasdiqlash
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 dark:bg-neutral-900 dark:text-neutral-100 bg-stone-100 text-neutral-800`}>

      {/* Dynamic Toast feedback */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 dark:bg-emerald-700 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckSquare size={16} />
          {notification}
        </div>
      )}

      {/* Visual background saving indicator with gorgeous motion animations */}
      <AnimatePresence>
        {savingState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 35, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-xl shadow-2xl border text-xs font-bold select-none backdrop-blur-md transition-all duration-300 ${
              savingState === 'saving'
                ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {savingState === 'saving' ? (
              <>
                <RefreshCw size={13} className="animate-spin text-amber-500" />
                <span className="tracking-wide">Saqlanmoqda (Saving...)</span>
              </>
            ) : (
              <>
                <CheckSquare size={13} className="text-emerald-500 shrink-0" />
                <span className="tracking-wide">Barchasi saqlandi ✅</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <header className="bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 shadow-xs px-4 py-3 shrink-0 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-lg text-white">
                <PieChart size={24} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
                  OPERATORLAR ISH STOLI 📊
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {operators.length} ta faol operator, doimiy 40 talik jadvallar boshqaruvi
                </p>
              </div>
            </div>
            
            {/* Micro Toggle for mobile */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-amber-400 transition-colors"
                title={theme === 'dark' ? "Kunduzgi rejim" : "Tungi rejim"}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          </div>

          {/* Quick Stats Banner & Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            
            {/* Theme switcher button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-amber-400 border border-neutral-250 dark:border-neutral-700 rounded-md transition-colors cursor-pointer"
              title={theme === 'dark' ? "Kunduzgi rejim" : "Tungi rejim"}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Logged-in operator badge + logout */}
            {loggedInOperator && !isAdminLoggedIn && (
              <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md px-2.5 py-1">
                <UserCheck size={14} className="text-emerald-500" />
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200 truncate max-w-[140px]">{loggedInOperator.name}</span>
                <button
                  onClick={handleOperatorLogout}
                  className="ml-1 px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                  title="Tizimdan chiqish"
                >
                  <LogOut size={11} /> Chiqish
                </button>
              </div>
            )}

            {/* Global Search across all sheets (faqat admin) */}
            {isAdminLoggedIn && (
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                placeholder="Butun bazadan qidirish..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 rounded-md border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            </div>
            )}

            {/* Google Sheets Export actions (faqat admin) */}
            {isAdminLoggedIn && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyForGoogleSheets}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                title="Google Sheets-ga to'g'ridan-to'g'ri nusxasini olish"
              >
                <ClipboardCheck size={14} />
                Sheets-ga nusxalash
              </button>
              
              <button
                onClick={handleDownloadGoogleSheetsCSV}
                className="p-1.5 bg-[#f5f5f5] hover:bg-stone-250 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-emerald-400 border border-neutral-250 dark:border-neutral-700 rounded-md"
                title="Google Sheets formatidagi .tsv baza yuklash"
              >
                <FileSpreadsheet size={14} />
              </button>
            </div>
            )}

            {/* Admin entry buttons removed from header. Access exclusively via URL path/hash '/Operadminz' */}

            {/* Reset Defaults database state */}
            {isAdminLoggedIn && (
              <button
                onClick={handleResetDatabase}
                className="px-2.5 py-1.5 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-rose-600 dark:text-rose-400 rounded-md text-xs font-semibold border border-neutral-250 dark:border-neutral-700 flex items-center gap-1.5 transition-colors"
                title="Jadvallarni tozalab zavod holatiga keltirish"
              >
                <RefreshCw size={13} />
                Zavod holati
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Admin View Selection Sub-header */}
      {isAdminLoggedIn && (
        <div className="bg-neutral-100 dark:bg-neutral-950 border-b border-neutral-250 dark:border-neutral-850 py-1.5 transition-colors shadow-2xs shrink-0">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-neutral-500 dark:text-neutral-400 mr-1 uppercase tracking-wider text-[9px] select-none">
                Rejimni Tanlang:
              </span>
              <button
                onClick={() => setCurrentView('operator')}
                className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 text-xs cursor-pointer ${
                  currentView === 'operator'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white hover:bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <BookOpen size={13} />
                Operator Ish Joyi (Jadvallar)
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 text-xs cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white hover:bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Sliders size={13} />
                🛡️ Boshqaruv Markazi (Admin Panel)
              </button>
            </div>
            
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                Sessiya Holati: <strong className="text-emerald-500 font-bold">&#x25CF; Administrator Tizimda</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Floor */}
      <main className="flex-1 p-4 max-w-7xl w-full mx-auto flex flex-col gap-4 overflow-hidden">
        


        {/* Administrator Dashboard view (Rendered conditionally on top if logged in) */}
        {isAdminLoggedIn && currentView === 'admin' && (
          <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl border-2 border-emerald-600 dark:border-emerald-800 shadow-md">
            <div className="border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1 px-2.2 text-white bg-emerald-600 rounded text-xs font-bold font-mono">
                  ADMIN PANEL
                </div>
                <h2 className="text-sm font-extrabold text-neutral-900 dark:text-white">
                  Strategik Boshqaruv Markazi (Oper35Tm9WjDM)
                </h2>
              </div>

              {/* Inside admin control tab panels */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <button
                  onClick={() => setActiveAdminTab('stats')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${activeAdminTab === 'stats' ? 'bg-emerald-600 text-white' : 'bg-neutral-150 text-neutral-700 dark:bg-neutral-850 dark:text-neutral-300 hover:bg-neutral-200'}`}
                >
                  Operatorlar progressi
                </button>
                <button
                  onClick={() => setActiveAdminTab('topup')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${activeAdminTab === 'topup' ? 'bg-emerald-600 text-white' : 'bg-neutral-150 text-neutral-700 dark:bg-neutral-850 dark:text-neutral-300 hover:bg-neutral-200'}`}
                >
                  Yuklash & To'ldirish (40 talik balans)
                </button>
                <button
                  onClick={() => setActiveAdminTab('logs')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${activeAdminTab === 'logs' ? 'bg-emerald-600 text-white' : 'bg-neutral-150 text-neutral-700 dark:bg-neutral-850 dark:text-neutral-300 hover:bg-neutral-200'}`}
                >
                  Ish Jurnali (Soat, Minut, Sekund)
                </button>
                <button
                  onClick={() => setActiveAdminTab('settings')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${activeAdminTab === 'settings' ? 'bg-emerald-600 text-white' : 'bg-neutral-150 text-neutral-700 dark:bg-neutral-850 dark:text-neutral-300 hover:bg-neutral-200'}`}
                >
                  ⚙️ Tizim Sozlamalari
                </button>
                <button
                  onClick={() => setActiveAdminTab('operators_list')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${activeAdminTab === 'operators_list' ? 'bg-emerald-600 text-white' : 'bg-neutral-150 text-neutral-700 dark:bg-neutral-850 dark:text-neutral-300 hover:bg-neutral-200'}`}
                >
                  👥 Operatorlar (Rename)
                </button>
                <button
                  onClick={() => setActiveAdminTab('analytics')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${activeAdminTab === 'analytics' ? 'bg-emerald-600 text-white' : 'bg-neutral-150 text-neutral-700 dark:bg-neutral-850 dark:text-neutral-300 hover:bg-neutral-200'}`}
                >
                  📊 Grafik Tahlillar
                </button>
                <button
                  onClick={() => setActiveAdminTab('excel_import')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${activeAdminTab === 'excel_import' ? 'bg-emerald-600 text-white' : 'bg-neutral-150 text-neutral-700 dark:bg-neutral-850 dark:text-neutral-300 hover:bg-neutral-200'}`}
                >
                  📂 Excel Import
                </button>
                <span className="text-neutral-300 dark:text-neutral-800 mx-1">|</span>
                <button
                  onClick={() => {
                    setIsAdminLoggedIn(false);
                    setCurrentView('operator');
                    localStorage.removeItem('school_operators_admin_status');
                    triggerNotification("Admin rejimi yopildi.");
                  }}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold flex items-center gap-1 transition-colors"
                  title="Admin panelni yopish va chiqish"
                >
                  Chiqish 🚪
                </button>
              </div>
            </div>

            {/* TAB CONTENT: Operator stats */}
            {activeAdminTab === 'stats' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                  {operators.map(op => {
                    const total = op.records.length;
                    const kotarmadi = op.records.filter(r => r.natija === "Ko'tarmadi").length;
                    const ochirilgan = op.records.filter(r => r.natija === "O'chirilgan").length;
                    const oylabKoradi = op.records.filter(r => r.natija === "O'ylab ko'radi").length;
                    const maslahatQiladi = op.records.filter(r => r.natija === "Maslahat qiladi").length;
                    const xatoRaqam = op.records.filter(r => r.natija === "Xato raqam").length;
                    const oqimaydi = op.records.filter(r => r.natija === "O'qimaydi").length;
                    const oqiydi = op.records.filter(r => r.natija === "O'qiydi").length;
                    const shartnomaBerildi = op.records.filter(r => r.natija === "Shartnoma berildi").length;
                    const kutilmoqda = op.records.filter(r => !r.natija || r.natija === 'Kutilmoqda').length;
                    const processed = total - kutilmoqda;
                    const progressPerc = total ? Math.round((processed / total) * 100) : 0;

                    return (
                      <div key={op.id} className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 select-none">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 truncate pr-1 max-w-[140px]">{op.name}</span>
                          <span className="text-[10px] font-mono font-bold text-emerald-600">{progressPerc}%</span>
                        </div>
                        
                        {/* Micro bar indicator */}
                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: `${progressPerc}%` }}></div>
                        </div>

                        <div className="grid grid-cols-9 gap-0.5 text-[8px] font-semibold text-center mt-2.5">
                          <div className="bg-orange-50 dark:bg-orange-950/25 p-1 rounded font-mono text-orange-700 dark:text-orange-400" title="Ko'tarmadi">
                            {kotarmadi}📞
                          </div>
                          <div className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded font-mono text-neutral-600 dark:text-neutral-400" title="O'chirilgan">
                            {ochirilgan}📴
                          </div>
                          <div className="bg-yellow-50 dark:bg-yellow-950/25 p-1 rounded font-mono text-yellow-700 dark:text-yellow-400" title="O'ylab ko'radi">
                            {oylabKoradi}🤔
                          </div>
                          <div className="bg-sky-50 dark:bg-sky-950/25 p-1 rounded font-mono text-sky-700 dark:text-sky-400" title="Maslahat qiladi">
                            {maslahatQiladi}👥
                          </div>
                          <div className="bg-rose-50 dark:bg-rose-950/25 p-1 rounded font-mono text-rose-700 dark:text-rose-400" title="Xato raqam">
                            {xatoRaqam}❌
                          </div>
                          <div className="bg-red-50 dark:bg-red-950/25 p-1 rounded font-mono text-red-700 dark:text-red-400" title="O'qimaydi">
                            {oqimaydi}🚫
                          </div>
                          <div className="bg-indigo-50 dark:bg-indigo-950/25 p-1 rounded font-mono text-indigo-700 dark:text-indigo-400" title="O'qiydi">
                            {oqiydi}🎓
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-950/25 p-1 rounded font-mono text-emerald-700 dark:text-emerald-450" title="Shartnoma berildi">
                            {shartnomaBerildi}📄
                          </div>
                          <div className="bg-stone-100 dark:bg-neutral-800 p-1 rounded font-mono text-neutral-500 dark:text-neutral-500" title="Kutilmoqda">
                            {kutilmoqda}⏳
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Status distribution Bar Chart using recharts */}
                <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                    <div>
                      <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Barcha Operatorlar Bo'yicha Holat (Natija) Taqsimoti
                      </h3>
                      <p className="text-[10px] text-neutral-500 mt-0.5">Tezkor vizual tahlil va umumiy hisobotlar diagrammasi</p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-3 py-1 rounded-md font-medium text-neutral-500">
                      <span>Jami yozuvlar: <strong>{operators.reduce((sum, op) => sum + op.records.length, 0)} ta</strong></span>
                    </div>
                  </div>

                  <div className="h-64 sm:h-72 w-full text-[10px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={[
                          { name: "Ko'tarmadi 📞", soni: operators.reduce((acc, op) => acc + op.records.filter(r => r.natija === "Ko'tarmadi").length, 0), fill: '#f97316' },
                          { name: "O'chirilgan 📴", soni: operators.reduce((acc, op) => acc + op.records.filter(r => r.natija === "O'chirilgan").length, 0), fill: '#737373' },
                          { name: "O'ylab ko'radi 🤔", soni: operators.reduce((acc, op) => acc + op.records.filter(r => r.natija === "O'ylab ko'radi").length, 0), fill: '#eab308' },
                          { name: "Maslahat qiladi 👥", soni: operators.reduce((acc, op) => acc + op.records.filter(r => r.natija === "Maslahat qiladi").length, 0), fill: '#0ea5e9' },
                          { name: "Xato raqam ❌", soni: operators.reduce((acc, op) => acc + op.records.filter(r => r.natija === "Xato raqam").length, 0), fill: '#f43f5e' },
                          { name: "O'qimaydi 🚫", soni: operators.reduce((acc, op) => acc + op.records.filter(r => r.natija === "O'qimaydi").length, 0), fill: '#ef4444' },
                          { name: "O'qiydi 🎓", soni: operators.reduce((acc, op) => acc + op.records.filter(r => r.natija === "O'qiydi").length, 0), fill: '#6366f1' },
                          { name: "Shartnoma berildi 📄", soni: operators.reduce((acc, op) => acc + op.records.filter(r => r.natija === "Shartnoma berildi").length, 0), fill: '#10b981' },
                          { name: "Kutilmoqda ⏳", soni: operators.reduce((acc, op) => acc + op.records.filter(r => !r.natija || r.natija === '' || r.natija === 'Kutilmoqda').length, 0), fill: '#a3a3a3' }
                        ]} 
                        margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#262626' : '#e5e5e5'} vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke={theme === 'dark' ? '#a3a3a3' : '#525252'} 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke={theme === 'dark' ? '#a3a3a3' : '#525252'} 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: theme === 'dark' ? '#151515' : '#ffffff', 
                            borderColor: theme === 'dark' ? '#262626' : '#e5e5e5',
                            borderRadius: '8px',
                            color: theme === 'dark' ? '#ffffff' : '#000000',
                            fontWeight: '600',
                            fontSize: '11px'
                          }}
                          cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}
                        />
                        <Bar dataKey="soni" radius={[6, 6, 0, 0]} barSize={44}>
                          <LabelList dataKey="soni" position="top" fill={theme === 'dark' ? '#e5e5e5' : '#171717'} fontSize={11} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Top-up / Refill to 40 Balance with Smart File & Text inputs */}
            {activeAdminTab === 'topup' && (
              <div className="text-xs space-y-4">
                <p className="text-neutral-500 font-medium">
                  Kunlik jadvallarni zaxiralash va unikal to'ldirish tizimi. Hujjat yuklaganingizda yoki matn kiritganingizda tizim buni barcha 10 nafar operatorlarga aqlli ravishda tarqatadi. Jadvallardagi kutilayotgan ("Kutilmoqda") maktablar soni qayta <strong className="text-emerald-600 dark:text-emerald-400">aynan 40 ta</strong> bo'lguncha to'ldiriladi. Ortiqchalari zaxira sifatida qo'shiladi! <strong className="text-rose-600">Takroriy ma'lumot tushishi 100% cheklangan!</strong>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Option 1: File Uploader */}
                  <div className="p-4 border border-dashed border-neutral-300 dark:border-neutral-800 rounded bg-neutral-50 dark:bg-neutral-900 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-neutral-800 dark:text-white flex items-center gap-1 mb-1">
                        📁 Fayl yuklash (Excel, CSV, JSON)
                      </h4>
                      <p className="text-[10px] text-neutral-400 mb-3">
                        Hujjat faylini tanlang (.xlsx, .xls, .csv, .tsv, .json)
                      </p>
                      
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.tsv,.json,text/plain"
                        onChange={handleFileUpload}
                        className="block w-full text-xs text-neutral-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#00a372] file:text-white hover:file:bg-[#008c61] cursor-pointer"
                      />
                    </div>
                    
                    <div className="text-[9px] text-neutral-400 mt-2 italic">
                      Dastur yuklangan barcha satrlarni takrorlanmaslikka filtrlab chiqadi va jadvallarga teng taqsimlaydi.
                    </div>
                  </div>

                  {/* Option 2: Copy paste from sheets */}
                  <div className="md:col-span-2 p-4 border border-neutral-200 dark:border-neutral-800 rounded bg-neutral-50 dark:bg-neutral-900">
                    <h4 className="font-bold text-neutral-800 dark:text-white flex items-center gap-1 mb-1">
                      📝 Google Sheets / Excel'dan nusxa yuklash
                    </h4>
                    <p className="text-[10px] text-neutral-400 mb-2">
                      Ketma-ketlik: Tuman, Maktab nomi, Direktor F.I.Sh, Tel raqami.
                    </p>
                    <textarea
                      className="w-full h-24 p-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded font-mono placeholder-neutral-500 text-[10px] focus:outline-none"
                      placeholder="Tashkent	99-maktab	Sirojov G.	998901234567
Samarqand	12-maktab	Aliyev Q.	998911234567"
                      value={bulkDataInput}
                      onChange={(e) => setBulkDataInput(e.target.value)}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleBulkRefillOperator}
                        className="px-4 py-1.5 bg-[#00a372] hover:bg-[#008c61] text-white font-bold rounded text-xs flex items-center gap-1 transition-colors"
                      >
                        Matndan tahlil qilib taqsimlash ⚡
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-2 border border-blue-200 bg-blue-50/50 dark:border-neutral-800 dark:bg-neutral-900/40 rounded text-[10px] text-neutral-500 font-serif flex items-start gap-2">
                  <Info size={13} className="text-emerald-500" />
                  <span>
                    <strong>Aqlli Unikal Taqsimot mexanizmi:</strong> Har bir operatorning kutilayotgan ("Kutilmoqda") maktablari soni jami 40 taga yetkaziladi. Hech qanday takroriy maktab yuklanmaydi, bitta maktab faqat bitta operatorga tushadi, jadvallar qayta unikal statusda yangilanadi.
                  </span>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Interactive Seconds-level Modification Logs Feed */}
            {activeAdminTab === 'logs' && (
              <div className="text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-neutral-600 dark:text-neutral-400">
                    Real vaqtdagi operatorlar faoliyati (Oxirgi 1000 ta tahrirlashlar):
                  </span>
                  
                  {/* Inline search inside logs */}
                  <input
                    type="text"
                    placeholder="Jurnalni qidirish..."
                    className="p-1 px-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-350 dark:border-neutral-700 rounded text-xs w-48 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={adminLogSearch}
                    onChange={(e) => setAdminLogSearch(e.target.value)}
                  />
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-900 rounded border border-neutral-300 dark:border-neutral-800 max-h-40 overflow-y-auto">
                  <table className="w-full border-collapse text-left text-[10px] font-mono whitespace-nowrap">
                    <thead>
                      <tr className="bg-neutral-150 dark:bg-neutral-950 border-b border-stone-200 dark:border-neutral-800">
                        <th className="p-2 font-bold w-36">Vaqti (Sekundigacha)</th>
                        <th className="p-2 font-bold w-40">Kim tomondan (Operator)</th>
                        <th className="p-2 font-bold w-44">Tahrirlangan Muassasa</th>
                        <th className="p-2 font-bold w-20">Ustun</th>
                        <th className="p-2 font-bold">Eski Qiymati</th>
                        <th className="p-2 font-bold">Yangi Qiymat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {filteredLogs.length > 0 ? (
                        filteredLogs.map(log => (
                          <tr key={log.id} className="hover:bg-amber-500/10 transition-colors">
                            <td className="p-2 font-semibold text-emerald-600 dark:text-emerald-400">{log.timestamp}</td>
                            <td className="p-2 font-bold">{log.operatorName}</td>
                            <td className="p-2 text-neutral-600 dark:text-neutral-350">{log.schoolName}</td>
                            <td className="p-2 text-indigo-600 dark:text-indigo-400">{log.field}</td>
                            <td className="p-2 truncate max-w-[120px] text-neutral-450">{log.oldValue}</td>
                            <td className="p-2 font-bold text-neutral-900 dark:text-white truncate max-w-[150px]">{log.newValue}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-stone-400 italic">
                            Hech qanday tahrir jurnali topilmadi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Global Date Changer & Statistics Reset */}
            {activeAdminTab === 'settings' && (
              <div className="text-xs space-y-6">
                
                {/* 1. Add New Operator Section */}
                <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs">
                  <h3 className="text-xs font-bold text-neutral-850 dark:text-neutral-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    👥 Yangi Operator Qo'shish
                  </h3>
                  <p className="text-neutral-500 mb-3 font-semibold leading-relaxed">
                    Tizimga yangi operator xodimni qo'shish. Yangi operator dastlabki paroli '12345' bilan yaratiladi.
                  </p>
                  <form onSubmit={handleAddNewOperatorSubmit} className="flex flex-col sm:flex-row sm:items-center gap-2.5 max-w-md">
                    <input
                      type="text"
                      required
                      placeholder="Operator Ism Familiyasi..."
                      className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 rounded-md border border-neutral-300 dark:border-neutral-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-neutral-100"
                      value={newOpNameInput}
                      onChange={(e) => setNewOpNameInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-xs transition-all flex items-center gap-1 shadow-sm shrink-0 justify-center cursor-pointer"
                    >
                      Qo'shish ➕
                    </button>
                  </form>
                </div>

                {/* 1.5 Firestore Import Section */}
                <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs">
                  <h3 className="text-xs font-bold text-neutral-850 dark:text-neutral-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    ☁️ Firestore'dan Import Qilish
                  </h3>
                  <p className="text-neutral-500 mb-3 font-semibold leading-relaxed">
                    Tizim hozir barcha ma'lumotlarni brauzer xotirasida (localStorage) saqlaydi. Ushbu tugma Firestore bulutidagi operatorlar bazasini bir martalik yuklab, lokal bazani almashtiradi.
                  </p>
                  <button
                    onClick={handleImportFromFirestore}
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-md text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    ☁️ Firestore'dan Yuklash
                  </button>
                </div>

                {/* 2. Bulk Date Changer Section */}
                <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs">
                  <h3 className="text-xs font-bold text-neutral-850 dark:text-neutral-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    📅 Sanalarni Ommaviy O'zgartirish (Bulk Date Changer)
                  </h3>
                  <p className="text-neutral-500 mb-3 font-semibold leading-relaxed">
                    Sana boshqaruv tizimi: Ushbu funksiya barcha operatorlarning jadvallaridagi barcha mFY/maktab sanalarini bitta klik bilan bir vaqtda siz tanlagan yangi kunga o'zgartiradi.
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 max-w-md">
                    <div className="relative flex-1">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                      <input
                        type="date"
                        className="w-full pl-9 pr-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 rounded-md border border-neutral-300 dark:border-neutral-700 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-neutral-100"
                        value={convertToDateInputValue(bulkSanaInput)}
                        onChange={(e) => {
                          const converted = convertFromDateInputValue(e.target.value);
                          if (converted) setBulkSanaInput(converted);
                        }}
                      />
                    </div>
                    
                    <button
                      onClick={handleBulkUpdateDate}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md text-xs transition-all flex items-center gap-1 shadow-sm shrink-0 justify-center cursor-pointer"
                    >
                      Barchasini Yangilash
                    </button>
                  </div>

                  <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono flex items-center gap-1 mt-2 bg-neutral-50 dark:bg-neutral-900/40 p-2 rounded border border-neutral-150 dark:border-neutral-800/60 max-w-md animate-fade-in">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Baza uchun saqlanadigan format: <strong className="text-neutral-750 dark:text-neutral-250 font-black">{bulkSanaInput}</strong>
                  </div>
                </div>

                {/* 3. Danger Zone — Deletion Sections */}
                <div className="p-4 rounded-lg border border-rose-200 dark:border-rose-950/30 bg-rose-50/10 dark:bg-rose-950/5 shadow-xs space-y-4">
                  <h3 className="text-xs font-black text-rose-600 dark:text-rose-450 uppercase tracking-widest flex items-center gap-1.5 border-b border-rose-200/40 pb-2">
                    🚨 XAVFLI ZONA — MA'LUMOTLARNI O'CHIRISH BO'LIMLARI (Danger Zone)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Section 3.1: Delete Database Records (Progress) */}
                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-neutral-800 dark:text-white mb-1 flex items-center gap-1">
                          🟢 Baza Progressini Tozalash
                        </h4>
                        <p className="text-[10px] text-neutral-500 leading-relaxed">
                          Operatorlarning barcha mijozlar bo'yicha kiritgan natijalari (Ko'tarmadi, O'chirilgan, Xato raqam va h.k.) va izohlarini tozalab, kutilayotgan ("Kutilmoqda") holatiga qaytaradi. <strong>Mijozlar o'chmaydi!</strong>
                        </p>
                      </div>
                      <button
                        onClick={handleClearAllProgress}
                        className="w-full mt-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-all shadow-xs"
                      >
                        Progressni Tozalash
                      </button>
                    </div>

                    {/* Section 3.2: Delete Chat Messages */}
                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-neutral-800 dark:text-white mb-1 flex items-center gap-1">
                          💬 Chat Xabarlarini O'chirish
                        </h4>
                        <p className="text-[10px] text-neutral-500 leading-relaxed">
                          Tizimning tezkor chatidagi barcha jo'natilgan xabarlarni va e'lonlarni Firestore ma'lumotlar bazasidan butunlay o'chirib tashlaydi.
                        </p>
                      </div>
                      <button
                        onClick={handleClearChatMessages}
                        className="w-full mt-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-all shadow-xs"
                      >
                        Chatni O'chirish
                      </button>
                    </div>

                    {/* Section 3.3: Delete Main Data / School Records */}
                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-neutral-800 dark:text-white mb-1 flex items-center gap-1">
                          🗑️ Asosiy Maktab Ma'lumotlarini O'chirish
                        </h4>
                        <p className="text-[10px] text-neutral-500 leading-relaxed">
                          Barcha operatorlarga biriktirilgan barcha maktab/muassasa jadvallarini butunlay o'chiradi. Operatorlarning jadvallari bo'shab qoladi.
                        </p>
                      </div>
                      <button
                        onClick={handleClearAllSchoolRecords}
                        className="w-full mt-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-all shadow-xs"
                      >
                        Barcha Maktablarni O'chirish
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Operator management / Rename list */}
            {activeAdminTab === 'operators_list' && (
              <div className="text-xs space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-2">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-850 dark:text-neutral-100 uppercase tracking-wider">
                      👥 Operatorlar Boshqaruvi va Ismlarni O'zgartirish (Rename)
                    </h3>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Operatorlarning ism va familiyalarini to'g'ridan-to'g'ri tahrirlashingiz, yangi operator qo'shish va o'chirishingiz mumkin</p>
                  </div>
                  <button
                    onClick={() => {
                      const val = prompt("Yangi qo'shiladigan operator ism familiyasini kiriting:");
                      if (val && val.trim()) {
                        handleAddNewOperator(val.trim());
                      }
                    }}
                    className="px-3 py-1.5 bg-[#00a372] hover:bg-[#008c61] text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    Yangi Operator Qo'shish ➕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
                  {operators.map((op, idx) => {
                    return (
                      <div key={op.id} className="p-3 rounded-lg border border-neutral-250 dark:border-neutral-850 bg-neutral-50 dark:bg-neutral-900 flex items-start justify-between gap-3 shadow-xs animate-fade-in-up">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <label className="text-[9px] text-neutral-450 font-mono block mb-1">ID: {op.id} | Jami maktablari: {op.records.length} ta</label>
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
                              className="w-full px-2.5 py-1.2 bg-white dark:bg-neutral-950 border border-neutral-350 dark:border-neutral-800 rounded text-xs font-semibold text-neutral-850 dark:text-neutral-150 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                              placeholder="Operator ismi"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] text-neutral-450 font-mono block mb-1">Kirish paroli:</label>
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
                              className="w-full px-2.5 py-1.2 bg-white dark:bg-neutral-950 border border-neutral-350 dark:border-neutral-800 rounded text-xs font-mono text-neutral-850 dark:text-neutral-150 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                              placeholder="Parol"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0 mt-4">
                          <button
                            onClick={() => {
                              const val = prompt("Operatorning yangi ism familiyasini kiriting:", op.name);
                              if (val && val.trim()) {
                                handleRenameOperator(op.id, val.trim());
                                triggerNotification("Operator ismi tahrirlandi!");
                              }
                            }}
                            className="p-1.5 bg-sky-55 dark:bg-neutral-800 text-sky-650 dark:text-sky-350 rounded hover:bg-sky-100 dark:hover:bg-neutral-750 transition-colors"
                            title="Ismni tahrirlash"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              if (idx > 0) handleReorderOperators(idx, idx - 1);
                            }}
                            disabled={idx === 0}
                            className="p-1.5 bg-neutral-105 dark:bg-neutral-800 text-neutral-500 rounded disabled:opacity-35 cursor-pointer"
                            title="Yuqoriga"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => {
                              if (idx < operators.length - 1) handleReorderOperators(idx, idx + 1);
                            }}
                            disabled={idx === operators.length - 1}
                            className="p-1.5 bg-neutral-105 dark:bg-neutral-800 text-neutral-500 rounded disabled:opacity-35 cursor-pointer"
                            title="Pastga"
                          >
                            ▼
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Haqiqatan ham operator ${op.name}ni o'chirmoqchimisiz?`)) {
                                handleDeleteOperator(op.id);
                              }
                            }}
                            className="p-1.5 bg-rose-55 dark:bg-neutral-800 text-rose-650 dark:text-rose-450 rounded hover:bg-rose-100 dark:hover:bg-neutral-750 transition-colors"
                            title="O'chirish"
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Telegram Configurations */}
            {activeAdminTab === 'tg_settings' && (
              <div className="text-xs space-y-4">
                <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-2">
                  <h3 className="text-xs font-bold text-neutral-850 dark:text-neutral-100 uppercase tracking-wider">
                    💬 Telegram Bot va Kanallar Integratsiyasi
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Operatorlar maktab ma'lumotlarini o'zgartirganda yoki yangi hamkorlik linklari yaratilganda Telegram kanal va admin tizimiga bildirishnoma yuboruvchi sozlamalar
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Form section */}
                  <div className="lg:col-span-2 space-y-4 bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-neutral-450 dark:text-neutral-400 block mb-1">
                          🤖 Telegram Bot Token
                        </label>
                        <input
                          type="text"
                          value={tgBotToken}
                          onChange={(e) => setTgBotToken(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-850 rounded text-xs font-mono select-all focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-neutral-900 dark:text-neutral-100"
                          placeholder="Masalan: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                        />
                        <p className="text-[9px] text-neutral-400 mt-0.5">@BotFather orqali yaratilgan botning maxfiy token kaliti.</p>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-neutral-450 dark:text-neutral-400 block mb-1">
                          📊 Kanal / Guruh ID (Chat ID)
                        </label>
                        <input
                          type="text"
                          value={tgChannelId}
                          onChange={(e) => setTgChannelId(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-850 rounded text-xs font-mono select-all focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-neutral-900 dark:text-neutral-100"
                          placeholder="Masalan: -100123456789 (Kanal ID'si doim -100 bilan boshlanadi)"
                        />
                        <p className="text-[9px] text-neutral-400 mt-0.5">Ish faoliyatini kuzatib borish uchun guruh yoki jamoaviy kanal ID manzili.</p>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-neutral-450 dark:text-neutral-400 block mb-1">
                          👑 Admin Chat ID (Hamkorlik linklar uchun alohida ogohlantirish)
                        </label>
                        <input
                          type="text"
                          value={tgAdminChatId}
                          onChange={(e) => setTgAdminChatId(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-850 rounded text-xs font-mono select-all focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-neutral-900 dark:text-neutral-100"
                          placeholder="Masalan: 987654321"
                        />
                        <p className="text-[9px] text-neutral-400 mt-0.5">@qabul.bui.uz havolasi yaratilganda shoshilinch dilerlik xabari yuborilishi kerak bo'lgan boshqaruvchi ID.</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                      <button
                        onClick={() => handleSaveTelegramConfigs(tgBotToken, tgChannelId, tgAdminChatId)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        Sozlamalarni Saqlash 💾
                      </button>

                      <button
                        onClick={() => handleTestTelegramDelivery(tgBotToken, tgChannelId, tgAdminChatId)}
                        disabled={tgTestingState === 'sending'}
                        className={`px-4 py-2 border rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                          tgTestingState === 'sending' 
                            ? 'bg-neutral-150 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-450 animate-pulse'
                            : 'bg-white hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {tgTestingState === 'sending' ? (
                          <>Yuborilmoqda... ⏳</>
                        ) : (
                          <>Test Xabar Yuborish ✉️</>
                        )}
                      </button>
                    </div>

                    {/* Live Test Feedback alert screen */}
                    {tgTestingState !== 'idle' && (
                      <div className={`p-3 rounded-md text-xs border ${
                        tgTestingState === 'success' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                          : tgTestingState === 'error'
                          ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                          : 'bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 text-neutral-750 dark:text-neutral-300'
                      }`}>
                        {tgTestingState === 'success' && (
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">✓ Muvaffaqiyatli:</span>
                            <p>Ulanish zo'r! Telegram monitoring tekshirildi va test xabari muvaffaqiyatli yetkazildi.</p>
                          </div>
                        )}
                        {tgTestingState === 'error' && (
                          <div className="flex items-start gap-2">
                            <span className="text-rose-500 font-bold">⚠ Xato:</span>
                            <p>{tgTestErrorMessage || "Bot kiritilgan chatga ruxsat ololmagan bo'lishi mumkin. Botni ushbu chatga a'zo kilib, Admin ruxsatini bering!"}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Informational help panel */}
                  <div className="space-y-3 bg-neutral-900 border border-neutral-800 p-4 rounded-lg text-neutral-300 self-start">
                    <h4 className="font-extrabold text-neutral-100 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                      💡 Yo'riqnoma va Maslahat
                    </h4>
                    <ol className="space-y-2 text-[10px] leading-relaxed list-decimal list-inside text-neutral-400">
                      <li>
                        <b>Bot yaratish:</b> Telegramda <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">@BotFather</a> bepul boti orqali yangi bot yarating va uning API Tokenini kiriting.
                      </li>
                      <li>
                        <b>Kanalga a'zo qilish:</b> Tanlangan botni monitoring kanaliga yoki guruhiga <b>Adminstrator (Administrator)</b> etib qo'shing va xabar yozish (Post Messages) huquqini bering.
                      </li>
                      <li>
                        <b>ID aniqlash:</b> Guruh yoki kanal ID raqamini aniqlash uchun botni qo'shib, <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">@userinfobot</a> yoki boshqa monitoring botlaridan foydalanishingiz mumkin.
                      </li>
                      <li>
                        <b>Xavfsizlik:</b> Sozlamalar brauzeringizning <code className="bg-neutral-800 text-emerald-400 px-1 rounded font-mono">localStorage</code> xotirasida mutlaqo xavfsiz saqlanadi.
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Analytics */}
            {activeAdminTab === 'analytics' && (
              <div className="space-y-4">
                <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-2">
                  <h3 className="text-xs font-bold text-neutral-850 dark:text-neutral-100 uppercase tracking-wider">
                    📊 Tahliliy Diagrammalar va Grafik ko'rinishlar
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Operatorlar samaradorligi va tumanlar bo'yicha qamrov hisobotlari
                  </p>
                </div>
                <AnalyticsPanel operators={operators} />
              </div>
            )}

            {/* TAB CONTENT: Excel Import */}
            {activeAdminTab === 'excel_import' && (
              <div className="space-y-4">
                <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-2">
                  <h3 className="text-xs font-bold text-neutral-850 dark:text-neutral-100 uppercase tracking-wider">
                    📂 Excel/CSV Fayl orqali Yangi Maktablar Yuklash
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Faylni tanlab, kerakli ustunlarni tizim maydonlariga moslang
                  </p>
                </div>
                <ExcelImport operators={operators} onImportRecords={handleImportRecords} />
              </div>
            )}

          </div>
        )}

        {/* Global Progress indicator */}
        {currentView === 'operator' && showGlobalStats && (
          <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row items-center gap-6 transition-colors">
            <div className="shrink-0 text-center md:text-left">
              <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-0.5">Umumiy ko'rsatkichlar</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {totalProgressPercentage}% Bajarildi
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                {totalCompleted} / {totalSchools} jami maktablardan bog'lanildi
              </p>
            </div>
            
            <div className="flex-1 w-full bg-neutral-100 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-linear-to-r from-emerald-500 to-teal-500 transition-all duration-500 rounded-full" 
                style={{ width: `${totalProgressPercentage}%` }}
              ></div>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-neutral-400 font-medium">Faol kadrlar</p>
                <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{operators.length} nafar operator</p>
              </div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-full">
                <UserCheck size={18} className="text-emerald-600" />
              </div>
            </div>
          </div>
        )}

        {/* Global Search Results overlay */}
        {currentView === 'operator' && globalSearch.trim() !== '' && (
          <div className="bg-amber-50/75 dark:bg-neutral-900 border border-amber-200 dark:border-neutral-800 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                <Search size={14} />
                Butun bazadan olingan natijalar: {globalResults.length} ta yozuv topildi
              </h3>
              <button 
                onClick={() => setGlobalSearch('')} 
                className="text-xs text-neutral-500 hover:text-neutral-850 font-bold"
              >
                Yopish [x]
              </button>
            </div>
            {globalResults.length > 0 ? (
              <div className="max-h-60 overflow-y-auto divide-y divide-amber-100 dark:divide-neutral-800">
                {globalResults.map(({ operatorName, opId, record }) => (
                  <div key={record.id} className="py-2 flex items-center justify-between text-xs hover:bg-amber-150/40 dark:hover:bg-neutral-800/50 px-2 rounded">
                    <div>
                      <span className="font-bold text-emerald-800 dark:text-emerald-400 mr-2">[{operatorName}]</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-200">{record.fish} ({record.viloyat})</span>
                      <span className="text-neutral-450 mx-2">|</span>
                      <span className="text-neutral-500">{record.tugulganSana}</span>
                      <span className="text-neutral-450 mx-2">|</span>
                      <span className="font-mono text-neutral-600 dark:text-neutral-400">{record.tel}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedOpId(opId);
                        setGlobalSearch('');
                      }}
                      className="text-[10px] bg-white dark:bg-neutral-800 hover:bg-neutral-200 border border-neutral-350 dark:border-neutral-700 px-2 py-1 rounded text-neutral-700 dark:text-neutral-300 font-semibold transition-colors animate-pulse"
                    >
                      Sahifaga o'tish
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 p-2">Kiritilgan kalit so'z bo'yicha hech qanday mijoz topilmadi.</p>
            )}
          </div>
        )}

        {/* Sheet stats summary widget */}
        {currentView === 'operator' && activeOperator && (
          <div className="bg-stone-50 dark:bg-neutral-900/50 p-2.5 rounded-lg border border-neutral-250 dark:border-neutral-800/50 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-neutral-700 dark:text-neutral-300">
                Tanlangan operator: <strong className="text-neutral-900 dark:text-white font-black text-sm">{activeOperator.name}</strong> va uning ish binosi
              </p>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* View Mode Toggle */}
              <div className="bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg flex items-center gap-0.5 border border-neutral-200 dark:border-neutral-700 mr-2">
                <button
                  onClick={() => setOperatorViewMode('table')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${operatorViewMode === 'table' ? 'bg-emerald-600 text-white shadow-3xs' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                >
                  📝 Jadval
                </button>
                <button
                  onClick={() => setOperatorViewMode('charts')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${operatorViewMode === 'charts' ? 'bg-emerald-600 text-white shadow-3xs' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                >
                  📊 Grafik
                </button>
              </div>

              {/* Call center tips informational notice */}
              <div className="text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 font-medium bg-white dark:bg-neutral-850 px-3 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 shadow-3xs">
                <Info size={12} className="text-emerald-500 animate-bounce" />
                Natija va Izoh ustunlarini o'zgartirganingizda ma'lumotlar avtomatik saqlanib qoladi!
              </div>
            </div>
          </div>
        )}


        {/* Selected Operator Stats Cards (8 status cards - full width) */}
        {currentView === 'operator' && activeOperator && operatorViewMode === 'table' && (
          <Stats records={activeOperator.records} operatorName={activeOperator.name} />
        )}

        {/* Main interactive Workbook OperatorTable */}
        {currentView === 'operator' && activeOperator && operatorViewMode === 'table' && (
          <div className="flex-1 min-h-[400px]">
            <OperatorTable
              records={activeOperator.records}
              onUpdateRecord={handleUpdateRecord}
              onDeleteRecord={handleDeleteRecord}
              onAddRecord={handleAddRecord}
              isAdmin={isAdminLoggedIn}
              highlightTerm={globalSearch}
            />
          </div>
        )}

        {/* Selected Operator Analytics Panel */}
        {currentView === 'operator' && activeOperator && operatorViewMode === 'charts' && (
          <div className="flex-1 min-h-[400px]">
            <AnalyticsPanel operators={operators} />
          </div>
        )}

      </main>

      {/* Sheet Tab Bar Footer - mimicking Excel / Google Sheets workbook tab tray */}
      <footer className="bg-neutral-950 border-t border-neutral-800 p-0 text-white select-none sticky bottom-0 z-40 shrink-0 relative">
        {/* Collapsed upward menu portal - rendered at footer-level to prevent overflow clipping */}
        <AnimatePresence>
          {showDropup && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-15 left-4 w-80 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl p-3 z-50 flex flex-col gap-2 max-h-[420px] overflow-hidden text-neutral-100"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-1 shrink-0">
                <span className="text-[11px] font-black text-emerald-500 tracking-wider uppercase flex items-center gap-1.5 font-mono">
                  <Layers3 size={11} className="animate-bounce" />
                  Operatorlar Ro'yxati
                </span>
                <span className="text-[9px] bg-neutral-800 font-mono text-neutral-400 rounded px-1.5 py-0.5 border border-neutral-700/50">
                  {operators.length} Operatorlar
                </span>
              </div>

              {/* Drag instruction if admin */}
              {isAdminLoggedIn && (
                <p className="text-[9px] text-neutral-500 leading-normal select-none italic border-b border-neutral-800/40 pb-1 shrink-0">
                  * Tartib o'zgartirish uchun ushlab torting (drag) yoki o'q tugmalaridan foydalaning.
                </p>
              )}

              <div className="space-y-1 overflow-y-auto max-h-64 scrollbar-none flex-1">
                {visibleOperators.map((op, idx) => {
                  const isActive = op.id === selectedOpId;
                  const hasDraftProgress = op.records.filter(r => r.natija).length;
                  return (
                    <div
                      key={op.id}
                      draggable={isAdminLoggedIn}
                      onDragStart={(e) => {
                        if (isAdminLoggedIn) {
                          e.dataTransfer.setData("text/plain", op.id);
                        }
                      }}
                      onDragOver={(e) => {
                        if (isAdminLoggedIn) {
                          e.preventDefault();
                        }
                      }}
                      onDrop={(e) => {
                        if (isAdminLoggedIn) {
                          const draggedId = e.dataTransfer.getData("text/plain");
                          handleDropOperator(draggedId, op.id);
                        }
                      }}
                      className={`group flex items-center justify-between p-1.5 rounded-md transition-all border cursor-pointer ${
                        isActive 
                          ? 'bg-neutral-800/80 border-emerald-500/30' 
                          : 'bg-neutral-850/30 hover:bg-neutral-800 border-transparent hover:border-neutral-750'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setSelectedOpId(op.id);
                          setShowDropup(false);
                          triggerNotification(`${op.name} jadvallari yuklandi.`);
                        }}
                        className="flex-1 text-left text-xs font-semibold flex items-center gap-2 truncate text-neutral-200 group-hover:text-white cursor-pointer"
                      >
                        {isAdminLoggedIn ? (
                          <span className="text-neutral-500 group-hover:text-neutral-300 font-black tracking-tight cursor-grab active:cursor-grabbing px-1 font-mono text-[9px]">
                            ☰
                          </span>
                        ) : (
                          <BookOpen size={11} className={isActive ? "text-[#00a372]" : "text-neutral-500"} />
                        )}
                        <span className="truncate">{op.name}</span>
                        {hasDraftProgress > 0 && (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-semibold rounded px-1.5 py-0.2 border border-emerald-500/10 font-mono">
                            {hasDraftProgress}/40
                          </span>
                        )}
                      </button>

                      {/* Administrative action inline suite inside Dropup */}
                      {isAdminLoggedIn && (
                        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                          {/* Up/Down arrow controllers */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderOperators(idx, idx - 1);
                            }}
                            disabled={idx === 0}
                            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-750 rounded disabled:opacity-35 cursor-pointer"
                            title="Yuqoriga ko'chirish"
                          >
                            ▲
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderOperators(idx, idx + 1);
                            }}
                            disabled={idx === operators.length - 1}
                            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-750 rounded disabled:opacity-35 cursor-pointer"
                            title="Pastga ko'chirish"
                          >
                            ▼
                          </button>

                          {/* Edit Operator Name button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const val = prompt("Operatorning yangi ism familiyasini kiriting:", op.name);
                              if (val && val.trim()) {
                                handleRenameOperator(op.id, val.trim());
                              }
                            }}
                            className="p-1 text-sky-450 hover:text-sky-300 hover:bg-neutral-750 rounded cursor-pointer text-[10px]"
                            title="Tahrirlash"
                          >
                            ✏️
                          </button>

                          {/* Delete Operator Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOperator(op.id);
                            }}
                            className="p-1 text-rose-500 hover:text-rose-450 hover:bg-neutral-750 rounded cursor-pointer text-[10px]"
                            title="O'chirish"
                          >
                            ❌
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Admin only Footer Create trigger inside dropup */}
              {isAdminLoggedIn && (
                <div className="border-t border-neutral-800 pt-2 shrink-0">
                  <button
                    onClick={() => {
                      const val = prompt("Yangi qo'shiladigan operator ism familiyasini kiriting:");
                      if (val && val.trim()) {
                        handleAddNewOperator(val.trim());
                      }
                    }}
                    className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <PlusCircle size={11} />
                    Yangi Operator Qo'shish
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between">
          
          {/* Scrollable Tabs row matching image.png */}
          <div className="flex overflow-x-auto scrollbar-none divide-x divide-neutral-800">
            {/* Sheets list icon with Toggle trigger */}
            <div className="relative flex items-center shrink-0">
              <button
                onClick={() => setShowDropup(!showDropup)}
                className="p-3.5 bg-neutral-950 flex items-center justify-center text-neutral-400 hover:text-white shrink-0 border-r border-neutral-800 cursor-pointer h-full transition-colors"
                title="Barcha operatorlar ro'yxati (Dropup)"
              >
                <Layers 
                  size={14} 
                  className={`text-stone-300 transition-transform duration-300 ${showDropup ? 'rotate-180 text-emerald-500 font-bold' : ''}`} 
                />
              </button>
            </div>

            {visibleOperators.map((op) => {
              const isActive = op.id === selectedOpId;
              const hasDraftProgress = op.records.filter(r => r.natija).length;

              return (
                <button
                  key={op.id}
                  onClick={() => {
                    setSelectedOpId(op.id);
                    triggerNotification(`${op.name} jadvali ochildi.`);
                  }}
                  className={`px-4 py-3.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 shrink-0 ${
                    isActive 
                      ? 'bg-neutral-900 text-[#00a372] border-t-[3px] border-t-[#00a372]' 
                      : 'bg-[#181818] text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
                  id={`tab-${op.id}`}
                >
                  <BookOpen size={12} className={isActive ? "text-[#00a372]" : "text-neutral-500"} />
                  {op.name}
                  {hasDraftProgress > 0 && (
                    <span className="text-[9px] bg-emerald-600/30 text-emerald-400 rounded-full px-1.5 py-0.5 border border-emerald-500/20">
                      {hasDraftProgress}/40
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Real Live Running Asia/Tashkent clock ticking dynamically down to minute and seconds */}
          <div className="px-4 py-3 bg-neutral-950 text-neutral-300 text-[10px] font-mono shrink-0 flex items-center justify-between sm:justify-end gap-2.5 border-t sm:border-t-0 border-neutral-800">
            <span className="text-[#00a372] font-extrabold font-mono">
              {tashkentTime || 'Yuklanmoqda...'}
            </span>
            <span className="text-neutral-600">|</span>
            <span className="text-neutral-300 font-bold font-mono">{tashkentDate || '02.06.2026'}</span>
          </div>

        </div>
      </footer>

      {/* Secret Route Login Modal wrapper */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-sm w-full shadow-2xl relative">
            <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-1 mb-2">
              <Lock size={16} className="text-red-500" />
              Tizim Administratori Kirishi
            </h3>
            <p className="text-[11px] text-neutral-400 mb-4">
              Ushbu qism faqat idora rahbarlari va uni boshqaruvchi bosh administratorlar uchun mo'ljallangan. Iltimos parolni kiriting:
            </p>

            <form onSubmit={handleAdminVerify} className="space-y-3.5">
              <div>
                <input
                  type="password"
                  placeholder="Xavfsizlik paroli..."
                  className="w-full p-2 text-xs bg-neutral-50 dark:bg-neutral-850 text-neutral-800 dark:text-neutral-100 rounded-lg border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminLoginModal(false);
                    setAdminPasswordInput('');
                    window.location.hash = ''; // reset hash route
                  }}
                  className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 rounded font-semibold text-neutral-700 dark:text-neutral-300"
                >
                  Yopish
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-xs flex items-center gap-1"
                >
                  Tasdiqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Chat component */}
      {(() => {
        const opId = currentView === 'admin' ? 'ADMIN' : selectedOpId;
        const currentOperator = operators.find(op => op.id === selectedOpId);
        const opName = currentView === 'admin' ? 'Tizim Ma\'muri' : (currentOperator ? currentOperator.name : 'Operator');
        return (
          <LiveChat 
            operatorId={opId} 
            operatorName={opName} 
            isAdmin={currentView === 'admin'} 
          />
        );
      })()}

    </div>
  );
}
