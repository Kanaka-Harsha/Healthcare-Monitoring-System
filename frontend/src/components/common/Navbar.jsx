import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, isSyncing, triggerSync } = useSync();

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'doctor':
        return 'Doctor';
      case 'collector':
        return 'Healthcamp Assistant';
      case 'registrar':
        return 'Registration Desk';
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
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img 
            src="/icon-192.png" 
            alt="SwastGrama Logo" 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded object-contain shadow-sm border border-teal-100 flex-shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight whitespace-nowrap">
                SwastGrama
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 hidden md:inline-block">
                Village Health
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden lg:block truncate">Community Healthcare & Patient Records</p>
          </div>
        </div>

        {/* Status & User Actions */}
        {user && (
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            
            {/* Status Indicator */}
            <div className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-[11px] sm:text-xs font-medium border whitespace-nowrap ${
              isOnline 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {isOnline ? 'Connected' : 'Offline Mode'}
            </div>

            {/* Offline Records Button */}
            {pendingCount > 0 && (
              <button
                onClick={triggerSync}
                disabled={!isOnline || isSyncing}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition disabled:opacity-50"
              >
                {isSyncing ? 'Sending...' : `${pendingCount} Unsent Records (Send Now)`}
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
