# Docker Deployment

## 1. Requirements
- Docker 24+
- Docker Compose v2+

## 2. Start
```bash
cp .env.example .env
docker compose up -d --build
```

## 3. Access
- Frontend: `http://SERVER_IP:8080` (or your `FRONTEND_PORT`)
- Backend API: `http://SERVER_IP:3001/api` (or your `BACKEND_PORT`)

## 4. Data Persistence
- `forum/backend/data/db.json` is mounted into backend container
- `forum/backend/uploads/` is mounted into backend container

## 5. Common Commands
```bash
# View logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down
```

## 6. Update After New Code
```bash
git pull origin master
docker compose up -d --build
```
