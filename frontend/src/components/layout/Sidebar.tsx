import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Radar,
  Calculator,
  LineChart,
  Package,
  Cylinder,
  BoxIcon,
} from 'lucide-react';

const menuItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/radar-produtos', icon: Radar, label: 'Radar de Produtos' },
  { to: '/precificacao', icon: Calculator, label: 'Precificacao' },
  { to: '/simulacoes', icon: LineChart, label: 'Simulacoes' },
  { to: '#', icon: Package, label: 'Estoque', disabled: true },
  { to: '#', icon: Cylinder, label: 'Filamentos', disabled: true },
  { to: '#', icon: BoxIcon, label: 'Embalagens', disabled: true },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-blue-500">MAKER</span>FLOW
        </h1>
        <p className="text-xs text-gray-500 mt-1">Gestao de Impressao 3D</p>
      </div>

      <nav className="flex-1 p-4">
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
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 text-center">
          MAKERFLOW v1.0.0
        </p>
      </div>
    </aside>
  );
}
