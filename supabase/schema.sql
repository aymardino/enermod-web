-- EnerMod Africa hub: PostgreSQL schema (generated from apps/api/enermod_api/models.py).
-- The API creates these tables itself at start-up (Base.metadata.create_all); run this file
-- only if you prefer to create them by hand in the Supabase SQL editor first.

CREATE TABLE chat_logs (
	id SERIAL NOT NULL, 
	question TEXT NOT NULL, 
	answer TEXT NOT NULL, 
	provider VARCHAR(20) NOT NULL, 
	model VARCHAR(80) NOT NULL, 
	locale VARCHAR(8) NOT NULL, 
	citations JSON NOT NULL, 
	ok BOOLEAN NOT NULL, 
	duration_ms INTEGER NOT NULL, 
	input_tokens INTEGER NOT NULL, 
	output_tokens INTEGER NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);
CREATE INDEX ix_chat_logs_created_at ON chat_logs (created_at);

CREATE TABLE countries (
	iso_code VARCHAR(2) NOT NULL, 
	iso3 VARCHAR(3) NOT NULL, 
	country_name VARCHAR(120) NOT NULL, 
	power_pool VARCHAR(40) NOT NULL, 
	region VARCHAR(20) NOT NULL, 
	language VARCHAR(20) NOT NULL, 
	nb_models_applied INTEGER NOT NULL, 
	energy_governance VARCHAR(20) NOT NULL, 
	rise_governance_score FLOAT, 
	data_availability VARCHAR(20) NOT NULL, 
	data_transparency_score FLOAT, 
	electrification_rate FLOAT, 
	electrification_year INTEGER, 
	has_ndc VARCHAR(5) NOT NULL, 
	has_lts VARCHAR(5) NOT NULL, 
	PRIMARY KEY (iso_code)
);

CREATE TABLE discovery_runs (
	id VARCHAR(36) NOT NULL, 
	mode VARCHAR(20) NOT NULL, 
	since_date VARCHAR(10) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	n_fetched INTEGER NOT NULL, 
	n_new INTEGER NOT NULL, 
	n_known INTEGER NOT NULL, 
	n_queries INTEGER NOT NULL, 
	error TEXT NOT NULL, 
	started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	finished_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE TABLE events (
	id SERIAL NOT NULL, 
	kind VARCHAR(30) NOT NULL, 
	path VARCHAR(300) NOT NULL, 
	ref VARCHAR(200) NOT NULL, 
	locale VARCHAR(8) NOT NULL, 
	visitor VARCHAR(32) NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);
CREATE INDEX ix_events_kind ON events (kind);
CREATE INDEX ix_events_created_at ON events (created_at);
CREATE INDEX ix_events_kind_created ON events (kind, created_at);

CREATE TABLE login_tokens (
	id VARCHAR(36) NOT NULL, 
	email VARCHAR(320) NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	used_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);
CREATE UNIQUE INDEX ix_login_tokens_token_hash ON login_tokens (token_hash);
CREATE INDEX ix_login_tokens_email ON login_tokens (email);

CREATE TABLE power_pools (
	pool_code VARCHAR(20) NOT NULL, 
	pool_name VARCHAR(120) NOT NULL, 
	member_countries TEXT NOT NULL, 
	nb_models_applied INTEGER NOT NULL, 
	PRIMARY KEY (pool_code)
);

CREATE TABLE settings (
	key VARCHAR(80) NOT NULL, 
	value JSON NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (key), 
	UNIQUE (key)
);

CREATE TABLE studies (
	study_id SERIAL NOT NULL, 
	authors TEXT NOT NULL, 
	model_name TEXT NOT NULL, 
	extraction_level VARCHAR(20) NOT NULL, 
	study_category TEXT NOT NULL, 
	year INTEGER, 
	study_type VARCHAR(60) NOT NULL, 
	scale VARCHAR(40) NOT NULL, 
	nb_countries_covered VARCHAR(20) NOT NULL, 
	study_objective TEXT NOT NULL, 
	key_result TEXT NOT NULL, 
	time_horizon VARCHAR(60) NOT NULL, 
	time_horizon_start VARCHAR(20) NOT NULL, 
	time_horizon_end VARCHAR(20) NOT NULL, 
	approach VARCHAR(40) NOT NULL, 
	method VARCHAR(80) NOT NULL, 
	mathematical_approach TEXT NOT NULL, 
	hydro VARCHAR(10) NOT NULL, 
	solar VARCHAR(10) NOT NULL, 
	wind VARCHAR(10) NOT NULL, 
	biomass VARCHAR(10) NOT NULL, 
	nuclear VARCHAR(10) NOT NULL, 
	geothermal VARCHAR(10) NOT NULL, 
	fossil VARCHAR(10) NOT NULL, 
	h2 VARCHAR(10) NOT NULL, 
	coal VARCHAR(10) NOT NULL, 
	other_technologies TEXT NOT NULL, 
	sector VARCHAR(80) NOT NULL, 
	open_source VARCHAR(20) NOT NULL, 
	data_requirements TEXT NOT NULL, 
	sdg_7 VARCHAR(10) NOT NULL, 
	sdg_13 VARCHAR(10) NOT NULL, 
	ndc_mention VARCHAR(10) NOT NULL, 
	agenda_2063 VARCHAR(10) NOT NULL, 
	aisesa_theme TEXT NOT NULL, 
	informal_economy VARCHAR(10) NOT NULL, 
	biomass_charcoal VARCHAR(10) NOT NULL, 
	clean_cooking VARCHAR(10) NOT NULL, 
	power_reliability VARCHAR(10) NOT NULL, 
	urbanization VARCHAR(10) NOT NULL, 
	strengths TEXT NOT NULL, 
	weaknesses TEXT NOT NULL, 
	authors_affiliation TEXT NOT NULL, 
	author_origin TEXT NOT NULL, 
	local_ownership VARCHAR(10) NOT NULL, 
	institutional_users TEXT NOT NULL, 
	grey_literature VARCHAR(10) NOT NULL, 
	cost_of_capital TEXT NOT NULL, 
	coc_min FLOAT, 
	coc_max FLOAT, 
	coc_type VARCHAR(20) NOT NULL, 
	financing_modelling VARCHAR(10) NOT NULL, 
	financing_mechanism TEXT NOT NULL, 
	full_title TEXT NOT NULL, 
	link_doi TEXT NOT NULL, 
	contact TEXT NOT NULL, 
	other_references TEXT NOT NULL, 
	doi VARCHAR(300) NOT NULL, 
	source VARCHAR(20) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (study_id)
);
CREATE INDEX ix_studies_doi ON studies (doi);
CREATE INDEX ix_studies_status ON studies (status);
CREATE INDEX ix_studies_year ON studies (year);

CREATE TABLE tool_metrics (
	id SERIAL NOT NULL, 
	tool_name VARCHAR(120) NOT NULL, 
	repo_url TEXT NOT NULL, 
	stars INTEGER, 
	forks INTEGER, 
	open_issues INTEGER, 
	contributors INTEGER, 
	last_commit_at TIMESTAMP WITHOUT TIME ZONE, 
	repo_license VARCHAR(80) NOT NULL, 
	language VARCHAR(60) NOT NULL, 
	archived BOOLEAN NOT NULL, 
	fetched_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	error TEXT NOT NULL, 
	PRIMARY KEY (id)
);
CREATE INDEX ix_tool_metrics_fetched_at ON tool_metrics (fetched_at);
CREATE INDEX ix_tool_metrics_tool_name ON tool_metrics (tool_name);

CREATE TABLE tools (
	tool_name VARCHAR(120) NOT NULL, 
	full_name TEXT NOT NULL, 
	type VARCHAR(60) NOT NULL, 
	origin_country VARCHAR(60) NOT NULL, 
	origin_institution TEXT NOT NULL, 
	license VARCHAR(40) NOT NULL, 
	cost_usd VARCHAR(60) NOT NULL, 
	free_for_developing VARCHAR(20) NOT NULL, 
	learning_curve VARCHAR(20) NOT NULL, 
	doc_quality VARCHAR(20) NOT NULL, 
	training_available VARCHAR(20) NOT NULL, 
	community VARCHAR(20) NOT NULL, 
	programming_required VARCHAR(20) NOT NULL, 
	helpdesk VARCHAR(20) NOT NULL, 
	os VARCHAR(60) NOT NULL, 
	nb_studies_in_inventory INTEGER NOT NULL, 
	best_for TEXT NOT NULL, 
	clean_cooking_capable VARCHAR(20) NOT NULL, 
	financing_modelling VARCHAR(20) NOT NULL, 
	time_horizon VARCHAR(80) NOT NULL, 
	scale VARCHAR(120) NOT NULL, 
	data_intensity VARCHAR(20) NOT NULL, 
	proprietary_dependency TEXT NOT NULL, 
	info_source TEXT NOT NULL, 
	info_date VARCHAR(40) NOT NULL, 
	strengths TEXT NOT NULL, 
	weaknesses TEXT NOT NULL, 
	typical_results TEXT NOT NULL, 
	often_linked TEXT NOT NULL, 
	repo_url TEXT NOT NULL, 
	website_url TEXT NOT NULL, 
	tracker_url TEXT NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (tool_name)
);

CREATE TABLE users (
	id VARCHAR(36) NOT NULL, 
	email VARCHAR(320) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	organisation VARCHAR(300) NOT NULL, 
	password_hash VARCHAR(300), 
	locale VARCHAR(8) NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	email_verified_at TIMESTAMP WITHOUT TIME ZONE, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	last_login_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);
CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE TABLE candidates (
	id SERIAL NOT NULL, 
	run_id VARCHAR(36), 
	openalex_id VARCHAR(60) NOT NULL, 
	doi VARCHAR(300) NOT NULL, 
	title TEXT NOT NULL, 
	abstract TEXT NOT NULL, 
	authors TEXT NOT NULL, 
	year INTEGER, 
	venue TEXT NOT NULL, 
	url TEXT NOT NULL, 
	oa_url TEXT NOT NULL, 
	cited_by INTEGER NOT NULL, 
	work_type VARCHAR(40) NOT NULL, 
	language VARCHAR(10) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	match_study_id INTEGER, 
	match_score FLOAT, 
	relevance INTEGER, 
	signals TEXT NOT NULL DEFAULT '', 
	note TEXT NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(run_id) REFERENCES discovery_runs (id) ON DELETE SET NULL
);
CREATE INDEX ix_candidates_status ON candidates (status);
CREATE UNIQUE INDEX ix_candidates_openalex_id ON candidates (openalex_id);
CREATE INDEX ix_candidates_doi ON candidates (doi);

CREATE TABLE contributions (
	id VARCHAR(36) NOT NULL, 
	kind VARCHAR(20) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	source VARCHAR(20) NOT NULL, 
	payload JSON NOT NULL, 
	message TEXT NOT NULL, 
	submitter_name VARCHAR(200) NOT NULL, 
	submitter_email VARCHAR(320) NOT NULL, 
	submitter_org VARCHAR(300) NOT NULL, 
	user_id VARCHAR(36), 
	target_study_id INTEGER, 
	target_tool_name VARCHAR(120) NOT NULL, 
	match_study_id INTEGER, 
	match_note VARCHAR(200) NOT NULL, 
	created_study_id INTEGER, 
	reviewed_by VARCHAR(36), 
	reviewed_at TIMESTAMP WITHOUT TIME ZONE, 
	review_note TEXT NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(reviewed_by) REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX ix_contributions_status ON contributions (status);
CREATE INDEX ix_contributions_kind ON contributions (kind);
CREATE INDEX ix_contributions_created_at ON contributions (created_at);

CREATE TABLE jobs (
	id VARCHAR(36) NOT NULL, 
	kind VARCHAR(40) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	payload JSON NOT NULL, 
	result JSON NOT NULL, 
	error TEXT NOT NULL, 
	user_id VARCHAR(36), 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	started_at TIMESTAMP WITHOUT TIME ZONE, 
	finished_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX ix_jobs_status ON jobs (status);

CREATE TABLE sessions (
	id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	user_agent VARCHAR(300) NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX ix_sessions_token_hash ON sessions (token_hash);
CREATE INDEX ix_sessions_user_id ON sessions (user_id);

CREATE TABLE study_countries (
	study_id INTEGER NOT NULL, 
	iso_code VARCHAR(2) NOT NULL, 
	iso3 VARCHAR(3) NOT NULL, 
	country VARCHAR(120) NOT NULL, 
	PRIMARY KEY (study_id, iso_code), 
	FOREIGN KEY(study_id) REFERENCES studies (study_id) ON DELETE CASCADE
);

CREATE TABLE study_pools (
	study_id INTEGER NOT NULL, 
	pool_code VARCHAR(20) NOT NULL, 
	PRIMARY KEY (study_id, pool_code), 
	FOREIGN KEY(study_id) REFERENCES studies (study_id) ON DELETE CASCADE
);

CREATE TABLE study_tools (
	study_id INTEGER NOT NULL, 
	tool_name VARCHAR(120) NOT NULL, 
	type VARCHAR(60) NOT NULL, 
	PRIMARY KEY (study_id, tool_name), 
	FOREIGN KEY(study_id) REFERENCES studies (study_id) ON DELETE CASCADE
);

-- Row Level Security (optional). The API connects with the database role and bypasses RLS;
-- enabling RLS with no policy keeps the tables invisible to the anon/authenticated roles of
-- Supabase's auto-generated REST API (PostgREST), which this project does not use.

ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_tools ENABLE ROW LEVEL SECURITY;

-- Public read access through PostgREST for the open data, should you want it:
-- CREATE POLICY "public read" ON studies FOR SELECT USING (status = 'published');
-- CREATE POLICY "public read" ON tools FOR SELECT USING (true);
-- CREATE POLICY "public read" ON countries FOR SELECT USING (true);
