interface AdminRouteProps {
  children: React.ReactNode;
}

// TEMPORARIO: Auth desabilitado
export function AdminRoute({ children }: AdminRouteProps) {
  return <>{children}</>;
}
