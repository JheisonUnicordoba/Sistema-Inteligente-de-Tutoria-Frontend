import { Navigate } from 'react-router-dom'
import { type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  children: ReactNode
  requiredRole?: 'admin'
  studentOnly?: boolean
}

export default function ProtectedRoute({ children, requiredRole, studentOnly }: Props) {
  const { user, isLoading, token } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" state={{ message: 'Inicia sesión para continuar' }} replace />
  }

  // Admin-only route: block students
  if (requiredRole === 'admin' && user?.rol !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  // Student-only route: redirect admins to their panel
  if (studentOnly && user?.rol === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  return <>{children}</>
}
