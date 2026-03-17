interface ProtectedRouteProps {
  children: React.ReactNode;
}

// TEMPORARIO: Auth desabilitado
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <>{children}</>;
}
