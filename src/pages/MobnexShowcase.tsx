import { Smartphone, Monitor, Lightbulb, Mail, UserPlus, MessageSquare, Share2, Trophy, Bell, CheckSquare, MapPin, Users } from 'lucide-react';
import { MnAppBar } from '@/components/mobnex/MnAppBar';
import { MnButton } from '@/components/mobnex/MnButton';
import { MnMetricCard, MnMetricGrid } from '@/components/mobnex/MnMetricCard';
import { MnTaskCard } from '@/components/mobnex/MnTaskCard';
import { MnBadge } from '@/components/mobnex/MnBadge';
import { MnPointsBlock } from '@/components/mobnex/MnPointsBlock';
import { MnRankList } from '@/components/mobnex/MnRankList';
import { MnFeatureIcon, MnFeatureGrid } from '@/components/mobnex/MnFeatureIcon';
import { MnDivider } from '@/components/mobnex/MnDivider';
import { MnProfileCard } from '@/components/mobnex/MnProfileCard';

export default function MobnexShowcase() {
  return (
    <div className="mn-font" style={{ background: 'var(--mn-surface-alt)', minHeight: '100vh' }}>
      <MnAppBar brandTag="MOBNEX" title="Showcase do Design System" />

      {/* Hero dark */}
      <section className="mn-hero-dark">
        <div className="mn-hero-dark__content" style={{ maxWidth: 880, margin: '0 auto' }}>
          <span className="mn-app-bar__brand-tag">MOBNEX DESIGN</span>
          <h1 className="mn-text-hero" style={{ marginTop: 8 }}>
            Mobilização com<br />Engajamento em Rede
          </h1>
          <p className="mn-text-body" style={{ color: 'var(--mn-text-dark-2)', marginTop: 16 }}>
            Componentes prontos para uso em qualquer módulo da plataforma.
          </p>
          <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <MnButton variant="primary">Ação Principal</MnButton>
            <MnButton variant="ghost-dark">Ver Mais</MnButton>
          </div>
        </div>
      </section>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px', display: 'grid', gap: 32 }}>
        {/* Feature icons */}
        <section>
          <span className="mn-label">Recursos da Plataforma</span>
          <MnFeatureGrid>
            <MnFeatureIcon icon={Smartphone} label="Aplicativo de Mobilização" />
            <MnFeatureIcon icon={Monitor} label="Painel da Campanha" />
            <MnFeatureIcon icon={Lightbulb} label="Inteligência Artificial" />
            <MnFeatureIcon icon={Mail} label="Comunicação Instantânea" />
          </MnFeatureGrid>
        </section>

        <MnDivider />

        {/* Metrics */}
        <section>
          <span className="mn-label">Métricas</span>
          <MnMetricGrid>
            <MnMetricCard label="Eleitores Cadastrados" value="7.385" />
            <MnMetricCard label="Mobilizadores Ativos" value="1.204" />
            <MnMetricCard label="Tarefas Cumpridas" value="3.872" />
            <MnMetricCard label="Cidades Atingidas" value="42" />
          </MnMetricGrid>
        </section>

        {/* Tasks + Points */}
        <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <span className="mn-label">Tarefas Disponíveis</span>
            <MnTaskCard
              icon={<UserPlus size={20} strokeWidth={1.8} color="var(--mn-green)" />}
              type="META"
              title="Cadastre Amigos"
              description="Escolha 5 amigos para fazer parte da nossa campanha."
              earn="20 pts"
            />
            <MnTaskCard
              icon={<Share2 size={20} strokeWidth={1.8} color="var(--mn-green)" />}
              type="AÇÃO"
              title="Compartilhe Conteúdo"
              description="Compartilhe a campanha em suas redes sociais."
              earn="10 pts"
            />
            <MnTaskCard
              icon={<MessageSquare size={20} strokeWidth={1.8} color="var(--mn-green)" />}
              type="OPINIÃO"
              title="Deixe seu Depoimento"
              done
            />
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <MnPointsBlock label="Sua Pontuação" level="Cidadão Engajado" points={2585} nextLevelAt={5000} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <MnBadge variant="earn">+20 PTS</MnBadge>
              <MnBadge variant="level">NÍVEL 3</MnBadge>
              <MnBadge variant="action">Convidar</MnBadge>
              <MnBadge variant="achievement" pulse>Top 10</MnBadge>
            </div>
          </div>
        </section>

        <MnDivider variant="green" />

        {/* Ranking + Profile */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="mn-points-block">
            <span className="mn-label" style={{ marginBottom: 12 }}>Ranking de Mobilizadores</span>
            <MnRankList entries={[
              { position: 1, name: 'Carlos Eduardo Oliveira', points: 2389 },
              { position: 2, name: 'Marina Silva Souza', points: 2105 },
              { position: 3, name: 'João Pedro Almeida', points: 1850 },
              { position: 4, name: 'Você', points: 1432, isSelf: true },
              { position: 5, name: 'Ana Beatriz Lima', points: 1280 },
            ]} />
          </div>
          <MnProfileCard
            name="Carlos Alberto Parreira"
            location="Cuiabá, MT · Centro"
            level="Cidadão Engajado"
            stats={[
              { label: 'Pontuação total', value: '85 pts' },
              { label: 'Amigos na rede', value: 32 },
            ]}
            rows={[
              { label: 'Status', value: 'Cadastro incompleto' },
              { label: 'Nascimento', value: '01/03/1956' },
            ]}
          />
        </section>

        {/* Notifications */}
        <section className="mn-points-block">
          <span className="mn-label" style={{ marginBottom: 4 }}>Disparos Recentes</span>
          <div className="mn-notif-row">
            <span className="mn-notif-row__date">2018/05/03 16:34</span>
            <div className="mn-notif-row__content">
              <span className="mn-notif-row__title">Título da notificação</span>
              <span className="mn-notif-row__body">Mensagem que acabou de ser salva...</span>
            </div>
            <span className="mn-notif-row__target">Toda a base</span>
          </div>
          <div className="mn-notif-row">
            <span className="mn-notif-row__date">2018/05/02 09:12</span>
            <div className="mn-notif-row__content">
              <span className="mn-notif-row__title">Lembrete de evento</span>
              <span className="mn-notif-row__body">Comparecimento ao comitê às 18h.</span>
            </div>
            <span className="mn-notif-row__target">Lideranças</span>
          </div>
        </section>

        <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <MnButton variant="primary">CTA Principal</MnButton>
          <MnButton variant="secondary">Botão Secundário</MnButton>
          <MnButton variant="primary" size="sm">Pequeno</MnButton>
        </section>
      </main>
    </div>
  );
}
