import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import CollectorDashboard from './pages/collector/CollectorDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientDashboard from './pages/patient/PatientDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'doctor') return <Navigate to="/doctor" replace />;
  if (user.role === 'collector') return <Navigate to="/collector" replace />;
  if (user.role === 'patient') return <Navigate to="/patient" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SyncProvider>
          <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-teal-500 selection:text-slate-950">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                
                {/* Data Collector Role Route */}
                <Route
                  path="/collector"
                  element={
                    <ProtectedRoute allowedRoles={['collector', 'admin']}>
                      <CollectorDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Doctor Role Route */}
                <Route
                  path="/doctor"
                  element={
                    <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                      <DoctorDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Patient Role Route */}
                <Route
                  path="/patient"
                  element={
                    <ProtectedRoute allowedRoles={['patient', 'admin']}>
                      <PatientDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Role Route */}
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
