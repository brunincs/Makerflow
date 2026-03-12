import Link from 'next/link'

const modules = [
  {
    name: 'Radar de Concorrentes',
    description: 'Analise produtos da concorrência e compare preços entre marketplaces',
    href: '/radar-concorrentes',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'bg-blue-500',
    available: true,
  },
  {
    name: 'Precificação',
    description: 'Calcule preços e margens dos seus produtos',
    href: '/precificacao',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-green-500',
    available: false,
  },
  {
    name: 'Estoque',
    description: 'Controle seu estoque de produtos e materiais',
    href: '/estoque',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    color: 'bg-purple-500',
    available: false,
  },
  {
    name: 'Filamentos',
    description: 'Gerencie seus filamentos e consumo',
    href: '/filamentos',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    color: 'bg-orange-500',
    available: false,
  },
  {
    name: 'Embalagens',
    description: 'Controle de embalagens e materiais',
    href: '/embalagens',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    color: 'bg-pink-500',
    available: false,
  },
]

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Bem-vindo ao Print3D Manager</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <div key={module.href} className="relative">
            {module.available ? (
              <Link
                href={module.href}
                className="block bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow"
              >
                <div className={`w-14 h-14 ${module.color} rounded-lg flex items-center justify-center text-white mb-4`}>
                  {module.icon}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{module.name}</h2>
                <p className="text-gray-600">{module.description}</p>
              </Link>
            ) : (
              <div className="block bg-white rounded-xl shadow-sm border p-6 opacity-60">
                <div className={`w-14 h-14 bg-gray-400 rounded-lg flex items-center justify-center text-white mb-4`}>
                  {module.icon}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{module.name}</h2>
                <p className="text-gray-600">{module.description}</p>
                <span className="absolute top-4 right-4 bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                  Em breve
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
