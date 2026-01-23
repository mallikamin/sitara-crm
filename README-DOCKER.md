# Sitara CRM - Docker & PostgreSQL Setup

This guide will help you migrate from localStorage to PostgreSQL using Docker.

## Quick Start (Local Development)

### 1. Start Docker Services

```bash
# Start PostgreSQL and Backend API
docker-compose up -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### 2. Initialize Database

The database schema will be automatically created when PostgreSQL starts. You can verify:

```bash
docker-compose exec postgres psql -U sitara_user -d sitara_crm -c "\dt"
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Start Backend API

```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:5000`

### 5. Configure Frontend

Create `.env` file in root:

```env
VITE_API_URL=http://localhost:5000/api
```

### 6. Start Frontend

```bash
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Migrating from localStorage

When you first open the application with the API running, it will:

1. Check if API is available
2. Detect if you have localStorage data
3. Prompt you to migrate
4. Automatically migrate all data to PostgreSQL

You can also manually trigger migration from the browser console:

```javascript
import { migrateLocalStorageToDatabase } from './utils/migration';
await migrateLocalStorageToDatabase();
```

## API Endpoints

- Health Check: `GET /health`
- Customers: `/api/customers`
- Brokers: `/api/brokers`
- Projects: `/api/projects`
- Receipts: `/api/receipts`
- Interactions: `/api/interactions`
- Inventory: `/api/inventory`
- Backup Export: `GET /api/backup/export`
- Backup Import: `POST /api/backup/import`

## Database Access

```bash
# Connect to database
docker-compose exec postgres psql -U sitara_user -d sitara_crm

# Backup database
docker-compose exec postgres pg_dump -U sitara_user sitara_crm > backup.sql

# Restore database
docker-compose exec -T postgres psql -U sitara_user sitara_crm < backup.sql
```

## Stopping Services

```bash
# Stop services (keeps data)
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

## Troubleshooting

### Database not connecting

1. Check if PostgreSQL is running: `docker-compose ps`
2. Check logs: `docker-compose logs postgres`
3. Verify DATABASE_URL in `backend/.env`

### API not accessible

1. Check backend logs: `docker-compose logs backend`
2. Verify CORS_ORIGIN in `backend/.env`
3. Check if port 5000 is available

### Migration issues

1. Export localStorage data first
2. Check browser console for errors
3. Verify API is running and accessible

## Production Deployment

See `workplacesetup.txt` for detailed production deployment instructions.

