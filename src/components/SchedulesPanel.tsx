/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SchoolRecord, CallHistoryEntry } from '../types';
import { 
  Calendar, 
  Clock, 
  Phone, 
  Check, 
  Copy, 
  Send, 
  Search, 
  Edit3, 
  CheckCircle, 
  AlertCircle, 
  Timer, 
  History, 
  User, 
  MapPin, 
  Bell 
} from 'lucide-react';

interface SchedulesPanelProps {
  records: SchoolRecord[];
  callHistory: CallHistoryEntry[];
  onUpdateRecord: (
    id: string, 
    field: 'viloyat' | 'fish' | 'tugulganSana' | 'tel' | 'telQoshimcha' | 'natija' | 'izoh' | 'eslatmaVaqti' | 'eslatmaMatni', 
    value: string
  ) => void;
  onStartCallTimer?: (phone: string) => void;
}

const STATUS_LIST = [
  "Ko'tarmadi",
  "O'chirilgan",
  "O'ylab ko'radi",
  "Maslahat qiladi",
  "Xato raqam",
  "O'qimaydi",
  "O'qiydi",
  "Shartnoma berildi",
  ""
];

export const SchedulesPanel: React.FC<SchedulesPanelProps> = ({
  records = [],
  callHistory = [],
  onUpdateRecord,
  onStartCallTimer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempIzoh, setTempIzoh] = useState('');
  const [tempNatija, setTempNatija] = useState('');
  const [tempEslatmaVaqti, setTempEslatmaVaqti] = useState('');
  const [tempEslatmaMatni, setTempEslatmaMatni] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper: Strip 998 and copy Uzbek mobile format
  const handleCopyPhone = (id: string, phone: string) => {
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('998') && cleanPhone.length > 9) {
      cleanPhone = cleanPhone.substring(3);
    }
    navigator.clipboard.writeText(cleanPhone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);

    if (onStartCallTimer) {
      onStartCallTimer(phone);
    }
  };

  // Helper: check if qualification for Schedules view is met
  const isFollowUpRecord = (r: SchoolRecord) => {
    // 1. Has explicit reminder alarm
    if (r.eslatmaVaqti && r.eslatmaVaqti.trim() !== '') return true;
    // 2. Has specific intermediate statuses
    if (r.natija === "Ko'tarmadi" || r.natija === "O'ylab ko'radi" || r.natija === "Maslahat qiladi") return true;
    // 3. Comment includes callback triggers
    const izoh = (r.izoh || '').toLowerCase();
    if (
      izoh.includes('keyinroq') || 
      izoh.includes('qayta') || 
      izoh.includes('qongiroq') || 
      izoh.includes('qon’g') || 
      izoh.includes('tel qil') || 
      izoh.includes('telefon') || 
      izoh.includes('callback')
    ) return true;

    return false;
  };

  // Filter and sort critical follow-ups
  const filtered = records.filter(r => {
    if (!isFollowUpRecord(r)) return false;

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      return (
        (r.fish || '').toLowerCase().includes(q) ||
        (r.tel || '').includes(q) ||
        (r.viloyat || '').toLowerCase().includes(q) ||
        (r.izoh || '').toLowerCase().includes(q) ||
        (r.eslatmaMatni || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sort: upcoming reminders first, then sorted by status
  const sorted = [...filtered].sort((a, b) => {
    const timeA = a.eslatmaVaqti || '9999-12-31T23:59';
    const timeB = b.eslatmaVaqti || '9999-12-31T23:59';
    return timeA.localeCompare(timeB);
  });

  // Start inline edit mode
  const startEdit = (r: SchoolRecord) => {
    setEditingId(r.id);
    setTempIzoh(r.izoh || '');
    setTempNatija(r.natija || '');
    setTempEslatmaVaqti(r.eslatmaVaqti || '');
    setTempEslatmaMatni(r.eslatmaMatni || '');
  };

  // Save inline edit changes
  const saveEdit = (id: string) => {
    onUpdateRecord(id, 'izoh', tempIzoh);
    onUpdateRecord(id, 'natija', tempNatija);
    onUpdateRecord(id, 'eslatmaVaqti', tempEslatmaVaqti);
    onUpdateRecord(id, 'eslatmaMatni', tempEslatmaMatni);
    setEditingId(null);
  };

  return (
    <div className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col h-full animate-fade-in">
      
      {/* Search and Title bar */}
      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <Bell size={18} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black text-neutral-800 dark:text-white uppercase tracking-tight">
              Qayta Qo'ngiroqlar va Rejalar
            </h2>
            <p className="text-[10px] text-neutral-400 font-medium">
              Eslatmalar kiritilgan yoki qayta bog'lanish kerak bo'lgan barcha mijozlar nazorati.
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            className="w-full text-xs pl-9 pr-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-850 focus:outline-none focus:ring-1 focus:ring-amber-500 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400"
            placeholder="Mijoz ismi yoki tel raqami..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sorted.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {sorted.map(record => {
              // Find call history logs for this specific telephone number
              const clientLogs = callHistory
                .filter(h => {
                  const cleanedH = h.clientTel.replace(/[^0-9]/g, '');
                  const cleanedR = record.tel.replace(/[^0-9]/g, '');
                  return cleanedH === cleanedR || (cleanedH.endsWith(cleanedR) && cleanedR.length >= 7);
                })
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // Latest first

              const numAttempts = clientLogs.length;

              return (
                <div 
                  key={record.id}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/40 dark:bg-neutral-900/10 hover:border-amber-400/40 dark:hover:border-amber-400/30 p-4 transition-all duration-150 flex flex-col gap-3 relative shadow-xs"
                >
                  {/* Alarm ribbon indicator */}
                  {record.eslatmaVaqti && (
                    <div className="absolute top-0 right-4 px-2.5 py-0.5 rounded-b-md bg-amber-500 text-neutral-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-xs animate-bounce">
                      <Clock size={8} /> callback
                    </div>
                  )}

                  {/* Client Metadata block */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-[9px] tracking-wide font-mono uppercase">
                          № {record.no}
                        </span>
                        <span className="text-xs font-black text-neutral-950 dark:text-white">
                          {record.fish}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-500 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-neutral-400" />
                          {record.viloyat}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          🎂 {record.tugulganSana || "Sana yo'q"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div 
                        onClick={() => handleCopyPhone(record.id, record.tel)}
                        className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-neutral-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-450 border border-neutral-200 dark:border-neutral-700 cursor-pointer text-xs font-mono font-bold flex items-center gap-1.5 tracking-tight group/dial transition-all"
                        title="Nusxa olish va muloqot taymerini boshlash"
                      >
                        <Phone size={11} className="text-neutral-400 group-hover/dial:text-emerald-500" />
                        {record.tel}
                        {copiedId === record.id ? (
                          <span className="text-[9px] font-sans text-emerald-600">✓</span>
                        ) : (
                          <span className="text-[9px] text-neutral-400 font-sans font-light">📋</span>
                        )}
                      </div>
                      {record.telQoshimcha && record.telQoshimcha !== 'Kiritilmagan' && (
                        <div 
                          onClick={() => handleCopyPhone(record.id + '_q', record.telQoshimcha)}
                          className="px-2 py-0.5 rounded-md bg-neutral-150/40 dark:bg-neutral-850 border border-neutral-250 dark:border-neutral-750 text-[10px] text-neutral-550 dark:text-neutral-350 font-mono font-medium cursor-pointer flex items-center gap-1 hover:text-emerald-600"
                        >
                          ☎️ {record.telQoshimcha}
                          {copiedId === record.id + '_q' ? '✓' : '📋'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Render content or Editing Pane */}
                  {editingId === record.id ? (
                    <div className="p-3 bg-white dark:bg-neutral-950 rounded-xl border border-amber-300/60 dark:border-amber-700/40 space-y-3 shadow-inner">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Status Select */}
                        <div>
                          <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Mijoz Holati (Natija)</label>
                          <select
                            className="w-full text-xs p-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-850 dark:text-neutral-100 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                            value={tempNatija}
                            onChange={(e) => setTempNatija(e.target.value)}
                          >
                            {STATUS_LIST.map((lbl, idx) => (
                              <option key={idx} value={lbl}>
                                {lbl === '' ? '⏳ Kutilmoqda' : lbl}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Reminder Alarm Date */}
                        <div>
                          <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Qayta Qo'ngiroq Vaqti</label>
                          <input
                            type="datetime-local"
                            className="w-full text-xs p-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-850 dark:text-neutral-100 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                            value={tempEslatmaVaqti}
                            onChange={(e) => setTempEslatmaVaqti(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Reminder Reason */}
                      <div>
                        <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Eslatma Sababi</label>
                        <input
                          type="text"
                          placeholder="Rejalashtirilgan eslatma matni..."
                          className="w-full text-xs p-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-850 dark:text-neutral-100 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          value={tempEslatmaMatni}
                          onChange={(e) => setTempEslatmaMatni(e.target.value)}
                        />
                      </div>

                      {/* Izoh Textarea */}
                      <div>
                        <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Muloqot Izohi</label>
                        <textarea
                          rows={2}
                          placeholder="Suhbat tafsilotlarini kiriting..."
                          className="w-full text-xs p-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-850 dark:text-neutral-100 focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none font-sans"
                          value={tempIzoh}
                          onChange={(e) => setTempIzoh(e.target.value)}
                        />
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1 border-t border-neutral-150 dark:border-neutral-850">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-850 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-bold rounded-lg transition-colors"
                        >
                          Bekor qilish
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(record.id)}
                          className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                        >
                          Saqlash ✅
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-1">
                      {/* Current Status and Comment */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          record.natija === "Ko'tarmadi" ? 'bg-orange-100 text-orange-850 dark:bg-orange-950/40 dark:text-orange-355' :
                          record.natija === "O'ylab ko'radi" ? 'bg-yellow-105 text-yellow-850 dark:bg-yellow-950/40 dark:text-yellow-355 font-bold' :
                          record.natija === "Maslahat qiladi" ? 'bg-sky-100 text-sky-850 dark:bg-sky-950/40 dark:text-sky-355 font-bold' :
                          record.natija ? 'bg-indigo-50 text-indigo-805 dark:bg-indigo-950/40 dark:text-indigo-355' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                        }`}>
                          {record.natija ? `🎯 ${record.natija}` : '⏳ Kutilmoqda'}
                        </span>

                        {record.eslatmaVaqti && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-80 * border border-amber-200/50 dark:border-amber-900/50 font-bold font-mono">
                            📅 {record.eslatmaVaqti.replace('T', ' ')}
                            {record.eslatmaMatni ? ` (${record.eslatmaMatni})` : ''}
                          </span>
                        )}
                      </div>

                      {/* Comment text body */}
                      <div className="p-2.5 rounded-lg bg-neutral-100/60 dark:bg-neutral-850 border border-neutral-200/40 dark:border-neutral-750 text-xs text-neutral-800 dark:text-neutral-200 italic leading-relaxed">
                        {record.izoh ? (
                          <span>"{record.izoh}"</span>
                        ) : (
                          <span className="text-neutral-400 font-light">Muloqot yozuvlariga izoh qo'yilmagan.</span>
                        )}
                      </div>

                      {/* Row actions */}
                      <div className="flex justify-end gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => startEdit(record)}
                          className="px-3 py-1 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 text-[10.5px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Edit3 size={11} className="text-neutral-500" /> Tahrirlash / Scheduler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* History timeline segment (BU HAR KUNLIK SOATLARI BILAN KO'RSATADI) */}
                  <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-neutral-400 tracking-wider mb-2 select-none">
                      <History size={12} className="text-neutral-400 animate-spin-slow" />
                      Qo'ngiroqlar tarixi ({numAttempts} ta urinish)
                    </div>

                    {clientLogs.length > 0 ? (
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {clientLogs.map((log) => (
                          <div 
                            key={log.id} 
                            className="text-[11px] p-2 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-150 dark:border-neutral-800 flex items-start gap-1 justify-between shadow-xxs hover:shadow-xs transition-shadow"
                          >
                            <div className="space-y-0.5 max-w-[70%]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold text-neutral-505 dark:text-neutral-400">
                                  {log.timestamp}
                                </span>
                                <span className={`px-1 py-0.2 rounded text-[9px] font-black ${
                                  log.status === "Ko'tarmadi" ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300' :
                                  log.status === "O'ylab ko'radi" ? 'bg-yellow-100 text-yellow-850 dark:bg-yellow-950/40 dark:text-yellow-300' :
                                  log.status === "Maslahat qiladi" ? 'bg-sky-100 text-sky-850 dark:bg-sky-950/40' :
                                  log.status ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40' : 'bg-neutral-150 text-neutral-500'
                                }`}>
                                  {log.status || "Kutilmoqda"}
                                </span>
                              </div>
                              <p className="text-neutral-700 dark:text-neutral-300 font-sans break-words italic pl-1 border-l border-neutral-200 dark:border-neutral-850">
                                {log.izoh ? `"${log.izoh}"` : <span className="text-neutral-400 text-[10px]">Izohsiz log</span>}
                              </p>
                            </div>
                            <div className="text-[9px] font-mono font-medium text-neutral-400 text-right">
                              👨‍💼 {log.operatorName.split(' ')[0]}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-neutral-400 italic text-center py-2 bg-neutral-100/30 dark:bg-neutral-900/40 rounded-lg">
                        Tarixda hali bu mijozga qo'ngiroq qilinmagan.
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-neutral-400 dark:text-neutral-600">
            <CheckCircle size={32} className="mx-auto text-emerald-400/80 mb-3" />
            <p className="text-xs font-semibold">Taqvim va eslatmalarda hech qanday qayta qo'ngiroqlar topilmadi.</p>
            <p className="text-[10px] text-neutral-400 mt-1">Siz juda zo'r ishlayapsiz! Hamma ishlar o'z vaqtida bajarilgan.</p>
          </div>
        )}
      </div>

      <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-450 dark:text-neutral-500 font-mono text-center">
        Ushbu bolim statusi 'Ko'tarmadi', 'O'ylab ko'radi', 'Maslahat qiladi' bo'lgan muloqotlar va izohida keyinroq qo'ngiroq qilish so'ralgan mijozlarni birlashtiradi.
      </div>

    </div>
  );
};
