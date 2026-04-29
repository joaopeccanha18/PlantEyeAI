# PlantEyeAI — Documento Completo de Desenvolvimento

> **Última atualização:** Abril 2026  
> **Repositório:** [github.com/joaopeccanha18/PlantEyeAI](https://github.com/joaopeccanha18/PlantEyeAI)

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Arquitectura do Projeto](#arquitectura-do-projeto)
4. [Fases de Desenvolvimento](#fases-de-desenvolvimento)
5. [Base de Dados](#base-de-dados)
6. [Scripts SQL (Migrações)](#scripts-sql)
7. [Variáveis de Ambiente](#variáveis-de-ambiente)
8. [Funcionalidades Completas](#funcionalidades-completas)

---

## Visão Geral

O **PlantEyeAI** começou como um assistente botânico genérico e evoluiu para uma **ferramenta profissional de diagnóstico silvícola focada em _Eucalyptus globulus_**, ancorada na base científica do **RAIZ – Instituto de Investigação da Floresta e Papel** (Aveiro, Portugal).

A app corre como **PWA** (Progressive Web App) em dispositivos móveis e desktop, com suporte offline, geolocalização GPS, mapa interativo de campo e deteção de espécies invasoras para equipas técnicas florestais.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 18 + TypeScript 5 |
| **Build** | Vite + vite-plugin-pwa |
| **Estilização** | Tailwind CSS 3 |
| **Ícones** | Lucide React |
| **IA — Diagnóstico** | Google Gemini 2.5 Flash (Vision) |
| **IA — Voz (TTS)** | Gemini 2.5 Flash Preview TTS |
| **IA — Live** | Gemini 2.5 Flash Native Audio (WebSockets) |
| **Base de Dados** | Supabase (PostgreSQL) |
| **Autenticação** | Supabase Auth |
| **Cache Offline** | IndexedDB (via offlineDB.ts) + Workbox (PWA) |
| **Mapas** | Leaflet.js + OpenStreetMap tiles |
| **PDF** | jsPDF |
| **Deploy** | Vercel |

---

## Arquitectura do Projeto

```
PlantEyeAI/
├── App.tsx                        # Componente raiz, tabs, orquestração
├── index.tsx                      # Entry point React
├── index.html                     # HTML base
├── types.ts                       # Todos os tipos TypeScript (RAIZ + GPS + Invasoras)
├── vite.config.ts                 # Config Vite + PWA + Workbox
│
├── components/
│   ├── PlantScanner.tsx           # Câmara + captura + análise de imagem
│   ├── LiveAssistant.tsx          # Modo ao vivo (WebSocket Gemini multimodal)
│   ├── AnalysisResultView.tsx     # Painel de resultados (Eucalipto + Invasora)
│   ├── HistoryView.tsx            # Histórico de diagnósticos + filtros
│   ├── MapView.tsx                # Mapa Leaflet com pins por estado
│   ├── AuthModal.tsx              # Login / Registo (Supabase Auth)
│   ├── CameraSelector.tsx         # Seleção de câmara dispositivo
│   ├── QuotaAlert.tsx             # Alertas de quota da API Gemini
│   ├── SettingsModal.tsx          # Configurações + internacionalização (pt/en)
│   ├── VoiceFeedback.tsx          # Feedback de voz pós-análise
│   ├── PDFReport.ts               # Exportação de relatórios em PDF
│   └── estatistica.tsx            # Dashboard de estatísticas do histórico
│
├── services/
│   ├── gemini.ts                  # Sistema de prompt RAIZ + invasoras + API calls
│   ├── keyManager.ts              # Rotação automática de chaves Gemini (failover)
│   ├── offlineDB.ts               # IndexedDB para persistência offline
│   ├── supabase.ts                # Cliente Supabase
│   └── syncService.ts             # Sincronização offline→online
│
├── hooks/
│   ├── useAuth.ts                 # Autenticação Supabase
│   ├── useHistory.ts              # CRUD do histórico (local + Supabase)
│   ├── useOfflineSync.ts          # Estado da rede + sync pendente
│   └── useQuotaAlert.ts           # Gestão de erros de quota da API
│
├── migration_scan_history.sql     # Migração 1: analysis_id, GPS coords
├── migration_raiz.sql             # Migração 2: campos silvícolas RAIZ
└── migration_invasoras.sql        # Migração 3: is_invasive, invasive_species, removed_at
```

---

## Fases de Desenvolvimento

### Fase 1 — Aplicação Base (Assistente Botânico Genérico)

**O que existia no início:**
- Câmara com captura de imagem
- Análise por Gemini Vision (qualquer planta)
- Resultado simples: espécie, status (HEALTHY/THIRSTY/SICK), nível de luz, recomendação
- Interface com 3 tabs: Câmara, Direto, Arquivo
- Estilização Tailwind CSS, tema escuro/claro
- Componente `VoiceFeedback` (TTS)

---

### Fase 2 — Autenticação e Persistência (Supabase)

**Implementado:**
- **`AuthModal.tsx`** — Login e registo com email/password via Supabase Auth
- **`useAuth.ts`** — Hook para gestão da sessão
- **`useHistory.ts`** — Leitura e escrita do histórico em `scan_history` (Supabase)
- **`HistoryView.tsx`** — Listagem de análises passadas com thumbnail e data
- **`schema.sql`** — Tabela `scan_history` com RLS (Row Level Security) por utilizador

---

### Fase 3 — Rotação de Chaves API e Gestão de Quota

**Implementado:**
- **`services/keyManager.ts`** — Pool de chaves Gemini com `withRetry()`: ao receber erro 429 (quota), troca automaticamente para a próxima chave disponível
- **`QuotaAlert.tsx`** — Modal de alerta ao utilizador quando todas as chaves estão esgotadas, com botão de dismiss
- **`useQuotaAlert.ts`** — Hook de estado do alerta + `handleGeminiError()`
- Suporte a múltiplas chaves via variáveis de ambiente (`VITE_GEMINI_API_KEY_1`, `_2`, `_3`…)

---

### Fase 4 — GPS, Mapa Interativo e IDs de Análise

**Implementado:**
- **Geolocalização GPS** — cada análise captura `latitude` e `longitude` no momento da foto
- **ID sequencial por análise** — `#001`, `#002`… persistido no `localStorage` como contador
- **`MapView.tsx`** — Mapa Leaflet com:
  - Tiles OpenStreetMap
  - Pins coloridos por estado de saúde (verde, âmbar, vermelho)
  - Popup com foto, espécie, data e botão "Ver Análise"
  - Centra automaticamente nos pins existentes
- **`migration_scan_history.sql`** — Adicionadas colunas `analysis_id`, `latitude`, `longitude` à tabela `scan_history`
- Tab **Mapa** adicionada à navegação principal

---

### Fase 5 — Modo Offline (PWA + IndexedDB)

**Implementado:**
- **`services/offlineDB.ts`** — IndexedDB via `idb` para guardar diagnósticos quando sem rede:
  - `saveDiagnosticoPendente()` — guarda localmente
  - `getPendentesByUser()` — lista para sincronizar
  - `markSynced()` / `deletePendente()`
- **`services/syncService.ts`** — Sincronização automática quando a rede regressa: pega nos pendentes do IndexedDB e faz insert no Supabase
- **`useOfflineSync.ts`** — Hook com estado `isOnline`, `pendingCount`, `isSyncing` para a barra de status
- **`vite.config.ts`** — Configuração PWA com Workbox:
  - Cache de tiles OpenStreetMap (até 500 tiles, 30 dias)
  - Cache de imagens do Supabase Storage
  - Estratégia `NetworkFirst` para chamadas Supabase
  - `CacheFirst` para assets estáticos
- Indicador visual na UI: badge `📡 Offline` com contador de análises pendentes

---

### Fase 6 — Estatísticas e Exportação PDF

**Implementado:**
- **`estatistica.tsx`** — Dashboard com gráficos/contagens:
  - Total de diagnósticos
  - Distribuição por estado de saúde
  - Ameaças mais frequentes
  - Evolução temporal
- **`PDFReport.ts`** — Exportação de relatório individual ou total em PDF via `jsPDF`:
  - `exportSinglePDF(item)` — relatório de uma análise com imagem, espécie, diagnóstico, recomendações
  - `exportAllPDF(history)` — relatório consolidado de todo o histórico
- Botão de exportação PDF em cada cartão do `HistoryView`

---

### Fase 7 — Internacionalização e Configurações

**Implementado:**
- **`SettingsModal.tsx`** — Modal com:
  - Toggle modo escuro/claro
  - Seletor de idioma: Português (pt) / Inglês (en)
  - Objeto `translations` com todas as strings da UI
- Suporte a `Language` type e `t.key` em todo o `App.tsx`

---

### Fase 8 — Integração RAIZ (Base Científica Silvícola)

**O maior marco do projeto.** A app deixou de ser um assistente genérico de plantas e passou a ser um **sistema profissional de diagnóstico florestal** especializado em eucalipto.

**Implementado:**

#### `types.ts` — Taxonomia Científica
```typescript
type ThreatType = 'gonipterus' | 'phoracantha' | 'mycosphaerella'
                | 'deficiencia_N' | 'deficiencia_K' | 'deficiencia_Mg'
                | 'invasora' | 'nenhuma'

type SeverityLevel = 0 | 1 | 2 | 3  // Escala RAIZ/BIOND
type HealthStatus  = 'Saudável' | 'Em Stress' | 'Doente' | 'Crítico'
type ForestryRisk  = 'Baixo' | 'Médio' | 'Alto'

interface EucalyptusAnalysis {
  species, healthStatus, threatDetected, severityLevel,
  forestryRisk, recommendations[], raizReference, summary,
  lightLevel, confidence, isInvasive, invasiveSpecies
}
```

#### `services/gemini.ts` — System Prompt RAIZ
System prompt estruturado em 2 passos:
1. **Identificação**: Eucalipto vs. Invasora vs. Desconhecido
2. **Diagnóstico** (só para eucalipto): 4 ameaças com sintomas visuais + escala BIOND

Ameaças diagnosticadas:
| Ameaça | Sintomas Visuais |
|---|---|
| Gonipterus platensis | Posturas esbranquiçadas, folhas roídas nas margens, desfolha nos ápices |
| Phoracantha spp. | Copa seca top-down, exsudações resinosas, serrim na base |
| Mycosphaerella | Manchas castanhas/negras com halo, queda prematura |
| Deficiência N/K/Mg | Avermelhamento (N), necrose marginal (K), clorose internerval (Mg) |

Escala de severidade RAIZ/BIOND: `0=sem sinais | 1=11–25% | 2=26–50% | 3=>50%`

#### `AnalysisResultView.tsx` — Dois Painéis Distintos

**Painel Eucalipto** (existente, melhorado):
- Grid de estado fitossanitário + risco florestal
- Badge de ameaça com cor específica por tipo
- Barra visual de severidade 0–3 (RAIZ/BIOND)
- Lista de recomendações ordenadas por prioridade
- Badge "Conhecimento RAIZ" com link para raiz-iifp.pt

**Painel Invasora** (novo, completamente diferente):
- Header vermelho pulsante com ícone de alerta
- Nome científico da invasora em destaque
- Lista de ações de campo (sempre começa por "REMOVER IMEDIATAMENTE.")
- Botão "Registar e Fechar" vermelho

#### `migration_raiz.sql`
Colunas adicionadas à `scan_history`:
- `threat_detected` (TEXT, CHECK constraint)
- `severity_level` (INTEGER 0–3)
- `forestry_risk` (TEXT)
- `health_status` (TEXT)
- `recommendations` (JSONB)
- `raiz_reference` (TEXT)

---

### Fase 9 — Deteção de Espécies Invasoras

**Implementado:**

#### Invasoras identificáveis (7 espécies)
| Espécie | Nome Comum | Sintomas Visuais |
|---|---|---|
| Acacia dealbata | Mimosa | Folhagem verde-azulada bipinada, flores amarelas em cachos |
| Acacia melanoxylon | Acácia-de-flor-branca | Folhas lanceoladas largas, casca cinzenta rugosa |
| Acacia longifolia | Acácia-de-espigas | Folhas estreitas brilhantes, flores em espigas |
| Hakea sericea | Hakea espinhosa | Folhas em agulha rígidas, flores brancas |
| Hakea salicifolia | Hakea salgueiro | Folhas lanceoladas, flores brancas em cachos |
| Pittosporum undulatum | Incenseiro | Folhas onduladas brilhantes, frutos laranja |
| Robinia pseudoacacia | Falsa-acácia | Folhas pinadas, flores brancas pendentes |

#### `MapView.tsx` — Pins diferenciados
- 🟣 **Pin roxo com ✕** — Invasora ativa (por remover)
- ⚫ **Pin cinza com ✓** — Invasora removida (já tratada)
- Popup roxo com "⚠ Ver Invasora →"
- Overlay roxo semi-transparente na miniatura da foto

#### `HistoryView.tsx` — Gestão de Invasoras
- Badge `⚠ INVASORA` roxo nos cartões
- Badge `✅ Removida` cinza para as já tratadas
- **Botão Trash** (roxo) para o técnico marcar como removida sem apagar o registo
- `onMarkRemoved(id)` persiste `removed_at` no Supabase

#### `migration_invasoras.sql`
```sql
ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS is_invasive      BOOLEAN   DEFAULT FALSE;
ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS invasive_species TEXT;
ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS removed_at       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_scan_history_invasoras
  ON public.scan_history (is_invasive, removed_at)
  WHERE is_invasive = TRUE;
```

---

### Fase 10 — Onboarding RAIZ

**Implementado:**
- Modal de boas-vindas apresentado apenas na **primeira sessão após login**
- Controlado por `localStorage` (`planteye_raiz_onboarding_seen`)
- Conteúdo: apresentação do RAIZ, programa e-globulus, 4 capacidades da app
- Botões: "e-globulus.pt" (link externo) e "Começar Diagnóstico →"

---

## Base de Dados

### Tabela `scan_history` (Supabase)

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK) | Utilizador Supabase Auth |
| `analysis_id` | INTEGER | ID sequencial (#001…) |
| `timestamp` | BIGINT | Unix timestamp (ms) |
| `image_url` | TEXT | URL da imagem no Supabase Storage |
| `species` | TEXT | Espécie identificada |
| `status` | TEXT | HEALTHY / THIRSTY / SICK / UNKNOWN (legado) |
| `recommendation` | TEXT | Recomendação (legado) |
| `summary` | TEXT | Observação técnica |
| `confidence` | FLOAT | Confiança do modelo [0–1] |
| `light_level` | TEXT | LOW / ADEQUATE / HIGH |
| `latitude` | DOUBLE PRECISION | GPS |
| `longitude` | DOUBLE PRECISION | GPS |
| `health_status` | TEXT | Saudável / Em Stress / Doente / Crítico |
| `threat_detected` | TEXT | Tipo de ameaça RAIZ |
| `severity_level` | INTEGER | 0–3 (escala BIOND) |
| `forestry_risk` | TEXT | Baixo / Médio / Alto |
| `recommendations` | JSONB | Array de recomendações |
| `raiz_reference` | TEXT | Referência científica |
| `is_invasive` | BOOLEAN | true se espécie invasora |
| `invasive_species` | TEXT | Nome científico da invasora |
| `removed_at` | TIMESTAMPTZ | Quando foi marcada como removida |

**Row Level Security (RLS):** cada utilizador só vê e edita os seus próprios registos.

---

## Scripts SQL

Correr **por esta ordem** no SQL Editor do Supabase:

```
1. schema.sql                  → Cria tabela base scan_history com RLS
2. migration_scan_history.sql  → Adiciona analysis_id, latitude, longitude
3. migration_raiz.sql          → Adiciona campos silvícolas RAIZ
4. migration_invasoras.sql     → Adiciona is_invasive, invasive_species, removed_at
```

Todos os scripts são **idempotentes** (`IF NOT EXISTS`).

---

## Variáveis de Ambiente

```env
# .env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...

# Pool de chaves Gemini (rotação automática)
VITE_GEMINI_API_KEY_1=AIzaSy...
VITE_GEMINI_API_KEY_2=AIzaSy...   # opcional
VITE_GEMINI_API_KEY_3=AIzaSy...   # opcional
```

---

## Funcionalidades Completas

| # | Funcionalidade | Estado |
|---|---|---|
| 1 | Diagnóstico por imagem (câmara) | ✅ |
| 2 | Modo ao vivo (WebSocket Gemini) | ✅ |
| 3 | Diagnóstico especializado em Eucalyptus globulus | ✅ |
| 4 | Deteção de 4 ameaças silvícolas (Gonipterus, Phoracantha, Mycosphaerella, Deficiências) | ✅ |
| 5 | Escala de severidade RAIZ/BIOND (0–3) | ✅ |
| 6 | Deteção de 7 espécies invasoras com instrução de remoção | ✅ |
| 7 | Marcação de invasoras como "Removida" pelo técnico | ✅ |
| 8 | Geolocalização GPS por análise | ✅ |
| 9 | Mapa interativo com pins diferenciados (eucalipto / invasora / removida) | ✅ |
| 10 | Histórico completo com filtros por status e data | ✅ |
| 11 | Persistência online (Supabase) | ✅ |
| 12 | Persistência offline (IndexedDB) | ✅ |
| 13 | Sincronização automática offline→online | ✅ |
| 14 | PWA instalável com cache de tiles do mapa | ✅ |
| 15 | Rotação automática de chaves API Gemini | ✅ |
| 16 | Exportação de relatórios PDF | ✅ |
| 17 | Dashboard de estatísticas | ✅ |
| 18 | Feedback de voz (TTS) | ✅ |
| 19 | Autenticação (login / registo) | ✅ |
| 20 | Internacionalização PT / EN | ✅ |
| 21 | Onboarding RAIZ na primeira visita | ✅ |
| 22 | ID sequencial por análise (#001, #002…) | ✅ |
