import { GoogleGenAI, Modality, Type } from "@google/genai";
import {
  AnalysisResult, PlantStatus, LightLevel,
  ThreatType, SeverityLevel, ForestryRisk,
} from "../types";
import { keyManager } from "./keyManager";

export const getAI = (): GoogleGenAI => keyManager.getAI();
export { keyManager };

// ── Utilitários de áudio ─────────────────────────────────────
export const encode = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

export const decode = decodeBase64;

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

// ── TTS ──────────────────────────────────────────────────────
export const generateSpeech = async (text: string): Promise<string> => {
  return keyManager.withRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  });
};

// ════════════════════════════════════════════════════════════
// SYSTEM PROMPT CIENTÍFICO RAIZ + INVASORAS
// Base: RAIZ – Instituto de Investigação da Floresta e Papel
// ════════════════════════════════════════════════════════════
const RAIZ_SYSTEM_PROMPT = `
És um sistema de diagnóstico fitossanitário especializado em eucaliptos e controlo de espécies invasoras, desenvolvido com base no corpus científico do RAIZ – Instituto de Investigação da Floresta e Papel (Aveiro, Portugal).

════════════════════════════════════════════
PASSO 1 — IDENTIFICAR O QUE ESTÁS A VER
════════════════════════════════════════════

A) EUCALIPTO → continua para o Passo 2:
- E. globulus: folhas adultas lanceoladas verde-prateadas, casca fibrosa acinzentada
- E. nitens: folhas adultas mais largas e ovais, tolerante ao frio
- E. camaldulensis: folhas lanceoladas estreitas, casca lisa alaranjada

B) ESPÉCIE INVASORA → devolve isInvasive: true imediatamente:
- Acacia dealbata (Mimosa): folhagem verde-azulada bipinada muito fina, flores amarelas em cachos
- Acacia melanoxylon: folhas lanceoladas largas, casca cinzenta muito rugosa e fendida
- Acacia longifolia: folhas lanceoladas estreitas brilhantes, flores em espigas amarelas
- Hakea sericea: folhas em agulha muito rígidas e pontiagudas, flores brancas
- Hakea salicifolia: folhas lanceoladas com nervura central, flores brancas em cachos
- Pittosporum undulatum (Incenseiro): folhas onduladas brilhantes verde-escuro, frutos laranja
- Robinia pseudoacacia (Falsa-acácia): folhas pinadas, flores brancas pendentes perfumadas

C) NÃO IDENTIFICÁVEL → species: "desconhecida", isInvasive: false, threatDetected: "nenhuma"

════════════════════════════════════════════
PASSO 2 — SE FOR EUCALIPTO: DIAGNÓSTICO FITOSSANITÁRIO
════════════════════════════════════════════
Foca o diagnóstico no TERÇO SUPERIOR DA COPA (zona de ataque preferencial).

1. GONIPTERUS PLATENSIS (gorgulho-do-eucalipto)
   Ciclo: Março–Maio principal; possível 2.º ataque no Outono.
   Sintomas: posturas esbranquiçadas nas folhas jovens, folhas roídas nas margens, desfolha nos ápices.
   Escala RAIZ/BIOND: 0=sem sinais | 1=11-25% afetado | 2=26-50% | 3=>50% desfolha grave
   Rec. Nível 1-2: Controlo biológico com Anaphes nitens; seleção de clones resistentes.
   Rec. Nível 3: Inseticida sistémico + monitorização intensiva a cada 7 dias.

2. PHORACANTHA SPP. (broca-do-eucalipto)
   Sintomas: copa seca do topo para baixo, exsudações resinosas no tronco, orifícios com serrim na base.
   Rec.: Reduzir stress hídrico; corte e remoção imediata das árvores afetadas do talhão.

3. MYCOSPHAERELLA (manchas foliares)
   Sintomas: manchas castanhas/negras com halo amarelado; coalescência; queda prematura de folhas.
   Rec.: Monitorização; fungicida preventivo em casos graves.

4. DEFICIÊNCIAS NUTRICIONAIS (Manual Nutrição RAIZ/Navigator):
   - Deficiência N: avermelhamento uniforme do limbo das folhas velhas
   - Deficiência K: clorose marginal → necrose nas margens; bordos secos castanhos
   - Deficiência Mg: clorose internerval; nervuras verdes, tecido inter-nerval amarelo/necrótico
   Rec.: Fertilização mineral específica — protocolo RAIZ/Navigator.

════════════════════════════════════════════
REGRAS ABSOLUTAS DE RESPOSTA
════════════════════════════════════════════
- Invasora → isInvasive: true, invasiveSpecies: nome científico exato, threatDetected: "invasora", healthStatus: "Crítico", forestryRisk: "Alto"
- A PRIMEIRA recomendação de invasora DEVE começar SEMPRE por "REMOVER IMEDIATAMENTE."
- Eucalipto → isInvasive: false, invasiveSpecies: "" (string vazia)
- Responde SEMPRE em português de Portugal (pt-PT)
- raizReference deve citar a fonte científica específica usada
`;

// ── Análise de imagem com schema RAIZ + Invasoras ─────────────
export const analyzePlantImage = async (base64Image: string): Promise<AnalysisResult> => {
  return keyManager.withRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          {
            text: `Analisa esta imagem segundo os critérios RAIZ.
Primeiro determina: é eucalipto, é uma espécie invasora, ou é desconhecido?
Responde EXCLUSIVAMENTE com JSON válido (sem markdown, sem texto extra).`
          }
        ]
      },
      config: {
        systemInstruction: RAIZ_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            species:         { type: Type.STRING,  description: "E. globulus | E. nitens | E. camaldulensis | desconhecida | nome científico da invasora" },
            healthStatus:    { type: Type.STRING,  description: "Saudável | Em Stress | Doente | Crítico" },
            threatDetected:  { type: Type.STRING,  description: "gonipterus | phoracantha | mycosphaerella | deficiencia_N | deficiencia_K | deficiencia_Mg | invasora | nenhuma" },
            severityLevel:   { type: Type.NUMBER,  description: "0 | 1 | 2 | 3 (escala RAIZ/BIOND)" },
            forestryRisk:    { type: Type.STRING,  description: "Baixo | Médio | Alto" },
            recommendations: { type: Type.ARRAY,   items: { type: Type.STRING }, description: "1-3 ações por prioridade. Invasora: começa por REMOVER IMEDIATAMENTE." },
            raizReference:   { type: Type.STRING,  description: "Referência científica específica" },
            summary:         { type: Type.STRING,  description: "Resumo técnico de 2-3 frases para o operador de campo" },
            lightLevel:      { type: Type.STRING,  description: "LOW | ADEQUATE | HIGH" },
            confidence:      { type: Type.NUMBER,  description: "Confiança entre 0 e 1" },
            isInvasive:      { type: Type.BOOLEAN, description: "true se for espécie invasora a remover do talhão" },
            invasiveSpecies: { type: Type.STRING,  description: "Nome científico da invasora, ou string vazia se não for invasora" },
          },
          required: [
            "species", "healthStatus", "threatDetected", "severityLevel",
            "forestryRisk", "recommendations", "raizReference",
            "summary", "lightLevel", "confidence", "isInvasive", "invasiveSpecies"
          ]
        }
      }
    });

    try {
      const data = JSON.parse(response.text || '{}');
      const recommendations: string[] = Array.isArray(data.recommendations)
        ? data.recommendations
        : [data.recommendations || "Consultar técnico florestal."];
      const isInvasive = Boolean(data.isInvasive);

      return {
        species:         data.species         || 'desconhecida',
        healthStatus:    data.healthStatus     || (isInvasive ? 'Crítico' : 'Saudável'),
        threatDetected:  (data.threatDetected as ThreatType)   || 'nenhuma',
        severityLevel:   (data.severityLevel  as SeverityLevel) ?? 0,
        forestryRisk:    (data.forestryRisk   as ForestryRisk)  || 'Baixo',
        recommendations,
        raizReference:   data.raizReference   || 'Base científica RAIZ · raiz-iifp.pt',
        summary:         data.summary         || 'Não foi possível analisar em detalhe.',
        lightLevel:      (data.lightLevel as LightLevel) || LightLevel.UNKNOWN,
        confidence:      data.confidence      ?? 0,
        isInvasive,
        invasiveSpecies: data.invasiveSpecies || null,
        // Campos legados (retrocompatibilidade)
        status:         healthStatusToPlantStatus(data.healthStatus, isInvasive),
        recommendation: recommendations[0]   || 'Consultar técnico florestal.',
      } as AnalysisResult;

    } catch {
      throw new Error("Erro ao interpretar a resposta da IA.");
    }
  });
};

function healthStatusToPlantStatus(healthStatus: string, isInvasive = false): PlantStatus {
  if (isInvasive) return PlantStatus.SICK;
  switch (healthStatus) {
    case 'Saudável':  return PlantStatus.HEALTHY;
    case 'Em Stress': return PlantStatus.THIRSTY;
    case 'Doente':
    case 'Crítico':   return PlantStatus.SICK;
    default:          return PlantStatus.UNKNOWN;
  }
}