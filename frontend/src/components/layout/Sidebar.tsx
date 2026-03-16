import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Radar,
  Calculator,
  LineChart,
  Package,
  Cylinder,
  BoxIcon,
  Printer,
  ClipboardList,
  Shield,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../services/supabaseClient';

const menuItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/radar-produtos', icon: Radar, label: 'Radar de Produtos' },
  { to: '/precificacao', icon: Calculator, label: 'Calculadora' },
  { to: '/simulacoes', icon: LineChart, label: 'Precificados' },
  { to: '/fila-producao', icon: ClipboardList, label: 'Fila de Producao' },
  { to: '/impressoes', icon: Printer, label: 'Impressoes' },
  { to: '/filamentos', icon: Cylinder, label: 'Filamentos' },
  { to: '/embalagens', icon: Package, label: 'Embalagens' },
  { to: '#', icon: BoxIcon, label: 'Estoque', disabled: true },
];

export function Sidebar() {
  const { profile, isAdmin, signOut, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const showAuth = isSupabaseConfigured();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-blue-500">MAKER</span>FLOW
        </h1>
        <p className="text-xs text-gray-500 mt-1">Gestao de Impressao 3D</p>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.label}>
              {item.disabled ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500 cursor-not-allowed">
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  <span className="ml-auto text-xs bg-gray-800 px-2 py-0.5 rounded">
                    em breve
                  </span>
                </div>
              ) : (
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              )}
            </li>
          ))}

          {/* Link Admin */}
          {showAuth && isAdmin && (
            <li className="pt-4 mt-4 border-t border-gray-800">
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <Shield className="w-5 h-5" />
                <span>Admin</span>
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      {/* User Profile Section */}
      {showAuth && isAuthenticated && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {profile?.email}
              </p>
            </div>
            {isAdmin && (
              <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 rounded">
                Admin
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      )}

      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 text-center">
          MAKERFLOW v1.0.0
        </p>
      </div>
    </aside>
  );
}
