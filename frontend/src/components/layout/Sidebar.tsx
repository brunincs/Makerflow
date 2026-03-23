import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Radar,
  Package,
  Cylinder,
  BoxIcon,
  Printer,
  ClipboardList,
  Shield,
  LogOut,
  User,
  Store,
  Settings,
  Layers,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../services/supabaseClient';

// Menu organizado por seções
const menuSections = [
  {
    title: 'Operacao',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/fila-producao', icon: ClipboardList, label: 'Fila de Producao' },
      { to: '/impressoes', icon: Printer, label: 'Impressoes' },
    ],
  },
  {
    title: 'Produtos',
    items: [
      { to: '/radar-produtos', icon: Radar, label: 'Radar' },
      { to: '/catalogo', icon: Store, label: 'Catalogo' },
    ],
  },
  {
    title: 'Recursos',
    items: [
      { to: '/estoque', icon: Layers, label: 'Estoque' },
      { to: '/filamentos', icon: Cylinder, label: 'Filamentos' },
      { to: '/embalagens', icon: Package, label: 'Embalagens' },
    ],
  },
  {
    title: 'Ferramentas',
    items: [
      { to: '/precificacao', icon: Zap, label: 'Calculadora' },
      { to: '/simulacoes', icon: BoxIcon, label: 'Precificados' },
    ],
  },
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
    <aside className="fixed left-0 top-0 h-screen w-56 bg-[#111827] text-white flex flex-col border-r border-[#1f2937]">
      {/* Logo */}
      <div className="px-5 py-6">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-emerald-400">MAKER</span>
          <span className="text-white">FLOW</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto">
        {menuSections.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="px-3 mb-2 text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.label}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                          : 'text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[#1f2937]'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Sistema */}
        <div className="mb-6">
          <h3 className="px-3 mb-2 text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider">
            Sistema
          </h3>
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/perfil"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                      : 'text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[#1f2937]'
                  }`
                }
              >
                <Settings className="w-4 h-4" />
                <span>Configuracoes</span>
              </NavLink>
            </li>

            {/* Link Admin */}
            {showAuth && isAdmin && (
              <li>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                        : 'text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[#1f2937]'
                    }`
                  }
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {/* User Profile Section */}
      {showAuth && isAuthenticated && (
        <div className="p-3 border-t border-[#1f2937]">
          <Link
            to="/perfil"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1f2937] transition-all duration-200 cursor-pointer"
          >
            <div className="w-8 h-8 bg-[#1f2937] rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border border-[#374151]">
              {profile?.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-[#6b7280]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#f9fafb] truncate">
                {profile?.nome_fantasia || profile?.name || 'Usuario'}
              </p>
              <p className="text-[10px] text-[#6b7280] truncate">
                {profile?.email}
              </p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-2 text-xs font-medium text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[#1f2937] rounded-lg transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      )}
    </aside>
  );
}
