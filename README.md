# Bot Dashboard

A full-stack web application to monitor and control Python futures trading bots
running on Binance, Bybit, and OKX — from any device, anywhere.

Built as a learning project to gain hands-on experience with CI/CD pipelines,
REST APIs, Docker, and DevOps practices.

---

## Architecture
Browser / Phone  →  Nginx (HTTPS)  →  React Dashboard

↓

FastAPI Backend (JWT auth)

↓

Bot Manager Service

↙       ↓        ↘

Binance    Bybit       OKX

bot        bot        bot
---

## Tech Stack

| Layer        | Technology          | Purpose                         |
|--------------|---------------------|---------------------------------|
| Frontend     | React               | Mobile-friendly dashboard UI    |
| Backend      | FastAPI (Python)    | REST API with JWT auth          |
| Bot Manager  | Systemd + Python    | Start/stop bot processes        |
| Web Server   | Nginx               | Reverse proxy + HTTPS           |
| Containers   | Docker              | Reproducible deployment         |
| CI/CD        | GitHub Actions      | Auto-deploy on push             |
| Platform     | GCP (Ubuntu/Debian) | Cloud VM hosting                |

---

## Project Phases

- [x] **Phase 1** — Repo setup and documentation
- [x] **Phase 2** — Bot Manager Service (systemd wrappers)
- [x] **Phase 3** — FastAPI backend with JWT authentication
- [x] **Phase 4** — React dashboard (mobile-friendly)
- [ ] **Phase 5** — Dockerise everything
- [ ] **Phase 6** — CI/CD with GitHub Actions
- [ ] **Phase 7** — Monitoring and logging

---

## Getting Started

### Prerequisites
- GCP VM running Ubuntu/Debian
- Python 3.10+
- Docker and Docker Compose
- Node.js 18+

### Local setup (coming in Phase 3)

```bash
git clone https://github.com/YOUR_USERNAME/bot-dashboard.git
cd bot-dashboard
cp .env.example .env
# Edit .env with your credentials
```

---

## Security

- All API endpoints protected with JWT tokens
- HTTPS enforced via Let's Encrypt + Nginx
- Credentials stored in environment variables, never in code
- `.env` files excluded from version control

---

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)
- [API Reference](docs/api.md)

---

## Getting Started

### Prerequisites
- GCP VM running Ubuntu/Debian
- Python 3.10+
- Docker and Docker Compose
- Node.js 18+

### Local setup

```bash
git clone https://github.com/YOUR_USERNAME/bot-dashboard.git
cd bot-dashboard
cp .env.example .env
# Edit .env with your credentials
```

---

## Security

- All API endpoints protected with JWT tokens
- HTTPS enforced via Let's Encrypt + Nginx
- Credentials stored in environment variables, never in code
- `.env` files excluded from version control

---

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)
- [API Reference](docs/api.md)

---

## License

MIT
