import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import InstallAppButton from './InstallButton';
import api, { extractErrorMessage } from '../../services/api';
import { Menu, X, User, LogOut, KeyRound, Wifi, WifiOff, RefreshCw } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, isSyncing, triggerSync } = useSync();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const closePasswordDialog = () => {
    setShowPasswordDialog(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage(null);
  };

  const submitPasswordChange = async (event) => {
    event.preventDefault();
    setPasswordMessage(null);
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Use at least 8 characters for your new password.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'The new passwords do not match.' });
      return;
    }
    setPasswordSaving(true);
    try {
      const response = await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMessage({ type: 'success', text: response.data?.message || 'Your password has been changed.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordMessage({ type: 'error', text: extractErrorMessage(error, 'Unable to change your password.') });
    } finally {
      setPasswordSaving(false);
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'App Admin';
      case 'doctor':
        return 'Doctor';
      case 'camp_assistant':
      case 'collector':
        return 'Assistant/Camp';
      case 'volunteer':
        return 'Village Volunteer';
      case 'higher_authority':
        return 'Higher Authority';
      case 'patient':
        return 'Patient';
      default:
        return role;
    }
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    ...(user && (user.role === 'volunteer' || user.role === 'camp_assistant' || user.role === 'admin')
      ? [{ to: '/registration', label: 'Register Citizen' }]
      : []),
    ...(user && (user.role === 'camp_assistant' || user.role === 'doctor' || user.role === 'admin')
      ? [{ to: '/collector', label: 'Health Check Desk' }]
      : []),
    ...(user && (user.role === 'doctor' || user.role === 'admin')
      ? [{ to: '/doctor', label: 'Doctor Consultation' }]
      : []),
    ...(user && user.role === 'patient'
      ? [{ to: '/patient', label: 'My Health Numbers' }]
      : []),
    ...(user && (user.role === 'higher_authority' || user.role === 'admin')
      ? [{ to: '/analytics', label: 'Health Analytics', dot: true }]
      : []),
    ...(user && user.role === 'admin'
      ? [{ to: '/admin', label: 'Admin Console', highlight: true }]
      : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          
          {/* Left: Brand & Desktop Nav Links */}
          <div className="flex items-center gap-4 lg:gap-6 min-w-0">
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <img 
                src="/icon-192-v2.png" 
                alt="SwasthGrama" 
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain shadow-sm border border-teal-100 flex-shrink-0"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                  SwasthGrama
                </span>
                <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                  Rural Health
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            {user && navLinks.length > 0 && (
              <nav className="hidden xl:flex items-center gap-1 pl-3 border-l border-slate-200 text-xs font-semibold">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                      isActive(link.to)
                        ? link.highlight
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-teal-800 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {link.dot && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive(link.to) ? 'bg-emerald-300' : 'bg-emerald-500'}`} />
                    )}
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Right: Actions & User Info */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            <InstallAppButton />

            {user && (
              <>
                {/* Online / Offline badge */}
                <div 
                  className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                    isOnline 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                  title={isOnline ? 'Online - Database Connected' : 'Offline - Queued to sync locally'}
                >
                  {isOnline ? <Wifi className="w-3 h-3 text-emerald-600" /> : <WifiOff className="w-3 h-3 text-amber-600" />}
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </div>

                {/* Offline Sync Button */}
                {pendingCount > 0 && (
                  <button
                    onClick={triggerSync}
                    disabled={!isOnline || isSyncing}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition disabled:opacity-50 flex-shrink-0"
                    title="Click to sync offline records"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : `${pendingCount} (Sync)`}</span>
                  </button>
                )}

                {/* User Pill (Desktop) */}
                <div className="hidden lg:flex flex-col text-right pl-2 border-l border-slate-200">
                  <p className="text-xs font-bold text-slate-900 max-w-[140px] truncate" title={user.full_name}>
                    {user.full_name}
                  </p>
                  <p className="text-[11px] text-teal-700 font-medium">
                    {getRoleLabel(user.role)}
                  </p>
                </div>

                {/* Account / Password Button */}
                <button
                  onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordMessage(null); setShowPasswordDialog(true); }}
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 transition flex-shrink-0"
                  title="Change your sign-in password"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Account</span>
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={logout}
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 transition flex-shrink-0"
                  title="Sign out of your session"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>

                {/* Mobile / Tablet Menu Toggle */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="xl:hidden inline-flex items-center justify-center p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>

        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        {user && mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg animate-fadeIn">
            {/* User Profile header on mobile */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{user.full_name}</p>
                  <p className="text-xs text-teal-700 font-medium">{getRoleLabel(user.role)}</p>
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                isOnline ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {isOnline ? 'Online' : 'Offline'}
              </div>
            </div>

            {/* Nav links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    isActive(link.to)
                      ? link.highlight
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-teal-800 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{link.label}</span>
                  {link.dot && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </Link>
              ))}
            </div>

            {/* Secondary actions on mobile */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordMessage(null);
                  setShowPasswordDialog(true);
                }}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-teal-50 text-teal-800 border border-slate-200 flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Account Password</span>
              </button>

              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Change Password Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closePasswordDialog(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="account-password-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h2 id="account-password-title" className="text-base font-bold text-slate-900">Account Settings</h2>
                <p className="mt-0.5 text-xs text-slate-500">Change your sign-in password</p>
              </div>
              <button type="button" onClick={closePasswordDialog} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitPasswordChange} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Password *</label>
                <input 
                  type="password" 
                  autoComplete="current-password" 
                  required 
                  value={currentPassword} 
                  onChange={e=>setCurrentPassword(e.target.value)} 
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
                <input 
                  type="password" 
                  autoComplete="new-password" 
                  minLength={8} 
                  required 
                  value={newPassword} 
                  onChange={e=>setNewPassword(e.target.value)} 
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium" 
                />
                <span className="mt-1 block text-[10px] text-slate-500">Must be at least 8 characters.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password *</label>
                <input 
                  type="password" 
                  autoComplete="new-password" 
                  minLength={8} 
                  required 
                  value={confirmPassword} 
                  onChange={e=>setConfirmPassword(e.target.value)} 
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium" 
                />
              </div>

              {passwordMessage && (
                <div role="status" className={`rounded-xl border p-3 text-xs font-medium ${passwordMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                  {passwordMessage.text}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button type="button" onClick={closePasswordDialog} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition">
                  Cancel
                </button>
                <button type="submit" disabled={passwordSaving} className="rounded-xl bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50 transition shadow-sm">
                  {passwordSaving ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
};

export default Navbar;
