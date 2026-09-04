import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import AdminPreguntas from './pages/admin/AdminPreguntas'
import AdminEvaluaciones from './pages/admin/AdminEvaluaciones'
import AdminReportes from './pages/admin/AdminReportes'
import AdminPerfilUsuario from './pages/admin/AdminPerfilUsuario'
import DiagnosticoPage from './pages/DiagnosticoPage'
import TutoriaPage from './pages/TutoriaPage'
import EvaluacionPage from './pages/EvaluacionPage'
import ProgresoPage from './pages/ProgresoPage'
import ReportePage from './pages/ReportePage'
import HistorialPage from './pages/HistorialPage'
import ProtectedRoute from './components/ProtectedRoute'
import { ToastProvider } from './contexts/ToastContext'
import ToastContainer from './components/ToastContainer'
import { ThemeProvider } from './contexts/ThemeContext'

export default function App() {
  return (
    <ThemeProvider>
    <ToastProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute studentOnly>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute studentOnly>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/diagnostico"
            element={
              <ProtectedRoute studentOnly>
                <DiagnosticoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tutoria"
            element={
              <ProtectedRoute studentOnly>
                <TutoriaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluacion"
            element={
              <ProtectedRoute studentOnly>
                <EvaluacionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminUsuarios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/preguntas"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPreguntas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/evaluaciones"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminEvaluaciones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reportes"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminReportes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios/:id/perfil"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPerfilUsuario />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progreso"
            element={
              <ProtectedRoute studentOnly>
                <ProgresoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reporte"
            element={
              <ProtectedRoute studentOnly>
                <ReportePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/historial"
            element={
              <ProtectedRoute studentOnly>
                <HistorialPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    <ToastContainer />
    </ToastProvider>
    </ThemeProvider>
  )
}
