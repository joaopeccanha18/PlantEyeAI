import React from 'react';
import {
  X, Leaf, Sun, AlertTriangle, CheckCircle2, Info, Zap,
  Bug, ExternalLink, ShieldAlert, Trash2, AlertOctagon,
} from 'lucide-react';
import { AnalysisResult, ThreatType, SeverityLevel } from '../types';

interface AnalysisResultViewProps {
  result: AnalysisResult;
  image: string | null;
  onClose: () => void;
}

// ── Config visual das ameaças silvícolas ──────────────────────
const THREAT_CONFIG: Record<ThreatType, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  gonipterus:     { label: 'Gonipterus platensis',       icon: <Bug className="w-4 h-4" />,           color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200' },
  phoracantha:    { label: 'Phoracantha spp.',            icon: <Bug className="w-4 h-4" />,           color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200'    },
  mycosphaerella: { label: 'Mycosphaerella',              icon: <AlertTriangle className="w-4 h-4" />, color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200' },
  deficiencia_N:  { label: 'Deficiência de Azoto (N)',   icon: <Info className="w-4 h-4" />,          color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  deficiencia_K:  { label: 'Deficiência de Potássio (K)',icon: <Info className="w-4 h-4" />,          color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  deficiencia_Mg: { label: 'Deficiência de Magnésio (Mg)',icon: <Info className="w-4 h-4" />,         color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  invasora:       { label: 'Espécie Invasora',            icon: <Trash2 className="w-4 h-4" />,        color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200'    },
  nenhuma:        { label: 'Sem Ameaça Detetada',         icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-700',bg: 'bg-emerald-50', border: 'border-emerald-200'},
};

const HEALTH_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  'Saudável':  { color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: <CheckCircle2 className="w-5 h-5" /> },
  'Em Stress': { color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',   icon: <AlertTriangle className="w-5 h-5" /> },
  'Doente':    { color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200',  icon: <ShieldAlert className="w-5 h-5" /> },
  'Crítico':   { color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     icon: <ShieldAlert className="w-5 h-5" /> },
};

const RISK_CONFIG: Record<string, { color: string; bg: string }> = {
  'Baixo': { color: 'text-emerald-700', bg: 'bg-emerald-100' },
  'Médio': { color: 'text-amber-700',   bg: 'bg-amber-100'   },
  'Alto':  { color: 'text-red-700',     bg: 'bg-red-100'     },
};

const SeverityBar: React.FC<{ level: SeverityLevel }> = ({ level }) => {
  const colors = ['bg-emerald-400', 'bg-amber-400', 'bg-orange-500', 'bg-red-600'];
  const labels = ['Nível 0\nSem sinais', 'Nível 1\n11–25%', 'Nível 2\n26–50%', 'Nível 3\n>50%'];
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50">Severidade — Escala RAIZ/BIOND</p>
      <div className="flex gap-1.5">
        {([0, 1, 2, 3] as const).map((bar) => (
          <div key={bar} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-full h-3 rounded-full ${bar <= level ? colors[level] : 'bg-gray-200'}`} />
            <span className={`text-[8px] font-bold text-center leading-tight whitespace-pre-line ${bar === level ? 'text-gray-700' : 'text-gray-400'}`}>{labels[bar]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════
// PAINEL DE INVASORA — substituição completa quando isInvasive
// ════════════════════════════════════════════════════════════
const InvasivePanel: React.FC<{ result: AnalysisResult; image: string | null; onClose: () => void }> = ({ result, image, onClose }) => {
  const recs = Array.isArray(result.recommendations) && result.recommendations.length > 0
    ? result.recommendations
    : [result.recommendation ?? 'Remover imediatamente do talhão.'];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header vermelho de emergência */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <AlertOctagon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm uppercase tracking-widest">⚠ Invasora Detetada</h3>
              <p className="text-red-200 text-[10px] font-bold uppercase tracking-widest">Ação de Campo Obrigatória</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">

          {/* Imagem */}
          {image && (
            <div className="w-full aspect-video rounded-[2rem] overflow-hidden border-4 border-red-100 shadow-inner relative">
              <img src={image} alt="Invasora detetada" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-red-600/10" />
              <div className="absolute bottom-3 right-3 px-3 py-1 bg-red-600/80 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest">
                PlantEye · INVASORA
              </div>
            </div>
          )}

          {/* Espécie invasora */}
          <div className="text-center p-5 bg-red-50 rounded-[1.5rem] border-2 border-red-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500/70 mb-1">Espécie Invasora Identificada</p>
            <h2 className="text-2xl font-black text-red-700 tracking-tighter leading-tight italic">
              {result.invasiveSpecies || result.species}
            </h2>
            <p className="text-sm text-red-600/70 font-medium mt-2">{result.summary}</p>
          </div>

          {/* Bloco de ação obrigatória */}
          <div className="bg-red-700 p-5 rounded-[1.5rem] text-white shadow-xl">
            <h4 className="flex items-center gap-2 font-black text-white mb-3 text-sm uppercase tracking-wide">
              <Trash2 className="w-4 h-4 text-red-300" />
              Ações de Campo
            </h4>
            <ol className="space-y-2">
              {recs.map((rec, i) => (
                <li key={i} className="flex gap-2 text-sm text-red-100 leading-relaxed">
                  <span className="font-black text-red-300 flex-shrink-0">{i + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ol>

            {/* Risco */}
            <div className="mt-4 pt-3 border-t border-red-600/50 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-300" />
              <span className="text-[10px] font-black text-red-300 uppercase tracking-widest">
                Risco Florestal: <span className="text-white">{result.forestryRisk ?? 'Alto'}</span>
              </span>
            </div>
          </div>

          {/* Referência + Confiança */}
          <div className="space-y-2">
            <div className="px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Referência Científica</p>
              <p className="text-xs text-gray-600 font-medium italic">{result.raizReference ?? 'Base científica RAIZ · raiz-iifp.pt'}</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <p className="text-xs text-gray-600 font-medium">
                Confiança: <span className="font-black">{Math.round((result.confidence ?? 0) * 100)}%</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 bg-white border-t border-red-50">
          <button
            onClick={onClose}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-[1.5rem] font-bold tracking-wide transition-all shadow-xl active:scale-95"
          >
            Registar e Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════
// PAINEL PRINCIPAL (eucalipto)
// ════════════════════════════════════════════════════════════
const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({ result, image, onClose }) => {
  // Redireciona para o painel de invasora quando aplicável
  if (result.isInvasive) {
    return <InvasivePanel result={result} image={image} onClose={onClose} />;
  }

  const healthCfg = HEALTH_CONFIG[result.healthStatus ?? 'Saudável'] ?? HEALTH_CONFIG['Saudável'];
  const threatCfg = THREAT_CONFIG[result.threatDetected ?? 'nenhuma'] ?? THREAT_CONFIG['nenhuma'];
  const riskCfg   = RISK_CONFIG[result.forestryRisk ?? 'Baixo'] ?? RISK_CONFIG['Baixo'];
  const recs      = Array.isArray(result.recommendations) && result.recommendations.length > 0
    ? result.recommendations
    : [result.recommendation ?? 'Consultar técnico florestal.'];

  const getLightLabel = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'HIGH':     return 'Exposição Alta';
      case 'ADEQUATE': return 'Exposição Adequada';
      case 'LOW':      return 'Exposição Baixa';
      default:         return 'Desconhecida';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-50 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <Leaf className="w-4 h-4 text-[#064E3B]" />
            </div>
            <div>
              <h3 className="font-black text-[#064E3B] tracking-tight uppercase text-sm">Relatório de Campo</h3>
              <p className="text-[9px] text-emerald-600/50 font-bold uppercase tracking-widest">Base Científica RAIZ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-emerald-50 rounded-full text-emerald-800 hover:bg-emerald-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {image && (
            <div className="w-full aspect-video rounded-[2rem] overflow-hidden border-4 border-emerald-50 shadow-inner relative">
              <img src={image} alt="Talhão analisado" className="w-full h-full object-cover" />
              <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest">
                PlantEye · RAIZ
              </div>
            </div>
          )}

          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50 mb-1">Espécie Identificada</p>
            <h2 className="text-2xl font-black text-[#064E3B] tracking-tighter leading-tight italic">{result.species}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`flex flex-col items-center justify-center p-4 rounded-[1.5rem] border ${healthCfg.color} ${healthCfg.bg} ${healthCfg.border}`}>
              {healthCfg.icon}
              <span className="mt-2 text-[9px] font-black uppercase tracking-widest opacity-70">Estado Fitossanitário</span>
              <span className="font-bold tracking-tight text-center text-sm mt-0.5">{result.healthStatus ?? 'Saudável'}</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 rounded-[1.5rem] border border-gray-200 bg-gray-50">
              <ShieldAlert className="w-5 h-5 text-gray-500" />
              <span className="mt-2 text-[9px] font-black uppercase tracking-widest text-gray-500">Risco Florestal</span>
              <span className={`font-black text-sm mt-1 px-3 py-0.5 rounded-full ${riskCfg.color} ${riskCfg.bg}`}>{result.forestryRisk ?? 'Baixo'}</span>
            </div>
          </div>

          <div className={`p-4 rounded-[1.5rem] border ${threatCfg.bg} ${threatCfg.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={threatCfg.color}>{threatCfg.icon}</span>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ameaça Detetada</p>
            </div>
            <p className={`font-bold text-sm italic ${threatCfg.color}`}>{threatCfg.label}</p>
          </div>

          {result.threatDetected !== 'nenhuma' && result.threatDetected !== 'invasora' && (
            <div className="p-4 bg-gray-50 rounded-[1.5rem] border border-gray-100">
              <SeverityBar level={result.severityLevel ?? 0} />
            </div>
          )}

          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-100">
            <Sun className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-600/60">Radiação Solar</p>
              <p className="text-sm font-bold text-amber-800">{getLightLabel(result.lightLevel ?? 'UNKNOWN')}</p>
            </div>
          </div>

          <div className="bg-emerald-50/50 p-5 rounded-[1.5rem] border border-emerald-100">
            <h4 className="flex items-center gap-2 font-bold text-emerald-900 mb-2">
              <Info className="w-4 h-4 text-emerald-500" />
              Observação Técnica
            </h4>
            <p className="text-sm text-emerald-800 leading-relaxed font-medium">{result.summary}</p>
          </div>

          <div className="bg-[#064E3B] p-5 rounded-[1.5rem] text-white shadow-lg">
            <h4 className="flex items-center gap-2 font-bold text-emerald-50 mb-3">
              <Zap className="w-4 h-4 text-emerald-300" />
              Ações Recomendadas
            </h4>
            <ol className="space-y-2">
              {recs.map((rec, i) => (
                <li key={i} className="flex gap-2 text-sm text-emerald-100/90 leading-relaxed">
                  <span className="font-black text-emerald-400 flex-shrink-0">{i + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 pt-3 border-t border-emerald-700/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-emerald-400/20 rounded-full flex items-center justify-center">
                  <Leaf className="w-2.5 h-2.5 text-emerald-300" />
                </div>
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Conhecimento RAIZ</span>
              </div>
              <a href="https://raiz-iifp.pt" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[9px] text-emerald-400 hover:text-emerald-200 transition-colors">
                raiz-iifp.pt <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <div className="px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/50 mb-0.5">Referência Científica</p>
              <p className="text-xs text-emerald-700 font-medium italic">{result.raizReference ?? 'Base científica RAIZ · raiz-iifp.pt'}</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-700 font-medium">
                Confiança do modelo: <span className="font-black">{Math.round((result.confidence ?? 0) * 100)}%</span>
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 pt-2 bg-white border-t border-emerald-50">
          <button onClick={onClose}
            className="w-full py-4 bg-[#064E3B] hover:bg-[#064E3B]/90 text-white rounded-[1.5rem] font-bold tracking-wide transition-all shadow-xl active:scale-95">
            Fechar Relatório
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResultView;