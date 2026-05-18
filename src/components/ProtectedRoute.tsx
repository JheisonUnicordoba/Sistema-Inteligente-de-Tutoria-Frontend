import { Navigate } from 'react-router-dom'
import { type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  children: ReactNode
  requiredRole?: 'estudiante' | 'admin'
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, isLoading, token } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" state={{ message: 'Inicia sesion para continuar' }} replace />
  }

  if (requiredRole && user?.rol !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
