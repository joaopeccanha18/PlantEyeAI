// ═══════════════════════════════════════════════════════════
// PlantEye — Types
// Base científica: RAIZ – Instituto de Investigação da Floresta e Papel
// Especializado em Eucalyptus globulus · Portugal
// ═══════════════════════════════════════════════════════════

// ── Enums legados (mantidos para retrocompatibilidade) ──────
export enum PlantStatus {
  HEALTHY = 'HEALTHY',
  THIRSTY = 'THIRSTY',
  SICK    = 'SICK',
  UNKNOWN = 'UNKNOWN',
}

export enum LightLevel {
  LOW      = 'LOW',
  ADEQUATE = 'ADEQUATE',
  HIGH     = 'HIGH',
  UNKNOWN  = 'UNKNOWN',
}

// ── GPS ─────────────────────────────────────────────────────
export interface GpsCoords {
  latitude:  number;
  longitude: number;
  accuracy?: number;
}

// ═══════════════════════════════════════════════════════════
// TIPOS SILVÍCOLAS RAIZ
// ═══════════════════════════════════════════════════════════

/** Espécies de eucalipto identificáveis */
export type EucalyptusSpecies =
  | 'E. globulus'
  | 'E. nitens'
  | 'E. camaldulensis'
  | 'desconhecida';

/**
 * Ameaças documentadas pelo RAIZ e parceiros.
 * Cada valor corresponde a sintomas visuais detetáveis por câmara.
 */
export type ThreatType =
  | 'gonipterus'      // Gonipterus platensis — desfolha no ápice, posturas visíveis
  | 'phoracantha'     // Phoracantha spp. — copa seca, exsudações no tronco, serrim
  | 'mycosphaerella'  // Manchas foliares — alteração de cor e forma
  | 'deficiencia_N'   // Avermelhamento uniforme das folhas velhas
  | 'deficiencia_K'   // Necrose marginal (clorose → necrose nas margens)
  | 'deficiencia_Mg'  // Clorose internerval com pontos necróticos
  | 'invasora'        // Espécie invasora — deve ser removida do talhão
  | 'nenhuma';

/** Espécies invasoras mais comuns em talhões de eucalipto em Portugal */
export const INVASIVE_SPECIES_PT = [
  'Acacia dealbata',      // Mimosa — a invasora mais agressiva
  'Acacia melanoxylon',   // Acácia-de-flor-branca
  'Acacia longifolia',    // Acácia-de-espigas
  'Hakea sericea',        // Hakea espinhosa — muito agressiva
  'Hakea salicifolia',    // Hakea salgueiro
  'Pittosporum undulatum',// Incenseiro
  'Robinia pseudoacacia', // Falsa-acácia
] as const;

/**
 * Escala de severidade RAIZ/BIOND — adaptada para Gonipterus e outras ameaças.
 * 0 = sem sinais
 * 1 = folha comida 11–25% (ataque principal Mar–Mai; possível 2.º em Outono)
 * 2 = folha comida 26–50%
 * 3 = desfolha grave >50%
 */
export type SeverityLevel = 0 | 1 | 2 | 3;

/** Estado geral de saúde do talhão */
export type HealthStatus = 'Saudável' | 'Em Stress' | 'Doente' | 'Crítico';

/** Risco de impacto produtivo florestal */
export type ForestryRisk = 'Baixo' | 'Médio' | 'Alto';

/**
 * Resultado completo de uma análise silvícola PlantEye.
 * Ancorado na base científica do RAIZ – raiz-iifp.pt / e-globulus.pt
 */
export interface EucalyptusAnalysis {
  /** Espécie identificada pela IA */
  species: EucalyptusSpecies | string;
  /** Estado geral de saúde */
  healthStatus: HealthStatus;
  /** Ameaça fitossanitária detetada */
  threatDetected: ThreatType;
  /** Nível de severidade 0–3 (escala RAIZ/BIOND) */
  severityLevel: SeverityLevel;
  /** Risco florestal estimado */
  forestryRisk: ForestryRisk;
  /** Recomendações de gestão RAIZ (ordenadas por prioridade) */
  recommendations: string[];
  /** Referência à fonte científica RAIZ usada */
  raizReference: string;
  /** Resumo técnico para o operador */
  summary: string;
  /** Nível de luminosidade estimado */
  lightLevel: LightLevel;
  /** Confiança do modelo [0–1] */
  confidence: number;
  /** true se a planta identificada é uma espécie invasora a remover */
  isInvasive: boolean;
  /** Nome científico da invasora, null se não for invasora */
  invasiveSpecies: string | null;
}

// ── AnalysisResult como alias de compatibilidade ─────────────
// Mantido para compatibilidade com VoiceFeedback, PDFReport e LiveAssistant
export interface AnalysisResult extends EucalyptusAnalysis {
  /** @deprecated Usa healthStatus em vez disto */
  status: PlantStatus;
  /** @deprecated Usa recommendations[0] em vez disto */
  recommendation: string;
  /** true = capturado offline, análise IA ainda não realizada */
  isPending?: boolean;
  /** Base64 da imagem guardada para re-análise quando online */
  imageBase64?: string;
}

// ── HistoryItem ──────────────────────────────────────────────
export interface HistoryItem extends AnalysisResult {
  id:         string;
  /** ID sequencial exibido ao utilizador: #001, #002… */
  analysisId: number;
  timestamp:  number;
  imageUrl:   string;
  /** Coordenadas GPS no momento da captura */
  coords:     GpsCoords | null;
  /** true = análise com schema antigo (pre-RAIZ) */
  isLegacy?:  boolean;
  /** true = o técnico confirmou que removeu a invasora */
  removedAt?: number | null;
  /** true = capturado offline, aguarda re-análise online */
  isPending?: boolean;
  /** Base64 da imagem original guardada para re-análise */
  imageBase64?: string;
}

export interface VoiceState {
  isSpeaking: boolean;
  voiceName:  string;
}
