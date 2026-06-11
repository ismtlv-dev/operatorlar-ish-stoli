/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SchoolRecord } from '../types';
import { Search, AlertCircle, Copy, Check, Send, Plus, ArrowUpDown } from 'lucide-react';

interface OperatorTableProps {
  records: SchoolRecord[];
  onUpdateRecord: (id: string, field: 'viloyat' | 'fish' | 'tugulganSana' | 'tel' | 'telQoshimcha' | 'natija' | 'izoh' | 'eslatmaVaqti' | 'eslatmaMatni', value: string) => void;
  onDeleteRecord?: (id: string) => void;
  onAddRecord?: (record: Omit<SchoolRecord, 'id'>) => void;
  isAdmin?: boolean;
  highlightTerm?: string;
  defaultStatusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  onStartCallTimer?: (phone: string, clientName: string) => void;
}

const RESULT_OPTIONS = [
  { value: 'all', label: 'Barcha holatlar' },
  { value: "Ko'tarmadi", label: "📞 Ko'tarmadi", color: 'bg-transparent border-2 border-orange-500 text-orange-600 dark:text-orange-400 font-bold' },
  { value: "O'chirilgan", label: "📴 O'chirilgan", color: 'bg-transparent border-2 border-neutral-400 text-neutral-600 dark:text-neutral-450 font-bold' },
  { value: "O'ylab ko'radi", label: "🤔 O'ylab ko'radi", color: 'bg-transparent border-2 border-yellow-500 text-yellow-600 dark:text-yellow-400 font-bold' },
  { value: "Maslahat qiladi", label: "👥 Maslahat qiladi", color: 'bg-transparent border-2 border-sky-500 text-sky-600 dark:text-sky-400 font-bold' },
  { value: "Xato raqam", label: "❌ Xato raqam", color: 'bg-transparent border-2 border-rose-500 text-rose-600 dark:text-rose-455 font-bold' },
  { value: "O'qimaydi", label: "🚫 O'qimaydi", color: 'bg-transparent border-2 border-red-500 text-red-600 dark:text-red-405 font-bold' },
  { value: "O'qiydi", label: "🎓 O'qiydi", color: 'bg-transparent border-2 border-indigo-500 text-indigo-650 dark:text-indigo-400 font-bold' },
  { value: "Shartnoma berildi", label: "📄 Shartnoma berildi", color: 'bg-transparent border-2 border-emerald-500 text-emerald-650 dark:text-emerald-400 font-bold' },
  { value: '', label: '⏳ Kutilmoqda', color: 'bg-transparent border-2 border-neutral-300 text-neutral-550 dark:border-neutral-700 dark:text-neutral-400 font-bold' }
];

/* Custom search highlight helper */
const highlightText = (text: string, search: string) => {
  if (!text) return "";
  if (!search || !search.trim()) return <>{text}</>;
  
  const cleanSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${cleanSearch})`, 'gi');
  const parts = text.split(regex);

  // split() capture-guruh bilan: toq indekslar - mos tushgan bo'laklar
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-neutral-900 dark:text-neutral-50 px-0.5 rounded font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export const OperatorTable: React.FC<OperatorTableProps> = ({
  records = [],
  onUpdateRecord,
  onDeleteRecord,
  onAddRecord,
  isAdmin = false,
  highlightTerm = "",
  defaultStatusFilter,
  onStatusFilterChange,
  onStartCallTimer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viloyatFilter, setViloyatFilter] = useState('');
  
  const [localStatusFilter, setLocalStatusFilter] = useState('all');
  const statusFilter = defaultStatusFilter !== undefined ? defaultStatusFilter : localStatusFilter;
  const setStatusFilter = onStatusFilterChange !== undefined ? onStatusFilterChange : setLocalStatusFilter;

  // Track active callback reminder schedule recordID
  const [schedulerRecordId, setSchedulerRecordId] = useState<string | null>(null);

  const [sanaFilter, setSanaFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Sorting setup
  const [sortField, setSortField] = useState<'no' | 'viloyat' | 'fish' | 'tugulganSana'>('no');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Drag and drop columns setup
  const [columnIds, setColumnIds] = useState<string[]>(['viloyat', 'fish', 'tugulganSana', 'tel', 'telQoshimcha', 'natija', 'izoh']);
  const [draggedCol, setDraggedCol] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedCol(colId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!draggedCol || draggedCol === targetColId) return;
    
    const currentIdx = columnIds.indexOf(draggedCol);
    const targetIdx = columnIds.indexOf(targetColId);
    
    const updated = [...columnIds];
    updated.splice(currentIdx, 1);
    updated.splice(targetIdx, 0, draggedCol);
    
    setColumnIds(updated);
  };

  const handleDragEnd = () => {
    setDraggedCol(null);
  };

  // Add record dialog state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newViloyat, setNewViloyat] = useState('');
  const [newFish, setNewFish] = useState('');
  const [newTugulganSana, setNewTugulganSana] = useState('');
  const [newTel, setNewTel] = useState('');
  const [newTelQoshimcha, setNewTelQoshimcha] = useState('');

  // Handle Sort
  const handleSort = (field: 'no' | 'viloyat' | 'fish' | 'tugulganSana') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Extract unique regions (Viloyat) for filtering
  const allViloyats = Array.from(new Set(records.map(r => r.viloyat).filter(Boolean)));

  // Extract unique dates for history filter
  const allSanas = Array.from(new Set(records.map(r => r.sana).filter(Boolean))) as string[];
  allSanas.sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('.').map(Number);
    const [dayB, monthB, yearB] = b.split('.').map(Number);
    const timeA = new Date(yearA, monthA - 1, dayA).getTime();
    const timeB = new Date(yearB, monthB - 1, dayB).getTime();
    return timeB - timeA;
  });

  // Combine search string
  const activeSearch = searchTerm.trim() || highlightTerm.trim();

  // Filter records
  const filteredRecords = records.filter(record => {
    const matchesSearch = !activeSearch || 
      (record.fish || '').toLowerCase().includes(activeSearch.toLowerCase()) ||
      (record.viloyat || '').toLowerCase().includes(activeSearch.toLowerCase()) ||
      (record.tel || '').includes(activeSearch) ||
      (record.telQoshimcha || '').includes(activeSearch) ||
      record.no.toString().includes(activeSearch) ||
      (record.tugulganSana || '').includes(activeSearch);

    const matchesViloyat = !viloyatFilter || record.viloyat === viloyatFilter;
    const matchesSana = !sanaFilter || record.sana === sanaFilter;
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = record.natija === statusFilter;
    }

    return matchesSearch && matchesViloyat && matchesSana && matchesStatus;
  });

  // Sort records
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }

    const strA = String(valA || '').toLowerCase();
    const strB = String(valB || '').toLowerCase();

    if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
    if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Selected Row State
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Set first row as selected by default if nothing is selected yet
  React.useEffect(() => {
    if (!selectedRecordId && sortedRecords.length > 0) {
      setSelectedRecordId(sortedRecords[0].id);
    }
  }, [sortedRecords, selectedRecordId]);

  // Copy phone helper
  const handleCopyPhone = (id: string, phone: string) => {
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('998') && cleanPhone.length > 9) {
      cleanPhone = cleanPhone.substring(3);
    }
    navigator.clipboard.writeText(cleanPhone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);

    if (onStartCallTimer) {
      // Find matching record
      const actualId = id.replace('_q', '');
      const matched = records.find(r => r.id === actualId);
      onStartCallTimer(phone, matched ? matched.fish : "Mijoz");
    }
  };

  // Keyboard Navigation & Action Hotkeys Effect
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (sortedRecords.length === 0) return;
      const currentIndex = sortedRecords.findIndex(r => r.id === selectedRecordId);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, sortedRecords.length - 1);
        if (sortedRecords[nextIndex]) {
          setSelectedRecordId(sortedRecords[nextIndex].id);
          const el = document.getElementById(`row-${sortedRecords[nextIndex].id}`);
          if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        if (sortedRecords[prevIndex]) {
          setSelectedRecordId(sortedRecords[prevIndex].id);
          const el = document.getElementById(`row-${sortedRecords[prevIndex].id}`);
          if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const activeRec = sortedRecords.find(r => r.id === selectedRecordId);
        if (activeRec) {
          handleCopyPhone(activeRec.id, activeRec.tel);
        }
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
         const activeRec = sortedRecords.find(r => r.id === selectedRecordId);
         if (activeRec) {
           setSchedulerRecordId(prev => prev === activeRec.id ? null : activeRec.id);
         }
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        const activeRec = sortedRecords.find(r => r.id === selectedRecordId);
        if (activeRec) {
          const izohInput = document.getElementById(`izoh-input-${activeRec.id}`);
          if (izohInput) {
            (izohInput as HTMLInputElement).focus();
            (izohInput as HTMLInputElement).select();
          }
        }
      } else if (['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(e.key)) {
        e.preventDefault();
        const activeRec = sortedRecords.find(r => r.id === selectedRecordId);
        if (activeRec) {
          let targetStatus = '';
          if (e.key === '1') targetStatus = "Ko'tarmadi";
          else if (e.key === '2') targetStatus = "O'chirilgan";
          else if (e.key === '3') targetStatus = "O'ylab ko'radi";
          else if (e.key === '4') targetStatus = "Maslahat qiladi";
          else if (e.key === '5') targetStatus = "Xato raqam";
          else if (e.key === '6') targetStatus = "O'qimaydi";
          else if (e.key === '7') targetStatus = "O'qiydi";
          else if (e.key === '8') targetStatus = "Shartnoma berildi";
          else if (e.key === '9' || e.key === '0') targetStatus = "";

          onUpdateRecord(activeRec.id, 'natija', targetStatus);
          
          // Show trigger notification
          console.log("Status key updated active record: ", activeRec.id, "to", targetStatus);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRecordId, sortedRecords]);

  // Submit new record
  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViloyat || !newFish || !newTel) {
      alert("Iltimos, asosiy maydonlarni (Viloyat, F.I.Sh va Telefon) to'ldiring!");
      return;
    }

    if (onAddRecord) {
      const nextNo = records.length > 0 ? Math.max(...records.map(r => r.no)) + 1 : 1;
      onAddRecord({
        no: nextNo,
        viloyat: newViloyat,
        fish: newFish,
        tugulganSana: newTugulganSana || 'Kiritilmagan',
        tel: newTel,
        telQoshimcha: newTelQoshimcha || 'Kiritilmagan',
        natija: '',
        izoh: ''
      });
      // clear
      setNewViloyat('');
      setNewFish('');
      setNewTugulganSana('');
      setNewTel('');
      setNewTelQoshimcha('');
      setShowAddForm(false);
    }
  };

  // Calculate summary stats for the selected date
  const selectedDateRecords = records.filter(r => r.sana === sanaFilter);
  const totalCallsOnDate = selectedDateRecords.length;
  
  const statsOnDate = {
    kotarmadi: selectedDateRecords.filter(r => r.natija === "Ko'tarmadi").length,
    ochirilgan: selectedDateRecords.filter(r => r.natija === "O'chirilgan").length,
    oylabKoradi: selectedDateRecords.filter(r => r.natija === "O'ylab ko'radi").length,
    maslahatQiladi: selectedDateRecords.filter(r => r.natija === "Maslahat qiladi").length,
    xatoRaqam: selectedDateRecords.filter(r => r.natija === "Xato raqam").length,
    oqimaydi: selectedDateRecords.filter(r => r.natija === "O'qimaydi").length,
    oqiydi: selectedDateRecords.filter(r => r.natija === "O'qiydi").length,
    shartnomaBerildi: selectedDateRecords.filter(r => r.natija === "Shartnoma berildi").length,
    kutilmoqda: selectedDateRecords.filter(r => r.natija === "").length,
  };

  // Helper to render draggable headers
  const renderHeaderCell = (id: string) => {
    switch (id) {
      case 'viloyat':
        return (
          <th 
            key="viloyat"
            draggable
            onDragStart={(e) => handleDragStart(e, 'viloyat')}
            onDragOver={(e) => handleDragOver(e, 'viloyat')}
            onDragEnd={handleDragEnd}
            className={`p-2 font-bold text-neutral-600 dark:text-neutral-350 border-r border-b border-neutral-200 dark:border-neutral-800 cursor-grab active:cursor-grabbing hover:bg-neutral-150 dark:hover:bg-neutral-800 text-center select-none ${draggedCol === 'viloyat' ? 'opacity-40 bg-neutral-100 dark:bg-neutral-800' : ''}`}
            onClick={() => handleSort('viloyat')}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] text-neutral-400">⋮⋮</span>
              Viloyati <ArrowUpDown size={10} className="opacity-60" />
            </div>
          </th>
        );
      case 'fish':
        return (
          <th 
            key="fish"
            draggable
            onDragStart={(e) => handleDragStart(e, 'fish')}
            onDragOver={(e) => handleDragOver(e, 'fish')}
            onDragEnd={handleDragEnd}
            className={`p-2 font-bold text-neutral-600 dark:text-neutral-350 border-r border-b border-neutral-200 dark:border-neutral-800 cursor-grab active:cursor-grabbing hover:bg-neutral-150 dark:hover:bg-neutral-800 text-center select-none ${draggedCol === 'fish' ? 'opacity-40 bg-neutral-100 dark:bg-neutral-800' : ''}`}
            onClick={() => handleSort('fish')}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] text-neutral-400">⋮⋮</span>
              Familiya Ism Sharif <ArrowUpDown size={10} className="opacity-60" />
            </div>
          </th>
        );
      case 'tugulganSana':
        return (
          <th 
            key="tugulganSana"
            draggable
            onDragStart={(e) => handleDragStart(e, 'tugulganSana')}
            onDragOver={(e) => handleDragOver(e, 'tugulganSana')}
            onDragEnd={handleDragEnd}
            className={`p-2 font-bold text-neutral-600 dark:text-neutral-350 border-r border-b border-neutral-200 dark:border-neutral-800 cursor-grab active:cursor-grabbing hover:bg-neutral-150 dark:hover:bg-neutral-800 text-center select-none w-36 ${draggedCol === 'tugulganSana' ? 'opacity-40 bg-neutral-100 dark:bg-neutral-800' : ''}`}
            onClick={() => handleSort('tugulganSana')}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] text-neutral-400">⋮⋮</span>
              Tugulgan sanasi <ArrowUpDown size={10} className="opacity-60" />
            </div>
          </th>
        );
      case 'tel':
        return (
          <th 
            key="tel"
            draggable
            onDragStart={(e) => handleDragStart(e, 'tel')}
            onDragOver={(e) => handleDragOver(e, 'tel')}
            onDragEnd={handleDragEnd}
            className={`p-2 font-bold text-neutral-600 dark:text-neutral-350 border-r border-b border-neutral-200 dark:border-neutral-800 cursor-grab active:cursor-grabbing hover:bg-neutral-150 dark:hover:bg-neutral-800 text-center select-none min-w-[180px] ${draggedCol === 'tel' ? 'opacity-40 bg-neutral-100 dark:bg-neutral-800' : ''}`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] text-neutral-400">⋮⋮</span>
              Telefon raqami
            </div>
          </th>
        );
      case 'telQoshimcha':
        return (
          <th 
            key="telQoshimcha"
            draggable
            onDragStart={(e) => handleDragStart(e, 'telQoshimcha')}
            onDragOver={(e) => handleDragOver(e, 'telQoshimcha')}
            onDragEnd={handleDragEnd}
            className={`p-2 font-bold text-neutral-600 dark:text-neutral-350 border-r border-b border-neutral-200 dark:border-neutral-800 cursor-grab active:cursor-grabbing hover:bg-neutral-150 dark:hover:bg-neutral-800 text-center select-none min-w-[160px] ${draggedCol === 'telQoshimcha' ? 'opacity-40 bg-neutral-100 dark:bg-neutral-800' : ''}`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] text-neutral-400">⋮⋮</span>
              Qo'shimcha telefon
            </div>
          </th>
        );
      case 'natija':
        return (
          <th 
            key="natija"
            draggable
            onDragStart={(e) => handleDragStart(e, 'natija')}
            onDragOver={(e) => handleDragOver(e, 'natija')}
            onDragEnd={handleDragEnd}
            className={`p-2 font-bold text-neutral-600 dark:text-neutral-350 border-r border-b border-neutral-200 dark:border-neutral-800 cursor-grab active:cursor-grabbing hover:bg-neutral-150 dark:hover:bg-neutral-800 text-center select-none w-44 ${draggedCol === 'natija' ? 'opacity-40 bg-neutral-100 dark:bg-neutral-800' : ''}`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] text-neutral-400">⋮⋮</span>
              Natija (Holat)
            </div>
          </th>
        );
      case 'izoh':
        return (
          <th 
            key="izoh"
            draggable
            onDragStart={(e) => handleDragStart(e, 'izoh')}
            onDragOver={(e) => handleDragOver(e, 'izoh')}
            onDragEnd={handleDragEnd}
            className={`p-2 font-bold text-neutral-600 dark:text-neutral-350 border-b border-neutral-200 dark:border-neutral-800 cursor-grab active:cursor-grabbing hover:bg-neutral-150 dark:hover:bg-neutral-800 text-center select-none w-64 ${draggedCol === 'izoh' ? 'opacity-40 bg-neutral-100' : ''}`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] text-neutral-400">⋮⋮</span>
              IZOH
            </div>
          </th>
        );
      default:
        return null;
    }
  };

  // Helper to render corresponding cells
  const renderCell = (id: string, record: SchoolRecord, inputTxtClass: string, selectedOption: any) => {
    switch (id) {
      case 'viloyat':
        return (
          <td key="viloyat" className={`p-0 border-r border-neutral-200 dark:border-neutral-800 min-w-[150px] ${draggedCol === 'viloyat' ? 'bg-neutral-100/30 dark:bg-neutral-900/30' : ''}`}>
            <div className={`w-full text-xs px-2.5 py-2 whitespace-normal break-words leading-snug ${inputTxtClass}`}>
              {highlightText(record.viloyat, activeSearch)}
            </div>
          </td>
        );
      case 'fish':
        return (
          <td key="fish" className={`p-0 border-r border-neutral-200 dark:border-neutral-800 min-w-[200px] ${draggedCol === 'fish' ? 'bg-neutral-100/30 dark:bg-neutral-900/30' : ''}`}>
            <div className={`w-full text-xs px-2.5 py-2 whitespace-normal break-words leading-snug font-bold ${inputTxtClass}`}>
              {highlightText(record.fish, activeSearch)}
            </div>
          </td>
        );
      case 'tugulganSana':
        return (
          <td key="tugulganSana" className={`p-0 border-r border-neutral-200 dark:border-neutral-800 ${draggedCol === 'tugulganSana' ? 'bg-neutral-100/30 dark:bg-neutral-900/30' : ''}`}>
            <input
              type="text"
              className="w-full text-xs bg-transparent focus:bg-white focus:dark:bg-[#151515] px-2.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-mono text-neutral-800 dark:text-neutral-100"
              value={record.tugulganSana}
              onChange={(e) => onUpdateRecord(record.id, 'tugulganSana', e.target.value)}
            />
          </td>
        );
      case 'tel':
        return (
          <td key="tel" className={`p-0 border-r border-neutral-200 dark:border-neutral-800 min-w-[200px] ${draggedCol === 'tel' ? 'bg-neutral-100/30 dark:bg-neutral-900/30' : ''}`}>
            <div className="flex items-center justify-between group/cell relative px-2.5 py-2">
              <span 
                onClick={() => handleCopyPhone(record.id, record.tel)}
                className="flex-1 text-xs font-mono font-bold text-neutral-800 dark:text-neutral-100 hover:text-emerald-600 dark:hover:text-emerald-450 cursor-pointer select-all whitespace-nowrap flex items-center gap-1.5 group/phone active:scale-95 transition-all"
                title="Nusxa olish va muloqot taymerini boshlash uchun bosing"
              >
                {highlightText(record.tel, activeSearch)}
                {copiedId === record.id ? (
                  <span className="text-[10px] font-sans font-black text-emerald-650 dark:text-emerald-400 animate-pulse">✓ nusxa %998-siz</span>
                ) : (
                  <span className="text-[9px] font-sans text-neutral-400 opacity-0 group-hover/phone:opacity-100 transition-opacity">📋 nusxalash</span>
                )}
              </span>
              <div className="flex items-center shrink-0 ml-1">
                {(() => {
                  const cleanPhone = record.tel.replace(/[^0-9]/g, '');
                  const tgPhone = cleanPhone.length === 9 ? `998${cleanPhone}` : cleanPhone;
                  return (
                    <a
                      href={`https://t.me/+${tgPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-500 hover:text-sky-550 hover:bg-neutral-300 dark:hover:bg-neutral-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ml-1 flex items-center justify-center"
                      title="Telegram orqali bog'lanish"
                    >
                      <Send size={10} />
                    </a>
                  );
                })()}
              </div>
            </div>
          </td>
        );
      case 'telQoshimcha':
        return (
          <td key="telQoshimcha" className={`p-0 border-r border-neutral-200 dark:border-neutral-800 ${draggedCol === 'telQoshimcha' ? 'bg-neutral-100/30 dark:bg-neutral-900/30' : ''}`}>
            <div className="flex items-center justify-between group/cell relative pr-1">
              <input
                type="text"
                className="flex-1 text-xs bg-transparent focus:bg-white focus:dark:bg-[#151515] px-2.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-mono text-neutral-800 dark:text-neutral-100"
                value={record.telQoshimcha}
                onChange={(e) => onUpdateRecord(record.id, 'telQoshimcha', e.target.value)}
              />
              <div className="flex items-center shrink-0 ml-1">
                <button
                  type="button"
                  onClick={() => handleCopyPhone(record.id + "_q", record.telQoshimcha)}
                  className="p-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-500 hover:text-emerald-600 hover:bg-neutral-300 dark:hover:bg-neutral-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  title="Nusxa olish"
                >
                  {copiedId === record.id + "_q" ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                </button>
                {(() => {
                  const cleanPhone = record.telQoshimcha.replace(/[^0-9]/g, '');
                  if (!cleanPhone) return null;
                  const tgPhone = cleanPhone.length === 9 ? `998${cleanPhone}` : cleanPhone;
                  return (
                    <a
                      href={`https://t.me/+${tgPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-500 hover:text-sky-550 hover:bg-neutral-300 dark:hover:bg-neutral-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ml-1 flex items-center justify-center"
                      title="Telegram orqali bog'lanish"
                    >
                      <Send size={10} />
                    </a>
                  );
                })()}
              </div>
            </div>
          </td>
        );
      case 'natija':
        return (
          <td key="natija" className={`p-1 border-r border-neutral-200 dark:border-neutral-800 ${draggedCol === 'natija' ? 'bg-neutral-100/30 dark:bg-neutral-900/30' : ''}`}>
            <select
              className={`w-full text-xs font-semibold py-1.5 px-2 rounded border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${selectedOption.color || 'bg-white text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100'}`}
              value={record.natija}
              onChange={(e) => onUpdateRecord(record.id, 'natija', e.target.value)}
            >
              <option value="">-- Kutilmoqda --</option>
              <option value="Ko'tarmadi">📞 Ko'tarmadi</option>
              <option value="O'chirilgan">📴 O'chirilgan</option>
              <option value="O'ylab ko'radi">🤔 O'ylab ko'radi</option>
              <option value="Maslahat qiladi">👥 Maslahat qiladi</option>
              <option value="Xato raqam">❌ Xato raqam</option>
              <option value="O'qimaydi">🚫 O'qimaydi</option>
              <option value="O'qiydi">🎓 O'qiydi</option>
              <option value="Shartnoma berildi">📄 Shartnoma berildi</option>
            </select>
          </td>
        );
      case 'izoh':
        return (
          <td key="izoh" className={`p-0 border-r border-neutral-200 dark:border-neutral-800 relative ${draggedCol === 'izoh' ? 'bg-neutral-100/30 dark:bg-neutral-900/30' : ''}`}>
            <div className="flex items-center gap-1.5 px-2.5">
              <input
                type="text"
                id={`izoh-input-${record.id}`}
                placeholder="Izoh yozishingiz mumkin..."
                className="flex-1 bg-transparent border-none py-2 text-xs text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-0 min-w-[120px]"
                value={record.izoh}
                onChange={(e) => onUpdateRecord(record.id, 'izoh', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setSchedulerRecordId(schedulerRecordId === record.id ? null : record.id)}
                className={`p-1.5 rounded-lg transition-all duration-200 select-none active:scale-90 ${
                  record.eslatmaVaqti 
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/55 dark:text-amber-450 hover:bg-amber-200' 
                    : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                title={record.eslatmaVaqti ? `Eslatma soatlangany: ${new Date(record.eslatmaVaqti).toLocaleDateString()} ${new Date(record.eslatmaVaqti).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} da` : "Eslatma (Qayta qo'ngiroq) belgilash"}
              >
                <span className={`${record.eslatmaVaqti ? 'animate-bounce block' : ''}`}>🔔</span>
              </button>
            </div>
            {record.eslatmaVaqti && (
              <div className="mx-2.5 mb-1.5 px-2 py-0.5 rounded-md bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 text-[10px] text-amber-850 dark:text-amber-300 font-bold flex items-center justify-between">
                <span className="truncate">
                  📅 {record.eslatmaVaqti.replace('T', ' ')}: {record.eslatmaMatni || "Izohsiz"}
                </span>
              </div>
            )}
            {schedulerRecordId === record.id && (
              <div className="absolute right-0 top-full z-10 w-72 p-3 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-lg shadow-xl space-y-2 text-left">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-750 dark:text-amber-450">
                  <span>📅 Qayta qo'ngiroq vaqti</span>
                  <button type="button" onClick={() => setSchedulerRecordId(null)} className="text-neutral-500 hover:text-neutral-900 font-bold">×</button>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 mb-0.5">Sana va vaqtni tanlang:</label>
                    <input
                      type="datetime-local"
                      className="w-full text-xs bg-white dark:bg-neutral-850 border border-neutral-350 dark:border-neutral-700 rounded p-1 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      value={record.eslatmaVaqti || ''}
                      onChange={(e) => onUpdateRecord(record.id, 'eslatmaVaqti', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 mb-0.5">Eslatma sababi:</label>
                    <input
                      type="text"
                      placeholder="Masalan: Erta soat 14:00 da qayta tel qiling..."
                      className="w-full text-xs bg-white dark:bg-neutral-850 border border-neutral-350 dark:border-neutral-700 rounded p-1 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      value={record.eslatmaMatni || ''}
                      onChange={(e) => onUpdateRecord(record.id, 'eslatmaMatni', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-1.5 pt-1">
                  {record.eslatmaVaqti && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateRecord(record.id, 'eslatmaVaqti', '');
                        onUpdateRecord(record.id, 'eslatmaMatni', '');
                        setSchedulerRecordId(null);
                      }}
                      className="px-2 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded text-[10px] font-bold transition-all text-left"
                    >
                      Eslatmani o'chirish
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSchedulerRecordId(null)}
                    className="px-3 py-1 bg-neutral-200 hover:bg-neutral-305 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-[10px] font-bold transition-all"
                  >
                    Yopish
                  </button>
                </div>
              </div>
            )}
          </td>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
      
      {/* Table Controllers */}
      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-stretch sm:items-center">
          {/* Detailed Search input */}
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Ism, viloyat yoki tel..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 rounded-md border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Viloyat filter dropdown */}
          <select
            className="text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 focus:outline-none"
            value={viloyatFilter}
            onChange={(e) => setViloyatFilter(e.target.value)}
          >
            <option value="">Barcha viloyatlar</option>
            {allViloyats.map(viloyat => (
              <option key={viloyat} value={viloyat}>{viloyat}</option>
            ))}
          </select>

          {/* Status color coded filter */}
          <select
            className="text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {RESULT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Sana (Tarix) filter dropdown */}
          <select
            className="text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 focus:outline-none"
            value={sanaFilter}
            onChange={(e) => setSanaFilter(e.target.value)}
          >
            <option value="">Barcha sanalar (Tarix)</option>
            {allSanas.map(sana => (
              <option key={sana} value={sana}>📅 {sana}</option>
            ))}
          </select>
        </div>

        {/* Add Record Button */}
        {onAddRecord && isAdmin && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 self-stretch sm:self-auto transition-colors"
          >
            <Plus size={14} />
            Yangi ma'lumot qo'shish
          </button>
        )}
      </div>

      {/* Date History Stats Panel */}
      {sanaFilter && (
        <div className="px-4 py-3 bg-neutral-100/70 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-2 items-center text-xs">
          <span className="font-bold text-neutral-700 dark:text-neutral-300">
            📅 {sanaFilter} tarixidagi qo'ngiroqlar jami: <span className="text-emerald-650 dark:text-emerald-400 font-extrabold text-sm">{totalCallsOnDate} ta</span>
          </span>
          <div className="flex flex-wrap gap-1.5 ml-2">
            {statsOnDate.kotarmadi > 0 && <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300">📞 {statsOnDate.kotarmadi}</span>}
            {statsOnDate.ochirilgan > 0 && <span className="px-2 py-0.5 rounded bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">📴 {statsOnDate.ochirilgan}</span>}
            {statsOnDate.oylabKoradi > 0 && <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">🤔 {statsOnDate.oylabKoradi}</span>}
            {statsOnDate.maslahatQiladi > 0 && <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-850 dark:bg-sky-950/40 dark:text-sky-300">👥 {statsOnDate.maslahatQiladi}</span>}
            {statsOnDate.xatoRaqam > 0 && <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">❌ {statsOnDate.xatoRaqam}</span>}
            {statsOnDate.oqimaydi > 0 && <span className="px-2 py-0.5 rounded bg-rose-200 text-red-800 dark:bg-rose-950/40 dark:text-rose-300">🚫 {statsOnDate.oqimaydi}</span>}
            {statsOnDate.oqiydi > 0 && <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-805 dark:bg-indigo-950/40 dark:text-indigo-300">🎓 {statsOnDate.oqiydi}</span>}
            {statsOnDate.shartnomaBerildi > 0 && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-805 dark:bg-emerald-950/40 dark:text-emerald-300">📄 {statsOnDate.shartnomaBerildi}</span>}
          </div>
        </div>
      )}

      {/* Add Record Form Inline Modal */}
      {showAddForm && (
        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 animate-fade-in-up">
          <form onSubmit={handleCreateRecord} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Viloyat *</label>
              <input
                type="text"
                required
                placeholder="Buxoro viloyati..."
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-neutral-850 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={newViloyat}
                onChange={(e) => setNewViloyat(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Familiya Ism Sharif *</label>
              <input
                type="text"
                required
                placeholder="Adizova Nozanin..."
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-neutral-850 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={newFish}
                onChange={(e) => setNewFish(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Tugulgan sanasi</label>
              <input
                type="text"
                placeholder="DD.MM.YYYY"
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-neutral-850 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={newTugulganSana}
                onChange={(e) => setNewTugulganSana(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Telefon raqami *</label>
              <input
                type="text"
                required
                placeholder="507718335"
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-neutral-850 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={newTel}
                onChange={(e) => setNewTel(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">Qo'shimcha telefon</label>
              <input
                type="text"
                placeholder="Qo'shimcha telefon..."
                className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-neutral-850 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={newTelQoshimcha}
                onChange={(e) => setNewTelQoshimcha(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 md:col-span-5 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded"
              >
                Saqlash
              </button>
            </div>
          </form>
        </div>
      )}



      {/* Main spreadsheet rendering */}
      <div className="overflow-x-auto border-t border-neutral-200 dark:border-neutral-800">
        <table className="w-full border-collapse text-left text-xs text-neutral-700 dark:text-neutral-300">
          <thead>
            {/* 1. Columns letters row (Google Sheets Style) */}
            <tr className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 select-none">
              <th className="bg-neutral-150/70 dark:bg-neutral-900 w-10 text-center text-[10px] font-bold text-neutral-450 dark:text-neutral-500 border-r border-b border-neutral-200 dark:border-neutral-800 p-1 font-mono">
                {/* empty top left corner */}
              </th>
              {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((letter) => (
                <th 
                  key={letter} 
                  className="bg-neutral-150/70 dark:bg-neutral-900 text-center text-[10px] font-bold text-neutral-500 dark:text-neutral-450 border-r border-b border-neutral-200 dark:border-neutral-800 p-1 font-mono"
                >
                  {letter}
                </th>
              ))}
            </tr>

            {/* 2. Spreadsheet Row 1 (Header titles) */}
            <tr className="bg-neutral-50 dark:bg-neutral-900/60 select-none">
              {/* Row Number 1 cell */}
              <td className="bg-neutral-150/70 dark:bg-neutral-900 text-center text-[10px] font-bold text-neutral-550 dark:text-neutral-450 border-r border-b border-neutral-200 dark:border-neutral-800 p-1.5 font-mono select-none">
                1
              </td>
              
              {columnIds.map(id => renderHeaderCell(id))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {sortedRecords.length > 0 ? (
              sortedRecords.map((record, index) => {
                const rowNumber = index + 2; // Rows start at 2 since Row 1 is header
                const selectedOption = RESULT_OPTIONS.find(o => o.value === record.natija) || RESULT_OPTIONS[RESULT_OPTIONS.length - 1];

                // Dynamically get spreadsheet row bg based on status
                let rowBgClass = "";
                let inputTxtClass = "text-neutral-800 dark:text-neutral-100";
                
                if (record.natija === "O'ylab ko'radi") {
                  // Beautiful soft yellow background - exactly like the user's screenshot yellow row!
                  rowBgClass = "bg-yellow-100/80 hover:bg-yellow-200/80 dark:bg-yellow-950/30 dark:hover:bg-yellow-900/40";
                  inputTxtClass = "text-yellow-900 dark:text-yellow-300 font-semibold";
                } else if (record.natija === "Maslahat qiladi") {
                  rowBgClass = "bg-sky-50/70 hover:bg-sky-100 dark:bg-sky-950/20 dark:hover:bg-sky-900/30";
                  inputTxtClass = "text-sky-900 dark:text-sky-300 font-semibold";
                } else if (record.natija === "Ko'tarmadi") {
                  rowBgClass = "bg-orange-50/70 hover:bg-orange-100/70 dark:bg-orange-950/20 dark:hover:bg-orange-900/30";
                  inputTxtClass = "text-orange-900 dark:text-orange-300 font-semibold";
                } else if (record.natija === "Xato raqam" || record.natija === "O'qimaydi") {
                  rowBgClass = "bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30";
                  inputTxtClass = "text-rose-900 dark:text-rose-300 font-semibold";
                } else if (record.natija === "O'chirilgan") {
                  rowBgClass = "bg-neutral-100/50 hover:bg-neutral-150 dark:bg-neutral-900/10 dark:hover:bg-neutral-850/20";
                  inputTxtClass = "text-neutral-500 dark:text-neutral-400 font-semibold";
                } else if (record.natija === "O'qiydi") {
                  rowBgClass = "bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30";
                  inputTxtClass = "text-indigo-900 dark:text-indigo-300 font-semibold";
                } else if (record.natija === "Shartnoma berildi") {
                  rowBgClass = "bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30";
                  inputTxtClass = "text-emerald-900 dark:text-emerald-305 font-semibold";
                } else {
                  // Default striped / clean background
                  rowBgClass = index % 2 === 1 
                    ? "bg-neutral-50/50 hover:bg-neutral-100/50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900/50" 
                    : "bg-white hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900/50";
                }

                return (
                  <tr 
                    key={record.id} 
                    id={`row-${record.id}`}
                    onClick={() => setSelectedRecordId(record.id)}
                    className={`${rowBgClass} transition-all duration-150 group border-b border-neutral-200 dark:border-neutral-800 ${selectedRecordId === record.id ? 'bg-emerald-50/15 dark:bg-emerald-950/10 border-l-4 border-l-emerald-600 outline outline-1 outline-emerald-500/30' : ''}`}
                  >
                    {/* Row Index Number Column */}
                    <td className="bg-neutral-150/70 dark:bg-neutral-900 text-center text-[10px] font-bold text-neutral-500 dark:text-neutral-450 border-r border-neutral-200 dark:border-neutral-800 p-1.5 font-mono select-none">
                      {rowNumber}
                    </td>

                    {columnIds.map(id => renderCell(id, record, inputTxtClass, selectedOption))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columnIds.length + 1} className="p-8 text-center text-neutral-400">
                  <AlertCircle size={24} className="mx-auto text-neutral-300 mb-2" />
                  Ushbu shartlarga mos keladigan ma'lumotlar topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Grid footer */}
      <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 text-neutral-500 text-[10px] flex items-center justify-between font-mono select-none">
        <span>Sarlavhadan saralash uchun xonalarni bosing.</span>
        <span>Ko'rsatilmoqda: {sortedRecords.length} tadan {records.length} ta yozuv</span>
      </div>
    </div>
  );
};
