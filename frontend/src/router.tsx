import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from './components/layout';
import { Dashboard } from './pages/Dashboard';
import { RadarProdutos } from './pages/RadarProdutos';
import { Precificacao } from './pages/Precificacao';
import { Simulacoes } from './pages/Simulacoes';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <MainLayout>
        <Dashboard />
      </MainLayout>
    ),
  },
  {
    path: '/radar-produtos',
    element: (
      <MainLayout>
        <RadarProdutos />
      </MainLayout>
    ),
  },
  {
    path: '/precificacao',
    element: (
      <MainLayout>
        <Precificacao />
      </MainLayout>
    ),
  },
  {
    path: '/simulacoes',
    element: (
      <MainLayout>
        <Simulacoes />
      </MainLayout>
    ),
  },
]);
