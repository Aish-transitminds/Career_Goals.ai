/**
 * AbroadPath AI - Delete My Data Privacy Modal
 * File: src/components/common/DeleteDataModal.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R4 §Security and privacy) & PROJECT.md
 */

import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export interface DeleteDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export const DeleteDataModal: React.FC<DeleteDataModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 border border-slate-200 animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 text-rose-600">
            <div className="p-3 bg-rose-100 rounded-2xl">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 id="delete-modal-title" className="text-lg font-bold text-slate-900">
                Delete All Personal Data
              </h3>
              <span className="text-xs text-rose-600 font-semibold uppercase tracking-wider">
                Permanent & Non-Reversible
              </span>
            </div>
          </div>
          <button
            disabled={isDeleting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description & Impact Summary */}
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <p>
            In strict compliance with our privacy mandate (<strong>zero data retention</strong>), confirming this action will execute a cascading deletion across:
          </p>
          <ul className="space-y-1.5 pl-3 text-slate-700">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span><strong>User Profile:</strong> Exam scores (GRE, GMAT, IELTS, TOEFL) and budget.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span><strong>Applications:</strong> All tracked university pipelines and status notes.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span><strong>Notifications:</strong> In-app reminder milestones and check-in history.</span>
            </li>
          </ul>
        </div>

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Once confirmed, your account session will be terminated and all local storage flushed. You cannot recover these records.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting Records...</span>
              </>
            ) : (
              <span>Confirm Permanent Deletion</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
