import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProgramsPage from './pages/ProgramsPage';
import PoliciesPage from './pages/PoliciesPage';
import EvidenceUploadPage from './pages/EvidenceUploadPage';
import ExceptionQueuePage from './pages/ExceptionQueuePage';
import ExportCenterPage from './pages/ExportCenterPage';
import AuditLogPage from './pages/AuditLogPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute
            roles={['Admin', 'LearningManager', 'QualificationsTeam', 'SharedServices', 'Auditor']}
          >
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'programs',
        element: (
          <ProtectedRoute roles={['Admin', 'LearningManager']}>
            <ProgramsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'policies',
        element: (
          <ProtectedRoute roles={['Admin', 'LearningManager']}>
            <PoliciesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'evidence/upload',
        element: (
          <ProtectedRoute roles={['Admin', 'LearningManager', 'SharedServices']}>
            <EvidenceUploadPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'exceptions',
        element: (
          <ProtectedRoute roles={['Admin', 'QualificationsTeam', 'LearningManager']}>
            <ExceptionQueuePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'export',
        element: (
          <ProtectedRoute roles={['Admin', 'LearningManager', 'SharedServices']}>
            <ExportCenterPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'audit-log',
        element: (
          <ProtectedRoute roles={['Admin', 'Auditor']}>
            <AuditLogPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}