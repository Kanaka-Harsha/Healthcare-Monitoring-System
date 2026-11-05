import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import InstallAppButton from './InstallButton';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, isSyncing, triggerSync } = useSync();
  const location = useLocation();

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
  );
};

export default Navbar;
