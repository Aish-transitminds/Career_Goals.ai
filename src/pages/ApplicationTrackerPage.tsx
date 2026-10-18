/**
 * AbroadPath AI - Comprehensive Interactive Application Tracker Page
 * File: src/pages/ApplicationTrackerPage.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (Screens #5, #6, Acceptance Criteria) & PROJECT.md
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../hooks/useCatalog';
import { useNotifications } from '../hooks/useNotifications';
import { getUserApplications } from '../services/firestoreService';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Application, ApplicationStatus } from '../types';
import {
  CalendarClock,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Plus,
  ArrowRight,
  TrendingUp,
  FileText,
} from 'lucide-react';

const MOCK_APPS_PREFIX = 'abroadpath_mock_apps_';

export const ApplicationTrackerPage: React.FC = () => {
  const { user } = useAuth();
  const { universities } = useCatalog();
  const { refresh: refreshNotifications } = useNotifications();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedUnivToAdd, setSelectedUnivToAdd] = useState<string>('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState<string>('');

  const getLocalMockApps = useCallback((uid: string): Application[] => {
    try {
      const saved = localStorage.getItem(`${MOCK_APPS_PREFIX}${uid}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, []);

  const saveLocalMockApps = useCallback((uid: string, apps: Application[]) => {
    try {
      localStorage.setItem(`${MOCK_APPS_PREFIX}${uid}`, JSON.stringify(apps));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const fetchApps = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      let apps: Application[] = [];

      if (user.isMock) {
        apps = getLocalMockApps(user.uid);
      } else {
        try {
          apps = await getUserApplications(user.uid);
        } catch {
          apps = getLocalMockApps(user.uid);
        }
      }
      setApplications(apps);
    } catch (err) {
      console.error('[Tracker] Failed to fetch applications:', err);
    } finally {
      setLoading(false);
    }
  }, [user, getLocalMockApps]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // Persist application helper
  const persistApplication = async (app: Application) => {
    if (!user) return;
    // Local mock sync
    const current = getLocalMockApps(user.uid);
    const existingIndex = current.findIndex((a) => a.id === app.id);
    let updatedMock: Application[];
    if (existingIndex >= 0) {
      updatedMock = [...current];
      updatedMock[existingIndex] = app;
    } else {
      updatedMock = [...current, app];
    }
    saveLocalMockApps(user.uid, updatedMock);

    // Firestore sync if not mock or connected
    try {
      const appRef = doc(db, 'users', user.uid, 'applications', app.id);
      await setDoc(appRef, app, { merge: true });
    } catch (e) {
      console.warn('[Tracker] Firestore write warning:', e);
    }
  };

  // Status Action Handlers
  const handleMarkApplied = async (appId: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const existing = applications.find((a) => a.id === appId);
    const updated: Application = {
      id: appId,
      universityId: existing?.universityId || appId,
      status: 'applied',
      appliedAt: now,
      updatedAt: now,
      notes: existing?.notes || null,
    };

    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? updated : a))
    );

    await persistApplication(updated);
    // Trigger reminder engine synchronization
    refreshNotifications();
  };

  const handleMarkRejected = async (app: Application) => {
    if (!user) return;
    const now = new Date().toISOString();
    const updated: Application = {
      ...app,
      status: 'rejected',
      updatedAt: now,
    };

    setApplications((prev) =>
      prev.map((a) => (a.id === app.id ? updated : a))
    );

    await persistApplication(updated);
  };

  const handleMarkAccepted = async (app: Application) => {
    if (!user) return;
    const now = new Date().toISOString();
    const updated: Application = {
      ...app,
      status: 'accepted',
      updatedAt: now,
    };

    setApplications((prev) =>
      prev.map((a) => (a.id === app.id ? updated : a))
    );

    await persistApplication(updated);
  };

  const handleAddApplication = async (status: ApplicationStatus = 'planned') => {
    if (!user || !selectedUnivToAdd) return;
    const now = new Date().toISOString();
    const newApp: Application = {
      id: selectedUnivToAdd,
      universityId: selectedUnivToAdd,
      status,
      appliedAt: status === 'applied' ? now : null,
      updatedAt: now,
      notes: null,
    };

    setApplications((prev) => {
      const existing = prev.filter((a) => a.id !== selectedUnivToAdd);
      return [...existing, newApp];
    });

    await persistApplication(newApp);
    setShowAddModal(false);
    setSelectedUnivToAdd('');

    if (status === 'applied') {
      refreshNotifications();
    }
  };

  const handleSaveNotes = async (app: Application) => {
    if (!user) return;
    const cappedNotes = notesInput.slice(0, 500);
    const updated: Application = {
      ...app,
      notes: cappedNotes,
      updatedAt: new Date().toISOString(),
    };

    setApplications((prev) =>
      prev.map((a) => (a.id === app.id ? updated : a))
    );

    await persistApplication(updated);
    setEditingNotesId(null);
  };

  // Metrics
  const counts = useMemo(() => {
    return {
      all: applications.length,
      planned: applications.filter((a) => a.status === 'planned').length,
      applied: applications.filter((a) => a.status === 'applied').length,
      accepted: applications.filter((a) => a.status === 'accepted').length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
    };
  }, [applications]);

  const filteredApps = useMemo(() => {
    if (statusFilter === 'all') return applications;
    return applications.filter((a) => a.status === statusFilter);
  }, [applications, statusFilter]);

  // Compute elapsed days helper
  const getElapsedDays = (appliedAt: string | null): number => {
    if (!appliedAt) return 0;
    const appliedTime = new Date(appliedAt).getTime();
    if (isNaN(appliedTime)) return 0;
    return Math.floor((Date.now() - appliedTime) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 font-poppins">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B4D3E]">
            Application Tracker & Login Reminders
          </h1>
          <p className="text-[#5C6B63] text-sm mt-1">
            Track admission pipelines with automated milestone check-ins (+1, +3, +7 days from submission).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#1B4D3E] hover:bg-[#2E6B57] text-[#FAF7F0] rounded-[6px] text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 text-[#FAF7F0]" />
            <span>Track New University</span>
          </button>
          <Link
            to="/matches"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-[#F3EEE2] text-[#1B4D3E] border border-[#E6DFCF] rounded-[6px] text-xs font-semibold transition-colors"
          >
            <span>Browse Matches</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#1B4D3E]" />
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/15 pb-3">
        {[
          { id: 'all', label: 'All Applications', count: counts.all },
          { id: 'planned', label: 'Planned', count: counts.planned },
          { id: 'applied', label: 'Applied', count: counts.applied },
          { id: 'accepted', label: 'Accepted', count: counts.accepted },
          { id: 'rejected', label: 'Rejected', count: counts.rejected },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-[6px] text-xs font-bold transition-colors ${
                isActive
                  ? 'bg-[#deb062] text-[#0b1e17] shadow-sm'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20 border border-white/15'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Loading admission records...
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <CalendarClock className="w-12 h-12 text-[#FF5E00] mx-auto" />
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#0B1026]">
              {statusFilter === 'all'
                ? 'No applications tracked yet'
                : `No applications with status "${statusFilter}"`}
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Add programs directly or browse verified university matches and click "I Have Applied" to initiate check-in reminders.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF5E00] hover:bg-[#E65400] text-[#0B1026] rounded-[6px] text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 text-[#0B1026]" />
            <span>Track an Institution</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredApps.map((app) => {
            const univ = universities.find((u) => u.id === app.universityId);
            const elapsedDays = getElapsedDays(app.appliedAt);

            return (
              <div
                key={app.id}
                className="bg-white rounded-[8px] border border-[#E6DFCF] shadow-xs p-6 space-y-4 flex flex-col justify-between hover:border-[#1B4D3E] transition-all"
              >
                <div className="space-y-3">
                  {/* Card Header: Country & Status Pill */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-[4px] bg-[#1B4D3E] text-[#FAF7F0]">
                      {univ?.countryId.toUpperCase() || 'UNIVERSITY'}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider ${
                        app.status === 'applied'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : app.status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          : app.status === 'rejected'
                          ? 'bg-rose-100 text-rose-900 border border-rose-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  {/* Institution & Program */}
                  <div>
                    <h2 className="font-bold text-[#0B1026] text-lg leading-snug">
                      {univ?.name || app.universityId}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {univ?.program || 'Graduate Degree Program'}
                    </p>
                  </div>

                  {/* Deadline & Tuition Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-[6px] border border-slate-100">
                    <div>
                      <span className="text-slate-500 block">Application Deadline</span>
                      <span className="font-bold text-[#0B1026]">
                        {univ?.requirements.application_deadline || 'Not confirmed'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Tuition Fee</span>
                      <span className="font-bold text-[#0B1026]">
                        {univ?.tuition || 'Not confirmed'}
                      </span>
                    </div>
                  </div>

                  {/* Submission Timestamp & Milestone Progress */}
                  {app.status === 'applied' && (
                    <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[#0B1026] font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#FF5E00]" />
                          <span>
                            Applied: {new Date(app.appliedAt!).toLocaleDateString()}
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-600 font-bold">
                          {elapsedDays === 0 ? 'Today' : `${elapsedDays}d ago`}
                        </span>
                      </div>

                      {/* Milestone Progress Steps */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <div
                          className={`p-1.5 rounded-[4px] text-center text-[10px] font-semibold border ${
                            elapsedDays >= 1
                              ? 'bg-[#0B1026] text-[#FF5E00] border-[#0B1026] shadow-xs'
                              : 'bg-white text-slate-500 border-slate-200'
                          }`}
                        >
                          Day +1 {elapsedDays >= 1 ? '✓' : 'Pending'}
                        </div>
                        <div
                          className={`p-1.5 rounded-[4px] text-center text-[10px] font-semibold border ${
                            elapsedDays >= 3
                              ? 'bg-[#0B1026] text-[#FF5E00] border-[#0B1026] shadow-xs'
                              : 'bg-white text-slate-500 border-slate-200'
                          }`}
                        >
                          Day +3 {elapsedDays >= 3 ? '✓' : 'Pending'}
                        </div>
                        <div
                          className={`p-1.5 rounded-[4px] text-center text-[10px] font-semibold border ${
                            elapsedDays >= 7
                              ? 'bg-[#0B1026] text-[#FF5E00] border-[#0B1026] shadow-xs'
                              : 'bg-white text-slate-500 border-slate-200'
                          }`}
                        >
                          Day +7 {elapsedDays >= 7 ? '✓' : 'Pending'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Student Notes Section (500 Char Cap) */}
                  <div className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-[#FF5E00]" />
                        <span>Application Notes:</span>
                      </span>
                      {editingNotesId !== app.id && (
                        <button
                          onClick={() => {
                            setEditingNotesId(app.id);
                            setNotesInput(app.notes || '');
                          }}
                          className="text-[#FF5E00] hover:text-[#E65400] font-semibold text-[11px]"
                        >
                          {app.notes ? 'Edit' : '+ Add Note'}
                        </button>
                      )}
                    </div>

                    {editingNotesId === app.id ? (
                      <div className="space-y-1.5 pt-1">
                        <textarea
                          maxLength={500}
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value.slice(0, 500))}
                          placeholder="Save portal application ID, reference numbers, or interview dates..."
                          className="w-full p-2.5 rounded-[6px] border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5E00]"
                          rows={2}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {notesInput.length} / 500
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setEditingNotesId(null)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-[6px]"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveNotes(app)}
                              className="px-3.5 py-1 text-[11px] font-semibold text-[#0B1026] bg-[#FF5E00] hover:bg-[#E65400] rounded-[6px] shadow-sm"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : app.notes ? (
                      <p className="text-slate-600 bg-slate-50 p-2.5 rounded-[6px] border border-slate-100 italic">
                        "{app.notes}"
                      </p>
                    ) : (
                      <p className="text-slate-400 italic">No notes added.</p>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Official Portal Button */}
                    {univ?.portalUrl && (
                      <a
                        href={univ.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-[#FF5E00] text-xs font-semibold"
                      >
                        <span>Official Portal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Primary Lifecycle Action Buttons */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      {/* PLANNED: "I Have Applied" */}
                      {app.status === 'planned' && (
                        <button
                          onClick={() => handleMarkApplied(app.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FF5E00] hover:bg-[#E65400] text-[#0B1026] rounded-[6px] text-xs font-semibold shadow-sm transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-[#0B1026]" />
                          <span>I Have Applied</span>
                        </button>
                      )}

                      {/* APPLIED: Mark Accepted / Mark Rejected */}
                      {app.status === 'applied' && (
                        <>
                          <button
                            onClick={() => handleMarkAccepted(app)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-[6px] text-xs font-semibold transition-colors border border-emerald-200"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Accepted</span>
                          </button>
                          <button
                            onClick={() => handleMarkRejected(app)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-[6px] text-xs font-semibold transition-colors border border-rose-200"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Mark as Rejected</span>
                          </button>
                        </>
                      )}

                      {/* REJECTED: Direct Rejection Roadmap Link */}
                      {app.status === 'rejected' && (
                        <Link
                          to={`/roadmap/${app.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1B4D3E] hover:bg-[#2E6B57] text-[#FAF7F0] rounded-[6px] text-xs font-semibold shadow-xs transition-colors"
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-[#F3C97E]" />
                          <span>View Rejection Roadmap</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Track New University Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-4 border border-[#E6DFCF]">
            <h2 className="text-lg font-bold text-[#1B4D3E]">
              Track an Institution in Your Admission Pipeline
            </h2>
            <p className="text-xs text-[#5C6B63]">
              Select a verified institution from our catalog to monitor deadlines and automated follow-ups.
            </p>

            <select
              value={selectedUnivToAdd}
              onChange={(e) => setSelectedUnivToAdd(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[6px] border border-[#E6DFCF] text-xs text-[#2B3A33] focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-white"
            >
              <option value="">-- Choose University --</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.program} ({u.countryId.toUpperCase()})
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#5C6B63] hover:bg-[#F3EEE2] rounded-[6px]"
              >
                Cancel
              </button>
              <button
                disabled={!selectedUnivToAdd}
                onClick={() => handleAddApplication('planned')}
                className="px-4 py-2 text-xs font-semibold text-[#1B4D3E] border border-[#E6DFCF] bg-white hover:bg-[#F3EEE2] rounded-[6px] disabled:opacity-50"
              >
                Add as Planned
              </button>
              <button
                disabled={!selectedUnivToAdd}
                onClick={() => handleAddApplication('applied')}
                className="px-4 py-2 text-xs font-semibold text-[#FAF7F0] bg-[#1B4D3E] hover:bg-[#2E6B57] rounded-[6px] shadow-xs disabled:opacity-50"
              >
                I Have Applied
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationTrackerPage;
