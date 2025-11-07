# Registration Troubleshooting Guide

## Common Registration Failures

### 1. Check Backend Logs

After attempting registration, check your backend terminal for these logs:

#### Success ✅
```
📝 Registration attempt: { email: 'user@example.com', name: 'John Doe' }
⏳ Creating user...
✅ User created successfully: [user_id]
```

#### Validation Error ❌
```
📝 Registration attempt: { email: 'invalid', name: 'John' }
❌ Validation errors: [
  { msg: 'Please provide a valid email', param: 'email' }
]
```

#### User Already Exists ❌
```
📝 Registration attempt: { email: 'existing@example.com', name: 'John' }
❌ User already exists: existing@example.com
```

#### Server Error ❌
```
📝 Registration attempt: { email: 'user@example.com', name: 'John' }
⏳ Creating user...
❌ Register error: [error details]
```

### 2. Common Issues & Solutions

#### Issue 1: "User already exists"
**Cause**: Email is already registered
**Solution**: 
- Use a different email
- Or delete the existing user from MongoDB:
```bash
# In MongoDB shell or Compass
db.users.deleteOne({ email: "user@example.com" })
```

#### Issue 2: "Validation failed"
**Causes**:
- Name is empty
- Email is invalid format
- Password is less than 6 characters

**Solution**: Check frontend form:
- Name: Must not be empty
- Email: Must be valid format (user@domain.com)
- Password: Must be at least 6 characters

#### Issue 3: "CORS error"
**Error**: `Access to XMLHttpRequest blocked by CORS policy`
**Solution**: Backend already fixed with CORS configuration
- Make sure backend is running
- Check backend shows: `🚀 Server running on port 5000`

#### Issue 4: "Network Error" or "Failed to fetch"
**Causes**:
- Backend not running
- Wrong API URL
- Port mismatch

**Solution**:
1. Check backend is running: `npm run dev` in backend folder
2. Check frontend .env has correct API URL:
```
VITE_API_URL=http://localhost:5000/api
```

#### Issue 5: "MongoDB connection error"
**Error**: `MongoServerError` or `ECONNREFUSED`
**Solution**:
1. Make sure MongoDB is running:
```bash
# Windows
net start MongoDB

# Mac/Linux
sudo systemctl start mongod
```
2. Check connection string in backend/.env:
```
MONGODB_URI=mongodb://localhost:27017/financial-lifeguard
```

#### Issue 6: "Rate limit exceeded"
**Error**: `429 Too Many Requests`
**Solution**: Already fixed - wait 1 minute or restart backend

### 3. Debugging Steps

#### Step 1: Check Backend is Running
```bash
# In backend terminal, you should see:
🚀 Server running in development mode on port 5000
✅ MongoDB Connected
```

#### Step 2: Check Frontend Console (F12)
Look for errors:
- ✅ No errors = good
- ❌ Red errors = check error message

#### Step 3: Check Network Tab (F12)
1. Open Network tab
2. Try to register
3. Look for `/api/auth/register` request
4. Check:
   - Status: Should be 201 (success) or 400/500 (error)
   - Response: Shows error message
   - Request Payload: Shows what was sent

#### Step 4: Check Backend Terminal
Watch for the registration logs when you submit the form

### 4. Test Registration Manually

#### Using Browser Console (F12)
```javascript
// Test API directly
fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
```

#### Using curl
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

### 5. Check MongoDB

#### Using MongoDB Compass
1. Connect to `mongodb://localhost:27017`
2. Open `financial-lifeguard` database
3. Check `users` collection
4. See if user was created

#### Using MongoDB Shell
```bash
mongosh
use financial-lifeguard
db.users.find()
```

### 6. Reset Everything

If nothing works, try a fresh start:

```bash
# 1. Stop backend (Ctrl+C)

# 2. Clear MongoDB
mongosh
use financial-lifeguard
db.users.deleteMany({})
exit

# 3. Restart backend
cd backend
npm run dev

# 4. Hard refresh frontend
# In browser: Ctrl + Shift + F5

# 5. Try registration again
```

### 7. Check Environment Variables

#### Backend .env
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/financial-lifeguard
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:3000
```

#### Frontend .env (if exists)
```
VITE_API_URL=http://localhost:5000/api
```

### 8. What to Report

If registration still fails, provide:

1. **Backend logs** - Copy from terminal
2. **Browser console errors** - Screenshot or copy
3. **Network tab** - Screenshot of failed request
4. **What you entered** - Name, email format (not actual password)
5. **Error message** - Exact error shown on screen

## Quick Checklist

Before asking for help, verify:

- [ ] Backend is running (`npm run dev` in backend folder)
- [ ] MongoDB is running and connected
- [ ] No CORS errors in console
- [ ] Email is valid format
- [ ] Password is at least 6 characters
- [ ] Email is not already registered
- [ ] Checked backend terminal for logs
- [ ] Checked browser console (F12) for errors
- [ ] Checked Network tab for request/response

## Files Modified
- ✅ backend/routes/auth.js - Added detailed logging
- ✅ REGISTRATION_TROUBLESHOOTING.md - This guide
