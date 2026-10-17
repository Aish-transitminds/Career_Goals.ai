/**
 * AbroadPath AI - Responsive Navigation Bar with Milestone Notifications
 * File: src/components/common/Navbar.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R4, §Screens #6) & PROJECT.md
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { DeleteDataModal } from './DeleteDataModal';
import {
  Compass,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  Trash2,
  ShieldCheck,
  Bell,
  CheckCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, signInWithGoogle, signInWithMock, signOutUser, deleteMyData, isMockAuth } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const navLinks = [
    { name: 'Matches', path: '/matches' },
    { name: 'Country Guides', path: '/countries' },
    { name: 'Application Tracker', path: '/tracker' },
    { name: 'Letter Helper', path: '/letter-helper' },
  ];

  const isActive = (path: string) => {
    if (path === '/matches') return location.pathname === '/matches';
    return location.pathname.startsWith(path);
  };

  const handleDeleteData = async () => {
    try {
      setIsDeleting(true);
      await deleteMyData();
      setShowDeleteModal(false);
      navigate('/', { state: { dataDeleted: true } });
    } catch (err) {
      console.error('Delete data error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: Brand / Logo */}
            <div className="flex items-center">
              <Link to={user ? '/matches' : '/'} className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                    Career<span className="text-indigo-600">Goals</span>
                  </span>
                  <span className="block text-xs font-medium text-slate-500 -mt-1">
                    Study Abroad Guide
                  </span>
                </div>
              </Link>

              {/* Verified Badge */}
              <div className="hidden lg:flex items-center ml-4 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Verified Data Only
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex md:items-center md:space-x-1 lg:space-x-4">
              {user &&
                navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(link.path)
                        ? 'text-indigo-600 bg-indigo-50 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
            </div>

            {/* Right: Notifications, Auth & Profile */}
            <div className="hidden md:flex md:items-center md:space-x-3">
              {user ? (
                <>
                  {/* Notification Bell & Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setNotifDropdownOpen(!notifDropdownOpen);
                        setUserDropdownOpen(false);
                      }}
                      className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
                      title="In-App Milestone Reminders"
                      aria-label="In-App Milestone Reminders"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full border-2 border-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Interactive Dropdown List */}
                    {notifDropdownOpen && (
                      <div
                        className="origin-top-right absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 divide-y divide-slate-100 focus:outline-none z-50 overflow-hidden"
                        onMouseLeave={() => setNotifDropdownOpen(false)}
                      >
                        <div className="px-4 py-3 flex items-center justify-between bg-slate-50">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">In-App Milestone Reminders</span>
                            <span className="text-[10px] text-slate-500 font-normal">(In-app only)</span>
                            {unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                {unreadCount} new
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>Mark all read</span>
                            </button>
                          )}
                        </div>

                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                              <Clock className="w-6 h-6 text-slate-400 mx-auto" />
                              <p className="font-semibold text-slate-700">No active reminders</p>
                              <p>Apply to programs in the Tracker to initiate +1, +3, +7 day check-ins.</p>
                            </div>
                          ) : (
                            notifications.map((n) => (
                              <div
                                key={n.id}
                                onClick={() => markAsRead(n.id)}
                                className={`p-3.5 text-xs transition-colors cursor-pointer ${
                                  !n.read ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    {!n.read && (
                                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                                    )}
                                    <span className="font-bold text-slate-900">
                                      Day +{n.dayInterval || 1} Follow-Up
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(n.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-slate-600 mt-1 leading-relaxed pl-3.5">{n.message}</p>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="p-2.5 bg-slate-50 text-center border-t border-slate-100">
                          <Link
                            to="/tracker"
                            onClick={() => setNotifDropdownOpen(false)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                          >
                            <span>Open Application Tracker</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(!userDropdownOpen);
                        setNotifDropdownOpen(false);
                      }}
                      className="flex items-center space-x-2 text-sm focus:outline-none p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          className="w-8 h-8 rounded-full border border-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {(user.displayName || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-slate-700 max-w-[140px] truncate">
                        {user.displayName || 'Student'}
                      </span>
                    </button>

                    {/* Profile Dropdown Menu */}
                    {userDropdownOpen && (
                      <div
                        className="origin-top-right absolute right-0 mt-2 w-56 rounded-2xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 divide-y divide-slate-100 focus:outline-none z-50 overflow-hidden"
                        onMouseLeave={() => setUserDropdownOpen(false)}
                      >
                        <div className="px-4 py-3 bg-slate-50">
                          <p className="text-xs text-slate-500">Signed in as</p>
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {user.email || user.displayName}
                          </p>
                          {user.isMock && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold">
                              Mock Test Session
                            </span>
                          )}
                        </div>
                        <div className="py-1">
                          <Link
                            to="/onboarding"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <UserIcon className="w-4 h-4 mr-2 text-slate-400" />
                            Edit Exam Profile
                          </Link>
                          <Link
                            to="/tracker"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Clock className="w-4 h-4 mr-2 text-slate-400" />
                            Application Tracker
                          </Link>
                        </div>
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              setShowDeleteModal(true);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 font-medium"
                          >
                            <Trash2 className="w-4 h-4 mr-2 text-rose-500" />
                            Delete My Data
                          </button>
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              signOutUser();
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <LogOut className="w-4 h-4 mr-2 text-slate-400" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => signInWithMock('standard')}
                    className="text-xs font-medium text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    Demo Student Login
                  </button>
                  <button
                    onClick={signInWithGoogle}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Sign In with Google
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="flex items-center md:hidden">
              {user && (
                <Link
                  to="/tracker"
                  className="relative p-2 text-slate-600 mr-1"
                  aria-label="View notifications in Tracker"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 text-[9px] font-bold text-white bg-rose-500 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-2 pt-2 pb-3 space-y-1">
            {user ? (
              <>
                <div className="px-3 py-2 border-b border-slate-100 mb-2">
                  <p className="text-sm font-semibold text-slate-800">{user.displayName || 'Student'}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  {isMockAuth && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold">
                      Mock Mode
                    </span>
                  )}
                </div>
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      isActive(link.path)
                        ? 'text-indigo-600 bg-indigo-50 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
                <Link
                  to="/onboarding"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit Profile & Scores
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowDeleteModal(true);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-rose-600 hover:bg-rose-50"
                >
                  Delete My Data
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOutUser();
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="p-2 space-y-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signInWithGoogle();
                  }}
                  className="w-full flex justify-center items-center px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Sign In with Google
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signInWithMock('standard');
                  }}
                  className="w-full flex justify-center items-center px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Demo Student Mock Sign-In
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* R4 "Delete My Data" Confirmation Modal */}
      <DeleteDataModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteData}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default Navbar;
