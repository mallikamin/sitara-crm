# Quick Start Guide - Local Development

## Step 1: Start Docker Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Backend API on port 5000

## Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

## Step 3: Start Backend API

```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:5000`

Check health: `http://localhost:5000/health`

## Step 4: Configure Frontend

Create `.env` file in root directory:

```env
VITE_API_URL=http://localhost:5000/api
```

## Step 5: Install Frontend Dependencies

```bash
npm install
```

## Step 6: Start Frontend

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Step 7: Migrate Data (If You Have Existing Data)

When you first open the application:
1. It will detect if you have localStorage data
2. Prompt you to migrate
3. Click "OK" to migrate all data to PostgreSQL

Or manually trigger from browser console:

```javascript
// Open browser console (F12)
// Then run:
localStorage.getItem('sitara_crm_data')
// Copy the output, then use the Import Backup feature in the app
```

## Verify Everything Works

1. ✅ API Health: http://localhost:5000/health
2. ✅ Frontend: http://localhost:3000
3. ✅ Create a test customer
4. ✅ Create a test project
5. ✅ Export backup

## Troubleshooting

### Database not starting
```bash
docker-compose logs postgres
docker-compose restart postgres
```

### API not connecting
```bash
docker-compose logs backend
# Check backend/.env file has correct DATABASE_URL
```

### Frontend can't reach API
- Check `.env` file has `VITE_API_URL=http://localhost:5000/api`
- Check backend CORS_ORIGIN in `backend/.env`
- Restart frontend dev server

## Next Steps

- See `README-DOCKER.md` for more details
- See `workplacesetup.txt` for production deployment

