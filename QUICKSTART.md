# 🚀 Quick Start Guide

Get Financial Lifeguard up and running in 5 minutes!

## Prerequisites
- Node.js v18+
- MongoDB running locally OR MongoDB Atlas account
- Google Cloud project with Gmail API enabled

## 1. Clone & Install

```bash
# Backend
cd backend
npm install
cp .env.example .env

# Frontend (in new terminal)
cd frontend
npm install
cp .env.example .env
```

## 2. Configure Environment

### Backend `.env`
```env
MONGODB_URI=mongodb://localhost:27017/financial-lifeguard
JWT_SECRET=your_random_secret_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000/api
```

## 3. Initialize Database

```bash
cd backend
node scripts/initCategories.js
```

## 4. Start Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## 5. Access Application

Open browser: `http://localhost:3000`

1. Sign up for a new account
2. Connect Gmail (optional)
3. Start tracking expenses!

## Google OAuth Setup (5 min)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable Gmail API
3. Create OAuth 2.0 credentials (Web application)
4. Add redirect URI: `http://localhost:5000/api/auth/google/callback`
5. Copy Client ID & Secret to backend `.env`

## Troubleshooting

**MongoDB Error**: Ensure MongoDB is running
```bash
# Check if MongoDB is running
mongosh
```

**Port Already in Use**: Change PORT in backend `.env`

**CORS Error**: Verify FRONTEND_URL matches your frontend port

## What's Next?

- ✅ Create your first budget
- ✅ Add custom categories
- ✅ Sync Gmail transactions
- ✅ View spending analytics

For detailed setup, see [SETUP.md](./SETUP.md)
