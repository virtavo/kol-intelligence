import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navigation from './components/Navigation';
import LoginPage from './pages/LoginPage';
import ProjectListPage from './pages/ProjectListPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import MarketDashboardPage from './pages/MarketDashboardPage';
import BackerListPage from './pages/BackerListPage';
import BackerDetailPage from './pages/BackerDetailPage';
import MonitoringPage from './pages/MonitoringPage';
import ReportCenterPage from './pages/ReportCenterPage';
import AdminPage from './pages/AdminPage';
import CompetitorAnalysisPage from './pages/CompetitorAnalysisPage';
import MailchimpPage from './pages/MailchimpPage';
import ApolloEnrichPage from './pages/ApolloEnrichPage';
import YouTubeKOLPage from './pages/YouTubeKOLPage';
import SnapVitalKOLPage from './pages/SnapVitalKOLPage';
import AutoKOLPage from './pages/AutoKOLPage';
import LeadDashboardPage from './pages/LeadDashboardPage';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'super_admin' && user.role !== 'admin') return <Navigate to="/projects" replace />;
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Navigation />
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg-secondary, #f8fafc)' }}>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/projects" element={<ProtectedRoute><AppLayout><ProjectListPage /></AppLayout></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><AppLayout><ProjectDetailPage /></AppLayout></ProtectedRoute>} />
        <Route path="/market" element={<ProtectedRoute><AppLayout><MarketDashboardPage /></AppLayout></ProtectedRoute>} />
        <Route path="/backers" element={<ProtectedRoute><AppLayout><BackerListPage /></AppLayout></ProtectedRoute>} />
        <Route path="/backers/:id" element={<ProtectedRoute><AppLayout><BackerDetailPage /></AppLayout></ProtectedRoute>} />
        <Route path="/monitoring" element={<ProtectedRoute><AppLayout><MonitoringPage /></AppLayout></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><AppLayout><ReportCenterPage /></AppLayout></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><AppLayout><AdminPage /></AppLayout></ProtectedRoute>} />
        <Route path="/competitors" element={<ProtectedRoute><AppLayout><CompetitorAnalysisPage /></AppLayout></ProtectedRoute>} />
        <Route path="/email" element={<ProtectedRoute><AppLayout><MailchimpPage /></AppLayout></ProtectedRoute>} />
        <Route path="/apollo" element={<ProtectedRoute adminOnly><AppLayout><ApolloEnrichPage /></AppLayout></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><AppLayout><LeadDashboardPage /></AppLayout></ProtectedRoute>} />
        <Route path="/kol" element={<ProtectedRoute><AppLayout><YouTubeKOLPage /></AppLayout></ProtectedRoute>} />
        <Route path="/kol-auto" element={<ProtectedRoute><AppLayout><AutoKOLPage /></AppLayout></ProtectedRoute>} />
        <Route path="/snapvital" element={<ProtectedRoute><AppLayout><SnapVitalKOLPage /></AppLayout></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
