-- ═══════════════════════════════════════════════════════════════
-- PlantEye — Migração: adicionar colunas à tabela scan_history
-- Corre este script no SQL Editor do teu projecto Supabase.
-- É seguro correr múltiplas vezes (todos os comandos são idempotentes).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Adicionar ID sequencial da análise ─────────────────────
-- Número crescente exibido ao utilizador como #001, #002…
ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS analysis_id INTEGER;

-- ── 2. Adicionar coordenadas GPS ──────────────────────────────
-- Guardadas como FLOAT simples para leitura rápida pelo Leaflet.
-- (A tabela `diagnosticos` já usa PostGIS geometry; aqui usamos
--  FLOAT para simplicidade no scan_history do frontend.)
ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION;

ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- ── 3. Índices para performance ──────────────────────────────
-- Índice no analysis_id para ordenação e pesquisa rápida
CREATE INDEX IF NOT EXISTS idx_scan_history_analysis_id
  ON public.scan_history (analysis_id);

-- Índice nas coordenadas para queries de mapa
CREATE INDEX IF NOT EXISTS idx_scan_history_coords
  ON public.scan_history (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ── 4. Verificar o resultado ─────────────────────────────────
-- Corre esta query para confirmar que as colunas foram criadas:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'scan_history'
  AND column_name  IN ('analysis_id', 'latitude', 'longitude')
ORDER BY column_name;

-- Deves ver 3 linhas:
-- analysis_id | integer          | YES
-- latitude    | double precision | YES
-- longitude   | double precision | YES
