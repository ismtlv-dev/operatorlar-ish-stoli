/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { SchoolRecord } from '../types';
import { 
  Phone, 
  Check, 
  Search, 
  GripVertical, 
  Clock, 
  X, 
  MessageSquare
} from 'lucide-react';

interface KanbanBoardProps {
  records: SchoolRecord[];
  operatorId: string;
  onUpdateRecord: (recordId: string, field: 'natija' | 'izoh', value: string) => void;
}

interface Column {
  id: string;
  title: string;
  statuses: string[];
  defaultStatus: string;
  emoji: string;
  dotColor: string; // Left dot color indicator
  leftBorderColor: string; // Left colored border accent
  bgTheme: string; // Header bottom accent line
}

const COLUMNS: Column[] = [
  {
    id: 'kutilmoqda',
    title: 'Kutilmoqda',
    statuses: ['', 'Kutilmoqda'],
    defaultStatus: 'Kutilmoqda',
    emoji: '⏳',
    dotColor: 'bg-zinc-600 dark:bg-zinc-400',
    leftBorderColor: 'border-l-4 border-l-zinc-500 dark:border-l-zinc-400',
    bgTheme: 'border-b-2 border-b-zinc-500 dark:border-b-zinc-400'
  },
  {
    id: 'kotarmadi',
    title: "Ko'tarmadi",
    statuses: ["Ko'tarmadi"],
    defaultStatus: "Ko'tarmadi",
    emoji: '📞',
    dotColor: 'bg-amber-600 dark:bg-amber-400',
    leftBorderColor: 'border-l-4 border-l-amber-500 dark:border-l-amber-400',
    bgTheme: 'border-b-2 border-b-amber-500 dark:border-b-amber-400'
  },
  {
    id: 'oylab_koradi',
    title: "O'ylab ko'radi",
    statuses: ["O'ylab ko'radi"],
    defaultStatus: "O'ylab ko'radi",
    emoji: '🤔',
    dotColor: 'bg-yellow-600 dark:bg-yellow-450',
    leftBorderColor: 'border-l-4 border-l-yellow-500 dark:border-l-yellow-400',
    bgTheme: 'border-b-2 border-b-yellow-500 dark:border-b-yellow-450'
  },
  {
    id: 'maslahat_qiladi',
    title: "Maslahat qiladi",
    statuses: ["Maslahat qiladi"],
    defaultStatus: "Maslahat qiladi",
    emoji: '👥',
    dotColor: 'bg-cyan-600 dark:bg-cyan-400',
    leftBorderColor: 'border-l-4 border-l-cyan-500 dark:border-l-cyan-400',
    bgTheme: 'border-b-2 border-b-cyan-500 dark:border-b-cyan-400'
  },
  {
    id: 'oqiydi',
    title: "O'qiydi",
    statuses: ["O'qiydi"],
    defaultStatus: "O'qiydi",
    emoji: '🎓',
    dotColor: 'bg-indigo-600 dark:bg-indigo-400',
    leftBorderColor: 'border-l-4 border-l-indigo-650 dark:border-l-indigo-500',
    bgTheme: 'border-b-2 border-b-indigo-500 dark:border-b-indigo-400'
  },
  {
    id: 'shartnoma_berildi',
    title: "Shartnoma",
    statuses: ["Shartnoma berildi"],
    defaultStatus: "Shartnoma berildi",
    emoji: '🤝',
    dotColor: 'bg-emerald-600 dark:bg-emerald-400',
    leftBorderColor: 'border-l-4 border-l-emerald-500 dark:border-l-emerald-400',
    bgTheme: 'border-b-2 border-b-emerald-600 dark:border-b-emerald-400'
  },
  {
    id: 'oqimaydi',
    title: "O'qimaydi",
    statuses: ["O'qimaydi"],
    defaultStatus: "O'qimaydi",
    emoji: '🚫',
    dotColor: 'bg-red-600 dark:bg-red-400',
    leftBorderColor: 'border-l-4 border-l-red-500 dark:border-l-red-400',
    bgTheme: 'border-b-2 border-b-red-500 dark:border-b-red-400'
  },
  {
    id: 'ochirilgan',
    title: "O'chirilgan",
    statuses: ["O'chirilgan"],
    defaultStatus: "O'chirilgan",
    emoji: '📴',
    dotColor: 'bg-stone-600 dark:bg-stone-400',
    leftBorderColor: 'border-l-4 border-l-stone-500 dark:border-l-stone-400',
    bgTheme: 'border-b-2 border-b-stone-500 dark:border-b-stone-400'
  },
  {
    id: 'xato_raqam',
    title: "Xato raqam",
    statuses: ["Xato raqam"],
    defaultStatus: "Xato raqam",
    emoji: '❌',
    dotColor: 'bg-rose-600 dark:bg-rose-450',
    leftBorderColor: 'border-l-4 border-l-rose-550 dark:border-l-rose-400',
    bgTheme: 'border-b-2 border-b-rose-500 dark:border-b-rose-450'
  }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ records = [], operatorId, onUpdateRecord }) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isOverColumn, setIsOverColumn] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [tempIzoh, setTempIzoh] = useState<string>('');

  // Search state within Kanban view
  const [searchQuery, setSearchQuery] = useState('');
  const [viloyatFilter, setViloyatFilter] = useState('ALL');

  const handleDragStart = (e: React.DragEvent, recordId: string) => {
    setDraggedId(recordId);
    e.dataTransfer.setData('text/plain', recordId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setIsOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setIsOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setIsOverColumn(null);
    const recordId = e.dataTransfer.getData('text/plain') || draggedId;
    if (!recordId) return;

    const column = COLUMNS.find(c => c.id === columnId);
    if (!column) return;

    // Trigger update immediately
    onUpdateRecord(recordId, 'natija', column.defaultStatus);
    setDraggedId(null);
  };

  const startEditIzoh = (rec: SchoolRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCardId(rec.id);
    setTempIzoh(rec.izoh || '');
  };

  const saveIzoh = (recordId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateRecord(recordId, 'izoh', tempIzoh.trim());
    setEditingCardId(null);
  };

  // Extract unique regions for filter
  const uniqueViloyatlar = useMemo(() => {
    const list = new Set<string>();
    records.forEach(r => {
      if (r.viloyat) list.add(r.viloyat.trim());
    });
    return Array.from(list).sort();
  }, [records]);

  // Filter records based on searchQuery & region filter
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchSearch = searchQuery.trim() === '' || 
        r.fish.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tel.includes(searchQuery) ||
        (r.izoh && r.izoh.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchViloyat = viloyatFilter === 'ALL' || r.viloyat === viloyatFilter;
      return matchSearch && matchViloyat;
    });
  }, [records, searchQuery, viloyatFilter]);

  return (
    <div className="space-y-4">
      {/* Search and Control Header - 100% Solid & Clear Contrast */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-black text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
            <span className="p-1 px-2.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg">📋</span>
            Mijozlar Kanban Taqsimot Paneli
          </h4>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 font-semibold">
            Jami 9 ta holat bo'yicha mijozlarni sudrab o'tkazing. O'zgarishlar jadvalga darhol ta'sir qiladi.
          </p>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input Field */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
            <input
              type="text"
              placeholder="F.I.SH. yoki telefon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-8 py-1.5 text-xs bg-neutral-100/70 dark:bg-neutral-950 text-neutral-950 dark:text-neutral-50 placeholder-neutral-500 dark:placeholder-neutral-400 border border-neutral-300 dark:border-neutral-750 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Viloyat Select list */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-neutral-500 tracking-wider hidden sm:inline">Hudud:</span>
            <select
              value={viloyatFilter}
              onChange={(e) => setViloyatFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-neutral-100/70 dark:bg-neutral-950 text-neutral-950 dark:text-neutral-50 border border-neutral-300 dark:border-neutral-750 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-555 font-bold"
            >
              <option value="ALL">Barcha hududlar</option>
              {uniqueViloyatlar.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 9 columns HORIZONTAL SCROLL container */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x select-none custom-scrollbar min-w-full">
        {COLUMNS.map(col => {
          // Filter records belonging to this column based on statuses set
          const colRecords = filteredRecords.filter(r => {
            const normalized = r.natija === undefined || r.natija === null ? '' : r.natija;
            return col.statuses.includes(normalized);
          });
          
          const isOver = isOverColumn === col.id;

          return (
            <div
              key={col.id}
              className={`w-[295px] shrink-0 flex flex-col rounded-xl border transition-all duration-300 snap-align-start min-h-[500px] h-[640px] shadow-sm relative ${
                isOver 
                  ? 'border-emerald-550 bg-emerald-550/10 scale-[1.01] ring-2 ring-emerald-500/25'
                  : 'border-neutral-300 dark:border-neutral-800 bg-neutral-150/70 dark:bg-neutral-900/60'
              }`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Kanban Column Header - CRISP BLACK AND WHITE/SLATE TEXT ONLY, NO BLENDING COLORS */}
              <div className={`p-3 rounded-t-xl bg-white dark:bg-neutral-950 ${col.bgTheme} flex items-center justify-between shadow-xs shrink-0`}>
                <div className="flex items-center gap-2 min-w-0">
                  {/* Colored status dot indicator */}
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor} shrink-0 shadow-xs`} />
                  <span className="text-sm shrink-0">{col.emoji}</span>
                  <span className="text-xs font-black truncate text-neutral-950 dark:text-neutral-50 uppercase tracking-wide">
                    {col.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm">
                    {colRecords.length}
                  </span>
                </div>
              </div>

              {/* Column Items area */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                {colRecords.length > 0 ? (
                  colRecords.map(rec => {
                    const isEditing = editingCardId === rec.id;
                    return (
                      <div
                        key={rec.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, rec.id)}
                        className={`bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800/80 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing hover:border-neutral-450 dark:hover:border-neutral-700 relative group animate-fade-in ${col.leftBorderColor}`}
                      >
                        {/* Drag indicator & Row ID */}
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-neutral-200 dark:border-neutral-900">
                          <div className="flex items-center gap-1.5">
                            <span className="text-neutral-400 dark:text-neutral-500 cursor-grab shrink-0 hover:text-neutral-600">
                              <GripVertical size={11} />
                            </span>
                            <span className="text-[9px] font-mono font-black text-neutral-950 bg-neutral-150 dark:text-white dark:bg-zinc-805 px-1.5 py-0.5 rounded-md tracking-wider">
                              № {rec.no}
                            </span>
                          </div>
                          
                          {/* Region label pill */}
                          {rec.viloyat && (
                            <span className="text-[9px] font-extrabold text-neutral-950 dark:text-neutral-200 bg-neutral-100 dark:bg-zinc-900 border border-neutral-250 dark:border-neutral-750 px-2 py-0.5 rounded-md">
                              {rec.viloyat}
                            </span>
                          )}
                        </div>

                        {/* Student Name */}
                        <div className="space-y-2">
                          <h5 className="text-xs md:text-[13px] font-extrabold text-neutral-950 dark:text-neutral-50 leading-snug tracking-tight">
                            {rec.fish}
                          </h5>
                          
                          {/* Phones with distinct high-contrast colors */}
                          <div className="space-y-1 pt-1">
                            <a 
                              href={`tel:${rec.tel}`} 
                              className="flex items-center gap-1.5 text-[11px] font-black text-neutral-950 dark:text-neutral-50 font-mono hover:text-emerald-600 dark:hover:text-emerald-400 animate-pulse-once"
                            >
                              <Phone size={10} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                              {rec.tel}
                            </a>
                            {rec.telQoshimcha && rec.telQoshimcha !== 'Kiritilmagan' && (
                              <a 
                                href={`tel:${rec.telQoshimcha}`} 
                                className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-800 dark:text-neutral-300 font-mono hover:text-emerald-600 dark:hover:text-emerald-400"
                              >
                                <Phone size={8} className="text-neutral-500 shrink-0" />
                                {rec.telQoshimcha}
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Updated date indicator inside card */}
                        <div className="mt-2.5 text-right">
                          <span className="text-[9px] font-mono font-black text-neutral-550 dark:text-neutral-400 flex items-center justify-end gap-1">
                            <Clock size={8} className="text-neutral-500" /> {rec.sana || 'Sana yo\'q'}
                          </span>
                        </div>

                        {/* Comment Section box with solid borders & distinct background */}
                        <div className="mt-2.5 pt-2 border-t border-neutral-200 dark:border-neutral-900">
                          {isEditing ? (
                            <div className="space-y-1.5">
                              <textarea
                                value={tempIzoh}
                                onChange={(e) => setTempIzoh(e.target.value)}
                                placeholder="Izoh yozing..."
                                rows={2}
                                className="w-full text-[10px] bg-neutral-100 dark:bg-neutral-900 border border-neutral-350 dark:border-neutral-750 rounded-lg p-2 text-neutral-950 dark:text-neutral-55 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCardId(null);
                                  }}
                                  className="px-2 py-0.5 bg-neutral-150 hover:bg-neutral-200 dark:bg-neutral-850 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[9px] font-extrabold rounded cursor-pointer animate-fade-in"
                                >
                                  Bekor qil
                                </button>
                                <button
                                  onClick={(e) => saveIzoh(rec.id, e)}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black rounded flex items-center gap-0.5 cursor-pointer shadow-xs"
                                >
                                  <Check size={8} /> Saqlash
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={(e) => startEditIzoh(rec, e)}
                              className="text-[10px] bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-900 dark:hover:bg-neutral-850 border border-neutral-300 dark:border-neutral-800 p-2.5 rounded-lg select-none cursor-pointer transition-colors max-h-20 overflow-y-auto custom-scrollbar flex items-start gap-1.5 text-neutral-950 dark:text-neutral-200 font-semibold"
                              title="Izohni o'zgartirish"
                            >
                              <MessageSquare size={10} className="text-neutral-500 dark:text-neutral-400 mt-0.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                {rec.izoh ? (
                                  <span className="italic text-neutral-900 dark:text-neutral-100">“{rec.izoh}”</span>
                                ) : (
                                  <span className="text-neutral-500 dark:text-neutral-450 italic">+ Izoh qo'shish</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center border border-dashed border-neutral-300 dark:border-neutral-850 rounded-xl text-[10px] text-neutral-500 dark:text-neutral-410 text-center select-none p-4 gap-1.5 bg-white/40 dark:bg-neutral-900/10">
                    <span className="text-lg">📂</span>
                    <span>Hozircha mijoz yo'q</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
