import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';

export default function Terms() {
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
          <h1>Termos de Serviço</h1>
          <p className="text-lg text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <h2>1. Aceitação dos Termos</h2>
          <p>
            Ao acessar e usar o AgendAi, você concorda com estes Termos de Serviço. 
            Se você não concorda com qualquer parte destes termos, não deve usar nossos serviços.
          </p>

          <h2>2. Descrição do Serviço</h2>
          <p>
            O AgendAi é uma plataforma de agendamento online que conecta prestadores de serviços 
            com clientes, facilitando o agendamento e gerenciamento de compromissos.
          </p>

          <h3>2.1 Funcionalidades</h3>
          <ul>
            <li>Agendamento online de serviços</li>
            <li>Gerenciamento de horários e disponibilidade</li>
            <li>Notificações e lembretes</li>
            <li>Histórico de agendamentos</li>
            <li>Integração com calendários</li>
          </ul>

          <h2>3. Contas de Usuário</h2>
          <h3>3.1 Criação de Conta</h3>
          <ul>
            <li>Você deve fornecer informações precisas e atualizadas</li>
            <li>É responsável por manter a segurança de sua conta</li>
            <li>Deve notificar imediatamente sobre uso não autorizado</li>
          </ul>

          <h3>3.2 Tipos de Conta</h3>
          <ul>
            <li><strong>Clientes:</strong> Podem agendar serviços</li>
            <li><strong>Prestadores:</strong> Podem oferecer e gerenciar serviços</li>
          </ul>

          <h2>4. Uso Aceitável</h2>
          <p>Você concorda em NÃO:</p>
          <ul>
            <li>Usar o serviço para atividades ilegais ou não autorizadas</li>
            <li>Interferir ou interromper o funcionamento da plataforma</li>
            <li>Tentar acessar contas de outros usuários</li>
            <li>Enviar spam ou conteúdo malicioso</li>
            <li>Violar direitos de propriedade intelectual</li>
            <li>Fornecer informações falsas ou enganosas</li>
          </ul>

          <h2>5. Agendamentos e Cancelamentos</h2>
          <h3>5.1 Responsabilidades do Cliente</h3>
          <ul>
            <li>Comparecer no horário agendado</li>
            <li>Cancelar com antecedência adequada</li>
            <li>Fornecer informações precisas para o agendamento</li>
          </ul>

          <h3>5.2 Responsabilidades do Prestador</h3>
          <ul>
            <li>Manter horários atualizados</li>
            <li>Prestar o serviço conforme acordado</li>
            <li>Comunicar alterações com antecedência</li>
          </ul>

          <h3>5.3 Políticas de Cancelamento</h3>
          <p>
            Cada prestador pode definir suas próprias políticas de cancelamento. 
            Estas políticas são exibidas durante o processo de agendamento.
          </p>

          <h2>6. Pagamentos e Taxas</h2>
          <h3>6.1 Taxas da Plataforma</h3>
          <p>
            O AgendAi pode cobrar taxas de serviço dos prestadores. 
            As taxas atuais são comunicadas claramente na plataforma.
          </p>

          <h3>6.2 Processamento de Pagamentos</h3>
          <p>
            Pagamentos são processados através de provedores terceirizados seguros. 
            O AgendAi não armazena informações de cartão de crédito.
          </p>

          <h2>7. Propriedade Intelectual</h2>
          <p>
            O AgendAi e todo seu conteúdo (textos, gráficos, logos, ícones, imagens, software) 
            são propriedade da empresa ou de seus licenciadores e são protegidos por leis de direitos autorais.
          </p>

          <h2>8. Privacidade e Proteção de Dados</h2>
          <p>
            Sua privacidade é importante para nós. Nossa coleta e uso de informações pessoais 
            é regida por nossa <Link to="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>.
          </p>

          <h2>9. Limitação de Responsabilidade</h2>
          <p>
            O AgendAi atua como intermediário entre clientes e prestadores de serviços. 
            Não somos responsáveis por:
          </p>
          <ul>
            <li>Qualidade dos serviços prestados</li>
            <li>Disputas entre clientes e prestadores</li>
            <li>Danos indiretos ou consequenciais</li>
            <li>Perda de dados ou interrupções do serviço</li>
          </ul>

          <h2>10. Disponibilidade do Serviço</h2>
          <p>
            Embora nos esforcemos para manter o serviço disponível 24/7, pode haver 
            interrupções para manutenção, atualizações ou por circunstâncias fora de nosso controle.
          </p>

          <h2>11. Modificações dos Termos</h2>
          <p>
            Reservamos o direito de modificar estes termos a qualquer momento. 
            Mudanças significativas serão comunicadas com pelo menos 30 dias de antecedência.
          </p>

          <h2>12. Encerramento</h2>
          <h3>12.1 Por Você</h3>
          <p>Você pode encerrar sua conta a qualquer momento através das configurações da plataforma.</p>

          <h3>12.2 Por Nós</h3>
          <p>
            Podemos suspender ou encerrar contas que violem estes termos, 
            com notificação prévia quando possível.
          </p>

          <h2>13. Lei Aplicável</h2>
          <p>
            Estes termos são regidos pelas leis brasileiras. 
            Disputas serão resolvidas nos tribunais competentes do Brasil.
          </p>

          <h2>14. Contato</h2>
          <p>
            Para questões sobre estes termos:
          </p>
          <ul>
            <li>Email: suporte@agendai.com.br</li>
            <li>Através da plataforma AgendAi</li>
          </ul>

          <div className="mt-12 p-6 bg-muted rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Resumo dos Seus Direitos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Como usuário brasileiro, você tem direitos específicos sob a LGPD e o Código de Defesa do Consumidor. 
              Estes termos não limitam seus direitos legais. Em caso de conflito entre estes termos e a lei brasileira, 
              a lei prevalece.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link to="/" className="text-primary hover:underline">
                Voltar ao Início
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/auth" className="text-primary hover:underline">
                Entrar
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/auth?mode=signup" className="text-primary hover:underline">
                Criar Conta
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/privacy" className="text-primary hover:underline">
                Política de Privacidade
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}