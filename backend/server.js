const http = require("http");
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
      password_hash TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );
  `);

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
      subscription: row.subscription || undefined,
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
    pdfContent: row.pdf_content,
  };
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
            JSON.stringify(body.subscription || null),
            hashPassword(body.password),
            ts,
            ts,
          ]
        );
      } else {
        await pool.query(
          `INSERT INTO users (
            email, role, first_name, last_name, occupation, about, price_per_hour,
            available_dates, certifications, experience_years, photo_url,
            password_hash, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
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
             updated_at = $9
         WHERE email = $10`,
        [
          patch.firstName ?? null,
          patch.lastName ?? null,
          patch.occupation ?? null,
          patch.about ?? null,
          Number.isFinite(Number(patch.pricePerHour)) ? Number(patch.pricePerHour) : null,
          Number.isFinite(Number(patch.experienceYears)) ? Number(patch.experienceYears) : null,
          Array.isArray(patch.certifications) ? JSON.stringify(patch.certifications) : null,
          patch.photoUrl ?? null,
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
      const msgRes = await pool.query(
        `SELECT id, from_email, to_email, text, created_at
         FROM messages
         WHERE lower(from_email) = $1 OR lower(to_email) = $1
         ORDER BY created_at DESC`,
        [myEmail]
      );
      const latestByThread = new Map();
      for (const m of msgRes.rows) {
        const tid = makeThreadId(m.from_email, m.to_email);
        if (!latestByThread.has(tid)) latestByThread.set(tid, m);
      }
      const threads = [];
      for (const [threadId, m] of latestByThread.entries()) {
        const peerEmail =
          normalizeEmail(m.from_email) === myEmail ? m.to_email : m.from_email;
        threads.push({
          threadId,
          peerEmail,
          lastMessageText: m.text,
          lastMessageAt: Number(m.created_at),
        });
      }
      threads.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      return json(res, 200, { ok: true, threads });
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
      return json(res, 200, { ok: true });
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
      };
      const pdfContent = createOfferPdfContent(offer);

      await pool.query(
        `INSERT INTO offers (
          id, builder_email, builder_company_name, builder_logo_url,
          labourer_email, labourer_name, start_date, end_date, hours, rate, estimated_hours,
          site_address, notes, status, created_at, updated_at, labourer_signature,
          labourer_responded_at, pdf_content
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
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
          pdfContent,
        ]
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

      const refreshed = await pool.query("SELECT * FROM offers WHERE id = $1", [offerId]);
      return json(res, 200, { ok: true, offer: rowToOffer(refreshed.rows[0]) });
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
