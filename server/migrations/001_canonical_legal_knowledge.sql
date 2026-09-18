-- ==============================================================================
-- JURISFLOW LEGALTECH - MIGRAÇÃO 001: REPOSITÓRIO CANÔNICO DE JURISPRUDÊNCIA E PRECEDENTES
-- Data: 2026-09-18
-- Objetivo: Armazenamento normalizado, imutável por hash SHA-256 e auditável
-- ==============================================================================

-- 1. Registro de Fontes Oficiais (Legal Source Registry)
CREATE TABLE IF NOT EXISTS legal_sources (
    source_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    court_code VARCHAR(32) NOT NULL,
    jurisdiction VARCHAR(64) NOT NULL,
    source_type VARCHAR(64) NOT NULL, -- OFFICIAL_API, OFFICIAL_OPEN_DATA, MANUAL_VERIFICATION_ONLY
    official_base_url TEXT NOT NULL,
    documentation_url TEXT NOT NULL,
    connector_status VARCHAR(32) NOT NULL DEFAULT 'READY',
    coverage_status TEXT,
    verification_method VARCHAR(64) NOT NULL,
    terms_status VARCHAR(64) NOT NULL,
    last_successful_sync_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    last_error_message TEXT,
    documents_discovered INTEGER DEFAULT 0,
    documents_validated INTEGER DEFAULT 0,
    documents_rejected INTEGER DEFAULT 0,
    checksum VARCHAR(64),
    latency_ms INTEGER,
    enabled BOOLEAN DEFAULT TRUE,
    requires_credential BOOLEAN DEFAULT FALSE,
    credential_configured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Decisões Canônicas e Acórdãos Oficiais (Legal Decision)
CREATE TABLE IF NOT EXISTS legal_decisions (
    id VARCHAR(64) PRIMARY KEY, -- Hash determinístico do conteúdo ou UUID
    tenant_id UUID NULL,        -- NULL para acervo público nacional; preenchido se precedente privado do escritório
    source_id VARCHAR(64) NOT NULL REFERENCES legal_sources(source_id),
    official_url TEXT NOT NULL,
    full_text_url TEXT,
    court VARCHAR(255) NOT NULL,
    court_code VARCHAR(32) NOT NULL,
    judicial_branch VARCHAR(64) NOT NULL,
    jurisdiction VARCHAR(64) NOT NULL,
    court_organ VARCHAR(255),
    process_class VARCHAR(128) NOT NULL,
    raw_case_number VARCHAR(128) NOT NULL,
    normalized_cnj_number VARCHAR(32), -- Formato NNNNNNN-DD.AAAA.J.TR.OOOO
    rapporteur VARCHAR(255) NOT NULL,
    judgment_date DATE,
    publication_date DATE,
    official_headnote TEXT NOT NULL,
    ruling_thesis TEXT,
    cited_legislation JSONB DEFAULT '[]'::jsonb,
    cited_precedents JSONB DEFAULT '[]'::jsonb,
    document_type VARCHAR(64) NOT NULL,
    precedent_situation VARCHAR(32) NOT NULL DEFAULT 'VIGENTE', -- VIGENTE, CANCELADO, SUPERADO
    precedent_strength VARCHAR(32) NOT NULL DEFAULT 'PERSUASIVO_SUPERIOR',
    theme_number INTEGER,
    content_sha256 VARCHAR(64) NOT NULL,
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    verification_status VARCHAR(64) NOT NULL DEFAULT 'VERIFIED_OFFICIAL',
    rejection_reasons JSONB DEFAULT '[]'::jsonb,
    parser_version VARCHAR(32) NOT NULL,
    document_version INTEGER DEFAULT 1,
    raw_payload_preserved JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_decisions_court ON legal_decisions(court_code);
CREATE INDEX IF NOT EXISTS idx_legal_decisions_cnj ON legal_decisions(normalized_cnj_number);
CREATE INDEX IF NOT EXISTS idx_legal_decisions_hash ON legal_decisions(content_sha256);
CREATE INDEX IF NOT EXISTS idx_legal_decisions_tenant ON legal_decisions(tenant_id);

-- 3. Precedentes Qualificados (Temas, Súmulas Vinculantes)
CREATE TABLE IF NOT EXISTS qualified_precedents (
    id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL REFERENCES legal_sources(source_id),
    court_code VARCHAR(32) NOT NULL,
    document_type VARCHAR(64) NOT NULL,
    number INTEGER NOT NULL,
    leading_cases JSONB DEFAULT '[]'::jsonb,
    title VARCHAR(255) NOT NULL,
    thesis TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'VIGENTE',
    judgment_date DATE,
    official_url TEXT NOT NULL,
    content_sha256 VARCHAR(64) NOT NULL,
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    verification_status VARCHAR(64) NOT NULL DEFAULT 'VERIFIED_OFFICIAL',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Metadados Processuais (DataJud Capa e Movimentações)
CREATE TABLE IF NOT EXISTS datajud_cases (
    normalized_cnj_number VARCHAR(32) PRIMARY KEY,
    raw_case_number VARCHAR(128) NOT NULL,
    court_code VARCHAR(32) NOT NULL,
    judicial_degree VARCHAR(16) NOT NULL,
    process_class_code INTEGER,
    process_class_name VARCHAR(255),
    subjects JSONB DEFAULT '[]'::jsonb,
    court_organ VARCHAR(255),
    distribution_date TIMESTAMPTZ,
    case_value NUMERIC(15,2),
    is_confidential BOOLEAN DEFAULT FALSE,
    last_movement_date TIMESTAMPTZ,
    collected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS datajud_movements (
    id VARCHAR(128) PRIMARY KEY,
    normalized_cnj_number VARCHAR(32) NOT NULL REFERENCES datajud_cases(normalized_cnj_number),
    movement_code INTEGER NOT NULL,
    movement_name VARCHAR(255) NOT NULL,
    movement_date TIMESTAMPTZ NOT NULL,
    complement TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Registro Auditável de Jobs de Sincronização Incremental
CREATE TABLE IF NOT EXISTS legal_sync_jobs (
    job_id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL REFERENCES legal_sources(source_id),
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    start_cursor TEXT,
    end_cursor TEXT,
    pages_queried INTEGER DEFAULT 0,
    documents_found INTEGER DEFAULT 0,
    documents_new INTEGER DEFAULT 0,
    documents_updated INTEGER DEFAULT 0,
    documents_unchanged INTEGER DEFAULT 0,
    documents_rejected INTEGER DEFAULT 0,
    documents_duplicates INTEGER DEFAULT 0,
    failures INTEGER DEFAULT 0,
    retries INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    bytes_transferred BIGINT DEFAULT 0,
    parser_version VARCHAR(32) NOT NULL,
    checksum VARCHAR(64),
    status VARCHAR(32) NOT NULL, -- QUEUED, RUNNING, SUCCESS, FAILED
    error_message TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
