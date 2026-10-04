import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { Activity, Wifi, WifiOff, RefreshCw, LogOut, User, Shield, Stethoscope, Smartphone } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, isSyncing, triggerSync } = useSync();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Shield className="w-3.5 h-3.5" /> Admin
          </span>
        );
      case 'doctor':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Stethoscope className="w-3.5 h-3.5" /> Doctor
          </span>
        );
      case 'collector':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <Smartphone className="w-3.5 h-3.5" /> Assistant / Healthcamp
          </span>
        );
      case 'registrar':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <User className="w-3.5 h-3.5" /> User Registration
          </span>
        );
      case 'patient':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <User className="w-3.5 h-3.5" /> Patient
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Activity className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                HealthPulse
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30">
                Medical Care
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Healthcare & Vitals Monitoring System</p>
          </div>
        </div>

        {/* Status & User Actions */}
        {user && (
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* Online / Offline Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
              {isOnline ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-slate-300 font-medium hidden md:inline">Online</span>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  <span className="text-amber-400 font-medium hidden md:inline">Offline Mode</span>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                </>
              )}
            </div>

            {/* Offline Sync Badge Button */}
            {pendingCount > 0 && (
              <button
                onClick={triggerSync}
                disabled={!isOnline || isSyncing}
                title="Pending offline screenings to sync"
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-300' : ''}`} />
                <span>{pendingCount} Pending Sync</span>
              </button>
            )}

            {/* Role Badge */}
            <div className="hidden sm:block">
              {getRoleBadge(user.role)}
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-200">{user.full_name}</p>
                <p className="text-[11px] text-slate-400">{user.phone}</p>
              </div>
              
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

      </div>
    </header>
  );
};

export default Navbar;
