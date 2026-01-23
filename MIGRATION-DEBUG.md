# Migration Debug Guide

## Quick Check Commands

Run these in your browser console (F12) to check migration status:

### 1. Check if localStorage has data:
```javascript
const data = localStorage.getItem('sitara_crm_data');
console.log('Has localStorage data:', !!data);
console.log('Data length:', data?.length || 0);
if (data) {
  try {
    const parsed = JSON.parse(data);
    console.log('Data keys:', Object.keys(parsed.state || parsed));
    console.log('Customers:', parsed.state?.customers?.length || parsed.customers?.length || 0);
    console.log('Brokers:', parsed.state?.brokers?.length || parsed.brokers?.length || 0);
    console.log('Projects:', parsed.state?.projects?.length || parsed.projects?.length || 0);
  } catch (e) {
    console.error('Error parsing:', e);
  }
}
```

### 2. Check migration status:
```javascript
console.log('Migration flag:', localStorage.getItem('sitara_crm_migrated'));
```

### 3. Check API availability:
```javascript
fetch('http://localhost:5000/health')
  .then(r => r.json())
  .then(d => console.log('API Health:', d))
  .catch(e => console.error('API Error:', e));
```

### 4. Manually trigger migration:
```javascript
// First, make sure the migration flag is cleared
localStorage.removeItem('sitara_crm_migrated');

// Then refresh the page, or if you have access to the context:
// The MigrationButton component should appear if localStorage data exists
```

### 5. Force migration (if you have access to the context):
```javascript
// This will work if you can access the useData hook
// Or you can import and call directly:
import { migrateLocalStorageToDatabase } from './src/utils/migration';
migrateLocalStorageToDatabase().then(result => console.log('Migration result:', result));
```

## Common Issues

1. **No prompt appears**: 
   - Check if localStorage has data (command #1)
   - Check if migration flag is set (command #2)
   - Check if API is available (command #3)

2. **Migration button doesn't show**:
   - Make sure you're using DataContextAPI (check App.tsx)
   - Check browser console for errors
   - Verify API is running and accessible

3. **Migration fails**:
   - Check browser console for detailed error messages
   - Verify backend is running: `docker-compose ps`
   - Check backend logs: `docker-compose logs backend`

## Reset Migration Flag

To reset and try again:
```javascript
localStorage.removeItem('sitara_crm_migrated');
location.reload();
```

