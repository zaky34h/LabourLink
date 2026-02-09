# LabourLink Backend (PostgreSQL)

This API now uses PostgreSQL for all persistence:

- Authentication and sessions
- Users and profile updates
- Chat threads/messages
- Work offers and labourer responses

## 1) Create local database

Example with default local Postgres user:

```bash
createdb labourlink
```

If needed, create user/password first and grant access.

## 2) Set environment variables

Required:

- `DATABASE_URL` (Postgres connection string)
- `PORT` (optional, defaults to `4000`)

Example:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/labourlink"
```

## 3) Install dependencies

```bash
npm install
```

(`pg` is required.)

## 4) Run API

```bash
npm run api
```

On startup the server auto-creates tables. SQL schema is also available in `backend/sql.init.sql`.

## App API URL

Set `EXPO_PUBLIC_API_BASE_URL` in `.env`:

- iOS simulator: `http://localhost:4000`
- Android emulator: `http://10.0.2.2:4000`
- Physical device: `http://<YOUR_COMPUTER_LAN_IP>:4000`

## Endpoints (high-level)

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /users`
- `GET /users/:email`
- `PATCH /builder/profile`
- `PATCH /labourer/profile`
- `PATCH /labourer/availability`
- `GET /chat/threads`
- `GET /chat/messages/:peerEmail`
- `POST /chat/messages`
- `POST /offers`
- `GET /offers/builder`
- `GET /offers/labourer`
- `GET /offers/:id`
- `POST /offers/:id/respond`
