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
  natija: string;       // "Ko'tarmadi" | "O'chirilgan" | "O'ylab ko'radi" | "Maslahat qiladi" | "Xato raqam" | "Kerak emas" | "O'qiydi" | ""
  izoh: string;         // Izoh
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

export type StatusFilter = 'all' | 'Ko\'tarmadi' | 'O\'chirilgan' | 'O\'ylab ko\'radi' | 'Maslahat qiladi' | 'Xato raqam' | 'Kerak emas' | 'O\'qiydi' | 'Kutilmoqda';

