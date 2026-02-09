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
  occupation TEXT,
  price_per_hour DOUBLE PRECISION,
  available_dates JSONB,
  certifications JSONB,
  experience_years INTEGER,
  photo_url TEXT,
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
  pdf_content TEXT NOT NULL
);
