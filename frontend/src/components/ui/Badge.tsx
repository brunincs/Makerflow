import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'teste' | 'validado' | 'rejeitado' | 'default';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    teste: 'bg-blue-100 text-blue-800',
    validado: 'bg-green-100 text-green-800',
    rejeitado: 'bg-red-100 text-red-800',
    default: 'bg-gray-100 text-gray-800',
  };

  const labels = {
    teste: 'Teste',
    validado: 'Validado',
    rejeitado: 'Rejeitado',
    default: children,
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {labels[variant] || children}
    </span>
  );
}
