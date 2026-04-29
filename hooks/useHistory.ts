import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { HistoryItem, AnalysisResult, GpsCoords } from '../types';
import { Session } from '@supabase/supabase-js';

const LS_HISTORY_KEY = 'planteye_history';
const LS_COUNTER_KEY = 'planteye_analysis_counter';

/** Lê o próximo ID sequencial e incrementa o contador no localStorage */
function nextAnalysisId(): number {
  const current = parseInt(localStorage.getItem(LS_COUNTER_KEY) || '0', 10);
  const next = current + 1;
  localStorage.setItem(LS_COUNTER_KEY, String(next));
  return next;
}

/** Lê o histórico guardado localmente */
function readLocalHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Escreve o histórico localmente */
function writeLocalHistory(items: HistoryItem[]) {
  try {
    // Guarda apenas os últimos 200 itens para não encher o localStorage
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(items.slice(0, 200)));
  } catch {
    // localStorage cheio — silencia
  }
}

export function useHistory(session: Session | null) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const fetchHistory = useCallback(async () => {
    // 1. Começa sempre com o histórico local (disponível offline)
    const local = readLocalHistory();
    setHistory(local);

    // 2. Se houver sessão e rede, vai buscar ao Supabase e atualiza
    if (!session || !navigator.onLine) return;

    try {
      const { data } = await supabase
        .from('scan_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('timestamp', { ascending: false });

      if (data && data.length > 0) {
        const remoteItems: HistoryItem[] = data.map((row, i) => {
          const isLegacy = !row.threat_detected;
          return {
            id:              row.id,
            analysisId:      row.analysis_id ?? (data.length - i),
            timestamp:       row.timestamp,
            imageUrl:        row.image_url,
            species:         row.species ?? 'desconhecida',
            healthStatus:    row.health_status ?? 'Saudável',
            threatDetected:  row.threat_detected ?? 'nenhuma',
            severityLevel:   row.severity_level ?? 0,
            forestryRisk:    row.forestry_risk ?? 'Baixo',
            recommendations: Array.isArray(row.recommendations)
              ? row.recommendations
              : [row.recommendation ?? 'Consultar técnico florestal.'],
            raizReference:   row.raiz_reference ?? 'Base científica RAIZ · raiz-iifp.pt',
            summary:         row.summary ?? '',
            lightLevel:      row.light_level ?? 'UNKNOWN',
            confidence:      row.confidence ?? 0,
            status:          row.status ?? 'UNKNOWN',
            recommendation:  row.recommendation ?? '',
            coords: row.latitude != null && row.longitude != null
              ? { latitude: row.latitude, longitude: row.longitude }
              : null,
            isLegacy,
            // Campos invasoras
            isInvasive:      row.is_invasive ?? false,
            invasiveSpecies: row.invasive_species ?? null,
            removedAt:       row.removed_at ? new Date(row.removed_at).getTime() : null,
          } as HistoryItem;
        });
        setHistory(remoteItems);
        writeLocalHistory(remoteItems);
      }
    } catch {
      // Sem rede — mantém os dados locais já carregados
    }
  }, [session]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const addHistoryItem = useCallback(async (
    result: AnalysisResult,
    imageUrl: string,
    coords: GpsCoords | null
  ) => {
    const analysisId = nextAnalysisId();

    const newItem: HistoryItem = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      analysisId,
      timestamp: Date.now(),
      imageUrl,
      coords,
      ...result,
    };

    // Otimismo: adiciona localmente de imediato
    setHistory(prev => {
      const updated = [newItem, ...prev];
      writeLocalHistory(updated);
      return updated;
    });

    // Tenta persistir no Supabase em background
    if (session && navigator.onLine) {
      try {
        const row = {
          user_id:          session.user.id,
          analysis_id:      analysisId,
          species:          result.species,
          status:           result.status,
          health_status:    result.healthStatus,
          threat_detected:  result.threatDetected,
          severity_level:   result.severityLevel,
          forestry_risk:    result.forestryRisk,
          recommendations:  result.recommendations,
          raiz_reference:   result.raizReference,
          light_level:      result.lightLevel,
          summary:          result.summary,
          recommendation:   result.recommendations?.[0] ?? '',
          confidence:       result.confidence,
          image_url:        imageUrl,
          timestamp:        newItem.timestamp,
          latitude:         coords?.latitude ?? null,
          longitude:        coords?.longitude ?? null,
          // Campos invasoras
          is_invasive:      result.isInvasive ?? false,
          invasive_species: result.invasiveSpecies ?? null,
        };

        const { data } = await supabase.from('scan_history').insert(row).select().single();

        if (data) {
          // Atualiza o id local pelo UUID do Supabase
          setHistory(prev => prev.map(item =>
            item.analysisId === analysisId ? { ...item, id: data.id } : item
          ));
        }
      } catch {
        // Falhou — fica guardado localmente e sincroniza depois
      }
    }

    return newItem;
  }, [session]);

  const deleteHistoryItem = useCallback(async (id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      writeLocalHistory(updated);
      return updated;
    });
    if (session && navigator.onLine) {
      await supabase.from('scan_history').delete().eq('id', id);
    }
  }, [session]);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    writeLocalHistory([]);
    if (session && navigator.onLine) {
      await supabase.from('scan_history').delete().eq('user_id', session.user.id);
    }
  }, [session]);

  /** Marca uma invasora como removida pelo técnico */
  const markInvasiveRemoved = useCallback(async (id: string) => {
    const removedAt = Date.now();
    setHistory(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, removedAt } : item
      );
      writeLocalHistory(updated);
      return updated;
    });
    if (session && navigator.onLine) {
      await supabase
        .from('scan_history')
        .update({ removed_at: new Date(removedAt).toISOString() })
        .eq('id', id);
    }
  }, [session]);

  /**
   * Substitui um item pendente (offline) pelos dados reais da análise.
   * Chamado quando o técnico pressiona "Analisar Agora" após voltar online.
   */
  const updateHistoryItem = useCallback(async (id: string, result: AnalysisResult) => {
    let updatedItem: HistoryItem | null = null;

    setHistory(prev => {
      const updated = prev.map(item => {
        if (item.id !== id) return item;
        updatedItem = {
          ...item,
          ...result,
          isPending: false,
          imageBase64: undefined, // liberta memória após análise
        };
        return updatedItem!;
      });
      writeLocalHistory(updated);
      return updated;
    });

    // Sincroniza no Supabase
    if (session && navigator.onLine && updatedItem) {
      const u = updatedItem as HistoryItem;
      try {
        const row = {
          species:          u.species,
          status:           u.status,
          health_status:    u.healthStatus,
          threat_detected:  u.threatDetected,
          severity_level:   u.severityLevel,
          forestry_risk:    u.forestryRisk,
          recommendations:  u.recommendations,
          raiz_reference:   u.raizReference,
          light_level:      u.lightLevel,
          summary:          u.summary,
          recommendation:   u.recommendations?.[0] ?? '',
          confidence:       u.confidence,
          is_invasive:      u.isInvasive ?? false,
          invasive_species: u.invasiveSpecies ?? null,
        };

        if (u.id.startsWith('local_')) {
          // Nunca foi para o Supabase — faz insert
          await supabase.from('scan_history').insert({
            ...row,
            user_id:     session.user.id,
            analysis_id: u.analysisId,
            timestamp:   u.timestamp,
            image_url:   u.imageUrl,
            latitude:    u.coords?.latitude ?? null,
            longitude:   u.coords?.longitude ?? null,
          });
        } else {
          // Já existe — faz update
          await supabase.from('scan_history').update(row).eq('id', u.id);
        }
      } catch {
        // Falhou — fica guardado localmente
      }
    }
  }, [session]);

  return { history, addHistoryItem, clearHistory, deleteHistoryItem, markInvasiveRemoved, updateHistoryItem, refetch: fetchHistory };
}
