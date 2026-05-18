import { type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  children: ReactNode
  title: string
}

const navItems = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: '▦' },
  { label: 'Usuarios', path: '/admin/usuarios', icon: '👥' },
  { label: 'Preguntas', path: '/admin/preguntas', icon: '❓' },
  { label: 'Evaluaciones', path: '/admin/evaluaciones', icon: '📋' },
  { label: 'Reportes', path: '/admin/reportes', icon: '📊' },
]

export default function Layout({ children, title }: Props) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-56 bg-white border-r border-gray-200 shadow-sm fixed top-0 left-0 h-full z-20">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-sm font-bold text-gray-900 leading-tight">
              TutorIA
              <br />
              <span className="text-xs font-medium text-gray-400">Panel Admin</span>
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Navegación admin">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 truncate mb-2">{user?.nombre}</p>
          <button
            onClick={handleLogout}
            className="w-full text-xs font-medium text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-300 rounded-lg px-3 py-2 transition text-left"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 shadow-sm h-14 flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-10">
          {/* Mobile: show nav inline */}
          <div className="md:hidden flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition ${
                  location.pathname === item.path
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <h1 className="hidden md:block text-base font-semibold text-gray-900 flex-1">{title}</h1>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500">{user?.nombre}</span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition md:hidden"
            >
              Salir
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 py-6">{children}</main>
      </div>
    </div>
  )
}
