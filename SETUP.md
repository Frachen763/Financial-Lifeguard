# Financial Lifeguard - Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **MongoDB** (local installation or MongoDB Atlas account)
- **npm** or **yarn**
- **Google Cloud Console** account (for Gmail API)

## Step 1: Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Gmail API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback` (for development)
     - Your production URL when deploying
   - Save the **Client ID** and **Client Secret**

## Step 2: Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=5000
NODE_ENV=development

# MongoDB - Use one of these options:
# Option 1: Local MongoDB
MONGODB_URI=mongodb://localhost:27017/financial-lifeguard

# Option 2: MongoDB Atlas (recommended)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/financial-lifeguard

# JWT Secret - Generate a random string
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# Google OAuth - From Google Cloud Console
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

5. Initialize default categories:
```bash
node scripts/initCategories.js
```

6. Start the backend server:
```bash
npm run dev
```

The backend should now be running on `http://localhost:5000`

## Step 3: Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

5. Start the frontend development server:
```bash
npm run dev
```

The frontend should now be running on `http://localhost:3000`

## Step 4: MongoDB Setup

### Option A: Local MongoDB

1. Install MongoDB Community Edition from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Start MongoDB service:
   - Windows: MongoDB should start automatically as a service
   - Mac: `brew services start mongodb-community`
   - Linux: `sudo systemctl start mongod`

### Option B: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Create a database user
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string and update `MONGODB_URI` in backend `.env`

## Step 5: Test the Application

1. Open your browser and go to `http://localhost:3000`
2. Click "Sign Up" to create a new account
3. After registration, you'll be redirected to the dashboard
4. Click "Connect Gmail" to authorize Gmail access
5. Once connected, click "Sync Emails" to fetch transactions

## Common Issues & Solutions

### Issue: MongoDB Connection Error
**Solution**: 
- Ensure MongoDB is running
- Check if the connection string in `.env` is correct
- For Atlas, ensure your IP is whitelisted

### Issue: Google OAuth Error (400: invalid_request)
**Solution**:
1. **Check OAuth Consent Screen**:
   - Go to Google Cloud Console > "APIs & Services" > "OAuth consent screen"
   - Ensure the consent screen is configured (Internal or External)
   - Add your email as a test user if using External type
   - Save all changes

2. **Verify OAuth Client Configuration**:
   - Go to "APIs & Services" > "Credentials"
   - Click on your OAuth 2.0 Client ID
   - **Application type** must be "Web application"
   - **Authorized redirect URIs** must include EXACTLY:
     - `http://localhost:5000/api/auth/google/callback`
   - Click "Save" after any changes

3. **Check Environment Variables**:
   - Verify `GOOGLE_CLIENT_ID` matches the Client ID from Google Console
   - Verify `GOOGLE_CLIENT_SECRET` matches the Client Secret
   - Verify `GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback`
   - Restart backend server after changing .env file

4. **Common Mistakes**:
   - Extra spaces in redirect URI
   - Using https instead of http for localhost
   - Wrong port number (must be 5000 for backend)
   - Client ID from wrong project

5. **Run OAuth Diagnostic Test**:
   ```bash
   cd backend
   npm run test:oauth
   ```
   This will check your OAuth configuration and generate a test URL

6. **If still failing**:
   - Delete existing OAuth client and create a new one
   - Clear browser cookies and cache
   - Try in incognito/private browsing mode

### Issue: CORS Error
**Solution**:
- Verify `FRONTEND_URL` in backend `.env` matches your frontend URL
- Check that both servers are running

### Issue: No Transactions Found
**Solution**:
- Ensure Gmail is connected
- Check if you have transaction emails in your Gmail
- The app looks for keywords like "transaction", "payment", "debited", etc.

## Development Tips

1. **Hot Reload**: Both frontend and backend support hot reload during development

2. **API Testing**: Use tools like Postman or Thunder Client to test API endpoints

3. **Database Inspection**: Use MongoDB Compass to view and manage your database

4. **Logs**: Check terminal output for both frontend and backend for debugging

## Next Steps

1. **Customize Categories**: Add or modify expense categories in the Categories page
2. **Set Budgets**: Create monthly budgets for different categories
3. **Manual Transactions**: Add transactions manually if needed
4. **Export Data**: Download your transaction data as CSV

## Production Deployment

### Backend (Render/Railway)
1. Push code to GitHub
2. Create new web service
3. Set environment variables
4. Deploy

### Frontend (Vercel)
1. Push code to GitHub
2. Import project to Vercel
3. Set `VITE_API_URL` to your backend URL
4. Deploy

## Security Notes

- Never commit `.env` files to version control
- Use strong JWT secrets in production
- Enable HTTPS in production
- Regularly update dependencies
- Review Gmail API scopes (currently read-only)

## Support

For issues or questions:
- Check the README.md file
- Review API documentation
- Check browser console for errors
- Review server logs

---

**Congratulations!** Your Financial Lifeguard application is now set up and ready to use. 🏊
