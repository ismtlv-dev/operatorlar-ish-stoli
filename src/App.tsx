/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { initialOperators } from './data';
import { Operator, SchoolRecord, EditLog, CallHistoryEntry } from './types';
import { Stats } from './components/Stats';
import { OperatorTable } from './components/OperatorTable';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { ExcelImport } from './components/ExcelImport';
import { AdminDashboard } from './components/AdminDashboard';
import { LiveChat } from './components/LiveChat';
import { CallHistory } from './components/CallHistory';
import { KanbanBoard } from './components/KanbanBoard';
import { SchedulesPanel } from './components/SchedulesPanel';
import { PricesPanel } from './components/PricesPanel';
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
  AlertTriangle,
  Users,
  Activity,
  Trophy,
  ArrowUpRight,
  Trash2,
  Edit2,
  Send,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  FolderInput
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

// Formats operator name to Surname + First Name without patronymic (otchestvo)
const formatOperatorName = (name: string): string => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name;
  return parts.slice(0, 2).join(' ');
};

// Dispatch asynchronous logging messages to Telegram Channel & Admin Alert Chat IDs
const sendTelegramNotification = async (
  log: EditLog,
  schoolNo: number = 0,
  tel: string = '',
  viloyat: string = '',
  record?: SchoolRecord
) => {
  const token = localStorage.getItem('school_operators_tg_token') || (import.meta as any).env.VITE_TELEGRAM_BOT_TOKEN || '';
  const channelId = localStorage.getItem('school_operators_tg_channel') || (import.meta as any).env.VITE_TELEGRAM_CHAT_ID || '';
  const adminId = localStorage.getItem('school_operators_tg_admin') || (import.meta as any).env.VITE_TELEGRAM_ADMIN_CHAT_ID || '';

  if (!token) return;

  const hashtag = nameToHashtag(log.operatorName);
  const esc = (text: string) => (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Format Tashkent time in "YYYY-MM-DD HH:mm:ss" style
  const formatTashkentTime = (tsStr: string) => {
    if (!tsStr) return '';
    const parts = tsStr.split(' ');
    if (parts.length === 2) {
      const datePart = parts[0];
      const timePart = parts[1];
      const dateSubparts = datePart.split('.');
      if (dateSubparts.length === 3) {
        return `${dateSubparts[2]}-${dateSubparts[1]}-${dateSubparts[0]} ${timePart}`;
      }
    }
    return tsStr;
  };

  const formattedTime = formatTashkentTime(log.timestamp);
  const lowerNewVal = String(log.newValue || '').toLowerCase();
  const hasSpecialLink = lowerNewVal.includes('qabul.bui.uz');

  const isOqiydi = lowerNewVal === "o'qiydi" || lowerNewVal === "oqiydi" || lowerNewVal.includes("o'qiydi") || lowerNewVal.includes("oqiydi");
  const isShartnoma = lowerNewVal === "shartnoma berildi" || lowerNewVal.includes("shartnoma") || lowerNewVal.includes("tuzild") || lowerNewVal.includes("shartnomani tuzdi");

  const isSpecialStatus = (log.field === 'Natija (Holat)' || log.field === 'natija') && (isOqiydi || isShartnoma);

  if (isSpecialStatus) {
    const statusLabel = isShartnoma ? 'shartnoma tuzildi' : "o'qiydi";
    const actionPhrase = isShartnoma ? 'shartnomani tuzdi' : "o'qiydi deb belgiladi";
    
    const opNameStr = esc(formatOperatorName(log.operatorName));
    const schoolNameStr = esc(log.schoolName);
    const viloyatStr = viloyat ? ` (${esc(viloyat)})` : '';
    
    // Details of the student (bolaning barcha ma'lumotlari)
    const rawTel1 = record ? record.tel : tel;
    const rawTel2 = record ? record.telQoshimcha : '';
    const birthDate = record && record.tugulganSana ? esc(record.tugulganSana) : 'Kiritilmagan';
    const comment = record && record.izoh ? esc(record.izoh) : (log.field === 'Izoh' || log.field === 'izoh' ? esc(log.newValue) : 'Kiritilmagan');

    const cleanNumber = (numStr: string) => {
      if (!numStr) return '';
      const digits = numStr.replace(/\D/g, '');
      if (digits.startsWith('998') || digits.length > 9) return '+' + digits;
      if (digits.length === 9) return '+998' + digits;
      return '+' + digits;
    };

    const displayTel1 = rawTel1 ? cleanNumber(rawTel1) : 'Kiritilmagan';
    const displayTel2 = rawTel2 ? cleanNumber(rawTel2) : 'Kiritilmagan';

    const specialMessage = `📝 <b>TIZIM ISH JURNALI - (${statusLabel})</b>\n\n` +
      `👤 <b>Operator:</b> ${opNameStr} (${hashtag}) ${actionPhrase}\n` +
      `🏫 <b>Maktab:</b> - ${schoolNameStr}${viloyatStr}\n\n` +
      `📌 <b>O'quvchi ma'lumotlari:</b>\n` +
      `👤 <b>F.I.Sh:</b> ${schoolNameStr}\n` +
      `📞 <b>Telefon:</b> ${displayTel1}\n` +
      `📱 <b>Qo'shimcha tel:</b> ${displayTel2}\n` +
      `🎂 <b>Tug'ilgan sana:</b> ${birthDate}\n` +
      `💬 <b>Izoh:</b> ${comment}\n\n` +
      `⏰ <b>Vaqti:</b> ${formattedTime}`;

    if (channelId) {
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: channelId,
            text: specialMessage,
            parse_mode: 'HTML'
          })
        });
      } catch (e) {
        console.warn("Telegram special channel alert failed:", e);
      }
    }

    if (adminId) {
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminId,
            text: specialMessage,
            parse_mode: 'HTML'
          })
        });
      } catch (e) {
        console.warn("Telegram special admin alert failed:", e);
      }
    }
  } else {
    // 1. Regular log sending to Telegram Channel
    if (channelId) {
      const opNameStr = esc(formatOperatorName(log.operatorName));
      const schoolNameStr = esc(log.schoolName);
      const fieldStr = esc(log.field);
      const oldValStr = esc(log.oldValue);
      const newValStr = esc(log.newValue);
      const viloyatStr = viloyat ? ` (${esc(viloyat)})` : '';

      const regularMessage = `📝 <b>TIZIM ISH JURNALI</b>\n\n` +
        `👤 <b>Operator:</b> ${opNameStr} (${hashtag})\n` +
        `🏫 <b>Maktab:</b> - ${schoolNameStr}${viloyatStr}\n` +
        `🔧 <b>O'zgarish:</b> ${fieldStr}\n` +
        `🔹 <b>Eski qiymat:</b> ${oldValStr}\n` +
        `🔸 <b>Yangi qiymat:</b> ${newValStr}\n` +
        `⏰ <b>Vaqti:</b> ${formattedTime}`;

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

    // 2. Alert sending to Admin if newValue/comments contain "qabul.bui.uz" (Legacy fallback filter)
    if (hasSpecialLink && adminId) {
      const opEscStr = esc(formatOperatorName(log.operatorName));
      const schoolEscStr = schoolNo ? `<b>${schoolNo}-mijoz</b>` : `<b>${esc(log.schoolName)}</b>`;
      const viloyatEscStr = viloyat ? ` (${esc(viloyat)})` : '';
      const valEscStr = esc(log.newValue);
      const telEscStr = tel ? esc(tel) : 'Kiritilmagan';

      const adminMessage = `🚀 <b>YANGI HAMKORLIK LINKI!</b>\n\n` +
        `👤 <b>Operator:</b> ${opEscStr} (${hashtag})\n` +
        `🏫 <b>Maktab:</b> - ${schoolEscStr}${viloyatEscStr}\n` +
        `📞 <b>Telefoni:</b> ${telEscStr}\n\n` +
        `<b>Ushbu operator (${opEscStr}) mazkur mijozga hamkorlik linkini yaratib berdi:</b>\n\n` +
        `🔗 <code>${valEscStr}</code>\n\n` +
        `⏰ <b>Vaqt:</b> ${formattedTime}`;

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

  // Call history state for individual calls across operators
  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>([]);

  // Date controller input
  const [bulkSanaInput, setBulkSanaInput] = useState('04.06.2026');

  // Bulk data paste input for refilling
  const [bulkDataInput, setBulkDataInput] = useState('');
  const [bulkTargetOpId, setBulkTargetOpId] = useState('1');

  // Search filter inside admin logs
  const [adminLogSearch, setAdminLogSearch] = useState('');

  // Saving indicator states
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  useEffect(() => {
    if (savingState === 'saved') {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('uz-UZ', {
        timeZone: 'Asia/Tashkent',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      setLastSavedTime(formatter.format(now));
    }
  }, [savingState]);

  const savingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastModifiedRef = useRef<number>(0);

  // Navigation & Dropup view states
  const [currentView, setCurrentView] = useState<'operator' | 'admin'>('operator');
  const [showDropup, setShowDropup] = useState(false);
  const [operatorViewMode, setOperatorViewMode] = useState<'table' | 'kanban' | 'charts' | 'history' | 'callbacks' | 'prices'>('table');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Call timer stopwatch states
  const [activeCallPhone, setActiveCallPhone] = useState<string | null>(null);
  const [activeCallClientName, setActiveCallClientName] = useState<string>('');
  const [callTimerSeconds, setCallTimerSeconds] = useState<number>(0);
  const [isCallTimerRunning, setIsCallTimerRunning] = useState<boolean>(false);

  // Callback alarm notifier states
  const [activeReminderPopup, setActiveReminderPopup] = useState<SchoolRecord | null>(null);
  const [acknowledgedReminderIds, setAcknowledgedReminderIds] = useState<Set<string>>(new Set());

  // Function to synthesize custom chimes
  const playReminderAudioChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch (e) {
      console.warn("Audio warning blocked", e);
    }
  };

  // Function to play Call Timer limit alarm beep
  const playTimerWarningBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880.00, ctx.currentTime); // A5 High Warning beep
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  // Change Password Modal States
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');

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
  const LS_CALL_HISTORY_KEY = 'school_operators_call_history';

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

  // Dastlabki yuklash tartibi: Neon PostgreSQL Server API -> localStorage -> initialOperators
  useEffect(() => {
    let cancelled = false;

    // Load from backend API
    const loadFromBackend = async () => {
      try {
        const resOps = await fetch('/api/operators');
        const dataOps = await resOps.json();
        if (dataOps.success && Array.isArray(dataOps.operators) && dataOps.operators.length > 0) {
          if (!cancelled) {
            setOperators(dataOps.operators);
            localStorage.setItem(LS_DATA_KEY, JSON.stringify(dataOps.operators));
          }
        } else {
          throw new Error("Invalid operators response");
        }
      } catch (err) {
        console.warn("Failed to fetch from backend Postgres API, falling back:", err);
        // Fallback to local only for offline/network issues
        const localOps = loadLocalOperators();
        if (localOps && !cancelled) {
          setOperators(localOps);
        } else if (!cancelled) {
          setOperators(initialOperators);
        }
      }
    };

    loadFromBackend();

    // Fetch activity logs
    fetch('/api/logs')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.logs) && !cancelled) {
          setActivityLogs(d.logs);
          localStorage.setItem(LS_LOGS_KEY, JSON.stringify(d.logs));
        } else {
          // fallback to local
          const rawLogs = localStorage.getItem(LS_LOGS_KEY);
          if (rawLogs && !cancelled) {
            try {
              setActivityLogs(JSON.parse(rawLogs));
            } catch (e) {
              console.warn("Failed to parse local logs", e);
            }
          }
        }
      })
      .catch(() => {
        const rawLogs = localStorage.getItem(LS_LOGS_KEY);
        if (rawLogs && !cancelled) {
          try {
            setActivityLogs(JSON.parse(rawLogs));
          } catch (e) {
            console.warn("Failed to parse local logs", e);
          }
        }
      });

    // Fetch call history
    fetch('/api/history')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.history) && !cancelled) {
          setCallHistory(d.history);
          localStorage.setItem(LS_CALL_HISTORY_KEY, JSON.stringify(d.history));
        } else {
          const rawHistory = localStorage.getItem(LS_CALL_HISTORY_KEY);
          if (rawHistory && !cancelled) {
            try {
              setCallHistory(JSON.parse(rawHistory));
            } catch (e) {
              console.warn("Failed to parse local history", e);
            }
          }
        }
      })
      .catch(() => {
        const rawHistory = localStorage.getItem(LS_CALL_HISTORY_KEY);
        if (rawHistory && !cancelled) {
          try {
            setCallHistory(JSON.parse(rawHistory));
          } catch (e) {
            console.warn("Failed to parse local history", e);
          }
        }
      });

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

  // Dynamic Real-time Background Polling of History and Operators
  useEffect(() => {
    let active = true;

    const pollHistory = async () => {
      try {
        const r = await fetch('/api/history');
        const d = await r.json();
        if (active && d.success && Array.isArray(d.history)) {
          setCallHistory(prev => {
            if (JSON.stringify(prev) === JSON.stringify(d.history)) return prev;
            localStorage.setItem(LS_CALL_HISTORY_KEY, JSON.stringify(d.history));
            return d.history;
          });
        }
      } catch (err) {
        console.warn("Background history poll failed:", err);
      }
    };

    const pollOperators = async () => {
      // Skip background polling if there was any local modification in the last 5 seconds to prevent race conditions
      if (lastModifiedRef.current && (Date.now() - lastModifiedRef.current < 5000)) {
        return;
      }

      // Check if user is typing or double clicking to avoid active-state interference
      const isUserEditing = document.activeElement && 
                            (document.activeElement.tagName === 'INPUT' || 
                             document.activeElement.tagName === 'TEXTAREA' ||
                             document.activeElement.hasAttribute('contenteditable'));
      if (isUserEditing) return;

      try {
        const r = await fetch('/api/operators');
        const d = await r.json();
        if (active && d.success && Array.isArray(d.operators)) {
          setOperators(prev => {
            if (JSON.stringify(prev) === JSON.stringify(d.operators)) return prev;
            localStorage.setItem(LS_DATA_KEY, JSON.stringify(d.operators));
            return d.operators;
          });
        }
      } catch (err) {
        console.warn("Background operators poll failed:", err);
      }
    };

    // Intervals
    const histInterval = setInterval(pollHistory, 1500); // Poll history every 1.5s
    const opsInterval = setInterval(pollOperators, 4000); // Poll operators data every 4s

    return () => {
      active = false;
      clearInterval(histInterval);
      clearInterval(opsInterval);
    };
  }, []);

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

  // O'zgarishlarni saqlash — localStorage asosiy xotira + Neon Postgres API
  const saveToLocalStorage = (updated: Operator[], newLogs?: EditLog[], newHistory?: CallHistoryEntry[]) => {
    // 1. Avval React state — UI darhol yangilanadi
    setOperators(updated);
    if (newLogs) {
      setActivityLogs(newLogs);
    }
    if (newHistory) {
      setCallHistory(newHistory);
    }

    setSavingState('saving');
    lastModifiedRef.current = Date.now();
    if (savingTimeoutRef.current) {
      clearTimeout(savingTimeoutRef.current);
    }

    // 2. localStorage'ga yozish
    try {
      localStorage.setItem(LS_DATA_KEY, JSON.stringify(updated));
      if (newLogs) {
        localStorage.setItem(LS_LOGS_KEY, JSON.stringify(newLogs.slice(0, 500)));
      }
      if (newHistory) {
        localStorage.setItem(LS_CALL_HISTORY_KEY, JSON.stringify(newHistory));
      }

      // 3. PostgreSQL Server API orqali sinxronlash
      fetch('/api/save-operators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ operators: updated })
      }).catch(err => console.error("Postgres operators save failed:", err));

      if (newLogs && newLogs.length > 0) {
        fetch('/api/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ logs: newLogs.slice(0, 500) })
        }).catch(err => console.error("Postgres logs save failed:", err));
      }

      if (newHistory && newHistory.length > 0) {
        fetch('/api/history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ history: newHistory })
        }).catch(err => console.error("Postgres history save failed:", err));
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
    field: 'viloyat' | 'fish' | 'tugulganSana' | 'tel' | 'telQoshimcha' | 'natija' | 'izoh' | 'eslatmaVaqti' | 'eslatmaMatni', 
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

      // Create a detailed call history log
      let newHistory = [...callHistory];
      if (field === 'natija' || field === 'izoh') {
        const now = new Date();
        const dStr = new Intl.DateTimeFormat('uz-UZ', {
          timeZone: 'Asia/Tashkent',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).format(now);
        const tStr = new Intl.DateTimeFormat('uz-UZ', {
          timeZone: 'Asia/Tashkent',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(now);
        const formattedTimestamp = `${dStr} ${tStr}`;

        const targetRec = updatedRecords.find(r => r.id === recordId);
        if (targetRec) {
          const newCallEntry: CallHistoryEntry = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            operatorId: opId,
            operatorName: opName,
            clientName: targetRec.fish,
            clientTel: targetRec.tel,
            clientViloyat: targetRec.viloyat,
            status: targetRec.natija || '',
            izoh: targetRec.izoh || '',
            timestamp: formattedTimestamp,
            date: dStr
          };
          newHistory = [newCallEntry, ...newHistory];
        }
      }

      saveToLocalStorage(updatedOperators, freshLogs, newHistory);
      triggerNotification("Ma'lumotlar saqlandi! 💾");

      // Telegram sending asynchronously (yangilangan yozuvdan o'qiladi)
      const lastCreatedLog = freshLogs[0];
      if (lastCreatedLog) {
        const targetRec = updatedRecords.find(r => r.id === recordId);
        const schoolNo = targetRec ? targetRec.no : 0;
        const schoolTel = targetRec ? targetRec.tel : '';
        const schoolViloyat = targetRec ? targetRec.viloyat : '';
        sendTelegramNotification(lastCreatedLog, schoolNo, schoolTel, schoolViloyat, targetRec);
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
      sendTelegramNotification(lastCreatedLog, newRec.no, newRec.tel, newRec.viloyat, { ...newRec, id: newId });
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
      sendTelegramNotification(lastCreatedLog, deletedRecord.no, deletedRecord.tel, deletedRecord.viloyat, deletedRecord);
    }
  };

  // Import batch of records from Excel with Duplicate Check (Admin only)
  const handleImportRecords = (operatorId: string, newRecords: Omit<SchoolRecord, 'id'>[]) => {
    const targetOp = operators.find(op => op.id === operatorId);
    if (!targetOp) return;

    // Normalize phone numbers for accurate comparison
    const normalizePhone = (p: string) => {
      if (!p) return "";
      let clean = p.replace(/\D/g, ""); // keep digits only
      if (clean.startsWith("998") && clean.length === 12) {
        clean = clean.slice(3); // convert to standard 9-digit to match cleanly
      }
      return clean;
    };

    // Get all existing unique phone numbers and name+region fingerprints from database
    const existingPhones = new Set<string>();
    const existingFingerprints = new Set<string>();

    operators.forEach(op => {
      (op.records || []).forEach(r => {
        const ph = normalizePhone(r.tel);
        if (ph) existingPhones.add(ph);
        const ph2 = normalizePhone(r.telQoshimcha);
        if (ph2) existingPhones.add(ph2);
        
        const fp = `${(r.fish || '').trim().toLowerCase()}_${(r.viloyat || '').trim().toLowerCase()}`;
        existingFingerprints.add(fp);
      });
    });

    const importedRecords: Omit<SchoolRecord, 'id'>[] = [];
    let fileDuplicateCount = 0;
    let databaseDuplicateCount = 0;
    const seenInFile = new Set<string>();

    newRecords.forEach(rec => {
      const p1 = normalizePhone(rec.tel);
      const p2 = normalizePhone(rec.telQoshimcha);
      const fp = `${(rec.fish || '').trim().toLowerCase()}_${(rec.viloyat || '').trim().toLowerCase()}`;

      // 1. Check if it's duplicated inside the spreadsheet itself
      const fileKey = p1 || fp;
      if (seenInFile.has(fileKey)) {
        fileDuplicateCount++;
        return;
      }
      seenInFile.add(fileKey);

      // 2. Check if duplicated in the PostgreSQL Database
      const isDbDuplicate = (p1 && existingPhones.has(p1)) || 
                            (p2 && existingPhones.has(p2)) || 
                            (p1 && existingPhones.has(p2)) ||
                            existingFingerprints.has(fp);

      if (isDbDuplicate) {
        databaseDuplicateCount++;
        return;
      }

      importedRecords.push(rec);
    });

    if (importedRecords.length === 0) {
      alert(`Yuklash to'xtatildi! Barcha ${newRecords.length} ta yozuv bazada yoki faylda DUBLIKAT deb topildi.\n\n- Fayl ichidagi dublikatlar: ${fileDuplicateCount} ta\n- Bazaga allaqachon kiritilganlari: ${databaseDuplicateCount} ta`);
      return;
    }

    const startingNo = targetOp.records.length > 0 ? Math.max(...targetOp.records.map(r => r.no)) + 1 : 1;
    
    const formatted = importedRecords.map((rec, idx) => ({
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
      `${importedRecords.length} ta mijoz`, 
      'Excel import', 
      '', 
      `${importedRecords.length} ta yangi mijoz yuklandi (Dublikatlar o'chirildi)`
    );

    saveToLocalStorage(updatedOperators, freshLogs);
    
    alert(`Import tugallandi! 🎉\n\n- Jami taqdim etilgan: ${newRecords.length} ta qator\n- Muvaffaqiyatli yuklandi: ${importedRecords.length} ta yangi mijoz\n- Fayl ichidagi ichki dublikatlar: ${fileDuplicateCount} ta (tashlab ketildi)\n- Bazadagi mavjud dublikatlar: ${databaseDuplicateCount} ta (tashlab ketildi)`);
    triggerNotification(`${importedRecords.length} ta mijoz muvaffaqiyatli yuklandi! 🚀`);
  };

  // Reset database state in LocalStorage + PG Backend
  const handleResetDatabase = async () => {
    if (window.confirm("Barcha kiritilgan o'zgarishlar o'chib ketadi va boshlang'ich operator ma'lumotlari holatiga qaytariladi. Tasdiqlaysizmi?")) {
      try {
        await fetch('/api/reset-records', { method: 'POST' });
      } catch (err) {
        console.warn("Failed to reset PG database records:", err);
      }
      saveToLocalStorage(initialOperators, [], []);
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

  // Change Password Submission Handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');
    setPasswordChangeSuccess('');

    if (!newPasswordInput || !confirmPasswordInput) {
      setPasswordChangeError("Yangi parolni kiriting va tasdiqlang!");
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeError("Yangi parollar bir xil emas!");
      return;
    }
    if (newPasswordInput.length < 4) {
      setPasswordChangeError("Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak!");
      return;
    }

    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorId: loggedInOpId,
          currentPassword: currentPasswordInput,
          newPassword: newPasswordInput
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordChangeSuccess("Parolingiz muvaffaqiyatli o'zgartirildi! 🔑");
        
        // Update operators state
        const updatedOps = operators.map(op => 
          op.id === loggedInOpId ? { ...op, password: newPasswordInput } : op
        );
        setOperators(updatedOps);
        localStorage.setItem(LS_DATA_KEY, JSON.stringify(updatedOps));

        // Reset fields
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        
        // Close modal
        setTimeout(() => {
          setShowPasswordChangeModal(false);
          setPasswordChangeSuccess('');
        }, 1500);
      } else {
        setPasswordChangeError(data.error || "Xatolik yuz berdi!");
      }
    } catch (err) {
      setPasswordChangeError("Server bilan bog'lanishda xatolik!");
    }
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
      const res = await fetch('/api/clear-chat', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error();
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

  // ===== INTERACTIVE TIME MONITORING OPERATIONS =====
  
  // 1. Calling Stopwatch effect loop
  useEffect(() => {
    let timerId: any = null;
    if (isCallTimerRunning) {
      timerId = setInterval(() => {
        setCallTimerSeconds(prev => {
          const nextVal = prev + 1;
          // Check limit warning at 5 minutes (300s)
          if (nextVal > 0 && nextVal === 300) {
            playTimerWarningBeep();
            triggerNotification("⚠️ Suhbat 5 daqiqaga yetdi! Suhbatni yakunlash tavsiya etiladi.");
          }
          return nextVal;
        });
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isCallTimerRunning]);

  // 2. Real-time Scheduled Reminder Alarms checker
  useEffect(() => {
    if (!activeOperator) return;

    const checkAlarmsInterval = setInterval(() => {
      const now = new Date();
      const tzOffsetMin = now.getTimezoneOffset();
      const localAdjusted = new Date(now.getTime() - (tzOffsetMin * 60000));
      const localISOStr = localAdjusted.toISOString().slice(0, 16);

      activeOperator.records.forEach(rec => {
        if (rec.eslatmaVaqti && rec.eslatmaVaqti.trim() !== '') {
          if (rec.eslatmaVaqti <= localISOStr && !acknowledgedReminderIds.has(rec.id)) {
            if (!activeReminderPopup || activeReminderPopup.id !== rec.id) {
              setActiveReminderPopup(rec);
              playReminderAudioChime();
            }
          }
        }
      });
    }, 10000);

    return () => clearInterval(checkAlarmsInterval);
  }, [activeOperator, acknowledgedReminderIds, activeReminderPopup]);

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
    if (!log) return false;
    const term = adminLogSearch.toLowerCase();
    const opVal = String(log.operatorName || '').toLowerCase();
    const schVal = String(log.schoolName || '').toLowerCase();
    const fldVal = String(log.field || '').toLowerCase();
    const newVal = String(log.newValue || '').toLowerCase();
    const oldVal = String(log.oldValue || '').toLowerCase();
    return (
      opVal.includes(term) ||
      schVal.includes(term) ||
      fldVal.includes(term) ||
      newVal.includes(term) ||
      oldVal.includes(term)
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
                  className="w-full p-2 text-xs bg-neutral-800 text-neutral-100 rounded-lg border border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                <div className="flex items-center gap-1">
                  <span className="tracking-wide">Barchasi saqlandi ✅</span>
                  {lastSavedTime && (
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono font-medium flex items-center gap-0.5 ml-1">
                      <Clock size={10} /> {lastSavedTime}
                    </span>
                  )}
                </div>
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
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-650 dark:text-amber-400 transition-colors text-[10px] font-black"
                title={theme === 'dark' ? "Kunduzgi rejim" : "Tungi rejim"}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun size={13} />
                    <span>Kun</span>
                  </>
                ) : (
                  <>
                    <Moon size={13} className="text-neutral-550" />
                    <span>Tun</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Middle Decorative Text / Edu info */}
          <div className="hidden md:flex items-center gap-3">
            {lastSavedTime && (
              <div className="flex items-center gap-1.5 py-1.5 px-3 bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 rounded-full select-none text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                <Clock size={11} className="text-emerald-500 animate-pulse" />
                <span>Saqlandi: {lastSavedTime}</span>
              </div>
            )}
          </div>

          {/* Quick Stats Banner & Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            
            {/* Theme switcher button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-amber-400 border border-neutral-250 dark:border-neutral-700 rounded-md transition-colors cursor-pointer text-xs font-black"
              title={theme === 'dark' ? "Kunduzgi rejim (Kun)" : "Tungi rejim (Tun)"}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={13} />
                  <span>Kun</span>
                </>
              ) : (
                <>
                  <Moon size={13} className="text-neutral-500" />
                  <span>Tun</span>
                </>
              )}
            </button>

            {/* Logged-in operator badge + logout */}
            {loggedInOperator && !isAdminLoggedIn && (
              <div className="flex items-center gap-2 select-none">
                {/* Name Box */}
                <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-lg px-3 py-1.5 shadow-xxs">
                  <UserCheck size={13} className="text-emerald-500 shrink-0" />
                  <span className="text-xs font-black text-neutral-700 dark:text-neutral-200">
                    {formatOperatorName(loggedInOperator.name)}
                  </span>
                </div>
                
                {/* Password and Logout Buttons - separate, clear gap */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowPasswordChangeModal(true)}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-605 text-white rounded-lg text-[10px] font-black flex items-center gap-0.5 transition-all shadow-xs hover:shadow-sm active:scale-95 cursor-pointer"
                    title="Parolni o'zgartirish"
                  >
                    🔑 Parol
                  </button>
                  <button
                    onClick={handleOperatorLogout}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-705 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all shadow-xs hover:shadow-sm active:scale-95 cursor-pointer"
                    title="Tizimdan chiqish"
                  >
                    <LogOut size={11} /> Chiqish
                  </button>
                </div>
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
          <AdminDashboard
            operators={operators}
            activeAdminTab={activeAdminTab}
            setActiveAdminTab={setActiveAdminTab}
            isAdminLoggedIn={isAdminLoggedIn}
            setIsAdminLoggedIn={setIsAdminLoggedIn}
            currentView={currentView}
            setCurrentView={setCurrentView}
            triggerNotification={triggerNotification}
            handleFileUpload={handleFileUpload}
            bulkDataInput={bulkDataInput}
            setBulkDataInput={setBulkDataInput}
            handleBulkRefillOperator={handleBulkRefillOperator}
            adminLogSearch={adminLogSearch}
            setAdminLogSearch={setAdminLogSearch}
            filteredLogs={filteredLogs}
            handleAddNewOperatorSubmit={handleAddNewOperatorSubmit}
            newOpNameInput={newOpNameInput}
            setNewOpNameInput={setNewOpNameInput}
            bulkSanaInput={bulkSanaInput}
            setBulkSanaInput={setBulkSanaInput}
            handleBulkUpdateDate={handleBulkUpdateDate}
            handleClearAllProgress={handleClearAllProgress}
            handleClearChatMessages={handleClearChatMessages}
            handleClearAllSchoolRecords={handleClearAllSchoolRecords}
            handleAddNewOperator={handleAddNewOperator}
            handleRenameOperator={handleRenameOperator}
            handleSetOperatorPassword={handleSetOperatorPassword}
            handleDeleteOperator={handleDeleteOperator}
            handleReorderOperators={handleReorderOperators}
            tgBotToken={tgBotToken}
            setTgBotToken={setTgBotToken}
            tgChannelId={tgChannelId}
            setTgChannelId={setTgChannelId}
            tgAdminChatId={tgAdminChatId}
            setTgAdminChatId={setTgAdminChatId}
            handleSaveTelegramConfigs={handleSaveTelegramConfigs}
            handleTestTelegramDelivery={handleTestTelegramDelivery}
            tgTestingState={tgTestingState}
            tgTestErrorMessage={tgTestErrorMessage}
            handleImportRecords={handleImportRecords}
            theme={theme}
          />
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
            
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              {/* View Mode Toggle */}
              <div className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl flex items-center gap-1 border border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={() => setOperatorViewMode('table')}
                  className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-150 cursor-pointer ${operatorViewMode === 'table' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                >
                  📝 Jadval
                </button>
                <button
                  onClick={() => setOperatorViewMode('kanban')}
                  className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-150 cursor-pointer ${operatorViewMode === 'kanban' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                >
                  📋 Kanban
                </button>
                <button
                  onClick={() => setOperatorViewMode('charts')}
                  className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-150 cursor-pointer ${operatorViewMode === 'charts' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                >
                  📊 Grafik
                </button>
                <button
                  onClick={() => setOperatorViewMode('history')}
                  className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-150 cursor-pointer ${operatorViewMode === 'history' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                >
                  📞 Tarix
                </button>
                <button
                  onClick={() => setOperatorViewMode('callbacks')}
                  className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-150 cursor-pointer ${operatorViewMode === 'callbacks' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                >
                  🔔 Rejalar
                </button>
                <button
                  onClick={() => setOperatorViewMode('prices')}
                  className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-150 cursor-pointer ${operatorViewMode === 'prices' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                >
                  💰 Narxlar
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Selected Operator Stats Cards (8 status cards - full width) */}
        {currentView === 'operator' && activeOperator && operatorViewMode === 'table' && (
          <Stats 
            records={activeOperator.records} 
            operatorName={activeOperator.name} 
            selectedStatus={selectedStatusFilter}
            onCardClick={setSelectedStatusFilter}
          />
        )}

        {/* Dynamic High-Priority Callback Reminders Dashboard Shelf */}
        {currentView === 'operator' && activeOperator && activeOperator.records.some(r => r.eslatmaVaqti) && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 p-4 shadow-sm animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <span className="text-lg animate-bounce">🔔</span>
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Siz belgilagan qayta qo'ngiroqlar (Yaqin orada muloqot)
                </h3>
              </div>
              <span className="text-[10px] font-bold bg-amber-200 dark:bg-amber-900/50 text-amber-850 dark:text-amber-300 px-2 py-0.5 rounded-full select-none">
                {activeOperator.records.filter(r => r.eslatmaVaqti).length} ta reja
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[160px] overflow-y-auto">
              {activeOperator.records
                .filter(r => r.eslatmaVaqti)
                .sort((a,b) => (a.eslatmaVaqti || '').localeCompare(b.eslatmaVaqti || ''))
                .map(rem => {
                  const remTime = new Date(rem.eslatmaVaqti || '');
                  const now = new Date();
                  const isPast = remTime < now;
                  const formattedTime = remTime.toLocaleDateString() + ' ' + remTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                  
                  return (
                    <div 
                      key={rem.id} 
                      className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1 text-xs transition-colors ${
                        isPast 
                          ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-250 dark:border-rose-900/40' 
                          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-amber-450'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-extrabold text-neutral-800 dark:text-neutral-200 leading-tight">
                            {rem.fish}
                          </p>
                          <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                            📍 {rem.viloyat}
                          </span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 border select-none ${
                          isPast 
                            ? 'bg-rose-100 text-rose-800 border-rose-350 dark:bg-rose-900/30' 
                            : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30'
                        }`}>
                          {isPast ? '⚠️ KECHIKDI' : '⏰ REJA'}
                        </span>
                      </div>
                      
                      {/* Reminder note text */}
                      <p className="text-[11px] italic text-neutral-600 dark:text-neutral-350 bg-neutral-100/55 dark:bg-neutral-850 p-1 px-1.5 rounded pr-6 leading-normal relative select-text break-words">
                        💬 {rem.eslatmaMatni || "Izohsiz..."}
                      </p>

                      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mt-1 select-none font-mono">
                        <span className="text-amber-800 dark:text-amber-450 font-black">
                          🕒 {formattedTime}
                        </span>
                        
                        {/* Quick action buttons */}
                        <div className="flex items-center gap-2">
                          {/* Done Button to clear the reminder */}
                          <button
                            onClick={() => {
                              handleUpdateRecord(rem.id, 'eslatmaVaqti', '');
                              handleUpdateRecord(rem.id, 'eslatmaMatni', '');
                            }}
                            className="text-emerald-650 hover:text-emerald-700 font-extrabold text-[10px] hover:underline"
                            title="Xizmat ko'rsatildi (bajarildi)"
                          >
                            ✓ Bajarildi
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
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
              defaultStatusFilter={selectedStatusFilter}
              onStatusFilterChange={setSelectedStatusFilter}
              onStartCallTimer={(phone, name) => {
                setActiveCallPhone(phone);
                setActiveCallClientName(name);
                setCallTimerSeconds(0);
                setIsCallTimerRunning(true);
              }}
            />
          </div>
        )}

        {/* Selected Operator Analytics Panel */}
        {currentView === 'operator' && activeOperator && operatorViewMode === 'charts' && (
          <div className="flex-1 min-h-[400px]">
            <AnalyticsPanel operators={operators} />
          </div>
        )}

        {/* Selected Operator Kanban Board Visual Panel */}
        {currentView === 'operator' && activeOperator && operatorViewMode === 'kanban' && (
          <div className="flex-1 min-h-[400px]">
            <KanbanBoard
              records={activeOperator.records}
              operatorId={activeOperator.id}
              onUpdateRecord={handleUpdateRecord}
            />
          </div>
        )}

        {/* Selected Operator Call History Panel */}
        {currentView === 'operator' && activeOperator && operatorViewMode === 'history' && (
          <div className="flex-1 min-h-[400px]">
            <CallHistory
              history={callHistory}
              onClearHistory={() => {
                saveToLocalStorage(operators, activityLogs, []);
              }}
              isAdmin={isAdminLoggedIn}
            />
          </div>
        )}

        {/* Selected Operator Custom Callbacks & Schedules Workspace Panel */}
        {currentView === 'operator' && activeOperator && operatorViewMode === 'callbacks' && (
          <div className="flex-1 min-h-[400px]">
            <SchedulesPanel
              records={activeOperator.records}
              callHistory={callHistory}
              onUpdateRecord={handleUpdateRecord}
              onStartCallTimer={(phone) => {
                const matched = activeOperator.records.find(r => r.tel === phone);
                setActiveCallPhone(phone);
                setActiveCallClientName(matched ? matched.fish : "Mijoz");
                setCallTimerSeconds(0);
                setIsCallTimerRunning(true);
              }}
            />
          </div>
        )}

        {/* Selected Operator University Prices and Subjects Info Panel */}
        {currentView === 'operator' && activeOperator && operatorViewMode === 'prices' && (
          <div className="flex-1 min-h-[400px]">
            <PricesPanel />
          </div>
        )}

      </main>

      {/* Interactive Active Call Timer Floating Bar (Stopwatch) */}
      {activeCallPhone && (
        <div className="fixed bottom-20 right-6 z-50 max-w-sm w-full bg-slate-900 border border-neutral-800 text-white p-3.5 rounded-xl shadow-2xl flex flex-col gap-3 select-none animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[9px] uppercase font-black tracking-widest text-[#9bc1bc]">Muloqot Taymeri</span>
            </div>
            <button 
              onClick={() => {
                setIsCallTimerRunning(false);
                setActiveCallPhone(null);
                setCallTimerSeconds(0);
              }}
              className="text-neutral-400 hover:text-white transition-colors p-1 text-sm font-bold"
              title="Yopish"
            >
              ×
            </button>
          </div>
          
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-900/50 text-emerald-400">
              📞
            </div>
            <div className="flex-1 overflow-hidden">
              <h4 className="text-xs font-black truncate text-neutral-100">{activeCallClientName || 'Noma’lum mijoz'}</h4>
              <p className="text-[11px] font-mono font-medium text-neutral-400 mt-0.5">{activeCallPhone}</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-800 pt-2">
            <div className="flex items-baseline gap-1">
              <span className={`text-lg font-bold font-mono tracking-tight ${callTimerSeconds >= 300 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
                {Math.floor(callTimerSeconds / 60).toString().padStart(2, '0')}:
                {(callTimerSeconds % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-[9px] text-neutral-500 font-mono">/ 05:00</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Play / Pause Toggle */}
              <button
                onClick={() => setIsCallTimerRunning(!isCallTimerRunning)}
                className={`p-1.5 rounded-lg border text-xs transition-all ${
                  isCallTimerRunning 
                    ? 'bg-neutral-800 text-amber-400 border-amber-900/30' 
                    : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700'
                }`}
                title={isCallTimerRunning ? "Suhbatni pauza qilish" : "Suhbatni davom ettirish"}
              >
                {isCallTimerRunning ? '⏸️' : '▶️'}
              </button>

              {/* Reset stopwatch */}
              <button
                onClick={() => setCallTimerSeconds(0)}
                className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-750 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-all text-xs"
                title="Taymerni qayta tiklash"
              >
                🔄
              </button>

              {/* End call / Save statistics log comment helper */}
              <button
                onClick={() => {
                  setIsCallTimerRunning(false);
                  const min = Math.floor(callTimerSeconds / 60).toString().padStart(2, '0');
                  const sec = (callTimerSeconds % 60).toString().padStart(2, '0');
                  const talkString = ` [📞 ${min}:${sec} suhbat]`;
                  
                  if (activeOperator) {
                    const cleanPhone = activeCallPhone.replace(/[^0-9]/g, '');
                    const matchedRec = activeOperator.records.find(r => r.tel.replace(/[^0-9]/g, '') === cleanPhone);
                    if (matchedRec) {
                      const currentIzoh = matchedRec.izoh || '';
                      if (!currentIzoh.includes(talkString)) {
                        handleUpdateRecord(matchedRec.id, 'izoh', currentIzoh ? `${currentIzoh}${talkString}` : `${talkString.trim()}`);
                        triggerNotification("⏱️ Suhbat vaqti mijoz izohiga saqlanishi uchun yuborildi!");
                      }
                    }
                  }
                  setActiveCallPhone(null);
                  setCallTimerSeconds(0);
                }}
                className="px-2.5 py-1 bg-rose-600 border border-rose-500 text-white hover:bg-rose-700 transition-all font-bold text-xs rounded-lg shadow-sm"
                title="Suhbatni yakunlab, vaqtni IZOHga yozish"
              >
                🔴 Tugatish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Highly polished Scheduled Callback Reminder Alarm Notification Card Overlay */}
      {activeReminderPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="max-w-md w-full bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 relative border-t-8 border-t-amber-500 scale-95 md:scale-100 transition-transform">
            
            {/* Alarm indicator */}
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-955/40 text-amber-700 dark:text-amber-405 relative flex items-center justify-center">
                <span className="text-lg animate-ping absolute leading-none">🔔</span>
                <span className="text-lg leading-none">🔔</span>
              </span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-tight text-neutral-800 dark:text-neutral-100">
                  Muloqot eslatma vaqti keldi!
                </h3>
                <p className="text-[10px] text-neutral-450 font-medium">Rejalashtirilgan bog'lanish muddati yetdi.</p>
              </div>
            </div>

            {/* Client info */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-500 dark:text-neutral-400">
                <span>👤 Mijoz F.I.Sh:</span>
                <span className="text-neutral-900 dark:text-white font-extrabold">{activeReminderPopup.fish}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-neutral-500 dark:text-neutral-400">
                <span>📍 Viloyat:</span>
                <span className="font-semibold text-neutral-600 dark:text-neutral-300">{activeReminderPopup.viloyat}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-neutral-500 dark:text-neutral-400">
                <span>📞 Telefon:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold">{activeReminderPopup.tel}</span>
              </div>
              {activeReminderPopup.eslatmaMatni && (
                <div className="mt-1.5 p-2 rounded bg-amber-50/50 dark:bg-amber-950/20 text-neutral-700 dark:text-neutral-200 italic text-xs border-l-2 border-l-amber-500">
                  ⚠️ "{activeReminderPopup.eslatmaMatni}"
                </div>
              )}
            </div>

            {/* Actions for reminder */}
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-neutral-150 dark:border-neutral-850">
              <button
                onClick={() => {
                  setAcknowledgedReminderIds(prev => new Set([...prev, activeReminderPopup.id]));
                  setActiveReminderPopup(null);
                }}
                className="px-2 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all"
              >
                🔕 O'chirish
              </button>

              <button
                onClick={() => {
                  const now = new Date();
                  const fifteenMinLater = new Date(now.getTime() + 15 * 60000);
                  const tzOffsetMin = fifteenMinLater.getTimezoneOffset();
                  const adjusted = new Date(fifteenMinLater.getTime() - (tzOffsetMin * 60000));
                  const newAlarmTime = adjusted.toISOString().slice(0, 16);
                  
                  handleUpdateRecord(activeReminderPopup.id, 'eslatmaVaqti', newAlarmTime);
                  triggerNotification("⏰ Eslatma 15 daqiqaga orqaga surildi!");
                  setActiveReminderPopup(null);
                }}
                className="px-2 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-955/20 text-amber-700 dark:text-amber-400 border border-neutral-200 dark:border-neutral-800 text-xs font-bold rounded-xl transition-all"
              >
                ⏳ +15 min
              </button>

              <button
                onClick={() => {
                  let cleanPhone = activeReminderPopup.tel.replace(/[^0-9]/g, '');
                  if (cleanPhone.startsWith('998') && cleanPhone.length > 9) {
                    cleanPhone = cleanPhone.substring(3);
                  }
                  navigator.clipboard.writeText(cleanPhone);
                  
                  setActiveCallPhone(activeReminderPopup.tel);
                  setActiveCallClientName(activeReminderPopup.fish);
                  setCallTimerSeconds(0);
                  setIsCallTimerRunning(true);
                  
                  setAcknowledgedReminderIds(prev => new Set([...prev, activeReminderPopup.id]));
                  setActiveReminderPopup(null);
                  
                  setOperatorViewMode('table');
                  triggerNotification("📞 Bog'lanish boshlandi!");
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
              >
                📞 Bog'lanish
              </button>
            </div>

          </div>
        </div>
      )}

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

      {/* Operator Password Change Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl relative animate-fade-in text-left">
            <h3 className="text-sm font-black text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5 uppercase tracking-wide border-b border-neutral-100 dark:border-neutral-800 pb-2 mb-3">
              🔑 Parolni O'zgartirish
            </h3>
            <p className="text-[10px] text-neutral-500 mb-4 font-medium">
              Xavfsizlik nuqtai nazaridan parolingizni boshqa operatorlar ko'ra olmaydigan mustahkam parolga yangilang.
            </p>

            <form onSubmit={handlePasswordChange} className="space-y-3.5">
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase font-bold text-neutral-400">Hozirgi Parol</label>
                <input
                  type="password"
                  placeholder="Hozirgi parolingiz..."
                  className="w-full p-2 text-xs bg-neutral-50 dark:bg-neutral-850 text-neutral-800 dark:text-neutral-100 rounded-lg border border-neutral-300 dark:border-neutral-750 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase font-bold text-neutral-400">Yangi Parol</label>
                <input
                  type="password"
                  placeholder="Yangi parol kiriting..."
                  className="w-full p-2 text-xs bg-neutral-50 dark:bg-neutral-850 text-neutral-800 dark:text-neutral-100 rounded-lg border border-neutral-300 dark:border-neutral-750 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase font-bold text-neutral-400">Yangi Parol Tasdig'i</label>
                <input
                  type="password"
                  placeholder="Yangi parolni qayta kiriting..."
                  className="w-full p-2 text-xs bg-neutral-50 dark:bg-neutral-850 text-neutral-800 dark:text-neutral-100 rounded-lg border border-neutral-300 dark:border-neutral-750 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  required
                />
              </div>

              {passwordChangeError && (
                <div className="text-[10px] font-bold text-rose-600 dark:text-rose-450 bg-rose-50 dark:bg-rose-950/20 border border-rose-220 dark:border-transparent p-2 rounded">
                  ⚠️ {passwordChangeError}
                </div>
              )}

              {passwordChangeSuccess && (
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-transparent p-2 rounded">
                  ✅ {passwordChangeSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 text-xs pt-2 font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordChangeModal(false);
                    setCurrentPasswordInput('');
                    setNewPasswordInput('');
                    setConfirmPasswordInput('');
                    setPasswordChangeError('');
                  }}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 rounded-lg font-bold text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  Yopish
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Parolni Yangilash
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
