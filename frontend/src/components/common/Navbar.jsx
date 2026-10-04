import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, isSyncing, triggerSync } = useSync();

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'System Administrator';
      case 'doctor':
        return 'Medical Doctor';
      case 'collector':
        return 'Healthcamp Assistant';
      case 'registrar':
        return 'User Registration';
      case 'patient':
        return 'Patient';
      default:
        return role;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-teal-700 text-white font-bold flex items-center justify-center text-sm">
            SG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                SwastGrama
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                Rural Healthcare
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Community Healthcare & Medical Records</p>
          </div>
        </div>

        {/* Status & User Actions */}
        {user && (
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* Online / Offline Text Indicator */}
            <div className={`px-2.5 py-1 rounded text-xs font-medium border ${
              isOnline 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {isOnline ? 'System Online' : 'Offline Mode'}
            </div>

            {/* Offline Sync Status */}
            {pendingCount > 0 && (
              <button
                onClick={triggerSync}
                disabled={!isOnline || isSyncing}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition disabled:opacity-50"
              >
                {isSyncing ? 'Syncing...' : `${pendingCount} Records Pending Sync`}
              </button>
            )}

            {/* User Role & Name */}
            <div className="text-right hidden sm:block pl-2 border-l border-slate-200">
              <p className="text-xs font-semibold text-slate-900">{user.full_name}</p>
              <p className="text-[11px] text-teal-700 font-medium">{getRoleLabel(user.role)}</p>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 transition"
            >
              Sign Out
            </button>

          </div>
        )}

      </div>
    </header>
  );
};

export default Navbar;
