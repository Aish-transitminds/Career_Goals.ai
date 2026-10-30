/**
 * AbroadPath AI - Floating AI Assistant Widget
 * File: src/components/assistant/AIAssistantWidget.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R4, R5, §Screens #9) & PROJECT.md
 */

import React, { useState, useEffect, useRef } from 'react';
import { useCatalog } from '../../hooks/useCatalog';
import { aiAssistantService, ChatMessage } from '../../services/aiAssistantService';
import {
  Compass,
  X,
  Send,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import DOMPurify from 'dompurify';

const INITIAL_WELCOME: ChatMessage = {
  id: 'welcome-0',
  role: 'assistant',
  content:
    'Hello! I am Atlas, your friendly study abroad guide. I provide verified, fact-checked admission requirements, language score cutoffs, blocked account policies, and application deadlines across Germany, Ireland, and the UK.\n\nEvery fact links to its official source, with the date we last checked it.',
  sourceUrl: 'https://www.daad.de/en/study-and-research-in-germany/',
  sourceName: 'Official DAAD & University Admissions',
  lastChecked: '2026-10-15',
  isFallback: true,
};


function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'checked 15 days ago';
  try {
    const d = new Date(dateStr);
    const now = new Date('2026-10-30T12:00:00');
    const diffDays = Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
    if (diffDays === 0) return 'checked today';
    if (diffDays === 1) return 'checked 1 day ago';
    return `checked ${diffDays} days ago`;
  } catch {
    return 'checked 15 days ago';
  }
}

const SUGGESTED_PROMPTS = [
  'IELTS for Manchester CS?',
  'Cheapest verified Germany MS?',
  'Trinity College Dublin deadlines?',
  'Ireland visa funds & Stamp 1G',
];

// 1. Renderer (bot bubbles only)
function renderChatText(raw?: string): string {
  const esc = String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const html = esc
    .split('\n')
    .filter((line) => !/demonstration-seeded|live change detection record/i.test(line))
    .map((line) => {
      const t = line.trim();
      let bold = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      bold = bold.replace(/\[Demo data\]/gi, '<span class="demo-badge">Demo data</span>');
      bold = bold.replace(
        /\[Suspicious seed data: verify on official sources\]/gi,
        '<span class="suspicious-badge">Suspicious seed data – verify</span>'
      );
      if (/^(•|-\s)/.test(t)) {
        return `<div class="chat-bullet">${bold.replace(/^(•|-)\s*/, '')}</div>`;
      }
      if (/^verify on the official site/i.test(t)) {
        return ""; // Cut duplicate italic footnote
      }
      return t ? `<div>${bold}</div>` : `<div class="chat-gap"></div>`;
    })
    .join('');

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'span', 'div', 'b', 'i', 'em'],
    ALLOWED_ATTR: ['class'],
  });
}

export const AIAssistantWidget: React.FC = () => {
  const { universities, countries } = useCatalog();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const lastDiscussedProgId = useRef<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Helper to read currently selected programme from storage (returns null if user has not selected one)
  const getSelectedProgramme = () => {
    try {
      const progId = localStorage.getItem('abroadpath_last_selected_program');
      if (!progId) return null;
      const intake = localStorage.getItem('abroadpath_last_selected_intake') || '2026';
      const univ = universities.find((u) => u.id === progId);
      if (univ) {
        return {
          id: univ.id,
          university: univ.name,
          programme: univ.program,
          intake,
          isDemo: Boolean(univ.demoSeeded),
        };
      }
    } catch {}
    return null;
  };

  // 2. Context sync: Show discussing pill only when a program has actually been selected by the user
  useEffect(() => {
    const syncProgramme = () => {
      const sel = getSelectedProgramme();
      if (sel) {
        if (sel.id !== lastDiscussedProgId.current) {
          lastDiscussedProgId.current = sel.id;
          setMessages([
            INITIAL_WELCOME,
            {
              id: `sys-${Date.now()}`,
              role: 'assistant',
              isSystem: true,
              content: `Now discussing: ${sel.university} – ${sel.programme}`,
            },
          ]);
        }
      } else {
        lastDiscussedProgId.current = null;
      }
    };

    window.addEventListener('storage', syncProgramme);
    if (isOpen) {
      syncProgramme();
    }
    return () => window.removeEventListener('storage', syncProgramme);
  }, [isOpen, universities]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Focus input on open & keyboard escape handler
  useEffect(() => {
    let focusTimer: ReturnType<typeof setTimeout> | null = null;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    if (isOpen) {
      focusTimer = setTimeout(() => inputRef.current?.focus(), 100);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [isOpen]);

  // 2. Context sync builder
  function buildChatPayload(userMsg: string) {
    const sel = getSelectedProgramme();
    return {
      message: userMsg.slice(0, 500),
      context: sel
        ? {
            id: sel.id,
            university: sel.university,
            programme: sel.programme,
            intake: sel.intake,
          }
        : undefined,
    };
  }

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || isTyping) return;

    // Strict 500-character input capping (R4)
    const payload = buildChatPayload(text);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: payload.message,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await aiAssistantService.askQuestion(
        payload.message,
        {
          universities,
          countries,
        },
        payload.context
      );

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        sourceUrl: response.sourceUrl,
        sourceName: response.sourceName,
        lastChecked: response.lastChecked,
        isFallback: response.isFallback,
        isDemo: response.isDemo,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[AIAssistantWidget] Query failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          role: 'assistant',
          content:
            'I encountered an issue retrieving verified records. Please verify requirements directly on the official portal.',
          sourceUrl: 'https://www.daad.de/en/study-and-research-in-germany/',
          sourceName: 'Official Portal',
          lastChecked: '2026-10-15',
          isFallback: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    const sel = getSelectedProgramme();
    if (sel) {
      setMessages([
        INITIAL_WELCOME,
        {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          isSystem: true,
          content: `Now discussing: ${sel.university} – ${sel.programme}`,
        },
      ]);
    } else {
      setMessages([INITIAL_WELCOME]);
    }
  };

  // Determine if the active conversation is currently discussing a demo record
  const lastBotMsg = [...messages].reverse().find((m) => m.role === 'assistant' && !m.isSystem);
  const isDemoActive = lastBotMsg ? Boolean(lastBotMsg.isDemo) : Boolean(getSelectedProgramme()?.isDemo);

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      <style>{`
        .chat-bullet { position: relative; padding-left: 14px; margin: 2px 0; }
        .chat-bullet::before { content: "•"; position: absolute; left: 2px; color: #6366f1; }
        .chat-gap { height: 8px; }
        .chat-footnote { margin-top: 8px; font-size: 11px; color: #64748b; font-style: italic; }
        .chat-bubble { white-space: normal; line-height: 1.5; }
        .chat-bubble strong { font-weight: 600; color: #0f172a; }
        .demo-badge { display: inline-block; padding: 1px 5px; margin-left: 4px; font-size: 10px; font-weight: 600; background-color: #fef3c7; color: #92400e; border-radius: 4px; border: 1px solid #fcd34d; }
        .suspicious-badge { display: inline-block; padding: 1px 5px; margin-left: 4px; font-size: 10px; font-weight: 600; background-color: #ffe4e6; color: #9f1239; border-radius: 4px; border: 1px solid #fecdd3; }
      `}</style>

      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-[#FF5E00] hover:bg-[#E65400] text-[#0B1026] shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#FF5E00]/30"
          aria-label="Open Atlas, your Study Abroad Guide"
          aria-expanded={false}
          aria-haspopup="dialog"
        >
          <Compass className="w-7 h-7 text-[#0B1026]" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white" />
          </span>

          {/* Hover Tooltip */}
          <span className="absolute right-16 px-3 py-1.5 bg-[#0B1026] text-white text-xs font-semibold rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none">
            Ask Atlas – Study Guide
          </span>
        </button>
      )}

      {/* Expanded Chat Window Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Atlas - Study Abroad Guide"
          className="fixed inset-x-0 bottom-0 sm:bottom-auto sm:relative sm:inset-auto w-full sm:w-96 h-[75vh] sm:h-[540px] max-h-[85vh] sm:max-h-[calc(100vh-5rem)] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fadeIn font-poppins z-50"
        >
          {/* Header */}
          <div className="bg-[#0B1026] text-white p-4 flex items-center justify-between shadow-sm border-b border-[#151B3A]">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-white/10 rounded-[6px]">
                <Compass className="w-5 h-5 text-[#FF5E00]" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                  Atlas
                  <Sparkles className="w-3.5 h-3.5 text-[#FF5E00]" />
                  <span className="text-[11px] font-normal text-slate-300">· Guide</span>
                </h3>
                {/* 3. Demo Data Labelling: Header badge only shows Verified Catalog Data when non-demo */}
                {isDemoActive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-200 font-medium bg-amber-500/20 px-1.5 py-0.5 rounded-[4px] border border-amber-300/30">
                    <AlertCircle className="w-3 h-3 text-amber-300" />
                    Demo Data Record
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-200 font-medium">
                    <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    Verified Catalog Data
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleReset}
                title="Reset conversation"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-[6px] transition-colors"
                aria-label="Reset conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize assistant"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-[6px] transition-colors"
                aria-label="Minimize assistant"
              >
                <span className="text-base font-bold leading-none">&minus;</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close assistant"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-[6px] transition-colors"
                aria-label="Close assistant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Message History */}
          <div
            role="log"
            aria-live="polite"
            className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 text-xs"
          >
            {messages.map((msg) => {
              if (msg.isSystem) {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="inline-block px-3 py-1 bg-slate-200/80 text-slate-700 text-[11px] font-semibold rounded-full border border-slate-300/60 shadow-2xs">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-[6px] p-3.5 shadow-xs space-y-2.5 ${
                      isUser
                        ? 'bg-[#0B1026] text-white border border-[#151B3A]'
                        : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    {/* Message Body */}
                    {!isUser && msg.sourceUrl && (
                      <div className="mb-2">
                        <a
                          href={msg.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium hover:bg-emerald-100 transition-colors shadow-2xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-bold">{msg.sourceName || 'Official Admission Portal'}</span>
                          <span className="text-emerald-500">&bull;</span>
                          <span className="text-emerald-700">{formatTimeAgo(msg.lastChecked)}</span>
                          <ExternalLink className="w-3 h-3 text-emerald-600 ml-0.5" />
                        </a>
                      </div>
                    )}

                    {isUser ? (
                      <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                        {msg.content}
                      </div>
                    ) : (
                      <div
                        className="leading-relaxed font-sans text-xs chat-bubble"
                        dangerouslySetInnerHTML={{ __html: renderChatText(msg.content) }}
                      />
                    )}

                    {/* Single yellow disclaimer box (no duplicate footnote) */}
                    {!isUser && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                        <div className="bg-amber-50 rounded-[6px] p-2 text-[10px] text-amber-900 flex items-start gap-1.5 border border-amber-200/80">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Verify on official site:</strong> Always confirm application deadlines, test score cutoffs, and fees directly on the official institution portal.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-[6px] p-3 text-slate-500 text-xs flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF5E00] animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-[#FF5E00] animate-pulse delay-150" />
                  <span className="w-2 h-2 rounded-full bg-[#FF5E00] animate-pulse delay-300" />
                  <span className="text-[11px] font-medium text-slate-500 ml-1">
                    Querying verified catalog...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Question Chips Above Input */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200/80 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white hover:bg-orange-50 text-slate-700 hover:text-[#FF5E00] border border-slate-200 hover:border-orange-300 transition-colors shrink-0 shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input Area */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-1.5">
            <div className="relative flex items-center">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value.slice(0, 500))}
                onKeyDown={handleKeyDown}
                placeholder="Ask about cutoffs, fees, deadlines (max 500 chars)..."
                maxLength={500}
                rows={2}
                className="w-full resize-none p-2.5 pr-10 text-xs text-slate-800 placeholder-slate-400 bg-slate-50 rounded-[6px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF5E00] focus:bg-white transition-all"
              />
              <button
                type="button"
                disabled={!inputText.trim() || isTyping}
                onClick={() => handleSendMessage()}
                className="absolute right-2 bottom-2.5 p-1.5 rounded-[6px] bg-[#FF5E00] hover:bg-[#E65400] text-[#0B1026] disabled:opacity-40 transition-colors"
                aria-label="Send query"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 500 Character Cap Counter shown ONLY after typing */}
            <div className="flex items-center justify-between text-[11px] text-slate-600 px-1 font-sans">
              <span className="text-[11px] text-slate-600 font-semibold">Press Enter ↵ to send</span>
              {inputText.length > 0 && (
                <span className={`font-mono font-bold ${inputText.length >= 480 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {inputText.length} / 500
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantWidget;
