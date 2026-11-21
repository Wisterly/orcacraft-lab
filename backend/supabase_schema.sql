-- OrçaCraft.lab — Schema Relacional PostgreSQL / Supabase
-- Modelagem relacional suportando demandas fechadas e modulares
-- (demand_groups, demand_subitems, subitem_services, contracts, contract_price_items, generated_budgets)

-- 1. Demandas / Grupos de Escopo
CREATE TABLE IF NOT EXISTS demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL DEFAULT 'PACKAGE', -- 'PACKAGE' (Pacote Fechado) ou 'MODULAR' (Personalizável)
  title VARCHAR(180) NOT NULL,
  subtitle VARCHAR(255) NOT NULL,
  icon_name VARCHAR(50) NOT NULL DEFAULT 'Building2',
  base_unit VARCHAR(10) NOT NULL DEFAULT 'UN',
  default_area_m2 NUMERIC(12, 2) DEFAULT 48.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Itens de Pacotes Fechados
CREATE TABLE IF NOT EXISTS demand_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
  code VARCHAR(60) NOT NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'SINAPI',
  description TEXT NOT NULL,
  unit VARCHAR(15) NOT NULL,
  base_coef NUMERIC(14, 4) NOT NULL,
  estimated_unit_price NUMERIC(14, 2) NOT NULL,
  wbs_stage VARCHAR(40) NOT NULL,
  chrono_group VARCHAR(40) NOT NULL
);

-- 3. Sub-itens / Ambientes de Construtores Modulares
CREATE TABLE IF NOT EXISTS demand_subitems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  unit VARCHAR(10) NOT NULL DEFAULT 'un', -- 'un', 'm²', 'm'
  default_qty NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Serviços Unitários que compõem 1 unidade de cada Sub-item / Ambiente
CREATE TABLE IF NOT EXISTS subitem_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subitem_id UUID NOT NULL REFERENCES demand_subitems(id) ON DELETE CASCADE,
  code VARCHAR(60) NOT NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'SINAPI',
  description TEXT NOT NULL,
  unit VARCHAR(15) NOT NULL,
  base_coef NUMERIC(14, 4) NOT NULL,
  estimated_unit_price NUMERIC(14, 2) NOT NULL,
  wbs_stage VARCHAR(40) NOT NULL,
  chrono_group VARCHAR(40) NOT NULL
);

-- 5. Contratos e Atas de Registro de Preços
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(220) NOT NULL,
  ata_number VARCHAR(80) NOT NULL,
  agency VARCHAR(180) NOT NULL,
  bdi_percent NUMERIC(6, 2) NOT NULL DEFAULT 24.80,
  tax_regime VARCHAR(30) NOT NULL DEFAULT 'DESONERADO',
  template_storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabela de Preços Oficiais Contratuais (para cruzamento INNER/LEFT JOIN)
CREATE TABLE IF NOT EXISTS contract_price_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  code VARCHAR(60) NOT NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'SINAPI',
  description TEXT NOT NULL,
  unit VARCHAR(15) NOT NULL,
  unit_price NUMERIC(14, 2) NOT NULL,
  UNIQUE(contract_id, code)
);

-- 7. Orçamentos Paramétricos Homologados / Gerados
CREATE TABLE IF NOT EXISTS generated_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_title VARCHAR(255) NOT NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  total_area_m2 NUMERIC(12, 2) NOT NULL,
  total_value_truncated NUMERIC(16, 2) NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
