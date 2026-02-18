CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_name TEXT,
  about TEXT,
  address TEXT,
  company_logo_url TEXT,
  company_rating DOUBLE PRECISION,
  reviews JSONB,
  subscription JSONB,
  price_per_hour DOUBLE PRECISION,
  unavailable_dates JSONB,
  certifications JSONB,
  experience_years INTEGER,
  photo_url TEXT,
  bsb TEXT,
  account_number TEXT,
  is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  disabled_at BIGINT,
  password_hash TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  from_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  to_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_typing (
  from_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  to_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (from_email, to_email)
);

CREATE TABLE IF NOT EXISTS chat_thread_reads (
  email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  peer_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  last_read_at BIGINT NOT NULL,
  PRIMARY KEY (email, peer_email)
);

CREATE TABLE IF NOT EXISTS chat_thread_closures (
  email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  peer_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  closed_at BIGINT NOT NULL,
  PRIMARY KEY (email, peer_email)
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  builder_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  builder_company_name TEXT NOT NULL,
  builder_logo_url TEXT,
  labourer_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  labourer_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  hours DOUBLE PRECISION NOT NULL,
  rate DOUBLE PRECISION NOT NULL,
  estimated_hours DOUBLE PRECISION NOT NULL,
  site_address TEXT NOT NULL,
  notes TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  labourer_signature TEXT,
  labourer_responded_at BIGINT,
  completed_at BIGINT,
  labourer_company_rating INTEGER,
  pdf_content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_push_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  offer_id TEXT UNIQUE NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  builder_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  labourer_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  builder_company_name TEXT NOT NULL,
  labourer_name TEXT NOT NULL,
  labourer_bsb TEXT,
  labourer_account_number TEXT,
  amount_owed DOUBLE PRECISION NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL,
  receipt_content TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  paid_at BIGINT
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  used_at BIGINT,
  created_at BIGINT NOT NULL
);
