import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

export function RootLayout() {
  console.log('[RootLayout] Renderizando');
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
