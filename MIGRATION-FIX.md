# Migration Fix Instructions

If the migration is stuck, try these steps:

## Option 1: Check Browser Console

1. Open browser console (F12)
2. Look for any error messages
3. Check if you see:
   - "🔄 Starting migration from localStorage to PostgreSQL..."
   - "📦 Migrating X customers..."
   - Any error messages

## Option 2: Manual Migration via Console

If the migration is stuck, you can run it manually from the browser console:

```javascript
// First, clear the migration flag
localStorage.removeItem('sitara_crm_migrated');

// Then import and run migration
import { migrateLocalStorageToDatabase } from './src/utils/migration';
migrateLocalStorageToDatabase().then(result => {
  console.log('Migration result:', result);
  if (result.success) {
    localStorage.setItem('sitara_crm_migrated', 'true');
    alert('Migration completed! Please refresh the page.');
  } else {
    alert('Migration failed: ' + result.message);
  }
});
```

## Option 3: Check Backend Logs

Run this to see backend errors:
```bash
docker-compose logs backend --tail 100
```

## Option 4: Test API Endpoint

Test if the bulk endpoint works:
```javascript
fetch('http://localhost:5000/api/customers/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ customers: [] })
})
.then(r => r.json())
.then(d => console.log('Bulk endpoint test:', d))
.catch(e => console.error('Error:', e));
```

## Option 5: Reset and Try Again

1. Clear migration flag: `localStorage.removeItem('sitara_crm_migrated');`
2. Refresh the page
3. Try migration again

## Common Issues

1. **Timeout**: Large datasets may take time. The migration now has a 60-second timeout.
2. **API Connection**: Ensure backend is running: `docker-compose ps`
3. **Data Format**: Check if localStorage data is valid JSON

