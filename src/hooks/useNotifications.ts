/**
 * AbroadPath AI - In-App Notification & Reminder Synchronization Hook
 * File: src/hooks/useNotifications.ts
 * Authoritative Reference: ORIGINAL_REQUEST.md (§Screens #6, Tech Stack) & PROJECT.md
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from './useCatalog';
import { InAppNotification, Application } from '../types';
import {
  getUserNotifications,
  getUserApplications,
} from '../services/firestoreService';
import { db } from '../services/firebase';
import { doc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { calculateDueNotifications } from '../utils/reminderEngine';

export interface UseNotificationsResult {
  notifications: InAppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  simulateTimeAdvance: (days: number) => Promise<void>;
}

const MOCK_NOTIF_PREFIX = 'abroadpath_mock_notifs_';

export function useNotifications(): UseNotificationsResult {
  const { user } = useAuth();
  const { universities } = useCatalog();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const syncLock = useRef<boolean>(false);

  // Helper to read local mock notifications when in mock mode or offline
  const getLocalMockNotifs = useCallback((uid: string): InAppNotification[] => {
    try {
      const saved = localStorage.getItem(`${MOCK_NOTIF_PREFIX}${uid}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, []);

  const saveLocalMockNotifs = useCallback((uid: string, notifs: InAppNotification[]) => {
    try {
      localStorage.setItem(`${MOCK_NOTIF_PREFIX}${uid}`, JSON.stringify(notifs));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const syncReminders = useCallback(
    async (refTime: Date = new Date()) => {
      if (!user || syncLock.current) return;
      syncLock.current = true;

      try {
        setLoading(true);

        let apps: Application[] = [];
        let existingNotifs: InAppNotification[] = [];

        if (user.isMock) {
          // Read from mock storage or firestore
          try {
            apps = await getUserApplications(user.uid);
          } catch {
            apps = [];
          }
          existingNotifs = getLocalMockNotifs(user.uid);
        } else {
          try {
            const [fetchedApps, fetchedNotifs] = await Promise.all([
              getUserApplications(user.uid).catch(() => [] as Application[]),
              getUserNotifications(user.uid).catch(() => [] as InAppNotification[]),
            ]);
            apps = fetchedApps;
            existingNotifs = fetchedNotifs;
          } catch (e) {
            console.warn('[useNotifications] Firestore fetch warning, falling back to local:', e);
            existingNotifs = getLocalMockNotifs(user.uid);
          }
        }

        const dueNotifs = calculateDueNotifications(
          apps,
          universities,
          existingNotifs,
          refTime
        );

        if (dueNotifs.length > 0) {
          // Save to Firestore if available
          if (!user.isMock) {
            try {
              const batch = writeBatch(db);
              dueNotifs.forEach((n) => {
                const notifRef = doc(db, 'users', user.uid, 'notifications', n.id);
                batch.set(notifRef, n, { merge: true });
              });
              await batch.commit();
            } catch (batchErr) {
              console.warn('[useNotifications] Firestore batch write fallback to local:', batchErr);
            }
          }

          const merged = [...dueNotifs, ...existingNotifs].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          saveLocalMockNotifs(user.uid, merged);
          setNotifications(merged);
        } else {
          setNotifications(existingNotifs);
        }
      } catch (err) {
        console.error('[useNotifications] Sync error:', err);
      } finally {
        setLoading(false);
        syncLock.current = false;
      }
    },
    [user, universities, getLocalMockNotifs, saveLocalMockNotifs]
  );

  useEffect(() => {
    if (user) {
      syncReminders();
    } else {
      setNotifications([]);
      setLoading(false);
    }
  }, [user, syncReminders]);

  const handleMarkAsRead = async (id: string) => {
    if (!user) return;
    try {
      if (!user.isMock) {
        try {
          const notifRef = doc(db, 'users', user.uid, 'notifications', id);
          const batch = writeBatch(db);
          batch.set(notifRef, { read: true }, { merge: true });
          await batch.commit();
        } catch (e) {
          console.warn('[useNotifications] Firestore mark read warning:', e);
        }
      }

      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        saveLocalMockNotifs(user.uid, updated);
        return updated;
      });
    } catch (err) {
      console.error('[useNotifications] Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      if (!user.isMock) {
        try {
          const snap = await getDocs(collection(db, 'users', user.uid, 'notifications'));
          const batch = writeBatch(db);
          snap.forEach((d) => {
            if (!d.data().read) {
              batch.set(d.ref, { read: true }, { merge: true });
            }
          });
          await batch.commit();
        } catch (e) {
          console.warn('[useNotifications] Firestore mark all read warning:', e);
        }
      }

      setNotifications((prev) => {
        const updated = prev.map((n) => ({ ...n, read: true }));
        saveLocalMockNotifs(user.uid, updated);
        return updated;
      });
    } catch (err) {
      console.error('[useNotifications] Failed to mark all read:', err);
    }
  };

  const simulateTimeAdvance = async (days: number) => {
    const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await syncReminders(future);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    refresh: () => syncReminders(),
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    simulateTimeAdvance,
  };
}
