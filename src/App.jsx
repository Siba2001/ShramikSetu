import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Icons
import { 
  FileText, 
  CreditCard, 
  HeartHandshake, 
  Baby, 
  Cross, 
  GraduationCap 
} from 'lucide-react';

/**
 * Clean Government Portal Route Skeleton Loader
 */
function PageSkeleton() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
        <Loader2 className="w-5 h-5 text-blue-600 absolute animate-pulse" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-slate-700 tracking-wide uppercase">ShramikSetu Operations Portal</p>
        <p className="text-xs text-slate-400">Loading module resources...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication & Security Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin-security" element={<AdminSecurityPage />} />

          {/* Protected Application Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            
            {/* Default redirect to Dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* 1. Dashboard */}
            <Route path="dashboard" element={<DashboardPage />} />

            {/* 2. Application Modules */}
            <Route 
              path="applications/new-card" 
              element={
                <ApplicationModulePage 
                  serviceKey="New Card"
                  title="New Nirman Shramik Card"
                  description="Registration of construction workers, Aadhaar linkage, and E-Sign pending verification"
                  icon={FileText}
                />
              } 
            />

            <Route 
              path="applications/card-renewal" 
              element={
                <ApplicationModulePage 
                  serviceKey="Card Renewal"
                  title="Card Renewal / Annual Contribution"
                  description="Annual welfare contribution payment, card renewal, and resumption of registration"
                  icon={CreditCard}
                />
              } 
            />

            {/* Redirect /applications/annual-contribution to unified card-renewal */}
            <Route 
              path="applications/annual-contribution" 
              element={<Navigate to="/applications/card-renewal" replace />} 
            />

            <Route 
              path="applications/marriage-benefit" 
              element={
                <ApplicationModulePage 
                  serviceKey="Marriage Benefit Apply"
                  title="Marriage Benefit Assistance"
                  description="Financial assistance claims for registered construction workers or daughter marriage"
                  icon={HeartHandshake}
                />
              } 
            />

            <Route 
              path="applications/maternity-benefit" 
              element={
                <ApplicationModulePage 
                  serviceKey="Maternity Benefit Apply"
                  title="Maternity Benefit Assistance"
                  description="Maternity financial support for registered female construction workers"
                  icon={Baby}
                />
              } 
            />

            <Route 
              path="applications/death-benefit" 
              element={
                <ApplicationModulePage 
                  serviceKey="Death Benefit Apply"
                  title="Death Benefit Assistance"
                  description="Fatal accident, non-fatal injury, and natural death compensation claims"
                  icon={Cross}
                />
              } 
            />

            <Route 
              path="applications/education-assistance" 
              element={
                <ApplicationModulePage 
                  serviceKey="Education Assistance Apply"
                  title="Education Assistance Grants"
                  description="Scholarships and financial education grants for children of registered workers"
                  icon={GraduationCap}
                />
              } 
            />

              {/* 3. Agent Management */}
              <Route path="data/agents" element={<AgentsPage />} />
              <Route path="agents" element={<Navigate to="/data/agents" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />

            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  </ErrorBoundary>
);
}
