import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from './components/layout';
import { Dashboard } from './pages/Dashboard';
import { RadarProdutos } from './pages/RadarProdutos';
import { Precificacao } from './pages/Precificacao';
import { Simulacoes } from './pages/Simulacoes';
import { Filamentos } from './pages/Filamentos';
import { Embalagens } from './pages/Embalagens';

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
  {
    path: '/filamentos',
    element: (
      <MainLayout>
        <Filamentos />
      </MainLayout>
    ),
  },
  {
    path: '/embalagens',
    element: (
      <MainLayout>
        <Embalagens />
      </MainLayout>
    ),
  },
]);
