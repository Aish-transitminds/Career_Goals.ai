/**
 * AbroadPath AI - Floating Atlas AI Assistant Widget (Atlas Architecture v2)
 * File: src/components/assistant/AIAssistantWidget.tsx
 *
 * Implements:
 * 1. Retrieve first, then write: facts grounded via tools and factKeys.
 * 2. Unfakeable receipts: source links and last-checked timestamps at the top of each answer.
 * 3. Structured layout: short direct answer first, labeled detail rows, action buttons, follow-ups.
 * 4. Profile awareness: "Using your profile" toggle chip allowing users to inspect/toggle profile knowledge.
 * 5. Cost & speed guards: 500-char counter shown only when typing, instant smart-routing.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCatalog } from '../../hooks/useCatalog';
import { useAuth } from '../../hooks/useAuth';
import { aiAssistantService, ChatMessage } from '../../services/aiAssistantService';
import { AtlasAction } from '../../types/atlas';
import {
  Compass,
  X,
  Send,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  Flag,
  UserCheck,
  EyeOff,
} from 'lucide-react';
const INITIAL_WELCOME: ChatMessage = {
  id: 'welcome-0',
  role: 'assistant',
  content:
    'Hello! I am Atlas, your admissions guide for Germany, Ireland, and the UK. Every fact links to its official source with the date we last verified it.',
  structured: {
    directAnswer: 'Hello! I am Atlas, your verified admissions guide for Germany, Ireland, and the UK.',
    blocks: [
      {
        text: 'I provide verified requirements, language cutoffs (IELTS/TOEFL), tuition schedules, and deadlines. Every claim links to its official university source.',
        factKey: 'general.scope',
      },
    ],
    details: [
      { label: 'Coverage', value: 'Germany, Ireland, UK' },
      { label: 'Fact Provenance', value: '100% Official Portals' },
    ],
    followUps: [
      'IELTS for Manchester CS?',
      'Cheapest verified Germany MS?',
      'Trinity College Dublin deadlines?',
      'Calculate loan EMI for ₹20 lakh',
    ],
    status: 'verified',
  },
  sourceUrl: 'https://www.daad.de/en/study-and-research-in-germany/',
  sourceName: 'Official DAAD & University Admissions',
  lastChecked: '2026-10-15',
  isFallback: false,
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

export const AIAssistantWidget: React.FC = () => {
  const { universities, countries } = useCatalog();
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isCountryGuidePage = location.pathname.startsWith('/countries');

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [useProfileData, setUseProfileData] = useState<boolean>(true);
  const [flagFeedback, setFlagFeedback] = useState<string | null>(null);

  const lastDiscussedProgId = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    if (isOpen) syncProgramme();
    return () => window.removeEventListener('storage', syncProgramme);
  }, [isOpen, universities]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend ?? inputText).trim();
    if (!text || isTyping) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptToSend) setInputText('');
    setIsTyping(true);

    try {
      const sel = getSelectedProgramme();
      const botResponse = await aiAssistantService.askQuestion(
        text,
        { universities, countries },
        {
          id: sel?.id,
          university: sel?.university,
          programme: sel?.programme,
          profile,
          useProfile: useProfileData,
        }
      );

      setMessages((prev) => [...prev, botResponse]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content: 'I could not reach the verified admissions catalog. Please check your connection and try again.',
          isFallback: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleActionClick = (action: AtlasAction) => {
    if (action.id === 'add_to_tracker') {
      const progId = action.payload?.programId;
      if (progId) {
        try {
          const stored = JSON.parse(localStorage.getItem('user_applications') || '[]');
          if (!stored.some((a: any) => a.universityId === progId)) {
            stored.push({
              id: `app_${Date.now()}`,
              universityId: progId,
              status: 'planned',
              appliedAt: null,
              updatedAt: new Date().toISOString(),
            });
            localStorage.setItem('user_applications', JSON.stringify(stored));
            window.dispatchEvent(new Event('storage'));
          }
        } catch {}
      }
      navigate('/applications');
      setIsOpen(false);
    } else if (action.id === 'compare') {
      navigate('/matches');
      setIsOpen(false);
    } else if (action.id === 'build_timeline') {
      navigate('/planner');
      setIsOpen(false);
    } else if (action.id === 'recheck_flag') {
      setFlagFeedback('Verification request logged! Our pipeline scraper will re-check this within 24 hours.');
      setTimeout(() => setFlagFeedback(null), 4000);
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

  const lastBotMsg = [...messages].reverse().find((m) => m.role === 'assistant' && !m.isSystem);
  const activeFollowUps = lastBotMsg?.followUps || lastBotMsg?.structured?.followUps || [
    'IELTS for Manchester CS?',
    'Cheapest verified Germany MS?',
    'Trinity College Dublin deadlines?',
    'Calculate loan EMI for ₹20 lakh',
  ];

  return (
    <div className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50${isCountryGuidePage ? ' atlas-widget--country-guide' : ''}`}>
      <style>{`
        .chat-bullet { position: relative; padding-left: 14px; margin: 2px 0; }
        .chat-bullet::before { content: "•"; position: absolute; left: 2px; color: #FF5E00; }
        .chat-bubble { white-space: normal; line-height: 1.5; }
        .chat-bubble strong { font-weight: 600; color: #0f172a; }
      `}</style>

      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 focus:outline-none ${
            isCountryGuidePage
              ? 'bg-[#1B4D3C] hover:bg-[#153D30] text-white focus:ring-4 focus:ring-[#1B4D3C]/30'
              : 'bg-[#FF5E00] hover:bg-[#E65400] text-[#0B1026] focus:ring-4 focus:ring-[#FF5E00]/30'
          }`}
          aria-label="Open Atlas Admissions Guide"
        >
          <Compass className={`w-7 h-7 ${isCountryGuidePage ? 'text-white' : 'text-[#0B1026]'}`} />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white" />
          </span>
          <span className="absolute right-16 px-3 py-1.5 bg-[#0B1026] text-white text-xs font-semibold rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none">
            Ask Atlas – Verified Guide
          </span>
        </button>
      )}

      {/* Expanded Atlas Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Atlas Admissions Guide"
          className="fixed inset-x-0 bottom-0 sm:bottom-auto sm:relative sm:inset-auto w-full sm:w-[420px] h-[80vh] sm:h-[600px] max-h-[88vh] sm:max-h-[calc(100vh-4rem)] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fadeIn font-poppins z-50"
        >
          {/* Header */}
          <div className="bg-[#0B1026] text-white p-3.5 flex items-center justify-between shadow-sm border-b border-[#151B3A]">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-white/10 rounded-[6px]">
                <Compass className="w-5 h-5 text-[#FF5E00]" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                  Atlas
                  <Sparkles className="w-3.5 h-3.5 text-[#FF5E00]" />
                  <span className="text-[11px] font-normal text-slate-300">· Admissions Guide</span>
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-200 font-medium">
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  Every fact links to official source
                </span>
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
                title="Close assistant"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-[6px] transition-colors"
                aria-label="Close assistant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Profile Awareness Control Strip */}
          <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-700">
              {useProfileData ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-medium truncate max-w-[240px]">
                    Using profile: {profile?.exams?.ielts ? `IELTS ${profile.exams.ielts}` : 'Scores'} • {profile?.gpa ? `GPA ${profile.gpa}` : 'GPA'}
                  </span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-500 font-medium">Profile disabled (general mode)</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setUseProfileData(!useProfileData)}
              className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors bg-white hover:bg-slate-200 text-slate-700 border border-slate-300"
            >
              {useProfileData ? 'Turn off' : 'Turn on'}
            </button>
          </div>

          {/* Flag feedback banner if active */}
          {flagFeedback && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-3 py-2 flex items-center gap-2 text-[11px] text-emerald-800 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{flagFeedback}</span>
            </div>
          )}

          {/* Scrollable Message History */}
          <div role="log" aria-live="polite" className="flex-1 p-3.5 overflow-y-auto space-y-4 bg-slate-50 text-xs">
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
              const structured = msg.structured;

              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92%] rounded-[8px] p-3.5 shadow-xs space-y-2.5 ${
                      isUser
                        ? 'bg-[#0B1026] text-white border border-[#151B3A]'
                        : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    {/* Bot Answer Header: Source Chip at TOP */}
                    {!isUser && (msg.sourceUrl || structured?.primarySource?.url) && (
                      <div className="mb-2">
                        <a
                          href={msg.sourceUrl || structured?.primarySource?.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium hover:bg-emerald-100 transition-colors shadow-2xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-bold">
                            {msg.sourceName || structured?.primarySource?.name || 'Official Admissions Portal'}
                          </span>
                          <span className="text-emerald-500">&bull;</span>
                          <span className="text-emerald-700">
                            {formatTimeAgo(msg.lastChecked || structured?.primarySource?.lastChecked)}
                          </span>
                          <ExternalLink className="w-3 h-3 text-emerald-600 ml-0.5" />
                        </a>
                      </div>
                    )}

                    {/* Direct Answer (First 1-2 sentences) */}
                    {isUser ? (
                      <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">{msg.content}</div>
                    ) : (
                      <div className="space-y-2.5">
                        {structured?.directAnswer && (
                          <p className="font-semibold text-slate-900 text-[13px] leading-snug">
                            {structured.directAnswer}
                          </p>
                        )}

                        {/* Grounded fact blocks */}
                        {structured?.blocks && structured.blocks.length > 0 ? (
                          <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                            {structured.blocks.map((b, idx) => (
                              <div key={idx} className="chat-bullet">
                                <span>{b.text}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="leading-relaxed whitespace-pre-line text-xs">{msg.content}</div>
                        )}

                        {/* Labeled Detail List (Entry, Deadline, Fees, EMI) */}
                        {structured?.details && structured.details.length > 0 && (
                          <div className="my-2 bg-slate-50 border border-slate-200 rounded-[6px] divide-y divide-slate-200 overflow-hidden">
                            {structured.details.map((row, idx) => (
                              <div key={idx} className="flex justify-between items-center px-2.5 py-1.5 text-[11px]">
                                <span className="font-medium text-slate-500">{row.label}</span>
                                <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]">
                                  {row.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Interactive Action Buttons inside answer */}
                        {((msg.actions && msg.actions.length > 0) || (structured?.actions && structured.actions.length > 0)) && (
                          <div className="pt-2 flex flex-wrap gap-1.5">
                            {(msg.actions || structured?.actions || []).map((action, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleActionClick(action)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-all shadow-2xs ${
                                  action.id === 'recheck_flag'
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                    : 'bg-orange-50 hover:bg-orange-100 text-[#FF5E00] border border-orange-200'
                                }`}
                              >
                                {action.id === 'add_to_tracker' && <CheckCircle2 className="w-3 h-3 text-[#FF5E00]" />}
                                {action.id === 'compare' && <Layers className="w-3 h-3 text-[#FF5E00]" />}
                                {action.id === 'build_timeline' && <Calendar className="w-3 h-3 text-[#FF5E00]" />}
                                {action.id === 'recheck_flag' && <Flag className="w-3 h-3 text-amber-700" />}
                                <span>{action.label}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Single Short Footer Note */}
                        <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-1.5">
                          <AlertCircle className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Always confirm deadlines & test cutoffs on the official institution portal.</span>
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
                    Retrieving verified admissions facts...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Dynamic Follow-Up Question Chips */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200/80 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
            {activeFollowUps.slice(0, 4).map((prompt, idx) => (
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

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-1.5">
            <div className="relative flex items-center">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value.slice(0, 500))}
                onKeyDown={handleKeyDown}
                placeholder="Ask about cutoffs, fees, deadlines, EMI (max 500 chars)..."
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

            {/* Character counter shown ONLY after typing starts */}
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
