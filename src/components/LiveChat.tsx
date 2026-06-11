/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { MessageSquare, X, Send, Megaphone, Bell, BellOff, Users } from 'lucide-react';

interface LiveChatProps {
  operatorId: string;
  operatorName: string;
  isAdmin: boolean;
}

export const LiveChat: React.FC<LiveChatProps> = ({ operatorId, operatorName, isAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [onlineCount, setOnlineCount] = useState(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Web Audio API notification beep
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.warn("Audio beep failed", e);
    }
  };

  // Poll real-time messages from API
  useEffect(() => {
    let cancelled = false;
    let timeoutId: any = null;
    let errorCount = 0;

    const fetchMessages = async () => {
      if (document.hidden) {
        if (!cancelled) {
          timeoutId = setTimeout(fetchMessages, 3000);
        }
        return;
      }
      try {
        const res = await fetch('/api/messages');
        if (!res.ok) {
          throw new Error(`HTTP status ${res.status}`);
        }
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error(`Response not JSON: ${text.slice(0, 100)}`);
        }
        const data = await res.json();
        errorCount = 0; // Reset on success

        if (data.success && Array.isArray(data.messages) && !cancelled) {
          const loaded = data.messages;
          
          setMessages(prevMessages => {
            // Check if there are new messages
            if (hasInitializedRef.current) {
              const lastPrev = prevMessages[prevMessages.length - 1];
              const lastLoaded = loaded[loaded.length - 1];
              if (lastLoaded && (!lastPrev || lastLoaded.id !== lastPrev.id) && lastLoaded.senderId !== operatorId) {
                playBeep();
                if (!isOpen) setUnreadCount(prev => prev + 1);
              }
            } else {
              hasInitializedRef.current = true;
            }
            return loaded;
          });
        }
      } catch (err: any) {
        errorCount++;
        console.warn(`[Chat Poll Warning] ${err?.message || err}`);
      } finally {
        if (!cancelled) {
          // Dynamic backoff to prevent rate-limiting: increment delay if hitting persistent errors
          const delay = errorCount > 3 ? Math.min(30000, 3000 * Math.pow(1.5, errorCount - 3)) : 3000;
          timeoutId = setTimeout(fetchMessages, delay);
        }
      }
    };

    fetchMessages();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [operatorId, isOpen, soundEnabled]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Simulate online count from unique senders in last 50 messages
  useEffect(() => {
    const senders = new Set(messages.slice(-50).map(m => m.senderId));
    setOnlineCount(Math.max(1, senders.size));
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const msgId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date();
    const timestamp = `${now.toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' })} ${now.toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour12: false })}`;

    const newMsg: ChatMessage = {
      id: msgId,
      senderId: operatorId,
      senderName: operatorName,
      text: inputText.trim(),
      timestamp,
      isAnnouncement: isAdmin && isAnnouncement
    };

    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg)
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, newMsg]);
        setInputText('');
        setIsAnnouncement(false);
      } else {
        throw new Error();
      }
    } catch {
      alert("Xabar yuborilmadi!");
    }
  };

  const latestAnnouncement = [...messages].reverse().find(m => m.isAnnouncement);

  // Format time from timestamp string
  const formatTime = (ts: string) => ts.includes(' ') ? ts.split(' ')[1] : ts;

  // Initials from name
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // Color hash from senderId for avatars
  const avatarColors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-lime-600'];
  const getAvatarColor = (id: string) => avatarColors[id.charCodeAt(0) % avatarColors.length];

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative p-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-full shadow-xl transition-all duration-200 flex items-center justify-center cursor-pointer pulse-green"
          title="Tezkor Chat"
        >
          <MessageSquare size={22} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-900 animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-open bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl w-[360px] sm:w-[390px] h-[500px] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <MessageSquare size={18} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white"></span>
              </div>
              <div>
                <h3 className="text-xs font-bold leading-none">Tezkor Chat</h3>
                <p className="text-[9px] text-emerald-100 mt-0.5 flex items-center gap-1">
                  <Users size={9} /> {onlineCount} faol foydalanuvchi
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundEnabled(s => !s)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                title={soundEnabled ? "Ovozni o'chirish" : "Ovozni yoqish"}
              >
                {soundEnabled ? <Bell size={14} /> : <BellOff size={14} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Pinned Announcement */}
          {latestAnnouncement && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-3 py-2 flex gap-2 items-start shrink-0">
              <Megaphone size={13} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">📌 Muhim E'lon</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-200 font-medium line-clamp-2 leading-tight">{latestAnnouncement.text}</p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-neutral-50 dark:bg-neutral-900">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <MessageSquare size={36} className="text-neutral-300 dark:text-neutral-600 mb-3" />
                <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Hozircha xabarlar yo'q</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Suhbatni boshlang!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === operatorId;

                if (msg.isAnnouncement) {
                  return (
                    <div key={msg.id} className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 p-2.5 rounded-r-lg mx-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
                          <Megaphone size={10} /> Admin E'loni
                        </span>
                        <span className="text-[9px] text-neutral-400 font-mono">{formatTime(msg.timestamp)}</span>
                      </div>
                      <p className="text-xs text-red-800 dark:text-red-200 font-semibold whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    {!isMe && (
                      <div className={`w-6 h-6 rounded-full ${getAvatarColor(msg.senderId)} flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-auto`}>
                        {getInitials(msg.senderName)}
                      </div>
                    )}
                    <div className={`flex flex-col max-w-[78%] ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && (
                        <span className="text-[9px] text-neutral-500 dark:text-neutral-400 font-medium mb-0.5 px-1">{msg.senderName}</span>
                      )}
                      <div className={`px-3 py-2 rounded-2xl text-xs break-words shadow-sm ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-tl-none'
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      </div>
                      <span className="text-[8px] text-neutral-400 dark:text-neutral-500 font-mono mt-0.5 px-1">{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 shrink-0 space-y-2">
            {isAdmin && (
              <label className="flex items-center gap-1.5 cursor-pointer group px-1">
                <input
                  type="checkbox"
                  checked={isAnnouncement}
                  onChange={e => setIsAnnouncement(e.target.checked)}
                  className="rounded accent-red-500 cursor-pointer"
                />
                <Megaphone size={11} className={`transition-colors ${isAnnouncement ? 'text-red-500' : 'text-neutral-400'}`} />
                <span className={`text-[10px] font-semibold transition-colors ${isAnnouncement ? 'text-red-600 dark:text-red-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                  E'lon sifatida yuborish
                </span>
              </label>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Xabar yozing..."
                className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-full px-4 py-2 text-xs border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-neutral-500 dark:placeholder-neutral-400 transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-8 h-8 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-full shrink-0 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
              >
                <Send size={14} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
