-- ═══════════════════════════════════════════════════════════════
-- PlantEye — Migração RAIZ: colunas silvícolas em scan_history
-- Corre este script no SQL Editor do teu projecto Supabase
-- APÓS o script migration_scan_history.sql (se ainda não o fizeste).
-- É seguro correr múltiplas vezes (todos os comandos são idempotentes).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Colunas do sistema RAIZ ────────────────────────────────

-- Ameaça fitossanitária detetada
ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS threat_detected TEXT
  CHECK (threat_detected IN (
    'gonipterus','phoracantha','mycosphaerella',
    'deficiencia_N','deficiencia_K','deficiencia_Mg','nenhuma'
  ));

-- Nível de severidade escala RAIZ/BIOND (0-3)
ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS severity_level INTEGER
  CHECK (severity_level BETWEEN 0 AND 3);

-- Risco florestal estimado
ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS forestry_risk TEXT
  CHECK (forestry_risk IN ('Baixo','Médio','Alto'));

-- Referência científica RAIZ usada pelo modelo
ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS raiz_reference TEXT;

-- Estado de saúde (novo schema — substitui o status legado)
ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS health_status TEXT
  CHECK (health_status IN ('Saudável','Em Stress','Doente','Crítico'));

-- Recomendações como array JSON (o modelo devolve até 3 ações)
ALTER TABLE public.scan_history
  ADD COLUMN IF NOT EXISTS recommendations JSONB;

-- ── 2. Índices para queries silvícolas ────────────────────────

-- Filtrar por ameaça no mapa/histórico
CREATE INDEX IF NOT EXISTS idx_scan_history_threat
  ON public.scan_history (threat_detected)
  WHERE threat_detected IS NOT NULL;

-- Filtrar por severidade (para alertas de nível alto)
CREATE INDEX IF NOT EXISTS idx_scan_history_severity
  ON public.scan_history (severity_level)
  WHERE severity_level IS NOT NULL;

-- ── 3. Verificar resultado ────────────────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'scan_history'
  AND column_name  IN (
    'threat_detected','severity_level','forestry_risk',
    'raiz_reference','health_status','recommendations'
  )
ORDER BY column_name;

-- Deves ver 6 linhas com as novas colunas.
