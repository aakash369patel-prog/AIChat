# AI Chat Board

Full-stack chat application: **React (Vite) + Laravel API + MySQL + Google Gemini + Sanctum + Axios + Tailwind CSS**.

## Project structure

| Path | Purpose |
|------|---------|
| `backend/` | Laravel REST API, Gemini integration, Sanctum auth |
| `frontend/` | React SPA (ChatGPT-style UI) |

## Prerequisites

- PHP 8.2+ and Composer
- Node.js 18+
- MySQL (XAMPP MySQL is fine)
- [Google AI Studio](https://aistudio.google.com/apikey) API key for Gemini

## Step 1 — MySQL database

Create the database (phpMyAdmin or CLI):

```sql
CREATE DATABASE ai_chat_board CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Step 2 — Laravel backend

```powershell
cd c:\xampp\htdocs\AIChat\backend
```

Edit `.env`:

- Set `DB_*` for your MySQL user/password
- Set `GEMINI_API_KEY=your_key_here` (never commit real keys)

Run migrations:

```powershell
php artisan migrate
```

Start API server:

```powershell
php artisan serve
```

API base URL: `http://localhost:8000/api`

### Backend API (Sanctum Bearer token)

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/register` | No |
| POST | `/api/login` | No |
| POST | `/api/logout` | Yes |
| GET | `/api/me` | Yes |
| GET/POST | `/api/conversations` | Yes (`?search=` on list) |
| GET/PATCH/DELETE | `/api/conversations/{id}` | Yes |
| POST | `/api/conversations/{id}/messages` | Yes — JSON `stream: true` for SSE chat replies |
| PATCH | `/api/conversations/{id}/messages/{message}` | Yes — edit user message (+ optional stream) |
| POST | `/api/conversations/{id}/messages/{message}/regenerate` | Yes |
| POST | `/api/forgot-password`, `/api/reset-password` | No |
| POST | `/api/billing/razorpay/order`, `.../verify` | Yes (when Razorpay configured) |
| GET | `/api/admin/analytics` | Admin |

Gemini calls run only in `app/Services/GeminiService.php` using `GEMINI_API_KEY` from `.env`. Image mode uses `GEMINI_IMAGE_MODEL` (default `gemini-2.5-flash-image`). Run `php artisan storage:link` once so generated images are served from `/storage`.

## Step 3 — React frontend

```powershell
cd c:\xampp\htdocs\AIChat\frontend
npm install
```

Copy `.env.example` to `.env` if needed (`VITE_API_URL=http://localhost:8000/api`).

```powershell
npm run dev
```

Open: `http://localhost:5173`

## Free tier & billing

- Free users get **3 prompts** by default (`FREE_PROMPT_LIMIT` in `backend/.env`), including **Create image** mode. Change to `2` if you want a 2-prompt trial.
- After the limit, the UI shows a **credit limit** popup and blocks new messages until upgrade.
- **Payment plans** page: `/plans` — Gemini-style tiers with **+20% platform fee** (`BILLING_MARKUP_PERCENT`).
- `POST /api/billing/subscribe` (demo) activates the selected plan when Razorpay keys are not set.
- With `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`, `/plans` opens Razorpay checkout and verifies payment server-side.
- Streaming chat, conversation search, usage dashboard (`/usage`), regenerate/edit messages, password reset, email verification, admin analytics, and per-user message rate limiting (`MESSAGE_RATE_LIMIT_PER_MINUTE`).
- **Gen Z layer:** installable PWA, personas per chat, slash commands (`/eli5`, `/code`, …), voice input/listen, share reply + PNG share cards, daily streaks & weekly recap (`GET /api/experience`).
- **Starter** (`gemini_starter`): chat only, capped prompts (`STARTER_CHAT_LIMIT`, default 100), no images. **Pro / Team**: unlimited chat + images.

API: `GET /api/usage`, `GET /api/billing/plans`, `POST /api/billing/subscribe`.

## Step 4 — Test flow

1. Register a new user (or use seeded demo users via `php artisan db:seed` if configured locally).
2. Click **New Chat**, send a message.
3. Confirm the assistant reply (requires valid `GEMINI_API_KEY`).
4. Rename or delete chats from the sidebar hover actions.
5. Logout and login again; history should load from MySQL.

## Troubleshooting

- **502 / Gemini errors**: Check `GEMINI_API_KEY` and model name (`GEMINI_MODEL`, default `gemini-2.0-flash`).
- **CORS**: Update `CORS_ALLOWED_ORIGINS` in `backend/.env` to match your Vite URL.
- **401**: Clear `localStorage` key `auth_token` and log in again.

## Security notes

- API keys stay in Laravel `.env` only.
- The React app never receives Gemini credentials.