-- ═══════════════════════════════════════════════════════════════
-- PlantEye — Migração: Espécies Invasoras
-- Corre NO Supabase SQL Editor APÓS os scripts anteriores.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Colunas de invasoras ───────────────────────────────────

-- Indica se é espécie invasora (a remover)
ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS is_invasive BOOLEAN DEFAULT FALSE;

-- Nome científico da invasora detetada
ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS invasive_species TEXT;

-- Quando o técnico marcou como removida (NULL = por remover)
ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

-- ── 2. Índice para filtrar invasoras pendentes de remoção ─────
CREATE INDEX IF NOT EXISTS idx_scan_history_invasoras
  ON public.scan_history (is_invasive, removed_at)
  WHERE is_invasive = TRUE;

-- ── 3. Verificar resultado ────────────────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'scan_history'
  AND column_name  IN ('is_invasive', 'invasive_species', 'removed_at')
ORDER BY column_name;

-- Deves ver 3 linhas:
-- invasive_species | text                        | YES
-- is_invasive      | boolean                     | YES
-- removed_at       | timestamp with time zone    | YES
