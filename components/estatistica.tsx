import React, { useMemo } from 'react';
import { HistoryItem, PlantStatus, LightLevel } from '../types';
import {
  Leaf, Heart, Droplets, Sun, TrendingUp, BarChart2,
  AlertTriangle, CheckCircle2, Clock, Award, Layers, Zap
} from 'lucide-react';

interface StatsViewProps {
  history: HistoryItem[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

const statusLabel: Record<PlantStatus, string> = {
  [PlantStatus.HEALTHY]: 'Saudável',
  [PlantStatus.THIRSTY]: 'Com Sede',
  [PlantStatus.SICK]: 'Doente',
  [PlantStatus.UNKNOWN]: 'Desconhecido',
};

const lightLabel: Record<LightLevel, string> = {
  [LightLevel.LOW]: 'Baixa',
  [LightLevel.ADEQUATE]: 'Adequada',
  [LightLevel.HIGH]: 'Alta',
  [LightLevel.UNKNOWN]: 'Desconhecido',
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

// ── sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent = 'emerald',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'emerald' | 'rose' | 'amber' | 'sky' | 'violet';
}) {
  const accents: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    sky: 'bg-sky-50 text-sky-600 border-sky-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
  };
  return (
    <div className="bg-white rounded-[1.75rem] border border-emerald-100 p-5 shadow-sm flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${accents[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700/50">{label}</p>
        <p className="text-3xl font-black text-[#064E3B] leading-none mt-0.5">{value}</p>
        {sub && <p className="text-xs text-emerald-700/60 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-[#064E3B]/70 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-emerald-50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-black text-[#064E3B] w-8 text-right">{count}</span>
    </div>
  );
}

function SpeciesCard({ species, count, lastSeen, status }: {
  species: string;
  count: number;
  lastSeen: number;
  status: PlantStatus;
}) {
  const dot: Record<PlantStatus, string> = {
    [PlantStatus.HEALTHY]: 'bg-emerald-500',
    [PlantStatus.THIRSTY]: 'bg-amber-400',
    [PlantStatus.SICK]: 'bg-rose-500',
    [PlantStatus.UNKNOWN]: 'bg-gray-300',
  };
  return (
    <div className="flex items-center justify-between bg-emerald-50/60 rounded-2xl px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot[status]}`} />
        <div>
          <p className="text-sm font-bold text-[#064E3B]">{species}</p>
          <p className="text-[10px] text-emerald-700/50">Último: {formatDate(lastSeen)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-black text-[#064E3B]">{count}×</p>
        <p className="text-[10px] text-emerald-700/50">{statusLabel[status]}</p>
      </div>
    </div>
  );
}

// componente principal twin

const StatsView: React.FC<StatsViewProps> = ({ history }) => {
  const stats = useMemo(() => {
    const total = history.length;
    if (total === 0) return null;

    const statusCount = {
      [PlantStatus.HEALTHY]: 0,
      [PlantStatus.THIRSTY]: 0,
      [PlantStatus.SICK]: 0,
      [PlantStatus.UNKNOWN]: 0,
    };
    history.forEach(h => statusCount[h.status]++);

    const lightCount = {
      [LightLevel.LOW]: 0,
      [LightLevel.ADEQUATE]: 0,
      [LightLevel.HIGH]: 0,
      [LightLevel.UNKNOWN]: 0,
    };
    history.forEach(h => lightCount[h.lightLevel]++);

    const thirstyPct = Math.round((statusCount[PlantStatus.THIRSTY] / total) * 100);

    const avgConfidence = Math.round(
      history.reduce((acc, h) => acc + (h.confidence ?? 0), 0) / total
    );

    const speciesMap: Record<string, { count: number; lastSeen: number; lastStatus: PlantStatus }> = {};
    history.forEach(h => {
      if (!speciesMap[h.species]) {
        speciesMap[h.species] = { count: 0, lastSeen: h.timestamp, lastStatus: h.status };
      }
      speciesMap[h.species].count++;
      if (h.timestamp > speciesMap[h.species].lastSeen) {
        speciesMap[h.species].lastSeen = h.timestamp;
        speciesMap[h.species].lastStatus = h.status;
      }
    });
    const speciesList = Object.entries(speciesMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
    const recent = sorted.slice(0, Math.min(5, total));
    const recentHealthy = recent.filter(h => h.status === PlantStatus.HEALTHY).length;
    const healthyPct = Math.round((statusCount[PlantStatus.HEALTHY] / total) * 100);

    const latest = sorted[0];

    return {
      total, statusCount, lightCount, thirstyPct, avgConfidence,
      speciesList, healthyPct, recentHealthy, latest,
    };
  }, [history]);

  if (!stats) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight">Estatísticas</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-violet-100 rounded-full">
            <BarChart2 className="w-3 h-3 text-violet-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-violet-700">Dashboard</span>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] border border-emerald-100 p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center">
            <Leaf className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="font-black text-[#064E3B] text-lg">Ainda sem dados</p>
            <p className="text-sm text-emerald-700/60 mt-1">Faz o primeiro diagnóstico para ver as tuas estatísticas aqui.</p>
          </div>
        </div>
      </div>
    );
  }

  const { total, statusCount, lightCount, thirstyPct, avgConfidence, speciesList, healthyPct, latest } = stats;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight">Estatísticas</h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-violet-100 rounded-full">
          <BarChart2 className="w-3 h-3 text-violet-600" />
          <span className="text-[10px] font-black uppercase tracking-widest text-violet-700">Dashboard</span>
        </div>
      </div>

      {/* Top KPI cards — 2×2 grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={<Layers className="w-5 h-5" />}
          label="Total Análises"
          value={total}
          sub="diagnósticos realizados"
          accent="emerald"
        />
        <StatCard
          icon={<Heart className="w-5 h-5" />}
          label="Taxa de Saúde"
          value={`${healthyPct}%`}
          sub={`${statusCount[PlantStatus.HEALTHY]} saudáveis`}
          accent="rose"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Confiança Média"
          value={`${avgConfidence}%`}
          sub="precisão da IA"
          accent="amber"
        />
        <StatCard
          icon={<Award className="w-5 h-5" />}
          label="Espécies"
          value={speciesList.length}
          sub="identificadas"
          accent="violet"
        />
      </div>

      {/* Estado de saúde */}
      <div className="bg-white rounded-[2rem] border border-emerald-100 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <h3 className="font-black text-sm uppercase tracking-widest text-emerald-900">Estado de Saúde</h3>
        </div>
        <StatusBar label="Saudável" count={statusCount[PlantStatus.HEALTHY]} total={total} color="bg-emerald-500" />
        <StatusBar label="Com Sede" count={statusCount[PlantStatus.THIRSTY]} total={total} color="bg-amber-400" />
        <StatusBar label="Doente" count={statusCount[PlantStatus.SICK]} total={total} color="bg-rose-500" />
        <StatusBar label="Desconhecido" count={statusCount[PlantStatus.UNKNOWN]} total={total} color="bg-gray-300" />
      </div>

      {/* Hidratação & Luz */}
      <div className="grid grid-cols-2 gap-4">
        {/* Hidratação */}
        <div className="bg-white rounded-[2rem] border border-emerald-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-sky-500" />
            <h3 className="font-black text-[11px] uppercase tracking-widest text-emerald-900">Hidratação</h3>
          </div>
          <div className="flex flex-col items-center gap-2 pt-1">
            {/* radial indicator */}
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#e0f2fe" strokeWidth="8" />
                <circle
                  cx="40" cy="40" r="32" fill="none"
                  stroke={thirstyPct > 50 ? '#f87171' : '#38bdf8'}
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - thirstyPct / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-black text-[#064E3B]">{thirstyPct}%</span>
              </div>
            </div>
            <p className="text-[10px] text-center text-emerald-700/60 leading-snug">
              das plantas precisaram de água
            </p>
          </div>
        </div>

        {/* Luz */}
        <div className="bg-white rounded-[2rem] border border-emerald-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <h3 className="font-black text-[11px] uppercase tracking-widest text-emerald-900">Luminosidade</h3>
          </div>
          <div className="space-y-2 pt-1">
            {[
              { key: LightLevel.LOW, color: 'bg-slate-400' },
              { key: LightLevel.ADEQUATE, color: 'bg-amber-400' },
              { key: LightLevel.HIGH, color: 'bg-amber-600' },
            ].map(({ key, color }) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                <span className="text-[10px] text-[#064E3B]/60 flex-1">{lightLabel[key]}</span>
                <span className="text-xs font-black text-[#064E3B]">{lightCount[key]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Espécies analisadas */}
      <div className="bg-white rounded-[2rem] border border-emerald-100 p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <h3 className="font-black text-sm uppercase tracking-widest text-emerald-900">Top Espécies</h3>
        </div>
        {speciesList.map(([species, data]) => (
          <SpeciesCard
            key={species}
            species={species}
            count={data.count}
            lastSeen={data.lastSeen}
            status={data.lastStatus}
          />
        ))}
      </div>

      {/* Última análise */}
      <div className="bg-[#064E3B] rounded-[2rem] p-6 shadow-lg text-white space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-300" />
          <h3 className="font-black text-[11px] uppercase tracking-widest text-emerald-300">Última Análise</h3>
        </div>
        <div className="flex items-center gap-4">
          {latest.imageUrl && (
            <img
              src={latest.imageUrl}
              alt={latest.species}
              className="w-14 h-14 rounded-2xl object-cover shrink-0 border-2 border-white/20"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-base truncate">{latest.species}</p>
            <p className="text-xs text-emerald-200/70 mt-0.5">{statusLabel[latest.status]} · {formatDate(latest.timestamp)}</p>
            <p className="text-[10px] text-emerald-100/60 mt-1 line-clamp-2">{latest.recommendation}</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default StatsView;