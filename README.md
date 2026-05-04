# School IT Ticket System

A lightweight web app for school IT teams: tickets with categories, priorities, QR links to a phone-friendly ticket page, attachments, dashboard counts, and CSV/PDF exports. Data is stored in **SQLite** (file under `data/`) so there is no separate database server.

## Features

- **Tickets**: title, full description, reporter (pupil / staff / unknown / **N/A** + name), category, priority (**N/A** supported), status, optional **device** when category is **Hardware** (options include type and brand from the registry), timestamps.
- **Devices registry** (**Devices** in the nav): brands and devices (printer, computer, peripheral, other) for linking hardware tickets.
- **Tags**: comma-separated labels; filter the list by tag.
- **Search & filters**: text search, status, category, priority, reporter, date range, sort.
- **QR codes**: link `/view/<uuid>` + PNG QR (e.g. from the staff ticket); the **public ticket page** omits the QR so phones aren’t shown it again after scanning.
- **Print**: staff modal includes details and QR; public **Print** still includes QR for paper handouts.
- **Reports** (separate page): dashboard totals, daily / weekly / monthly summaries, **CSV** and **PDF** export.
- **Attachments**: stored under `data/uploads/`; open **inline in the browser** (view), not as forced downloads.
- **Dark mode**: header toggle (saved in the browser).

## Requirements

- **Node.js 18+** ([nodejs.org](https://nodejs.org/))
- On some Windows setups, `better-sqlite3` may need build tools if prebuilt binaries are missing; installing [VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with “Desktop development with C++” usually resolves this. **Docker** avoids local compilation.

## Installation (local)

1. **Open a terminal** in the project folder (the directory that contains `package.json`).

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start the server**:

   ```bash
   npm start
   ```

4. **Open the app**: [http://localhost:3004](http://localhost:3004)

**Windows shortcut:** double‑click `start.bat` in this folder (it runs `npm install` if needed, then starts the server).

The SQLite database file is created automatically at `data/tickets.db`. Uploaded files go to `data/uploads/`.

### QR codes on phones (LAN)

QR codes encode a full URL. For scans to work from school devices, set **`BASE_URL`** to how users reach the PC (not only `localhost`).

**Option A — `.env` file (recommended for `npm start`):**

1. Copy `.env.example` to `.env` in the project root (same folder as `package.json`).
2. Uncomment and set `BASE_URL` (and optionally `PORT`). Example:

```env
BASE_URL=http://192.168.1.50:3004
```

3. Run `npm start` as usual. `.env` is gitignored.

**Option B — shell (one session only)**

**Windows (PowerShell, one session):**

```powershell
$env:BASE_URL = "http://192.168.1.50:3004"
npm start
```

**Linux / macOS:**

```bash
BASE_URL=http://192.168.1.50:3004 npm start
```

Replace the IP/host with your machine’s address and the port you use.

### Windows: allow inbound connections (firewall)

So phones on the LAN can reach the app, open the server’s TCP port (default **3004**). Run **PowerShell as Administrator**, then:

```powershell
New-NetFirewallRule -DisplayName "School IT Tickets" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3004
```

If you use a different `PORT` in `.env`, use that number instead of `3004`. You can narrow the rule to private networks with `-Profile Private,Domain` if you prefer.

## Docker

From the project folder:

```bash
docker compose up --build
```

Optional: create a `.env` next to `docker-compose.yml`:

```env
BASE_URL=http://your-server:3004
```

Data persists in the `ticket-data` Docker volume (`/app/data` in the container).

## Project layout

- `src/server.js` — Express API, static files, exports.
- `src/db.js` — SQLite schema and queries.
- `public/index.html` — ticket list; `public/devices.html` — brands/devices; `public/reports.html` — dashboard & exports; `public/view.html` — public ticket page.
- `public/css`, `public/js` — styles and scripts.
- `data/` — database and uploads (created at runtime; ignored by git).

## API (overview)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tickets` | List with query filters (`status`, `category`, `priority`, `reporter`, `tag`, `q`, `from`, `to`, `sort`, `limit`) |
| POST | `/api/tickets` | Create ticket (JSON body) |
| GET | `/api/tickets/:id` | One ticket |
| PUT | `/api/tickets/:id` | Update ticket |
| DELETE | `/api/tickets/:id` | Delete ticket and attachment files |
| GET | `/api/public/tickets/:publicId` | Public ticket (for `/view/...`) |
| GET | `/api/tickets/:id/qrcode.png` | QR PNG |
| GET/POST | `/api/tickets/:id/attachments` | List / upload (`multipart`, field `file`) |
| GET | `/api/stats/summary` | Dashboard aggregates |
| GET | `/api/stats/report?period=daily|weekly|monthly` | Period report JSON |
| GET | `/api/stats/export.csv` / `export.pdf` | Downloads |

There is **no login** in this version; run it on a trusted school network or behind your own auth/reverse proxy if needed.

## License

Use and modify freely for your school environment.
