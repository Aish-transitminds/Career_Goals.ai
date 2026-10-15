/**
 * AbroadPath AI - Firestore Typed CRUD Service
 * File: src/services/firestoreService.ts
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R4) & PROJECT.md
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  UserProfile,
  University,
  Country,
  Application,
  InAppNotification,
} from '../types';

/**
 * Fetches user profile from users/{uid}
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return null;
  }
  return docSnap.data() as UserProfile;
}

/**
 * Saves or updates user profile in users/{uid}
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const docRef = doc(db, 'users', profile.uid);
  await setDoc(docRef, {
    ...profile,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

/**
 * R4: Cascading deletion of user profile and all nested subcollections
 */
export async function deleteUserProfileAndData(uid: string): Promise<void> {
  const batch = writeBatch(db);

  // 1. Delete applications subcollection
  const appsSnap = await getDocs(collection(db, 'users', uid, 'applications'));
  appsSnap.forEach((d) => batch.delete(d.ref));

  // 2. Delete notifications subcollection
  const notifsSnap = await getDocs(collection(db, 'users', uid, 'notifications'));
  notifsSnap.forEach((d) => batch.delete(d.ref));

  // 3. Delete user root document
  const userRef = doc(db, 'users', uid);
  batch.delete(userRef);

  await batch.commit();
}

/**
 * Fetches all universities from public catalog
 */
export async function getUniversities(): Promise<University[]> {
  const colRef = collection(db, 'universities');
  const snap = await getDocs(colRef);
  const list: University[] = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() } as University);
  });
  return list;
}

/**
 * Fetches all countries from public catalog
 */
export async function getCountries(): Promise<Country[]> {
  const colRef = collection(db, 'countries');
  const snap = await getDocs(colRef);
  const list: Country[] = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() } as Country);
  });
  return list;
}

/**
 * Fetches applications for a user
 */
export async function getUserApplications(uid: string): Promise<Application[]> {
  const colRef = collection(db, 'users', uid, 'applications');
  const snap = await getDocs(colRef);
  const list: Application[] = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() } as Application);
  });
  return list;
}

/**
 * Saves an application document under users/{uid}/applications/{universityId}
 */
export async function setUserApplication(
  uid: string,
  universityId: string,
  status: Application['status'] = 'applied'
): Promise<void> {
  const appRef = doc(db, 'users', uid, 'applications', universityId);
  const now = new Date().toISOString();
  await setDoc(appRef, {
    id: universityId,
    universityId,
    status,
    appliedAt: status === 'applied' ? now : null,
    updatedAt: now,
  }, { merge: true });
}

/**
 * Fetches notifications for a user
 */
export async function getUserNotifications(uid: string): Promise<InAppNotification[]> {
  const colRef = collection(db, 'users', uid, 'notifications');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const list: InAppNotification[] = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() } as InAppNotification);
  });
  return list;
}

/**
 * Marks notification as read
 */
export async function markNotificationRead(uid: string, notificationId: string): Promise<void> {
  const notifRef = doc(db, 'users', uid, 'notifications', notificationId);
  await setDoc(notifRef, { read: true }, { merge: true });
}
