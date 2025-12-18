import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">agend4i</span>
            </Link>
            <Link 
              to="/" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Voltar ao início</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <h1>Política de Privacidade</h1>
          <p className="text-lg text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <h2>1. Informações que Coletamos</h2>
          <p>
            O AgendAi coleta as seguintes informações para fornecer nossos serviços de agendamento:
          </p>
          <ul>
            <li><strong>Informações de Conta:</strong> Nome, email, telefone quando você cria uma conta</li>
            <li><strong>Informações de Agendamento:</strong> Dados dos serviços agendados, horários e preferências</li>
            <li><strong>Informações de Uso:</strong> Como você interage com nossa plataforma</li>
            <li><strong>Informações Técnicas:</strong> Endereço IP, tipo de navegador, dispositivo</li>
          </ul>

          <h2>2. Como Usamos suas Informações</h2>
          <p>Utilizamos suas informações para:</p>
          <ul>
            <li>Fornecer e melhorar nossos serviços de agendamento</li>
            <li>Processar e gerenciar seus agendamentos</li>
            <li>Comunicar sobre seus agendamentos e atualizações do serviço</li>
            <li>Personalizar sua experiência na plataforma</li>
            <li>Garantir a segurança e prevenir fraudes</li>
          </ul>

          <h2>3. Compartilhamento de Informações</h2>
          <p>
            Não vendemos suas informações pessoais. Podemos compartilhar informações apenas:
          </p>
          <ul>
            <li>Com prestadores de serviços que você agenda</li>
            <li>Com provedores de serviços técnicos que nos ajudam a operar a plataforma</li>
            <li>Quando exigido por lei ou para proteger nossos direitos</li>
          </ul>

          <h2>4. Autenticação com Google</h2>
          <p>
            Quando você usa "Continuar com Google":
          </p>
          <ul>
            <li>Coletamos apenas seu nome, email e foto de perfil do Google</li>
            <li>Não acessamos outros dados da sua conta Google</li>
            <li>Você pode revogar o acesso a qualquer momento nas configurações do Google</li>
          </ul>

          <h2>5. Segurança dos Dados</h2>
          <p>
            Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações:
          </p>
          <ul>
            <li>Criptografia de dados em trânsito e em repouso</li>
            <li>Acesso restrito às informações pessoais</li>
            <li>Monitoramento regular de segurança</li>
            <li>Backup seguro dos dados</li>
          </ul>

          <h2>6. Seus Direitos</h2>
          <p>Você tem o direito de:</p>
          <ul>
            <li>Acessar suas informações pessoais</li>
            <li>Corrigir informações incorretas</li>
            <li>Solicitar a exclusão de sua conta e dados</li>
            <li>Exportar seus dados</li>
            <li>Retirar consentimento para processamento</li>
          </ul>

          <h2>7. Retenção de Dados</h2>
          <p>
            Mantemos suas informações pelo tempo necessário para fornecer nossos serviços e cumprir 
            obrigações legais. Dados de agendamentos são mantidos por até 5 anos para fins de histórico.
          </p>

          <h2>8. Cookies e Tecnologias Similares</h2>
          <p>
            Utilizamos cookies essenciais para o funcionamento da plataforma e cookies de análise 
            para melhorar nossos serviços. Você pode gerenciar cookies nas configurações do seu navegador.
          </p>

          <h2>9. Alterações nesta Política</h2>
          <p>
            Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas 
            por email ou através da plataforma.
          </p>

          <h2>10. Contato</h2>
          <p>
            Para questões sobre privacidade, entre em contato:
          </p>
          <ul>
            <li>Email: privacidade@agendai.com.br</li>
            <li>Através da plataforma AgendAi</li>
          </ul>

          <div className="mt-12 p-6 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-0">
              Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD) 
              e outras regulamentações aplicáveis de proteção de dados.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}