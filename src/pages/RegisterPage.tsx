import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import axios from 'axios'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

type PasswordStrength = 'Débil' | 'Media' | 'Fuerte'

function evaluateStrength(pwd: string): PasswordStrength | null {
  if (pwd.length === 0) return null
  const hasUpper = /[A-Z]/.test(pwd)
  const hasLower = /[a-z]/.test(pwd)
  const hasDigit = /[0-9]/.test(pwd)
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd)
  const score = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length

  if (pwd.length < 6 || score <= 1) return 'Débil'
  if (pwd.length < 10 || score === 2) return 'Media'
  return 'Fuerte'
}

const strengthConfig: Record<PasswordStrength, { color: string; bar: string }> = {
  Débil: { color: 'text-red-600', bar: 'bg-red-500 w-1/3' },
  Media: { color: 'text-yellow-600', bar: 'bg-yellow-400 w-2/3' },
  Fuerte: { color: 'text-green-600', bar: 'bg-green-500 w-full' },
}

export default function RegisterPage() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && user) {
      navigate(user.rol === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true })
    }
  }, [isLoading, user, navigate])

  const strength = evaluateStrength(password)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (strength === 'Débil') {
      setError('La contraseña es demasiado débil. Usa al menos 6 caracteres con letras y números.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/register', { nombre, email, password })
      navigate('/login', {
        state: { successMessage: 'Cuenta creada exitosamente. Inicia sesión para continuar.' },
      })
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        if (status === 409) {
          setError('Este correo ya está registrado')
        } else {
          setError(err.response?.data?.detail[0]?.msg)
        }
      } else {
        setError('Error al conectar con el servidor')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-gray-950/50 px-8 py-10 border border-transparent dark:border-gray-700">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
              <GraduationCap size={32} className="text-white" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Crear Cuenta</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Únete a TutorIA Saber Pro</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre completo
              </label>
              <input
                id="nombre"
                type="text"
                autoComplete="name"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
            </div>

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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
              {strength !== null && (
                <div className="mt-2">
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strengthConfig[strength].bar}`}
                    />
                  </div>
                  <p className={`mt-1 text-xs font-medium ${strengthConfig[strength].color} dark:brightness-125`}>
                    Seguridad: {strength}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full rounded-lg border px-4 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${confirmPassword.length > 0 && confirmPassword !== password
                  ? 'border-red-400 focus:border-red-400'
                  : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'
                  }`}
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">Las contraseñas no coinciden</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 active:bg-primary-900 text-white font-semibold py-2.5 px-4 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 underline-offset-2 hover:underline transition"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
