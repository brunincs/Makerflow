import { useEffect, useState } from 'react';
import { Card, CardBody } from '../../components/ui';
import { getProdutos } from '../../services/produtosService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { ProdutoConcorrente } from '../../types';
import {
  Radar,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  FlaskConical,
} from 'lucide-react';

export function Dashboard() {
  const [produtos, setProdutos] = useState<ProdutoConcorrente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProdutos();
  }, []);

  const loadProdutos = async () => {
    const data = await getProdutos();
    setProdutos(data);
    setLoading(false);
  };

  const stats = {
    total: produtos.length,
    ideias: produtos.filter((p) => p.status === 'ideia').length,
    testando: produtos.filter((p) => p.status === 'testando').length,
    validados: produtos.filter((p) => p.status === 'validado').length,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Visao geral do seu negocio de impressao 3D
        </p>
      </div>

      {!isSupabaseConfigured() && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Supabase nao configurado
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Os dados estao sendo salvos localmente. Configure as variaveis
              VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para persistir no banco.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total de Produtos
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {loading ? '-' : stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Ideias</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">
                  {loading ? '-' : stats.ideias}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Testando</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {loading ? '-' : stats.testando}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Validados</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {loading ? '-' : stats.validados}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <div className="flex items-center gap-3 mb-4">
              <Radar className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Produtos Recentes
              </h2>
            </div>
            {loading ? (
              <p className="text-gray-500">Carregando...</p>
            ) : produtos.length === 0 ? (
              <p className="text-gray-500">
                Nenhum produto cadastrado ainda. Acesse o Radar de Produtos para
                adicionar.
              </p>
            ) : (
              <ul className="space-y-3">
                {produtos.slice(0, 5).map((produto) => (
                  <li
                    key={produto.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {produto.imagem_url ? (
                      <img
                        src={produto.imagem_url}
                        alt={produto.nome}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{produto.nome}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {produto.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Proximos Passos
              </h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Cadastre produtos concorrentes
                  </p>
                  <p className="text-sm text-gray-500">
                    Use o Radar de Produtos para monitorar a concorrencia
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-gray-500">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-500">
                    Precificacao (em breve)
                  </p>
                  <p className="text-sm text-gray-400">
                    Calcule o preco ideal dos seus produtos
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-gray-500">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-500">
                    Controle de Estoque (em breve)
                  </p>
                  <p className="text-sm text-gray-400">
                    Gerencie seus filamentos e materiais
                  </p>
                </div>
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
