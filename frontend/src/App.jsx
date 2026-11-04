import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import UserRegistrationPage from './pages/registrar/UserRegistrationPage';
import CollectorDashboard from './pages/collector/CollectorDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientDashboard from './pages/patient/PatientDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import HigherAuthorityAnalyticsPage from './pages/analytics/HigherAuthorityAnalyticsPage';

const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'higher_authority') return <Navigate to="/analytics" replace />;
  if (user.role === 'doctor') return <Navigate to="/doctor" replace />;
  if (user.role === 'camp_assistant' || user.role === 'collector') return <Navigate to="/collector" replace />;
  if (user.role === 'volunteer' || user.role === 'registrar') return <Navigate to="/registration" replace />;
  if (user.role === 'patient') return <Navigate to="/patient" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SyncProvider>
          <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-teal-100 selection:text-teal-900">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                
                {/* 1. Citizen Registration Desk (Village Volunteers & Camp Assistants) */}
                <Route
                  path="/registration"
                  element={
                    <ProtectedRoute allowedRoles={['volunteer', 'camp_assistant', 'doctor', 'admin', 'registrar', 'collector']}>
                      <UserRegistrationPage />
                    </ProtectedRoute>
                  }
                />

                {/* 2. Healthcamp Vitals Check Desk (Camp Assistants & Doctors - Strictly NO Analytics) */}
                <Route
                  path="/collector"
                  element={
                    <ProtectedRoute allowedRoles={['camp_assistant', 'doctor', 'admin', 'collector']}>
                      <CollectorDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* 3. Doctor Consultation Portal */}
                <Route
                  path="/doctor"
                  element={
                    <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                      <DoctorDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* 4. Patient Health Numbers View */}
                <Route
                  path="/patient"
                  element={
                    <ProtectedRoute allowedRoles={['patient', 'admin']}>
                      <PatientDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* 5. Higher Authority Analytics Portal (Collectors, PHCs, ASHA - Scoped to Jurisdiction) */}
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute allowedRoles={['higher_authority', 'admin']}>
                      <HigherAuthorityAnalyticsPage />
                    </ProtectedRoute>
                  }
                />

                {/* 6. App Admin Management Console */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="/" element={<HomeRedirect />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </SyncProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
