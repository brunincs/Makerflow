import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'ideia' | 'testando' | 'validado' | 'default';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    ideia: 'bg-yellow-100 text-yellow-800',
    testando: 'bg-blue-100 text-blue-800',
    validado: 'bg-green-100 text-green-800',
    default: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}
