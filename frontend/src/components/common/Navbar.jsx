import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import InstallAppButton from './InstallButton';
import api, { extractErrorMessage } from '../../services/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, isSyncing, triggerSync } = useSync();
  const location = useLocation();
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

  return (
    <>
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Main Nav Links */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img 
              src="/icon-192-v2.png" 
              alt="SwasthGrama" 
              className="w-9 h-9 rounded object-contain shadow-sm border border-teal-100 flex-shrink-0"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">
                  SwasthGrama
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                  Rural Health
                </span>
              </div>
            </div>
          </Link>

          {/* Role-Specific Navigation Tabs */}
          {user && (
            <nav className="hidden md:flex items-center gap-1.5 pl-4 border-l border-slate-200 text-xs font-semibold">
              {/* Volunteer & Camp Assistant Tabs */}
              {(user.role === 'volunteer' || user.role === 'camp_assistant' || user.role === 'admin') && (
                <Link
                  to="/registration"
                  className={`px-3 py-1.5 rounded transition ${
                    isActive('/registration')
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Register Citizen
                </Link>
              )}

              {/* Camp Assistant & Doctor Vitals Intake */}
              {(user.role === 'camp_assistant' || user.role === 'doctor' || user.role === 'admin') && (
                <Link
                  to="/collector"
                  className={`px-3 py-1.5 rounded transition ${
                    isActive('/collector')
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Health Check Desk
                </Link>
              )}

              {/* Doctor Portal */}
              {(user.role === 'doctor' || user.role === 'admin') && (
                <Link
                  to="/doctor"
                  className={`px-3 py-1.5 rounded transition ${
                    isActive('/doctor')
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Doctor Consultation
                </Link>
              )}

              {/* Patient Self-View */}
              {user.role === 'patient' && (
                <Link
                  to="/patient"
                  className={`px-3 py-1.5 rounded transition ${
                    isActive('/patient')
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  My Health Numbers
                </Link>
              )}

              {/* Higher Authority & Admin Analytics */}
              {(user.role === 'higher_authority' || user.role === 'admin') && (
                <Link
                  to="/analytics"
                  className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 ${
                    isActive('/analytics')
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Health Analytics
                </Link>
              )}

              {/* Admin Console */}
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`px-3 py-1.5 rounded transition ${
                    isActive('/admin')
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Admin Console
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <InstallAppButton />

          {user && (
            <>
              {/* Online/Offline Status Indicator */}
              <div className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                isOnline 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {isOnline ? 'Online' : 'Offline'}
              </div>

              {pendingCount > 0 && (
                <button
                  onClick={triggerSync}
                  disabled={!isOnline || isSyncing}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition disabled:opacity-50"
                >
                  {isSyncing ? 'Uploading...' : `${pendingCount} Offline (Sync)`}
                </button>
              )}

              {/* User details */}
              <div className="text-right hidden sm:block pl-2 border-l border-slate-200">
                <p className="text-xs font-bold text-slate-900">{user.full_name}</p>
                <p className="text-[11px] text-teal-700 font-medium">{getRoleLabel(user.role)}</p>
              </div>

              <button
                onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordMessage(null); setShowPasswordDialog(true); }}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 transition"
              >
                Account
              </button>

              {/* Sign Out */}
              <button
                onClick={logout}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 transition"
              >
                Sign Out
              </button>
            </>
          )}
        </div>

      </div>
    </header>

    {showPasswordDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closePasswordDialog(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="account-password-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div><h2 id="account-password-title" className="text-lg font-bold text-slate-900">Account settings</h2><p className="mt-1 text-sm text-slate-600">Change your sign-in password.</p></div>
            <button type="button" onClick={closePasswordDialog} aria-label="Close" className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">✕</button>
          </div>
          <form onSubmit={submitPasswordChange} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700">Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700" /></label>
            <label className="block text-sm font-medium text-slate-700">New password<input type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700" /><span className="mt-1 block text-xs font-normal text-slate-500">Use at least 8 characters.</span></label>
            <label className="block text-sm font-medium text-slate-700">Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700" /></label>
            {passwordMessage && <p role="status" className={`rounded-lg border p-3 text-sm ${passwordMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{passwordMessage.text}</p>}
            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={closePasswordDialog} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Close</button><button type="submit" disabled={passwordSaving} className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50">{passwordSaving ? 'Saving…' : 'Change password'}</button></div>
          </form>
        </section>
      </div>
    )}
    </>
  );
};

export default Navbar;
