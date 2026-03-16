import { useEffect, useState } from 'react';
import {
  Users,
  Package,
  ShoppingCart,
  Printer,
  Cylinder,
  Shield,
  Ban,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { Profile } from '../../types';

interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalPrints: number;
  totalFilamentUsed: number;
}

export function Admin() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalPrints: 0,
    totalFilamentUsed: 0,
  });
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = async () => {
    if (!supabase) return;

    setLoading(true);

    try {
      // Buscar estatisticas
      const [usersRes, productsRes, ordersRes, printsRes, filamentRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('produtos_concorrentes').select('id', { count: 'exact' }),
        supabase.from('pedidos').select('id', { count: 'exact' }),
        supabase.from('impressoes').select('id', { count: 'exact' }),
        supabase.from('impressoes').select('peso_total_g'),
      ]);

      const totalFilament = filamentRes.data?.reduce(
        (acc, row) => acc + (row.peso_total_g || 0),
        0
      ) || 0;

      setStats({
        totalUsers: usersRes.count || 0,
        totalProducts: productsRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalPrints: printsRes.count || 0,
        totalFilamentUsed: totalFilament,
      });

      // Buscar usuarios
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      setUsers(usersData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleUserSuspension = async (userId: string, currentStatus: boolean) => {
    if (!supabase) return;

    setUpdating(userId);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ suspended: !currentStatus })
        .eq('id', userId);

      if (error) {
        console.error('Erro ao atualizar usuario:', error);
        return;
      }

      // Atualizar lista local
      setUsers(users.map(u =>
        u.id === userId ? { ...u, suspended: !currentStatus } : u
      ));
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setUpdating(null);
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    if (!supabase) return;

    setUpdating(userId);
    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        console.error('Erro ao atualizar role:', error);
        return;
      }

      // Atualizar lista local
      setUsers(users.map(u =>
        u.id === userId ? { ...u, role: newRole as 'user' | 'admin' } : u
      ));
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-500" />
            Painel Administrativo
          </h1>
          <p className="text-gray-400 mt-1">
            Gerencie usuarios e visualize estatisticas globais
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Usuarios</p>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Package className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Produtos</p>
              <p className="text-2xl font-bold text-white">{stats.totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Pedidos</p>
              <p className="text-2xl font-bold text-white">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Printer className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Impressoes</p>
              <p className="text-2xl font-bold text-white">{stats.totalPrints}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Cylinder className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Filamento Usado</p>
              <p className="text-2xl font-bold text-white">
                {(stats.totalFilamentUsed / 1000).toFixed(1)} kg
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Usuarios Cadastrados</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                  Nome
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                  Cadastro
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-white">
                    {user.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {user.email || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-gray-500/10 text-gray-400'
                      }`}
                    >
                      {user.role === 'admin' && <Shield className="w-3 h-3" />}
                      {user.role === 'admin' ? 'Admin' : 'Usuario'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.suspended
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-green-500/10 text-green-400'
                      }`}
                    >
                      {user.suspended ? (
                        <>
                          <Ban className="w-3 h-3" />
                          Suspenso
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Ativo
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleUserRole(user.id, user.role)}
                        disabled={updating === user.id}
                        className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                      </button>
                      <button
                        onClick={() => toggleUserSuspension(user.id, user.suspended)}
                        disabled={updating === user.id}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-50 ${
                          user.suspended
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        {updating === user.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : user.suspended ? (
                          'Ativar'
                        ) : (
                          'Suspender'
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nenhum usuario cadastrado
          </div>
        )}
      </div>
    </div>
  );
}
