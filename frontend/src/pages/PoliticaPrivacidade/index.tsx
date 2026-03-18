import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Politica de Privacidade</h1>
              <p className="text-gray-500">Ultima atualizacao: Março de 2026</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introducao</h2>
            <p className="text-gray-600 leading-relaxed">
              O Makerflow ("nos", "nosso" ou "plataforma") esta comprometido em proteger a privacidade
              dos nossos usuarios. Esta Politica de Privacidade descreve como coletamos, usamos,
              armazenamos e protegemos suas informacoes pessoais quando voce utiliza nossa plataforma
              de gestao para impressao 3D.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Informacoes que Coletamos</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Coletamos as seguintes categorias de informacoes:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Dados de Cadastro:</strong> nome, email e senha criptografada</li>
              <li><strong>Dados de Uso:</strong> informacoes sobre produtos, filamentos, pedidos e calculos de precificacao</li>
              <li><strong>Dados Tecnicos:</strong> informacoes de acesso, tipo de navegador e dispositivo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Como Usamos suas Informacoes</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Utilizamos suas informacoes para:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Fornecer e manter nossos servicos</li>
              <li>Processar e gerenciar seus dados de producao e precificacao</li>
              <li>Melhorar e personalizar sua experiencia na plataforma</li>
              <li>Enviar comunicacoes importantes sobre o servico</li>
              <li>Garantir a seguranca da plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Armazenamento e Seguranca</h2>
            <p className="text-gray-600 leading-relaxed">
              Seus dados sao armazenados em servidores seguros fornecidos pela Supabase, com
              criptografia em transito e em repouso. Implementamos medidas tecnicas e organizacionais
              apropriadas para proteger suas informacoes contra acesso nao autorizado, alteracao,
              divulgacao ou destruicao.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Compartilhamento de Dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Nao vendemos, alugamos ou compartilhamos suas informacoes pessoais com terceiros para
              fins de marketing. Podemos compartilhar dados apenas com provedores de servicos
              essenciais para o funcionamento da plataforma (como hospedagem e autenticacao),
              sempre sob acordos de confidencialidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Seus Direitos</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              De acordo com a Lei Geral de Protecao de Dados (LGPD), voce tem direito a:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Solicitar a exclusao dos seus dados</li>
              <li>Revogar consentimento a qualquer momento</li>
              <li>Solicitar portabilidade dos dados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              Utilizamos cookies essenciais para manter sua sessao ativa e garantir o funcionamento
              adequado da plataforma. Nao utilizamos cookies de rastreamento ou publicidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Alteracoes nesta Politica</h2>
            <p className="text-gray-600 leading-relaxed">
              Podemos atualizar esta Politica de Privacidade periodicamente. Notificaremos sobre
              mudancas significativas atraves da plataforma ou por email. Recomendamos revisar
              esta pagina regularmente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Contato</h2>
            <p className="text-gray-600 leading-relaxed">
              Para duvidas sobre esta Politica de Privacidade ou sobre o tratamento dos seus dados,
              entre em contato conosco atraves do email de suporte disponivel na plataforma.
            </p>
          </section>

          {/* Footer */}
          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Makerflow - Gestao Inteligente para Impressao 3D
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
