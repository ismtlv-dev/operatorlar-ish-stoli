/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SchoolRecord {
  id: string; // unique ID
  no: number;
  viloyat: string;      // Viloyati
  fish: string;         // Familiya Ism Sharif
  tugulganSana: string; // Tugulgan sanasi
  tel: string;          // Telefon raqami
  telQoshimcha: string; // Qo'shimcha telefon
  natija: string;       // "Ko'tarmadi" | "O'chirilgan" | "O'ylab ko'radi" | "Maslahat qiladi" | "Xato raqam" | "O'qimaydi" | "O'qiydi" | "Shartnoma berildi" | ""
  izoh: string;         // Izoh
  sana?: string;        // O'zgartirilgan sana (Tarix filteri uchun)
  eslatmaVaqti?: string; // Eslatma vaqti (YYYY-MM-DDTHH:mm)
  eslatmaMatni?: string; // Eslatma matni
}

export interface Operator {
  id: string;
  name: string;
  password?: string; // operator login paroli (default '12345')
  records: SchoolRecord[];
}

export interface EditLog {
  id: string;
  operatorId: string;
  operatorName: string;
  schoolName: string;
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: string; // "HH:mm:ss" or Date string
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string; // ISO date string or formatted Tashkent date-time
  isAnnouncement?: boolean;
}

export type StatusFilter = 'all' | 'Ko\'tarmadi' | 'O\'chirilgan' | 'O\'ylab ko\'radi' | 'Maslahat qiladi' | 'Xato raqam' | 'O\'qimaydi' | 'O\'qiydi' | 'Shartnoma berildi' | 'Kutilmoqda';

export interface CallHistoryEntry {
  id: string;
  operatorId: string;
  operatorName: string;
  clientName: string;
  clientTel: string;
  clientViloyat: string;
  status: string; // e.g. "Ko'tarmadi", "O'chirilgan", etc.
  izoh: string;
  timestamp: string; // "DD.MM.YYYY HH:mm:ss" or Tashkent date-time down to second
  date: string; // "DD.MM.YYYY"
}


