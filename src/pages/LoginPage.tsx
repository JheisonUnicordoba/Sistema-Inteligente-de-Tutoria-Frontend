import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { GraduationCap } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, user, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && user) {
      navigate(user.rol === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true })
    }
  }, [isLoading, user, navigate])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      // Decode JWT payload to determine role for redirect
      const stored = localStorage.getItem('tutoria_token')
      if (stored) {
        try {
          const payload = JSON.parse(atob(stored.split('.')[1])) as { rol?: string }
          if (payload.rol === 'admin') {
            navigate('/admin/dashboard')
          } else {
            navigate('/dashboard')
          }
        } catch {
          // Fallback: default to student dashboard
          navigate('/dashboard')
        }
      }
    } catch (err: unknown) {
      setPassword('')
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        if (status === 429) {
          setError('Cuenta bloqueada temporalmente. Intenta nuevamente en 5 minutos.')
        } else {
          setError('Email o contraseña incorrectos')
        }
      } else {
        setError('Error al conectar con el servidor')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-gray-950/50 px-8 py-10 border border-transparent dark:border-gray-700">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
              <GraduationCap size={32} className="text-white" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">TutorIA Saber Pro</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-snug">
              Sistema Inteligente de Tutoría para Razonamiento Cuantitativo
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold py-2.5 px-4 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            ¿No tienes cuenta?{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline underline-offset-2 transition"
            >
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
