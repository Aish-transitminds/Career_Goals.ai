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
  Menu,
  X,
  User as UserIcon,
  LogOut,
  Trash2,
  Bell,
  CheckCheck,
  Clock,
  ArrowRight,
  Search,
  GraduationCap,
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
  const [searchQuery, setSearchQuery] = useState('');

  // Exact 4 navigation tabs requested: Matches, Country Guides, Application Tracker, Statement Requirements & Planner
  const navLinks = [
    { name: 'Matches', path: '/matches' },
    { name: 'Country Guides', path: '/countries' },
    { name: 'Application Tracker', path: '/tracker' },
    { name: 'Statement Requirements & Planner', path: '/letter-helper' },
  ];

  const isActive = (path: string) => {
    if (path === '/matches') return location.pathname === '/matches';
    if (path === '/countries') return location.pathname.startsWith('/countries');
    if (path === '/tracker') return location.pathname.startsWith('/tracker');
    if (path === '/letter-helper') return location.pathname.startsWith('/letter-helper');
    return location.pathname === path;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/matches?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/matches');
    }
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
      {/* Unified Sticky Navy Nav (#0B1026): Logo, Exact 4 Tabs, Search, Notifications, Profile */}
      <nav className="bg-[#0B1026] text-white sticky top-0 z-40 shadow-md font-sans border-b border-[#151B3A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo on Left */}
            <Link to="/" className="flex items-center space-x-2.5 shrink-0 group mr-6">
              <div className="w-9 h-9 rounded-[6px] bg-[#FF5E00] flex items-center justify-center text-[#0B1026] font-bold shadow-xs group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5 text-[#0B1026]" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-base font-bold text-white tracking-tight leading-tight flex items-center">
                  Career<span className="text-[#FF5E00]">Goals</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium leading-none -mt-0.5">
                  Study Abroad Guide
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links (Pill highlight for active state) */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2 flex-1">
              {navLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`px-3 py-1.5 rounded-[6px] text-xs lg:text-sm font-medium tracking-normal transition-all duration-150 flex items-center whitespace-nowrap ${
                      active
                        ? 'bg-[#151B3A] text-[#FF5E00] font-semibold border border-[#FF5E00]/30 shadow-xs'
                        : 'text-slate-200 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* Right: Rounded Search Pill + Auth & Notifications */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Rounded search pill */}
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search universities..."
                  className="w-44 lg:w-56 bg-[#151B3A] text-white placeholder-slate-400 text-xs rounded-full pl-8 pr-3 py-1.5 border border-slate-700 focus:outline-none focus:border-[#FF5E00] transition-all"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </form>

              {user ? (
                <>
                  {/* Notification Bell & Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setNotifDropdownOpen(!notifDropdownOpen);
                        setUserDropdownOpen(false);
                      }}
                      className="relative p-2 text-slate-300 hover:text-white hover:bg-[#151B3A] rounded-lg transition-colors focus:outline-none"
                      title="Milestone Reminders"
                      aria-label="Milestone Reminders"
                    >
                      <Bell className="w-4 h-4" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 text-[9px] font-bold text-[#0B1026] bg-[#FF5E00] rounded-full border border-[#0B1026]">
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
                            <span className="text-xs font-bold text-slate-900">Milestone Reminders</span>
                            {unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                {unreadCount} new
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-[11px] font-semibold text-[#FF5E00] hover:text-[#E65400] flex items-center gap-1"
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
                                  !n.read ? 'bg-orange-50/50 hover:bg-orange-50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    {!n.read && (
                                      <span className="w-2 h-2 rounded-full bg-[#FF5E00] shrink-0" />
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
                            className="text-xs font-bold text-[#FF5E00] hover:text-[#E65400] inline-flex items-center gap-1"
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
                      className="flex items-center space-x-2 text-sm focus:outline-none p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          className="w-8 h-8 rounded-full border border-white/20 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#FF5E00] text-[#0B1026] flex items-center justify-center font-bold text-xs shrink-0">
                          {(user.displayName || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-white whitespace-nowrap">
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
                    className="text-xs font-semibold text-slate-200 hover:text-[#FF5E00] px-3 py-2 rounded-[6px] hover:bg-[#151B3A] transition-colors"
                  >
                    Demo Student Login
                  </button>
                  <button
                    onClick={signInWithGoogle}
                    className="inline-flex items-center px-4 py-2 border border-slate-700 text-xs font-semibold rounded-[6px] shadow-sm text-white bg-[#151B3A] hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-[#FF5E00]"
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
                  className="relative p-2 text-slate-300 hover:text-white mr-1"
                  aria-label="View notifications in Tracker"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 text-[9px] font-bold text-[#0B1026] bg-[#FF5E00] rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-[#FF5E00] hover:bg-[#151B3A] focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#151B3A] bg-[#0B1026] px-3 pt-3 pb-4 space-y-1">
            {/* Search bar in mobile drawer */}
            <form onSubmit={handleSearchSubmit} className="relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search universities..."
                className="w-full bg-[#151B3A] text-white placeholder-slate-400 text-xs rounded-full pl-8 pr-3 py-2 border border-slate-700 focus:outline-none focus:border-[#FF5E00]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </form>

            {user ? (
              <>
                <div className="px-3 py-2 border-b border-[#151B3A] mb-2">
                  <p className="text-sm font-semibold text-white">{user.displayName || 'Student'}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  {isMockAuth && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                      Mock Mode
                    </span>
                  )}
                </div>
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-sm font-semibold ${
                      isActive(link.path)
                        ? 'text-[#FF5E00] bg-[#151B3A] font-bold'
                        : 'text-slate-200 hover:text-[#FF5E00] hover:bg-[#151B3A]'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
                <Link
                  to="/onboarding"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-sm font-semibold text-slate-200 hover:bg-[#151B3A]"
                >
                  Edit Profile &amp; Scores
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowDeleteModal(true);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-sm font-semibold text-rose-400 hover:bg-[#151B3A]"
                >
                  Delete My Data
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOutUser();
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-sm font-semibold text-slate-300 hover:bg-[#151B3A]"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="p-2 space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-sm font-semibold ${
                      isActive(link.path)
                        ? 'text-[#FF5E00] bg-[#151B3A] font-bold'
                        : 'text-slate-200 hover:text-[#FF5E00] hover:bg-[#151B3A]'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signInWithGoogle();
                  }}
                  className="w-full flex justify-center items-center px-4 py-2.5 rounded-[6px] text-xs font-semibold text-white bg-[#151B3A] hover:bg-slate-800 border border-slate-700"
                >
                  Sign In with Google
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signInWithMock('standard');
                  }}
                  className="w-full flex justify-center items-center px-4 py-2 rounded-[6px] text-xs font-semibold text-[#0B1026] bg-[#FF5E00] hover:bg-[#E65400]"
                >
                  Get started (Demo)
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
