# 🌲 PlantEyeAI — Sistema de Diagnóstico Silvícola

> Ferramenta profissional de diagnóstico florestal por IA para técnicos de campo, especializada em *Eucalyptus globulus* e deteção de espécies invasoras. Desenvolvida com base no corpus científico do **RAIZ – Instituto de Investigação da Floresta e Papel** (Aveiro, Portugal).

![Status](https://img.shields.io/badge/Status-Produção-brightgreen)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC?logo=tailwind-css)
![Gemini](https://img.shields.io/badge/AI-Gemini_2.5_Flash-orange?logo=google)
![Supabase](https://img.shields.io/badge/DB-Supabase-3ECF8E?logo=supabase)
![PWA](https://img.shields.io/badge/PWA-Offline_Ready-5A0FC8?logo=pwa)

---

## ✨ Funcionalidades

### 🔬 Diagnóstico por IA (Base Científica RAIZ)

O sistema distingue automaticamente **3 cenários**:

| Cenário | Resultado |
|---|---|
| 🟢 **Eucalipto saudável** | Painel verde com estado fitossanitário e recomendações de manutenção |
| 🔴 **Eucalipto com praga/doença** | Painel com ameaça identificada, escala de severidade RAIZ/BIOND (0–3) e ações prioritárias |
| 🟣 **Espécie invasora** | Painel de alerta vermelho com nome científico e instrução "REMOVER IMEDIATAMENTE" |

**Ameaças silvícolas diagnosticadas:**
- 🐛 **Gonipterus platensis** — posturas, folhas roídas, desfolha nos ápices
- 🪵 **Phoracantha spp.** — copa seca top-down, exsudações, serrim na base
- 🍂 **Mycosphaerella** — manchas foliares castanhas/negras com halo
- 🌿 **Deficiências N/K/Mg** — avermelhamento, necrose marginal, clorose internerval

**Invasoras identificadas (7 espécies):**
Acacia dealbata, A. melanoxylon, A. longifolia, Hakea sericea, H. salicifolia, Pittosporum undulatum, Robinia pseudoacacia

**Escala de Severidade RAIZ/BIOND:** `0=sem sinais | 1=11–25% | 2=26–50% | 3=>50%`

---

### 📸 Modos de Captura

| Modo | Descrição |
|---|---|
| **Câmara** | Captura imagem + análise instantânea por Gemini 2.5 Flash Vision |
| **Direto (Live)** | Stream ao vivo via WebSocket com Gemini multimodal (áudio + vídeo) |

---

### 🗺️ Mapa de Campo

- **Pins coloridos** por estado: 🟢 Saudável · 🟡 Em Stress · 🔴 Doente · 🟣 Invasora · ⚫ Removida
- Cada análise com GPS regista automaticamente um pin
- Interface otimizada (full-screen mobile) sem conflitos de scroll (touch-action)
- Popup com foto, espécie, data e botão de abertura do relatório
- Baseado em **Leaflet.js + OpenStreetMap** (tiles em cache offline)

---

### 📋 Histórico e Gestão

- ID sequencial por análise (`#001`, `#002`…)
- Filtros por status de saúde e período de tempo
- Suporte a **Diagnósticos Pendentes** (capturados offline) com botão "Analisar" quando volta a rede
- Badge roxo **⚠ INVASORA** com botão para o técnico **marcar como Removida**
- Badge **✅ Removida** após confirmação (registo mantido para auditoria)
- Exportação de relatório **PDF** individual ou consolidado

---

### 📡 Offline First (PWA)

- Funciona sem rede: capturas de imagem guardadas localmente (Base64) em IndexedDB
- Diagnósticos pendentes no histórico: permite ao técnico fazer "Analisar Agora" logo que retome sinal
- Sincronização automática para a base de dados central
- Tiles do mapa em cache (até 500 tiles, 30 dias)
- **App 100% responsiva (Mobile First)**: suporte a iOS safe-areas, ícones nativos PWA e atalhos de ecrã principal

---

### 🔒 Autenticação e Multi-utilizador

- Login / Registo via **Supabase Auth**
- Dados isolados por utilizador (Row Level Security)
- Histórico sincronizado entre dispositivos quando online

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript 5 |
| Build | Vite + vite-plugin-pwa |
| Estilização | Tailwind CSS 3 |
| IA — Diagnóstico | Google Gemini 2.5 Flash (Vision) |
| IA — Voz | Gemini 2.5 Flash TTS |
| IA — Live | Gemini 2.5 Flash Native Audio (WebSocket) |
| Base de Dados | Supabase (PostgreSQL) |
| Cache Offline | IndexedDB + Workbox |
| Mapas | Leaflet.js + OpenStreetMap |
| PDF | jsPDF |
| Deploy | Vercel |

---

## 🚀 Instalação

### Pré-requisitos

- Node.js ≥ 18
- Conta [Supabase](https://supabase.com) com projeto criado
- Chave API [Google AI Studio](https://aistudio.google.com) (Gemini)

### Setup

```bash
# 1. Clonar
git clone https://github.com/joaopeccanha18/PlantEyeAI
cd PlantEyeAI

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# editar .env com as tuas chaves

# 4. Iniciar dev server
npm run dev
```

### Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...

# Pool de chaves Gemini (rotação automática em caso de quota esgotada)
VITE_GEMINI_API_KEY_1=AIzaSy...
VITE_GEMINI_API_KEY_2=AIzaSy...   # opcional — backup
VITE_GEMINI_API_KEY_3=AIzaSy...   # opcional — backup
```

### Base de Dados (Supabase)

Corre estes scripts **pela ordem indicada** no SQL Editor do Supabase:

```
1. schema.sql                   → Estrutura base + RLS
2. migration_scan_history.sql   → GPS + IDs sequenciais
3. migration_raiz.sql           → Campos silvícolas RAIZ
4. migration_invasoras.sql      → Deteção e gestão de invasoras
```

---

## 🏗️ Estrutura do Projeto

```
PlantEyeAI/
├── App.tsx                     # Raiz, tabs, orquestração global
├── types.ts                    # Tipos: EucalyptusAnalysis, ThreatType, HistoryItem…
├── vite.config.ts              # Vite + PWA + Workbox cache
│
├── components/
│   ├── PlantScanner.tsx        # Câmara + captura + análise
│   ├── LiveAssistant.tsx       # Modo ao vivo (WebSocket Gemini)
│   ├── AnalysisResultView.tsx  # Painel de resultados (eucalipto + invasora)
│   ├── HistoryView.tsx         # Histórico + filtros + gestão invasoras
│   ├── MapView.tsx             # Mapa Leaflet com pins diferenciados
│   ├── estatistica.tsx         # Dashboard de estatísticas
│   ├── PDFReport.ts            # Exportação PDF
│   ├── AuthModal.tsx           # Login / Registo
│   ├── QuotaAlert.tsx          # Alertas de quota Gemini
│   └── SettingsModal.tsx       # Configurações + i18n (pt/en)
│
├── services/
│   ├── gemini.ts               # Prompt RAIZ + invasoras + API calls
│   ├── keyManager.ts           # Rotação automática de chaves API
│   ├── offlineDB.ts            # IndexedDB (offline)
│   └── syncService.ts          # Sync offline→Supabase
│
└── hooks/
    ├── useHistory.ts           # CRUD histórico + markInvasiveRemoved
    ├── useAuth.ts              # Sessão Supabase
    ├── useOfflineSync.ts       # Estado da rede
    └── useQuotaAlert.ts        # Gestão de erros de quota
```

---

## 🔬 Base Científica

Este projeto é desenvolvido com base no corpus científico do **RAIZ – Instituto de Investigação da Floresta e Papel**, o maior repositório mundial de conhecimento sobre *Eucalyptus globulus*.

- 🌐 [raiz-iifp.pt](https://raiz-iifp.pt)
- 🌐 [e-globulus.pt](https://e-globulus.pt) *(Projeto e-globulus — Compete 2020)*

---

## 📝 Licença

MIT — sente-te livre para usar e modificar.

---

*Feito com RedBull, muito código e base científica do RAIZ.*
