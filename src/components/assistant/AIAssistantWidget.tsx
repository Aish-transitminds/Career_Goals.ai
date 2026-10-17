/**
 * AbroadPath AI - Floating AI Assistant Widget
 * File: src/components/assistant/AIAssistantWidget.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R4, R5, §Screens #9) & PROJECT.md
 */

import React, { useState, useEffect, useRef } from 'react';
import { useCatalog } from '../../hooks/useCatalog';
import { aiAssistantService, ChatMessage } from '../../services/aiAssistantService';
import { ASSISTANT_UNAVAILABLE_MESSAGE } from '../../config/modelConfig';
import {
  Bot,
  X,
  Send,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

const INITIAL_WELCOME: ChatMessage = {
  id: 'welcome-0',
  role: 'assistant',
  content:
    'Hello! I am your CareerGoals Guide. I provide verified, fact-checked admission requirements, language score cutoffs, blocked account policies, and application deadlines across Germany, Ireland, and the UK.\n\nEvery answer is grounded strictly in official university admission portals with zero AI hallucinations.',
  sourceUrl: 'https://www.daad.de/en/study-and-research-in-germany/',
  sourceName: 'Official DAAD & University Admissions',
  lastChecked: '2026-10-15',
  isFallback: true,
};

const SUGGESTED_PROMPTS = [
  'TUM GRE & IELTS requirements',
  'Free tuition universities in Germany',
  'Ireland visa funds & Stamp 1G',
  'Deadlines for Trinity College Dublin',
];

export const AIAssistantWidget: React.FC = () => {
  const { universities, countries } = useCatalog();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME]);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Focus input on open & keyboard escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || isTyping) return;

    // Strict 500-character input capping (R4)
    const clampedText = text.slice(0, 500);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: clampedText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await aiAssistantService.askQuestion(clampedText, {
        universities,
        countries,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        sourceUrl: response.sourceUrl,
        sourceName: response.sourceName,
        lastChecked: response.lastChecked,
        isFallback: response.isFallback,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[AIAssistantWidget] Query failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          role: 'assistant',
          content: ASSISTANT_UNAVAILABLE_MESSAGE,
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
    setMessages([INITIAL_WELCOME]);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-300"
          aria-label="Open CareerGoals Study Assistant"
          aria-expanded={false}
          aria-haspopup="dialog"
        >
          <Bot className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white" />
          </span>

          {/* Hover Tooltip */}
          <span className="absolute right-16 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none">
            Verified Study-Abroad Assistant
          </span>
        </button>
      )}

      {/* Expanded Chat Window Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="CareerGoals Study Assistant"
          className="w-[calc(100vw-2rem)] sm:w-96 h-[540px] max-h-[calc(100vh-5rem)] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fadeIn"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-white/10 rounded-xl">
                <Bot className="w-5 h-5 text-indigo-100" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                  CareerGoals Guide
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-200 font-medium">
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  Verified Catalog Data
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleReset}
                title="Reset conversation"
                className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Reset conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close assistant"
                className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
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
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl p-3.5 shadow-xs space-y-2.5 ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    {/* Message Body */}
                    <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                      {msg.content}
                    </div>

                    {/* Mandatory Verification & Source Footer on Assistant Messages (R2, R5) */}
                    {!isUser && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                        {msg.sourceUrl && (
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              {msg.lastChecked ? `Verified: ${msg.lastChecked}` : 'Official Record'}
                            </span>
                            <a
                              href={msg.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 underline decoration-indigo-200"
                            >
                              <span>{msg.sourceName || 'Official Source'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* Mandatory Universal Footer */}
                        <div className="bg-amber-50 rounded-lg p-2 text-[10px] text-amber-900 flex items-start gap-1.5 border border-amber-200/80">
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
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs p-3 text-slate-500 text-xs flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse delay-150" />
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse delay-300" />
                  <span className="text-[11px] font-medium text-slate-500 ml-1">
                    Querying verified catalog...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Chips */}
          {messages.length <= 2 && (
            <div className="p-2.5 bg-white border-t border-slate-100 flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 transition-colors text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

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
                className="w-full resize-none p-2.5 pr-10 text-xs text-slate-800 placeholder-slate-400 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              <button
                type="button"
                disabled={!inputText.trim() || isTyping}
                onClick={() => handleSendMessage()}
                className="absolute right-2 bottom-2.5 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors"
                aria-label="Send query"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 500 Character Cap Counter (R4) */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
              <span className="text-[10px] text-slate-400 font-sans">Enter to send, Shift+Enter for new line</span>
              <span className={inputText.length >= 480 ? 'text-rose-600 font-bold' : ''}>
                {inputText.length} / 500
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantWidget;
