import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'teste' | 'validado' | 'rejeitado' | 'default' | 'info' | 'warning' | 'success' | 'danger' | 'pending';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  const variants = {
    // Status de produto
    teste: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    validado: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    rejeitado: 'bg-red-500/10 text-red-400 border border-red-500/20',

    // Status genéricos
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    pending: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',

    // Default
    default: 'bg-[#1f2937] text-[#9ca3af] border border-[#374151]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  const labels: Record<string, ReactNode> = {
    teste: 'Teste',
    validado: 'Validado',
    rejeitado: 'Rejeitado',
  };

  return (
    <span className={`inline-flex items-center rounded-md font-medium ${variants[variant]} ${sizes[size]}`}>
      {labels[variant] || children}
    </span>
  );
}
