# 🏊 Financial Lifeguard

A personal finance web application that automatically tracks and categorizes expenses by connecting to your Gmail account and parsing transaction emails.

## 🌟 Features

- **Email Integration**: Connect Gmail to automatically fetch transaction emails
- **Smart Categorization**: Auto-categorize expenses (Food, Travel, Shopping, etc.)
- **Dashboard Analytics**: Visual insights with charts and spending trends
- **Budget Management**: Set monthly limits and track spending per category
- **Transaction Management**: Search, filter, and manually edit transactions
- **Secure Authentication**: JWT + Google OAuth 2.0
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark/Light Mode**: Toggle between themes

## 🛠️ Tech Stack

### Frontend
- React.js with Vite
- Tailwind CSS for styling
- Recharts for data visualization
- Lucide React for icons
- React Router for navigation

### Backend
- Node.js + Express.js
- MongoDB with Mongoose
- JWT authentication
- Google Gmail API
- Express Rate Limiting & Helmet for security

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- Google Cloud Console project with Gmail API enabled

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
   - Set `MONGODB_URI` to your MongoDB connection string
   - Set `JWT_SECRET` to a secure random string
   - Add Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
   - Set `FRONTEND_URL` to your frontend URL (default: http://localhost:3000)

5. Start the backend server:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
VITE_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## 🔐 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`
5. Copy Client ID and Client Secret to backend `.env` file

## 📁 Project Structure

```
Financial Lifeguard/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   ├── Category.js
│   │   └── Budget.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── transactions.js
│   │   ├── categories.js
│   │   └── budget.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── services/
│   │   ├── gmailService.js
│   │   └── emailParser.js
│   ├── utils/
│   │   └── categorizer.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

## 🚀 Deployment

### Backend (Render/Railway)
1. Push code to GitHub
2. Connect repository to Render/Railway
3. Set environment variables
4. Deploy

### Frontend (Vercel)
1. Push code to GitHub
2. Import project to Vercel
3. Set `VITE_API_URL` environment variable
4. Deploy

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- HTTP-only cookies
- Rate limiting on API endpoints
- Helmet.js for security headers
- CORS configuration
- Gmail API with read-only scope

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback

### Transactions
- `GET /api/transactions` - Get all transactions (with filters)
- `GET /api/transactions/:id` - Get single transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `POST /api/transactions/sync` - Sync emails and fetch new transactions

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Budget
- `GET /api/budget` - Get all budgets
- `POST /api/budget` - Create/update budget
- `GET /api/budget/summary` - Get budget summary

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Gmail API for email integration
- Recharts for beautiful charts
- Tailwind CSS for styling
- Lucide for icons
