const http = require("http");
const https = require("https");
const crypto = require("crypto");
const { URL } = require("url");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT || 4000);
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/labourlink";

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Content-Type": "application/json",
};

function now() {
  return Date.now();
}

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function makeId(prefix = "id") {
  return `${prefix}_${now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function makeThreadId(a, b) {
  return [normalizeEmail(a), normalizeEmail(b)].sort().join("__");
}

function defaultSubscription() {
  return {
    planName: "LabourLink Pro",
    status: "past_due",
    monthlyPrice: 50,
    renewalDate: null,
  };
}

function normalizeSubscription(input) {
  const fallback = defaultSubscription();
  if (!input || typeof input !== "object") return fallback;
  const status = String(input.status || fallback.status);
  const allowedStatus = new Set(["trial", "active", "past_due", "cancelled"]);
  return {
    planName: String(input.planName || fallback.planName),
    status: allowedStatus.has(status) ? status : fallback.status,
    monthlyPrice: Number.isFinite(Number(input.monthlyPrice))
      ? Number(input.monthlyPrice)
      : fallback.monthlyPrice,
    renewalDate: input.renewalDate ? String(input.renewalDate) : null,
  };
}

function isExpoPushToken(token) {
  return /^ExponentPushToken\[.+\]$/.test(token) || /^ExpoPushToken\[.+\]$/.test(token);
}

function sendExpoPushRequest(messages) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(messages);
    const req = https.request(
      "https://exp.host/--/api/v2/push/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode || 0, body: data });
        });
      }
    );

    req.on("error", () => resolve({ statusCode: 0, body: "" }));
    req.write(payload);
    req.end();
  });
}

async function sendPushToUser(email, title, body, data = {}) {
  const recipientEmail = normalizeEmail(email);
  const rowsRes = await pool.query(
    `SELECT token FROM user_push_tokens WHERE lower(email) = $1`,
    [recipientEmail]
  );

  const tokens = rowsRes.rows
    .map((r) => String(r.token || ""))
    .filter((t) => t && isExpoPushToken(t));

  if (!tokens.length) return;

  const chunks = [];
  for (let i = 0; i < tokens.length; i += 100) {
    chunks.push(tokens.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const messages = chunk.map((to) => ({
      to,
      sound: "default",
      title,
      body,
      data,
      priority: "high",
    }));
    const result = await sendExpoPushRequest(messages);
    if (!result.statusCode || result.statusCode >= 400) {
      // no-op: keep notification record even if push delivery failed
    }
  }
}

async function createNotification(recipientEmail, type, title, body, data = {}) {
  const normalizedRecipient = normalizeEmail(recipientEmail);
  await pool.query(
    `INSERT INTO notifications (
      id, recipient_email, type, title, body, data, is_read, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      makeId("notif"),
      normalizedRecipient,
      String(type || ""),
      String(title || ""),
      String(body || ""),
      JSON.stringify(data || {}),
      false,
      now(),
    ]
  );
  await sendPushToUser(normalizedRecipient, String(title || ""), String(body || ""), data);
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, CORS_HEADERS);
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) reject(new Error("Body too large"));
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function getAuthToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}

function createOfferPdfContent(offer) {
  return [
    "LABOURLINK WORK OFFER",
    `Offer ID: ${offer.id}`,
    `Created: ${new Date(offer.createdAt).toLocaleString()}`,
    "",
    `Builder Company: ${offer.builderCompanyName}`,
    `Builder Email: ${offer.builderEmail}`,
    "",
    `Labourer: ${offer.labourerName}`,
    `Labourer Email: ${offer.labourerEmail}`,
    "",
    `Date Range: ${offer.startDate} to ${offer.endDate}`,
    `Hours: ${offer.hours}`,
    `Rate: $${offer.rate}/hr`,
    `Estimated Hours: ${offer.estimatedHours}`,
    `Site Address: ${offer.siteAddress}`,
    `Notes: ${offer.notes || "None"}`,
    "",
    `Status: ${offer.status.toUpperCase()}`,
    offer.labourerSignature ? `Signed By: ${offer.labourerSignature}` : "Signed By: Pending",
  ].join("\n");
}

function validateOfferInput(input) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.startDate || ""))) return "Start date must be YYYY-MM-DD.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.endDate || ""))) return "End date must be YYYY-MM-DD.";
  if (String(input.startDate) > String(input.endDate)) return "Start date must be before end date.";
  if (!Number.isFinite(Number(input.hours)) || Number(input.hours) <= 0) return "Hours must be greater than 0.";
  if (!Number.isFinite(Number(input.rate)) || Number(input.rate) <= 0) return "Rate must be greater than 0.";
  if (!Number.isFinite(Number(input.estimatedHours)) || Number(input.estimatedHours) <= 0)
    return "Estimated hours must be greater than 0.";
  if (!String(input.siteAddress || "").trim()) return "Site address is required.";
  return null;
}

async function initDb() {
  await pool.query(`
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
      bsb TEXT,
      account_number TEXT,
      password_hash TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bsb TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_number TEXT;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      from_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      to_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_typing (
      from_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      to_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      is_typing BOOLEAN NOT NULL,
      updated_at BIGINT NOT NULL,
      PRIMARY KEY (from_email, to_email)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_thread_reads (
      email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      peer_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      last_read_at BIGINT NOT NULL,
      PRIMARY KEY (email, peer_email)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_thread_closures (
      email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      peer_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      closed_at BIGINT NOT NULL,
      PRIMARY KEY (email, peer_email)
    );
  `);

  await pool.query(`
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
  `);

  await pool.query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS completed_at BIGINT;`);
  await pool.query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS labourer_company_rating INTEGER;`);

  await pool.query(`
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
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_push_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
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
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS builder_saved_labourers (
      builder_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      labourer_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      created_at BIGINT NOT NULL,
      PRIMARY KEY (builder_email, labourer_email)
    );
  `);
}

function rowToUser(row) {
  const base = {
    role: row.role,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
  };

  if (row.role === "builder") {
    return {
      ...base,
      companyName: row.company_name || "",
      about: row.about || "",
      address: row.address || "",
      companyLogoUrl: row.company_logo_url || undefined,
      companyRating: row.company_rating ?? 0,
      reviews: row.reviews || [],
      subscription: normalizeSubscription(row.subscription),
    };
  }

  return {
    ...base,
    occupation: row.occupation || "",
    about: row.about || "",
    pricePerHour: Number(row.price_per_hour || 0),
    availableDates: row.available_dates || [],
    certifications: row.certifications || [],
    experienceYears: Number(row.experience_years || 0),
    photoUrl: row.photo_url || undefined,
    bsb: row.bsb || undefined,
    accountNumber: row.account_number || undefined,
    subscription: normalizeSubscription(row.subscription),
  };
}

function rowToOffer(row) {
  return {
    id: row.id,
    builderEmail: row.builder_email,
    builderCompanyName: row.builder_company_name,
    builderLogoUrl: row.builder_logo_url || undefined,
    labourerEmail: row.labourer_email,
    labourerName: row.labourer_name,
    startDate: row.start_date,
    endDate: row.end_date,
    hours: Number(row.hours),
    rate: Number(row.rate),
    estimatedHours: Number(row.estimated_hours),
    siteAddress: row.site_address,
    notes: row.notes,
    status: row.status,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    labourerSignature: row.labourer_signature || undefined,
    labourerRespondedAt: row.labourer_responded_at ? Number(row.labourer_responded_at) : undefined,
    completedAt: row.completed_at ? Number(row.completed_at) : undefined,
    labourerCompanyRating: row.labourer_company_rating ? Number(row.labourer_company_rating) : undefined,
    pdfContent: row.pdf_content,
  };
}

function rowToPayment(row) {
  return {
    id: row.id,
    offerId: row.offer_id,
    builderEmail: row.builder_email,
    labourerEmail: row.labourer_email,
    builderCompanyName: row.builder_company_name,
    labourerName: row.labourer_name,
    labourerBsb: row.labourer_bsb || "",
    labourerAccountNumber: row.labourer_account_number || "",
    amountOwed: Number(row.amount_owed || 0),
    details: row.details || "",
    status: row.status,
    receiptContent: row.receipt_content || undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    paidAt: row.paid_at ? Number(row.paid_at) : undefined,
  };
}

async function ensurePaymentsForCompletedOffersByRole(role, email) {
  const normalizedEmail = normalizeEmail(email);
  const filterColumn = role === "builder" ? "builder_email" : "labourer_email";
  const completedOffersRes = await pool.query(
    `SELECT * FROM offers
     WHERE lower(${filterColumn}) = $1 AND status = 'completed'
     ORDER BY created_at DESC`,
    [normalizedEmail]
  );

  for (const row of completedOffersRes.rows) {
    const offer = rowToOffer(row);
    const existingRes = await pool.query("SELECT id FROM payments WHERE offer_id = $1 LIMIT 1", [offer.id]);
    if (existingRes.rows.length) continue;

    const labourerUserRes = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [
      normalizeEmail(offer.labourerEmail),
    ]);
    const labourerUser = labourerUserRes.rows[0] || null;
    const amount = Number(offer.estimatedHours) * Number(offer.rate);
    const details = `Work offer ${offer.id}: ${offer.startDate} to ${offer.endDate}`;

    await pool.query(
      `INSERT INTO payments (
        id, offer_id, builder_email, labourer_email, builder_company_name, labourer_name,
        labourer_bsb, labourer_account_number, amount_owed, details, status,
        receipt_content, created_at, updated_at, paid_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      )`,
      [
        makeId("pay"),
        offer.id,
        normalizeEmail(offer.builderEmail),
        normalizeEmail(offer.labourerEmail),
        offer.builderCompanyName,
        offer.labourerName,
        labourerUser?.bsb || null,
        labourerUser?.account_number || null,
        Number.isFinite(amount) ? amount : 0,
        details,
        "pending",
        null,
        offer.completedAt || offer.updatedAt || now(),
        now(),
        null,
      ]
    );
  }
}

async function getSessionUser(req) {
  const token = getAuthToken(req);
  if (!token) return null;
  const sessionRes = await pool.query("SELECT email FROM sessions WHERE token = $1 LIMIT 1", [token]);
  if (!sessionRes.rows.length) return null;
  const email = sessionRes.rows[0].email;
  const userRes = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [email]);
  if (!userRes.rows.length) return null;
  return rowToUser(userRes.rows[0]);
}

async function requireAuth(req, res) {
  const user = await getSessionUser(req);
  if (!user) {
    json(res, 401, { ok: false, error: "Unauthorized" });
    return null;
  }
  return user;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  try {
    if (req.method === "GET" && pathname === "/health") {
      return json(res, 200, { ok: true, status: "healthy" });
    }

    if (req.method === "POST" && pathname === "/auth/register") {
      const body = await parseBody(req);
      const email = normalizeEmail(body.email);
      if (!email) return json(res, 400, { ok: false, error: "Email is required." });
      if (!body.password || String(body.password).length < 6) {
        return json(res, 400, { ok: false, error: "Password must be at least 6 characters." });
      }
      if (body.role !== "builder" && body.role !== "labourer") {
        return json(res, 400, { ok: false, error: "Role must be builder or labourer." });
      }

      const existsRes = await pool.query("SELECT 1 FROM users WHERE email = $1", [email]);
      if (existsRes.rows.length) return json(res, 409, { ok: false, error: "Email already exists" });

      const ts = now();
      const initialSubscription = defaultSubscription();
      if (body.role === "builder") {
        await pool.query(
          `INSERT INTO users (
            email, role, first_name, last_name, company_name, about, address,
            company_logo_url, company_rating, reviews, subscription,
            password_hash, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            email,
            "builder",
            String(body.firstName || ""),
            String(body.lastName || ""),
            String(body.companyName || ""),
            String(body.about || ""),
            String(body.address || ""),
            body.companyLogoUrl || null,
            Number(body.companyRating || 0),
            JSON.stringify(body.reviews || []),
            JSON.stringify(initialSubscription),
            hashPassword(body.password),
            ts,
            ts,
          ]
        );
      } else {
        await pool.query(
          `INSERT INTO users (
            email, role, first_name, last_name, occupation, about, price_per_hour,
            available_dates, certifications, experience_years, photo_url, bsb, account_number,
            subscription, password_hash, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
          [
            email,
            "labourer",
            String(body.firstName || ""),
            String(body.lastName || ""),
            String(body.occupation || ""),
            String(body.about || ""),
            Number(body.pricePerHour || 0),
            JSON.stringify(body.availableDates || []),
            JSON.stringify(body.certifications || []),
            Number(body.experienceYears || 0),
            body.photoUrl || null,
            body.bsb || null,
            body.accountNumber || null,
            JSON.stringify(initialSubscription),
            hashPassword(body.password),
            ts,
            ts,
          ]
        );
      }

      const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      return json(res, 200, { ok: true, user: rowToUser(userRes.rows[0]) });
    }

    if (req.method === "POST" && pathname === "/auth/login") {
      const body = await parseBody(req);
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      const userRes = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [email]);
      if (!userRes.rows.length) return json(res, 404, { ok: false, error: "Account not found" });
      const row = userRes.rows[0];
      if (row.password_hash !== hashPassword(password)) {
        return json(res, 401, { ok: false, error: "Incorrect password" });
      }
      const token = makeId("sess");
      await pool.query("INSERT INTO sessions (token, email, created_at) VALUES ($1,$2,$3)", [
        token,
        email,
        now(),
      ]);
      return json(res, 200, { ok: true, token, user: rowToUser(row) });
    }

    if (req.method === "POST" && pathname === "/auth/logout") {
      const token = getAuthToken(req);
      if (token) await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
      return json(res, 200, { ok: true });
    }

    if (req.method === "GET" && pathname === "/auth/me") {
      const user = await requireAuth(req, res);
      if (!user) return;
      return json(res, 200, { ok: true, user });
    }

    if (req.method === "GET" && pathname === "/subscription") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const userRes = await pool.query("SELECT subscription FROM users WHERE email = $1 LIMIT 1", [
        normalizeEmail(authUser.email),
      ]);
      if (!userRes.rows.length) return json(res, 404, { ok: false, error: "User not found." });
      return json(res, 200, { ok: true, subscription: normalizeSubscription(userRes.rows[0].subscription) });
    }

    if (req.method === "POST" && pathname === "/subscription/start-trial") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const trialEndsAt = new Date(now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const nextSub = {
        planName: "LabourLink Pro",
        status: "trial",
        monthlyPrice: 50,
        renewalDate: trialEndsAt,
      };
      await pool.query(
        `UPDATE users
         SET subscription = $1, updated_at = $2
         WHERE email = $3`,
        [JSON.stringify(nextSub), now(), normalizeEmail(authUser.email)]
      );
      return json(res, 200, { ok: true, subscription: nextSub });
    }

    if (req.method === "POST" && pathname === "/subscription/activate") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const renewsAt = new Date(now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const nextSub = {
        planName: "LabourLink Pro",
        status: "active",
        monthlyPrice: 50,
        renewalDate: renewsAt,
      };
      await pool.query(
        `UPDATE users
         SET subscription = $1, updated_at = $2
         WHERE email = $3`,
        [JSON.stringify(nextSub), now(), normalizeEmail(authUser.email)]
      );
      return json(res, 200, { ok: true, subscription: nextSub });
    }

    if (req.method === "POST" && pathname === "/subscription/cancel") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const nextSub = {
        planName: "LabourLink Pro",
        status: "cancelled",
        monthlyPrice: 50,
        renewalDate: null,
      };
      await pool.query(
        `UPDATE users
         SET subscription = $1, updated_at = $2
         WHERE email = $3`,
        [JSON.stringify(nextSub), now(), normalizeEmail(authUser.email)]
      );
      return json(res, 200, { ok: true, subscription: nextSub });
    }

    if (req.method === "POST" && pathname === "/subscription/sync") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const body = await parseBody(req);
      const status = String(body.status || "").trim().toLowerCase();
      if (!["trial", "active", "past_due", "cancelled"].includes(status)) {
        return json(res, 400, { ok: false, error: "Invalid subscription status." });
      }

      const planName = String(body.planName || "LabourLink Pro");
      const monthlyPrice = Number.isFinite(Number(body.monthlyPrice)) ? Number(body.monthlyPrice) : 50;
      const renewalDate = body.renewalDate ? String(body.renewalDate) : null;
      const nextSub = normalizeSubscription({
        planName,
        status,
        monthlyPrice,
        renewalDate,
      });

      await pool.query(
        `UPDATE users
         SET subscription = $1, updated_at = $2
         WHERE email = $3`,
        [JSON.stringify(nextSub), now(), normalizeEmail(authUser.email)]
      );

      return json(res, 200, { ok: true, subscription: nextSub });
    }

    if (req.method === "POST" && pathname === "/push/register") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const body = await parseBody(req);
      const token = String(body.token || "").trim();
      if (!token) return json(res, 400, { ok: false, error: "Push token is required." });
      if (!isExpoPushToken(token)) return json(res, 400, { ok: false, error: "Invalid Expo push token." });

      await pool.query(
        `INSERT INTO user_push_tokens (token, email, created_at, updated_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (token)
         DO UPDATE SET email = EXCLUDED.email, updated_at = EXCLUDED.updated_at`,
        [token, normalizeEmail(authUser.email), now(), now()]
      );
      return json(res, 200, { ok: true });
    }

    if (req.method === "POST" && pathname === "/push/unregister") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const body = await parseBody(req);
      const token = String(body.token || "").trim();
      if (!token) return json(res, 400, { ok: false, error: "Push token is required." });
      await pool.query(
        `DELETE FROM user_push_tokens WHERE token = $1 AND lower(email) = $2`,
        [token, normalizeEmail(authUser.email)]
      );
      return json(res, 200, { ok: true });
    }

    if (req.method === "GET" && pathname === "/users") {
      const user = await requireAuth(req, res);
      if (!user) return;
      const usersRes = await pool.query("SELECT * FROM users");
      return json(res, 200, { ok: true, users: usersRes.rows.map(rowToUser) });
    }

    if (req.method === "GET" && pathname.startsWith("/users/")) {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const email = normalizeEmail(decodeURIComponent(pathname.replace("/users/", "")));
      const userRes = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [email]);
      if (!userRes.rows.length) return json(res, 404, { ok: false, error: "User not found" });
      return json(res, 200, { ok: true, user: rowToUser(userRes.rows[0]) });
    }

    if (req.method === "GET" && pathname === "/saved-labourers") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "builder") return json(res, 403, { ok: false, error: "Only builders can view saved labourers." });
      const savedRes = await pool.query(
        `SELECT u.*
         FROM builder_saved_labourers s
         JOIN users u ON u.email = s.labourer_email
         WHERE lower(s.builder_email) = $1
         ORDER BY s.created_at DESC`,
        [normalizeEmail(authUser.email)]
      );
      const labourers = savedRes.rows.map(rowToUser).filter((u) => u.role === "labourer");
      return json(res, 200, { ok: true, labourers });
    }

    if (req.method === "GET" && pathname.startsWith("/saved-labourers/") && pathname.endsWith("/status")) {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "builder") return json(res, 403, { ok: false, error: "Only builders can check saved status." });
      const labourerEmail = normalizeEmail(
        decodeURIComponent(pathname.replace("/saved-labourers/", "").replace("/status", ""))
      );
      if (!labourerEmail) return json(res, 400, { ok: false, error: "Labourer email is required." });
      const savedRes = await pool.query(
        `SELECT 1
         FROM builder_saved_labourers
         WHERE lower(builder_email) = $1 AND lower(labourer_email) = $2
         LIMIT 1`,
        [normalizeEmail(authUser.email), labourerEmail]
      );
      return json(res, 200, { ok: true, saved: savedRes.rows.length > 0 });
    }

    if (req.method === "POST" && pathname.startsWith("/saved-labourers/") && pathname.endsWith("/save")) {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "builder") return json(res, 403, { ok: false, error: "Only builders can save labourers." });
      const labourerEmail = normalizeEmail(
        decodeURIComponent(pathname.replace("/saved-labourers/", "").replace("/save", ""))
      );
      if (!labourerEmail) return json(res, 400, { ok: false, error: "Labourer email is required." });
      const labourerRes = await pool.query("SELECT role FROM users WHERE email = $1 LIMIT 1", [labourerEmail]);
      if (!labourerRes.rows.length || labourerRes.rows[0].role !== "labourer") {
        return json(res, 404, { ok: false, error: "Labourer not found." });
      }

      await pool.query(
        `INSERT INTO builder_saved_labourers (builder_email, labourer_email, created_at)
         VALUES ($1,$2,$3)
         ON CONFLICT (builder_email, labourer_email) DO NOTHING`,
        [normalizeEmail(authUser.email), labourerEmail, now()]
      );
      return json(res, 200, { ok: true, saved: true });
    }

    if (req.method === "POST" && pathname.startsWith("/saved-labourers/") && pathname.endsWith("/unsave")) {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "builder") return json(res, 403, { ok: false, error: "Only builders can unsave labourers." });
      const labourerEmail = normalizeEmail(
        decodeURIComponent(pathname.replace("/saved-labourers/", "").replace("/unsave", ""))
      );
      if (!labourerEmail) return json(res, 400, { ok: false, error: "Labourer email is required." });
      await pool.query(
        `DELETE FROM builder_saved_labourers
         WHERE lower(builder_email) = $1 AND lower(labourer_email) = $2`,
        [normalizeEmail(authUser.email), labourerEmail]
      );
      return json(res, 200, { ok: true, saved: false });
    }

    if (req.method === "PATCH" && pathname === "/builder/profile") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "builder") return json(res, 403, { ok: false, error: "Not a builder account" });
      const patch = await parseBody(req);
      await pool.query(
        `UPDATE users
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             company_name = COALESCE($3, company_name),
             about = COALESCE($4, about),
             address = COALESCE($5, address),
             company_logo_url = COALESCE($6, company_logo_url),
             updated_at = $7
         WHERE email = $8`,
        [
          patch.firstName ?? null,
          patch.lastName ?? null,
          patch.companyName ?? null,
          patch.about ?? null,
          patch.address ?? null,
          patch.companyLogoUrl ?? null,
          now(),
          normalizeEmail(authUser.email),
        ]
      );
      const updatedRes = await pool.query("SELECT * FROM users WHERE email = $1", [
        normalizeEmail(authUser.email),
      ]);
      return json(res, 200, { ok: true, user: rowToUser(updatedRes.rows[0]) });
    }

    if (req.method === "PATCH" && pathname === "/labourer/profile") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "labourer") return json(res, 403, { ok: false, error: "Not a labourer account" });
      const patch = await parseBody(req);
      await pool.query(
        `UPDATE users
         SET first_name = COALESCE($1, first_name),
             last_name = COALESCE($2, last_name),
             occupation = COALESCE($3, occupation),
             about = COALESCE($4, about),
             price_per_hour = COALESCE($5, price_per_hour),
             experience_years = COALESCE($6, experience_years),
             certifications = COALESCE($7, certifications),
             photo_url = COALESCE($8, photo_url),
             bsb = COALESCE($9, bsb),
             account_number = COALESCE($10, account_number),
             updated_at = $11
         WHERE email = $12`,
        [
          patch.firstName ?? null,
          patch.lastName ?? null,
          patch.occupation ?? null,
          patch.about ?? null,
          Number.isFinite(Number(patch.pricePerHour)) ? Number(patch.pricePerHour) : null,
          Number.isFinite(Number(patch.experienceYears)) ? Number(patch.experienceYears) : null,
          Array.isArray(patch.certifications) ? JSON.stringify(patch.certifications) : null,
          patch.photoUrl ?? null,
          patch.bsb ?? null,
          patch.accountNumber ?? null,
          now(),
          normalizeEmail(authUser.email),
        ]
      );
      const updatedRes = await pool.query("SELECT * FROM users WHERE email = $1", [
        normalizeEmail(authUser.email),
      ]);
      return json(res, 200, { ok: true, user: rowToUser(updatedRes.rows[0]) });
    }

    if (req.method === "PATCH" && pathname === "/labourer/availability") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "labourer") return json(res, 403, { ok: false, error: "Not a labourer account" });
      const body = await parseBody(req);
      const dates = Array.isArray(body.availableDates) ? body.availableDates : [];
      await pool.query(
        `UPDATE users
         SET available_dates = $1, updated_at = $2
         WHERE email = $3`,
        [JSON.stringify(dates), now(), normalizeEmail(authUser.email)]
      );
      return json(res, 200, { ok: true });
    }

    if (req.method === "GET" && pathname === "/chat/threads") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const myEmail = normalizeEmail(authUser.email);
      const view = String(url.searchParams.get("view") || "active").toLowerCase();
      const historyMode = view === "history";
      const readsRes = await pool.query(
        `SELECT peer_email, last_read_at
         FROM chat_thread_reads
         WHERE lower(email) = $1`,
        [myEmail]
      );
      const lastReadByPeer = new Map();
      for (const row of readsRes.rows) {
        lastReadByPeer.set(normalizeEmail(row.peer_email), Number(row.last_read_at || 0));
      }
      const closuresRes = await pool.query(
        `SELECT email, peer_email, closed_at
         FROM chat_thread_closures
         WHERE lower(email) = $1 OR lower(peer_email) = $1`,
        [myEmail]
      );
      const closedAtByPeer = new Map();
      for (const row of closuresRes.rows) {
        const rowEmail = normalizeEmail(row.email);
        const rowPeerEmail = normalizeEmail(row.peer_email);
        const otherEmail = rowEmail === myEmail ? rowPeerEmail : rowEmail;
        const closedAt = Number(row.closed_at || 0);
        const prev = Number(closedAtByPeer.get(otherEmail) || 0);
        if (closedAt > prev) closedAtByPeer.set(otherEmail, closedAt);
      }

      const msgRes = await pool.query(
        `SELECT id, from_email, to_email, text, created_at
         FROM messages
         WHERE lower(from_email) = $1 OR lower(to_email) = $1
         ORDER BY created_at DESC`,
        [myEmail]
      );
      const latestByThread = new Map();
      const unreadByThread = new Map();
      for (const m of msgRes.rows) {
        const tid = makeThreadId(m.from_email, m.to_email);
        const fromEmail = normalizeEmail(m.from_email);
        const toEmail = normalizeEmail(m.to_email);
        const peerEmail = fromEmail === myEmail ? toEmail : fromEmail;
        const closedAt = closedAtByPeer.get(peerEmail) ?? 0;
        const createdAt = Number(m.created_at);

        if (historyMode) {
          // History is "threads I closed"; show them even if newer messages exist.
          if (closedAt <= 0) continue;
        } else {
          if (createdAt <= closedAt) continue;
        }

        if (!latestByThread.has(tid)) latestByThread.set(tid, m);
        const lastReadAt = lastReadByPeer.get(peerEmail) ?? 0;
        const isIncomingUnread = toEmail === myEmail && Number(m.created_at) > lastReadAt;
        if (!historyMode && isIncomingUnread) {
          unreadByThread.set(tid, (unreadByThread.get(tid) || 0) + 1);
        }
      }
      const threads = [];
      for (const [threadId, m] of latestByThread.entries()) {
        const peerEmail =
          normalizeEmail(m.from_email) === myEmail ? m.to_email : m.from_email;
        const unreadCount = Number(unreadByThread.get(threadId) || 0);
        threads.push({
          threadId,
          peerEmail,
          lastMessageText: m.text,
          lastMessageAt: Number(m.created_at),
          unreadCount,
        });
      }
      if (historyMode) {
        for (const [peerEmail, closedAt] of closedAtByPeer.entries()) {
          const threadId = makeThreadId(myEmail, peerEmail);
          const exists = threads.some((t) => t.threadId === threadId);
          if (exists) continue;
          threads.push({
            threadId,
            peerEmail,
            lastMessageText: "Chat closed",
            lastMessageAt: Number(closedAt || 0),
            unreadCount: 0,
          });
        }
      }
      threads.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      return json(res, 200, { ok: true, threads });
    }

    if (req.method === "POST" && pathname === "/chat/close") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const body = await parseBody(req);
      const myEmail = normalizeEmail(authUser.email);
      const peerEmail = normalizeEmail(body.peerEmail);
      if (!peerEmail) return json(res, 400, { ok: false, error: "Peer email is required." });

      const peerRes = await pool.query("SELECT email FROM users WHERE email = $1 LIMIT 1", [peerEmail]);
      if (!peerRes.rows.length) return json(res, 404, { ok: false, error: "Peer not found." });

      const closedAt = now();
      await pool.query(
        `INSERT INTO chat_thread_closures (email, peer_email, closed_at)
         VALUES ($1,$2,$3), ($2,$1,$3)
         ON CONFLICT (email, peer_email)
         DO UPDATE SET closed_at = EXCLUDED.closed_at`,
        [myEmail, peerEmail, closedAt]
      );

      return json(res, 200, { ok: true });
    }

    if (req.method === "GET" && pathname.startsWith("/chat/messages/")) {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const peerEmail = normalizeEmail(decodeURIComponent(pathname.replace("/chat/messages/", "")));
      const tid = makeThreadId(authUser.email, peerEmail);
      const msgRes = await pool.query(
        `SELECT id, from_email, to_email, text, created_at FROM messages
         WHERE (lower(from_email) = $1 AND lower(to_email) = $2)
            OR (lower(from_email) = $2 AND lower(to_email) = $1)
         ORDER BY created_at ASC`,
        [normalizeEmail(authUser.email), peerEmail]
      );
      const messages = msgRes.rows
        .filter((m) => makeThreadId(m.from_email, m.to_email) === tid)
        .map((m) => ({
          id: m.id,
          from: m.from_email,
          to: m.to_email,
          text: m.text,
          createdAt: Number(m.created_at),
        }));
      return json(res, 200, { ok: true, messages });
    }

    if (req.method === "POST" && pathname === "/chat/messages") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const body = await parseBody(req);
      const toEmail = normalizeEmail(body.toEmail);
      const text = String(body.text || "").trim();
      if (!toEmail) return json(res, 400, { ok: false, error: "Recipient is required." });
      if (!text) return json(res, 400, { ok: false, error: "Message is empty." });

      const toRes = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [toEmail]);
      if (!toRes.rows.length) return json(res, 404, { ok: false, error: "Recipient not found." });
      const toUser = rowToUser(toRes.rows[0]);
      if (toUser.role === authUser.role) {
        return json(res, 400, { ok: false, error: "Builders can only chat with labourers (and vice versa)." });
      }

      await pool.query(
        `INSERT INTO messages (id, from_email, to_email, text, created_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [makeId("msg"), normalizeEmail(authUser.email), toEmail, text, now()]
      );
      await createNotification(
        toEmail,
        "message_received",
        "New message",
        `${authUser.firstName} ${authUser.lastName} sent you a message.`,
        { fromEmail: normalizeEmail(authUser.email), toEmail }
      );
      await pool.query(
        `INSERT INTO chat_typing (from_email, to_email, is_typing, updated_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (from_email, to_email)
         DO UPDATE SET is_typing = EXCLUDED.is_typing, updated_at = EXCLUDED.updated_at`,
        [normalizeEmail(authUser.email), toEmail, false, now()]
      );
      return json(res, 200, { ok: true });
    }

    if (req.method === "POST" && pathname === "/chat/typing") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const body = await parseBody(req);
      const toEmail = normalizeEmail(body.toEmail);
      const isTyping = Boolean(body.isTyping);
      if (!toEmail) return json(res, 400, { ok: false, error: "Recipient is required." });

      const toRes = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [toEmail]);
      if (!toRes.rows.length) return json(res, 404, { ok: false, error: "Recipient not found." });
      const toUser = rowToUser(toRes.rows[0]);
      if (toUser.role === authUser.role) {
        return json(res, 400, { ok: false, error: "Builders can only chat with labourers (and vice versa)." });
      }

      await pool.query(
        `INSERT INTO chat_typing (from_email, to_email, is_typing, updated_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (from_email, to_email)
         DO UPDATE SET is_typing = EXCLUDED.is_typing, updated_at = EXCLUDED.updated_at`,
        [normalizeEmail(authUser.email), toEmail, isTyping, now()]
      );
      return json(res, 200, { ok: true });
    }

    if (req.method === "POST" && pathname === "/chat/read") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const body = await parseBody(req);
      const myEmail = normalizeEmail(authUser.email);
      const peerEmail = normalizeEmail(body.peerEmail);
      if (!peerEmail) return json(res, 400, { ok: false, error: "Peer email is required." });

      const peerRes = await pool.query("SELECT email FROM users WHERE email = $1 LIMIT 1", [peerEmail]);
      if (!peerRes.rows.length) return json(res, 404, { ok: false, error: "Peer not found." });

      await pool.query(
        `INSERT INTO chat_thread_reads (email, peer_email, last_read_at)
         VALUES ($1,$2,$3)
         ON CONFLICT (email, peer_email)
         DO UPDATE SET last_read_at = EXCLUDED.last_read_at`,
        [myEmail, peerEmail, now()]
      );
      return json(res, 200, { ok: true });
    }

    if (req.method === "GET" && pathname.startsWith("/chat/typing/")) {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const myEmail = normalizeEmail(authUser.email);
      const peerEmail = normalizeEmail(decodeURIComponent(pathname.replace("/chat/typing/", "")));
      if (!peerEmail) return json(res, 400, { ok: false, error: "Peer email is required." });

      const freshAfter = now() - 10000;
      const typingRes = await pool.query(
        `SELECT from_email, to_email, is_typing, updated_at
         FROM chat_typing
         WHERE (
           (lower(from_email) = $1 AND lower(to_email) = $2)
           OR (lower(from_email) = $2 AND lower(to_email) = $1)
         )
         AND updated_at >= $3`,
        [myEmail, peerEmail, freshAfter]
      );

      let meTyping = false;
      let peerTyping = false;
      for (const row of typingRes.rows) {
        const from = normalizeEmail(row.from_email);
        const to = normalizeEmail(row.to_email);
        const active = Boolean(row.is_typing);
        if (from === myEmail && to === peerEmail) meTyping = active;
        if (from === peerEmail && to === myEmail) peerTyping = active;
      }

      return json(res, 200, { ok: true, meTyping, peerTyping, eitherTyping: meTyping || peerTyping });
    }

    if (req.method === "POST" && pathname === "/offers") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "builder") return json(res, 403, { ok: false, error: "Only builders can create offers." });
      const body = await parseBody(req);
      const labourerEmail = normalizeEmail(body.labourerEmail);

      const labourerRes = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [labourerEmail]);
      if (!labourerRes.rows.length) return json(res, 404, { ok: false, error: "Labourer account not found." });
      const labourer = rowToUser(labourerRes.rows[0]);
      if (labourer.role !== "labourer") return json(res, 404, { ok: false, error: "Labourer account not found." });

      const validationError = validateOfferInput(body);
      if (validationError) return json(res, 400, { ok: false, error: validationError });

      const createdAt = now();
      const offer = {
        id: makeId("offer"),
        builderEmail: normalizeEmail(authUser.email),
        builderCompanyName: authUser.companyName,
        builderLogoUrl: authUser.companyLogoUrl || null,
        labourerEmail,
        labourerName: `${labourer.firstName} ${labourer.lastName}`,
        startDate: String(body.startDate),
        endDate: String(body.endDate),
        hours: Number(body.hours),
        rate: Number(body.rate),
        estimatedHours: Number(body.estimatedHours),
        siteAddress: String(body.siteAddress).trim(),
        notes: String(body.notes || "").trim(),
        status: "pending",
        createdAt,
        updatedAt: createdAt,
        labourerSignature: null,
        labourerRespondedAt: null,
        completedAt: null,
        labourerCompanyRating: null,
      };
      const pdfContent = createOfferPdfContent(offer);

      await pool.query(
        `INSERT INTO offers (
          id, builder_email, builder_company_name, builder_logo_url,
          labourer_email, labourer_name, start_date, end_date, hours, rate, estimated_hours,
          site_address, notes, status, created_at, updated_at, labourer_signature,
          labourer_responded_at, completed_at, labourer_company_rating, pdf_content
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
        )`,
        [
          offer.id,
          offer.builderEmail,
          offer.builderCompanyName,
          offer.builderLogoUrl,
          offer.labourerEmail,
          offer.labourerName,
          offer.startDate,
          offer.endDate,
          offer.hours,
          offer.rate,
          offer.estimatedHours,
          offer.siteAddress,
          offer.notes,
          offer.status,
          offer.createdAt,
          offer.updatedAt,
          offer.labourerSignature,
          offer.labourerRespondedAt,
          offer.completedAt,
          offer.labourerCompanyRating,
          pdfContent,
        ]
      );
      await createNotification(
        labourerEmail,
        "offer_sent",
        "New work offer",
        `${authUser.companyName} sent you a work offer.`,
        { offerId: offer.id, builderEmail: normalizeEmail(authUser.email) }
      );

      const createdRes = await pool.query("SELECT * FROM offers WHERE id = $1", [offer.id]);
      return json(res, 200, { ok: true, offer: rowToOffer(createdRes.rows[0]) });
    }

    if (req.method === "GET" && pathname === "/offers/builder") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "builder") return json(res, 403, { ok: false, error: "Not a builder account." });
      const offersRes = await pool.query(
        "SELECT * FROM offers WHERE lower(builder_email) = $1 ORDER BY created_at DESC",
        [normalizeEmail(authUser.email)]
      );
      return json(res, 200, { ok: true, offers: offersRes.rows.map(rowToOffer) });
    }

    if (req.method === "GET" && pathname === "/offers/labourer") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "labourer") return json(res, 403, { ok: false, error: "Not a labourer account." });
      const offersRes = await pool.query(
        "SELECT * FROM offers WHERE lower(labourer_email) = $1 ORDER BY created_at DESC",
        [normalizeEmail(authUser.email)]
      );
      return json(res, 200, { ok: true, offers: offersRes.rows.map(rowToOffer) });
    }

    if (req.method === "GET" && pathname.startsWith("/offers/")) {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const offerId = pathname.replace("/offers/", "");
      const offerRes = await pool.query("SELECT * FROM offers WHERE id = $1 LIMIT 1", [offerId]);
      if (!offerRes.rows.length) return json(res, 404, { ok: false, error: "Offer not found." });
      const offer = rowToOffer(offerRes.rows[0]);
      const allowed =
        normalizeEmail(offer.builderEmail) === normalizeEmail(authUser.email) ||
        normalizeEmail(offer.labourerEmail) === normalizeEmail(authUser.email);
      if (!allowed) return json(res, 403, { ok: false, error: "Forbidden" });
      return json(res, 200, { ok: true, offer });
    }

    if (req.method === "POST" && pathname.startsWith("/offers/") && pathname.endsWith("/respond")) {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "labourer") return json(res, 403, { ok: false, error: "Only labourers can respond." });
      const body = await parseBody(req);
      const status = body.status;
      const labourerSignature = String(body.labourerSignature || "").trim();
      if (status !== "approved" && status !== "declined") {
        return json(res, 400, { ok: false, error: "Invalid status." });
      }
      if (!labourerSignature) {
        return json(res, 400, { ok: false, error: "Signature is required." });
      }

      const offerId = pathname.replace("/offers/", "").replace("/respond", "");
      const offerRes = await pool.query("SELECT * FROM offers WHERE id = $1 LIMIT 1", [offerId]);
      if (!offerRes.rows.length) return json(res, 404, { ok: false, error: "Offer not found." });
      const offer = rowToOffer(offerRes.rows[0]);
      if (normalizeEmail(offer.labourerEmail) !== normalizeEmail(authUser.email)) {
        return json(res, 403, { ok: false, error: "You cannot respond to this offer." });
      }
      if (offer.status !== "pending") {
        return json(res, 400, { ok: false, error: "This offer has already been responded to." });
      }

      const updated = {
        ...offer,
        status,
        labourerSignature,
        labourerRespondedAt: now(),
        updatedAt: now(),
      };
      const pdfContent = createOfferPdfContent(updated);

      await pool.query(
        `UPDATE offers
         SET status = $1,
             labourer_signature = $2,
             labourer_responded_at = $3,
             updated_at = $4,
             pdf_content = $5
         WHERE id = $6`,
        [
          updated.status,
          updated.labourerSignature,
          updated.labourerRespondedAt,
          updated.updatedAt,
          pdfContent,
          offerId,
        ]
      );
      if (status === "approved") {
        await createNotification(
          offer.builderEmail,
          "offer_signed",
          "Offer signed",
          `${authUser.firstName} ${authUser.lastName} signed your work offer.`,
          { offerId: offer.id, labourerEmail: normalizeEmail(authUser.email) }
        );
      }

      const refreshed = await pool.query("SELECT * FROM offers WHERE id = $1", [offerId]);
      return json(res, 200, { ok: true, offer: rowToOffer(refreshed.rows[0]) });
    }

    if (req.method === "POST" && pathname.startsWith("/offers/") && pathname.endsWith("/complete")) {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "labourer") {
        return json(res, 403, { ok: false, error: "Only labourers can complete work." });
      }

      const body = await parseBody(req);
      const rating = Number(body.rating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return json(res, 400, { ok: false, error: "Rating must be between 1 and 5." });
      }

      const offerId = pathname.replace("/offers/", "").replace("/complete", "");
      const offerRes = await pool.query("SELECT * FROM offers WHERE id = $1 LIMIT 1", [offerId]);
      if (!offerRes.rows.length) return json(res, 404, { ok: false, error: "Offer not found." });
      const offer = rowToOffer(offerRes.rows[0]);

      if (normalizeEmail(offer.labourerEmail) !== normalizeEmail(authUser.email)) {
        return json(res, 403, { ok: false, error: "You cannot complete this offer." });
      }
      if (offer.status !== "approved") {
        return json(res, 400, { ok: false, error: "Only approved offers can be completed." });
      }
      const today = new Date().toISOString().slice(0, 10);
      if (today < String(offer.endDate)) {
        return json(res, 400, { ok: false, error: "You can complete this work after the end date." });
      }

      const completedAt = now();
      await pool.query(
        `UPDATE offers
         SET status = $1,
             completed_at = $2,
             labourer_company_rating = $3,
             updated_at = $4
         WHERE id = $5`,
        ["completed", completedAt, Math.round(rating), completedAt, offerId]
      );

      const paymentAmount = Number(offer.estimatedHours) * Number(offer.rate);
      const paymentDetails = `Work offer ${offerId}: ${offer.startDate} to ${offer.endDate}`;
      const labourerUserRes = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [
        normalizeEmail(offer.labourerEmail),
      ]);
      const labourerUser = labourerUserRes.rows[0] || null;
      if (!String(labourerUser?.bsb || "").trim() || !String(labourerUser?.account_number || "").trim()) {
        return json(res, 400, { ok: false, error: "Please add your BSB and account number in profile before completing work." });
      }
      await pool.query(
        `INSERT INTO payments (
          id, offer_id, builder_email, labourer_email, builder_company_name, labourer_name,
          labourer_bsb, labourer_account_number, amount_owed, details, status,
          receipt_content, created_at, updated_at, paid_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
        )
        ON CONFLICT (offer_id)
        DO UPDATE SET
          labourer_bsb = EXCLUDED.labourer_bsb,
          labourer_account_number = EXCLUDED.labourer_account_number,
          amount_owed = EXCLUDED.amount_owed,
          details = EXCLUDED.details,
          updated_at = EXCLUDED.updated_at`,
        [
          makeId("pay"),
          offerId,
          normalizeEmail(offer.builderEmail),
          normalizeEmail(offer.labourerEmail),
          offer.builderCompanyName,
          offer.labourerName,
          labourerUser?.bsb || null,
          labourerUser?.account_number || null,
          Number.isFinite(paymentAmount) ? paymentAmount : 0,
          paymentDetails,
          "pending",
          null,
          completedAt,
          completedAt,
          null,
        ]
      );

      await pool.query(
        `INSERT INTO messages (id, from_email, to_email, text, created_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          makeId("msg"),
          normalizeEmail(offer.labourerEmail),
          normalizeEmail(offer.builderEmail),
          "Work completed. Please process payment in the Pay tab.",
          completedAt,
        ]
      );

      const builderRes = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [
        normalizeEmail(offer.builderEmail),
      ]);
      if (builderRes.rows.length) {
        const builderRow = builderRes.rows[0];
        const existingReviews = Array.isArray(builderRow.reviews) ? builderRow.reviews : [];
        const nextReview = {
          id: makeId("review"),
          labourerEmail: normalizeEmail(authUser.email),
          labourerName: `${authUser.firstName} ${authUser.lastName}`,
          rating: Math.round(rating),
          comment: `Rated after completing offer ${offerId}.`,
          createdAt: completedAt,
        };
        const updatedReviews = [...existingReviews, nextReview];
        const total = updatedReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
        const companyRating = updatedReviews.length ? total / updatedReviews.length : 0;

        await pool.query(
          `UPDATE users
           SET reviews = $1,
               company_rating = $2,
               updated_at = $3
           WHERE email = $4`,
          [
            JSON.stringify(updatedReviews),
            companyRating,
            completedAt,
            normalizeEmail(offer.builderEmail),
          ]
        );
      }

      await createNotification(
        offer.builderEmail,
        "work_completed",
        "Work completed - payment required",
        `${authUser.firstName} ${authUser.lastName} marked work complete. Please process payment.`,
        { offerId, rating: Math.round(rating), labourerEmail: normalizeEmail(authUser.email) }
      );

      const refreshed = await pool.query("SELECT * FROM offers WHERE id = $1", [offerId]);
      return json(res, 200, { ok: true, offer: rowToOffer(refreshed.rows[0]) });
    }

    if (req.method === "GET" && pathname === "/payments/builder") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "builder") return json(res, 403, { ok: false, error: "Not a builder account." });
      await ensurePaymentsForCompletedOffersByRole("builder", authUser.email);
      const rowsRes = await pool.query(
        `SELECT * FROM payments WHERE lower(builder_email) = $1 ORDER BY created_at DESC`,
        [normalizeEmail(authUser.email)]
      );
      return json(res, 200, { ok: true, payments: rowsRes.rows.map(rowToPayment) });
    }

    if (req.method === "GET" && pathname === "/payments/labourer") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "labourer") return json(res, 403, { ok: false, error: "Not a labourer account." });
      await ensurePaymentsForCompletedOffersByRole("labourer", authUser.email);
      const rowsRes = await pool.query(
        `SELECT * FROM payments WHERE lower(labourer_email) = $1 ORDER BY created_at DESC`,
        [normalizeEmail(authUser.email)]
      );
      return json(res, 200, { ok: true, payments: rowsRes.rows.map(rowToPayment) });
    }

    if (req.method === "PATCH" && pathname.startsWith("/payments/") && !pathname.endsWith("/pay")) {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "builder") return json(res, 403, { ok: false, error: "Only builders can edit payments." });
      const paymentId = pathname.replace("/payments/", "");
      const patch = await parseBody(req);
      const amountOwed = Number(patch.amountOwed);
      const details = String(patch.details || "").trim();

      const payRes = await pool.query("SELECT * FROM payments WHERE id = $1 LIMIT 1", [paymentId]);
      if (!payRes.rows.length) return json(res, 404, { ok: false, error: "Payment not found." });
      const payment = rowToPayment(payRes.rows[0]);
      if (normalizeEmail(payment.builderEmail) !== normalizeEmail(authUser.email)) {
        return json(res, 403, { ok: false, error: "Forbidden." });
      }
      if (payment.status !== "pending") {
        return json(res, 400, { ok: false, error: "Only pending payments can be edited." });
      }
      if (!Number.isFinite(amountOwed) || amountOwed <= 0) {
        return json(res, 400, { ok: false, error: "Amount owed must be greater than 0." });
      }
      if (!details) return json(res, 400, { ok: false, error: "Details are required." });

      await pool.query(
        `UPDATE payments
         SET amount_owed = $1,
             details = $2,
             updated_at = $3
         WHERE id = $4`,
        [amountOwed, details, now(), paymentId]
      );
      const refreshed = await pool.query("SELECT * FROM payments WHERE id = $1", [paymentId]);
      return json(res, 200, { ok: true, payment: rowToPayment(refreshed.rows[0]) });
    }

    if (req.method === "POST" && pathname.startsWith("/payments/") && pathname.endsWith("/pay")) {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      if (authUser.role !== "builder") return json(res, 403, { ok: false, error: "Only builders can mark paid." });
      const paymentId = pathname.replace("/payments/", "").replace("/pay", "");

      const payRes = await pool.query("SELECT * FROM payments WHERE id = $1 LIMIT 1", [paymentId]);
      if (!payRes.rows.length) return json(res, 404, { ok: false, error: "Payment not found." });
      const payment = rowToPayment(payRes.rows[0]);
      if (normalizeEmail(payment.builderEmail) !== normalizeEmail(authUser.email)) {
        return json(res, 403, { ok: false, error: "Forbidden." });
      }
      if (payment.status !== "pending") return json(res, 400, { ok: false, error: "Payment already processed." });

      const paidAt = now();
      const receipt = [
        "LabourLink Payment Receipt",
        `Receipt Date: ${new Date(paidAt).toLocaleString()}`,
        `Payment ID: ${payment.id}`,
        "",
        `Builder: ${payment.builderCompanyName}`,
        `Builder Email: ${payment.builderEmail}`,
        `Labourer: ${payment.labourerName}`,
        `Labourer Email: ${payment.labourerEmail}`,
        `BSB: ${payment.labourerBsb || "-"}`,
        `Account Number: ${payment.labourerAccountNumber || "-"}`,
        "",
        `Amount Paid: $${Number(payment.amountOwed).toFixed(2)}`,
      ].join("\n");

      await pool.query(
        `UPDATE payments
         SET status = $1,
             paid_at = $2,
             receipt_content = $3,
             updated_at = $4
         WHERE id = $5`,
        ["paid", paidAt, receipt, paidAt, paymentId]
      );

      await createNotification(
        payment.labourerEmail,
        "payment_received",
        "Payment received",
        `${payment.builderCompanyName || "A builder"} has paid you $${Number(payment.amountOwed).toFixed(2)}.`,
        { paymentId, offerId: payment.offerId }
      );

      const refreshed = await pool.query("SELECT * FROM payments WHERE id = $1", [paymentId]);
      return json(res, 200, { ok: true, payment: rowToPayment(refreshed.rows[0]) });
    }

    if (req.method === "GET" && pathname === "/notifications") {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const rowsRes = await pool.query(
        `SELECT id, recipient_email, type, title, body, data, is_read, created_at
         FROM notifications
         WHERE lower(recipient_email) = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [normalizeEmail(authUser.email)]
      );

      const notifications = rowsRes.rows.map((row) => ({
        id: row.id,
        recipientEmail: row.recipient_email,
        type: row.type,
        title: row.title,
        body: row.body,
        data: row.data || {},
        isRead: Boolean(row.is_read),
        createdAt: Number(row.created_at),
      }));
      return json(res, 200, { ok: true, notifications });
    }

    if (req.method === "PATCH" && pathname.startsWith("/notifications/") && pathname.endsWith("/read")) {
      const authUser = await requireAuth(req, res);
      if (!authUser) return;
      const notificationId = pathname.replace("/notifications/", "").replace("/read", "");
      await pool.query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE id = $1 AND lower(recipient_email) = $2`,
        [notificationId, normalizeEmail(authUser.email)]
      );
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { ok: false, error: "Not found" });
  } catch (err) {
    return json(res, 500, { ok: false, error: err.message || "Server error" });
  }
});

initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`LabourLink API running on http://localhost:${PORT}`);
      console.log(`Using Postgres: ${DATABASE_URL}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize Postgres schema:", err);
    process.exit(1);
  });
