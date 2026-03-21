import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './components/RootLayout';
import { MainLayout } from './components/layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Dashboard } from './pages/Dashboard';
import { RadarProdutos } from './pages/RadarProdutos';
import { Precificacao } from './pages/Precificacao';
import { Simulacoes } from './pages/Simulacoes';
import { Filamentos } from './pages/Filamentos';
import { Embalagens } from './pages/Embalagens';
import { Impressoes } from './pages/Impressoes';
import { FilaProducao } from './pages/FilaProducao';
import { Estoque } from './pages/Estoque';
import { Catalogo } from './pages/Catalogo';
import { Login, Register, ForgotPassword } from './pages/Auth';
import { Admin } from './pages/Admin';
import { Perfil } from './pages/Perfil';
import { PoliticaPrivacidade } from './pages/PoliticaPrivacidade';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Rotas Publicas
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/register',
        element: <Register />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: '/privacidade',
        element: <PoliticaPrivacidade />,
      },
      // Rotas Protegidas
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/radar-produtos',
        element: (
          <ProtectedRoute>
            <MainLayout>
              <RadarProdutos />
            </MainLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/precificacao',
        element: (
          <ProtectedRoute>
            <MainLayout>
              <Precificacao />
            </MainLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/simulacoes',
        element: (
          <ProtectedRoute>
            <MainLayout>
              <Simulacoes />
            </MainLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/filamentos',
        element: (
          <ProtectedRoute>
            <MainLayout>
              <Filamentos />
            </MainLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/embalagens',
        element: (
          <ProtectedRoute>
            <MainLayout>
              <Embalagens />
            </MainLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/impressoes',
        element: (
          <ProtectedRoute>
            <MainLayout>
              <Impressoes />
            </MainLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/fila-producao',
        element: (
          <ProtectedRoute>
            <MainLayout>
              <FilaProducao />
            </MainLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/estoque',
        element: (
          <ProtectedRoute>
            <MainLayout>
              <Estoque />
            </MainLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/catalogo',
        element: (
          <ProtectedRoute>
            <MainLayout>
              <Catalogo />
            </MainLayout>
          </ProtectedRoute>
        ),
      },
      // Perfil do Usuario
      {
        path: '/perfil',
        element: (
          <ProtectedRoute>
            <MainLayout>
              <Perfil />
            </MainLayout>
          </ProtectedRoute>
        ),
      },
      // Rota Admin
      {
        path: '/admin',
        element: (
          <AdminRoute>
            <MainLayout>
              <Admin />
            </MainLayout>
          </AdminRoute>
        ),
      },
    ],
  },
]);
