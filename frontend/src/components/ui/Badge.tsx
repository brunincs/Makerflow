import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'teste' | 'validado' | 'rejeitado' | 'default';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    teste: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    validado: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    rejeitado: 'bg-red-500/10 text-red-400 border border-red-500/20',
    default: 'bg-gray-800 text-gray-400 border border-gray-700',
  };

  const labels = {
    teste: 'Teste',
    validado: 'Validado',
    rejeitado: 'Rejeitado',
    default: children,
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${variants[variant]}`}>
      {labels[variant] || children}
    </span>
  );
}
