import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Calendar, Lock, Eye, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoogleOAuthComplianceProps {
  className?: string;
}

export const GoogleOAuthCompliance: React.FC<GoogleOAuthComplianceProps> = ({ className }) => {
  return (
    <section className={cn(
      "relative bg-brand-dark py-16 border-t border-white/10",
      className
    )}>
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-8 h-8 text-neon-green" />
            <h2 className="text-3xl font-bold text-text-primary">
              Transparência e Segurança
            </h2>
          </div>
          <p className="text-text-secondary text-lg max-w-3xl mx-auto">
            O AgendAi é uma plataforma de agendamento profissional que conecta prestadores de serviços 
            com seus clientes de forma segura e eficiente.
          </p>
        </div>

        {/* App Identity and Brand */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-glass-surface border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-neon-green" />
              <h3 className="text-xl font-semibold text-text-primary">Sobre o AgendAi</h3>
            </div>
            <div className="space-y-3 text-text-secondary">
              <p><strong className="text-text-primary">Nome da Aplicação:</strong> AgendAi - Agenda Profissional</p>
              <p><strong className="text-text-primary">Desenvolvedor:</strong> AgendAi Team</p>
              <p><strong className="text-primary">Domínio Verificado:</strong> agendai.clubemkt.digital</p>
              <p><strong className="text-text-primary">Tipo:</strong> Plataforma de Agendamento Online</p>
            </div>
          </div>

          <div className="bg-glass-surface border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-neon-green" />
              <h3 className="text-xl font-semibold text-text-primary">Funcionalidades</h3>
            </div>
            <ul className="space-y-2 text-text-secondary">
              <li>• <strong>Agendamento Online:</strong> Sistema completo de reservas</li>
              <li>• <strong>Gestão de Horários:</strong> Controle de disponibilidade</li>
              <li>• <strong>Notificações:</strong> Lembretes automáticos por email</li>
              <li>• <strong>Histórico:</strong> Registro completo de agendamentos</li>
              <li>• <strong>Integração:</strong> Sincronização com calendários</li>
            </ul>
          </div>
        </div>

        {/* Data Usage Transparency */}
        <div className="bg-glass-surface border border-white/10 rounded-xl p-8 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="w-6 h-6 text-neon-green" />
            <h3 className="text-2xl font-semibold text-text-primary">
              Uso Transparente dos Seus Dados
            </h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-text-primary mb-4">
                Quando você usa "Continuar com Google", coletamos:
              </h4>
              <ul className="space-y-3 text-text-secondary">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-neon-green rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong className="text-text-primary">Nome:</strong> Para personalizar sua experiência
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-neon-green rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong className="text-text-primary">Email:</strong> Para comunicação sobre agendamentos
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-neon-green rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong className="text-text-primary">Foto de Perfil:</strong> Para identificação visual (opcional)
                  </div>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-text-primary mb-4">
                Por que precisamos desses dados:
              </h4>
              <ul className="space-y-3 text-text-secondary">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>Criar e gerenciar sua conta de usuário</div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>Enviar confirmações e lembretes de agendamentos</div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>Facilitar a comunicação com prestadores de serviços</div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>Personalizar sua experiência na plataforma</div>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-4 bg-neon-green/10 border border-neon-green/20 rounded-lg">
            <p className="text-sm text-text-secondary">
              <strong className="text-neon-green">Importante:</strong> Não acessamos outros dados da sua conta Google. 
              Você pode revogar o acesso a qualquer momento nas configurações da sua conta Google.
            </p>
          </div>
        </div>

        {/* Security and Privacy */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-glass-surface border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-neon-green" />
              <h3 className="text-xl font-semibold text-text-primary">Segurança</h3>
            </div>
            <ul className="space-y-2 text-text-secondary">
              <li>• <strong>Criptografia:</strong> Todos os dados são criptografados</li>
              <li>• <strong>HTTPS:</strong> Conexão segura em toda a plataforma</li>
              <li>• <strong>Conformidade:</strong> Seguimos a LGPD brasileira</li>
              <li>• <strong>Auditoria:</strong> Monitoramento contínuo de segurança</li>
            </ul>
          </div>

          <div className="bg-glass-surface border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-neon-green" />
              <h3 className="text-xl font-semibold text-text-primary">Seus Direitos</h3>
            </div>
            <ul className="space-y-2 text-text-secondary">
              <li>• <strong>Acesso:</strong> Visualizar seus dados pessoais</li>
              <li>• <strong>Correção:</strong> Atualizar informações incorretas</li>
              <li>• <strong>Exclusão:</strong> Deletar sua conta e dados</li>
              <li>• <strong>Portabilidade:</strong> Exportar seus dados</li>
            </ul>
          </div>
        </div>

        {/* Legal Links */}
        <div className="text-center">
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm">
            <Link 
              to="/privacy" 
              className="flex items-center gap-2 text-neon-green hover:text-neon-green/80 transition-colors font-medium"
            >
              <FileText className="w-4 h-4" />
              Política de Privacidade Completa
            </Link>
            <span className="text-white/20">•</span>
            <Link 
              to="/terms" 
              className="flex items-center gap-2 text-neon-green hover:text-neon-green/80 transition-colors font-medium"
            >
              <FileText className="w-4 h-4" />
              Termos de Uso
            </Link>
            <span className="text-white/20">•</span>
            <Link 
              to="/auth" 
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Entrar na Plataforma
            </Link>
          </div>
          
          <p className="text-xs text-text-secondary mt-4 max-w-2xl mx-auto">
            Esta página está sempre disponível sem necessidade de login. 
            Para dúvidas sobre privacidade, entre em contato através da nossa plataforma.
          </p>
        </div>
      </div>
    </section>
  );
};