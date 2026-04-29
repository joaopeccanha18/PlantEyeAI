import React, { useState, useMemo } from 'react';
import { History, Trash2, ChevronRight, Leaf, Filter, FileDown, X } from 'lucide-react';
import { HistoryItem, PlantStatus } from '../types';
import AnalysisResultView from './AnalysisResultView';
import { exportSinglePDF, exportAllPDF } from './PDFReport';

interface HistoryViewProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
  onMarkRemoved: (id: string) => void;
}

type StatusFilter = 'ALL' | PlantStatus;
type DateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';

const HistoryView: React.FC<HistoryViewProps> = ({ history, onClearHistory, onDeleteItem, onMarkRemoved }) => {
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(timestamp));
  };

  const translateStatus = (status: string, healthStatus?: string) => {
    // Preferir o novo healthStatus RAIZ
    if (healthStatus) return healthStatus;
    switch (status?.toUpperCase()) {
      case 'HEALTHY': return 'Saudável';
      case 'THIRSTY': return 'Deficit Hídrico';
      case 'SICK': return 'Anomalia';
      default: return 'Inconclusivo';
    }
  };

  const getStatusColor = (status: string, healthStatus?: string) => {
    const hs = healthStatus ?? status;
    switch (hs) {
      case 'Saudável': case 'HEALTHY':  return 'text-emerald-700 bg-emerald-100';
      case 'Em Stress': case 'THIRSTY': return 'text-amber-700 bg-amber-100';
      case 'Doente':  case 'SICK':     return 'text-orange-700 bg-orange-100';
      case 'Crítico':                  return 'text-red-700 bg-red-100';
      default:                         return 'text-gray-700 bg-gray-100';
    }
  };

  const filteredHistory = useMemo(() => {
    const now = Date.now();
    const day = 86400000;

    return history.filter(item => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      if (dateFilter === 'TODAY' && now - item.timestamp > day) return false;
      if (dateFilter === 'WEEK' && now - item.timestamp > day * 7) return false;
      if (dateFilter === 'MONTH' && now - item.timestamp > day * 30) return false;

      return true;
    });
  }, [history, statusFilter, dateFilter]);

  const activeFiltersCount = (statusFilter !== 'ALL' ? 1 : 0) + (dateFilter !== 'ALL' ? 1 : 0);

  if (history.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-emerald-200">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <History className="w-8 h-8 text-emerald-200" />
        </div>
        <p className="text-emerald-900 font-bold mb-2">Sem registos de campo</p>
        <p className="text-emerald-600/70 text-sm px-8">Os diagnósticos dos teus eucaliptos vão aparecer aqui após cada análise.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[#064E3B]">Registos de Campo</h2>
          <p className="text-xs text-emerald-600/50 font-medium mt-0.5">
            {filteredHistory.length} de {history.length} diagnóstico{history.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportAllPDF(filteredHistory)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#064E3B] text-white rounded-full text-xs font-black hover:bg-emerald-800 transition-colors"
            title="Exportar PDF"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2 rounded-full transition-colors ${showFilters ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-50'}`}
            title="Filtros"
          >
            <Filter className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              if (window.confirm('Tem a certeza que quer apagar todos os registos de campo?')) {
                onClearHistory();
              }
            }}
            className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
            title="Limpar Registos"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-[2rem] border border-emerald-100 p-5 space-y-4 shadow-sm">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50 mb-2">Estado Fitossanitário</p>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'ALL', label: 'Todos' },
                { value: 'HEALTHY', label: 'Saudável' },
                { value: 'THIRSTY', label: 'Deficit Hídrico' },
                { value: 'SICK', label: 'Anomalia' },
              ] as { value: StatusFilter; label: string }[]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    statusFilter === value
                      ? 'bg-[#064E3B] text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50 mb-2">Período</p>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'ALL', label: 'Todos' },
                { value: 'TODAY', label: 'Hoje' },
                { value: 'WEEK', label: 'Esta semana' },
                { value: 'MONTH', label: 'Este mês' },
              ] as { value: DateFilter; label: string }[]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDateFilter(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    dateFilter === value
                      ? 'bg-[#064E3B] text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={() => { setStatusFilter('ALL'); setDateFilter('ALL'); }}
              className="flex items-center gap-1.5 text-xs text-rose-500 font-bold hover:text-rose-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {filteredHistory.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-emerald-200">
          <p className="text-emerald-900 font-bold mb-1">Sem resultados</p>
          <p className="text-emerald-600/70 text-sm">Tenta ajustar os filtros aplicados.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-[2rem] p-4 flex gap-4 items-center border shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${item.isInvasive && !item.removedAt ? 'border-purple-200' : 'border-emerald-100'}`}
              onClick={() => setSelectedItem(item)}
            >
              <div className={`w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-2 ${item.isInvasive && !item.removedAt ? 'border-purple-200' : 'border-emerald-50'} relative`}>
                {item.imageUrl ? (
                  <>
                    <img src={item.imageUrl} alt={item.species} className="w-full h-full object-cover" />
                    {item.isInvasive && !item.removedAt && (
                      <div className="absolute inset-0 bg-purple-500/15 flex items-end justify-center pb-1">
                        <span className="text-[8px] font-black text-purple-700 bg-white/80 px-1 rounded">⚠</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-emerald-100 flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-emerald-500" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-[9px] font-black text-emerald-400/60 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                    #{String(item.analysisId ?? 0).padStart(3, '0')}
                  </span>
                  {item.coords && <span className="text-[9px] text-emerald-400/50 font-medium">📍 GPS</span>}
                  {/* Badge Invasora */}
                  {item.isInvasive && !item.removedAt && (
                    <span className="text-[9px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">⚠ INVASORA</span>
                  )}
                  {item.isInvasive && item.removedAt && (
                    <span className="text-[9px] font-black text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">✅ Removida</span>
                  )}
                  {!item.isInvasive && item.threatDetected && item.threatDetected !== 'nenhuma' && (
                    <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                      🐛 {item.severityLevel !== undefined ? `Nv.${item.severityLevel} ` : ''}{item.threatDetected.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-[#064E3B] truncate italic">
                  {item.isInvasive ? (item.invasiveSpecies || item.species) : item.species}
                </h3>
                <p className="text-xs text-emerald-600/70 mt-0.5">{formatDate(item.timestamp)}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Botão "Marcar como Removida" — só para invasoras não removidas */}
                {item.isInvasive && !item.removedAt && (
                  <button
                    onClick={e => { e.stopPropagation(); onMarkRemoved(item.id); }}
                    className="p-1.5 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                    title="Marcar invasora como removida"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); exportSinglePDF(item); }}
                  className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                  title="Exportar PDF"
                >
                  <FileDown className="w-4 h-4" />
                </button>
                {item.isInvasive ? (
                  <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full text-purple-700 bg-purple-100">
                    {item.removedAt ? 'Removida' : 'Invasora'}
                  </span>
                ) : (
                  <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${getStatusColor(item.status, item.healthStatus)}`}>
                    {translateStatus(item.status, item.healthStatus)}
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-emerald-200 group-hover:text-emerald-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <AnalysisResultView
          result={selectedItem}
          image={selectedItem.imageUrl}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};

export default HistoryView;