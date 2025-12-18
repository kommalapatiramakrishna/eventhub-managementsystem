# 🚀 EventHub - Complete Deployment Guide

## Overview
This guide will help you deploy the EventHub MERN application in three parts:
1. **Database** - MongoDB Atlas (Cloud Database)
2. **Backend** - Render (Node.js/Express API)
3. **Frontend** - Vercel (React Application)

---

## Part 1: Database Setup (MongoDB Atlas)

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster (Free tier M0 is sufficient)

### Step 2: Configure Database
1. **Create Database User:**
   - Go to Database Access
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `eventhub_user`
   - Password: Generate a strong password (save it!)
   - Database User Privileges: "Read and write to any database"

2. **Whitelist IP Addresses:**
   - Go to Network Access
   - Click "Add IP Address"
   - Select "Allow Access from Anywhere" (0.0.0.0/0)
   - This allows Render to connect

3. **Get Connection String:**
   - Go to Database → Connect
   - Choose "Connect your application"
   - Copy the connection string
   - It looks like: `mongodb+srv://eventhub_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - Replace `<password>` with your actual password

### Step 3: Test Connection (Optional)
```bash
# Install MongoDB Compass (GUI tool)
# Use the connection string to connect and verify
```

---

## Part 2: Backend Deployment (Render)

### Step 1: Prepare Backend Code
1. Ensure `server/package.json` has all dependencies
2. Update `server/.env.example` with required variables

### Step 2: Deploy to Render
1. Go to [Render](https://render.com)
2. Sign up/Login with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name:** `eventhub-api`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free

### Step 3: Set Environment Variables
In Render dashboard, add these environment variables:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://eventhub_user:<password>@cluster0.xxxxx.mongodb.net/eventhub?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=https://your-app.vercel.app
```

**Important:**
- Replace MongoDB URI with your actual connection string
- Generate a strong JWT_SECRET (use: `openssl rand -base64 32`)
- Update FRONTEND_URL after deploying frontend

### Step 4: Deploy
1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Your API will be available at: `https://eventhub-api.onrender.com`
4. Test: Visit `https://eventhub-api.onrender.com/health`

---

## Part 3: Frontend Deployment (Vercel)

### Step 1: Prepare Frontend Code
1. Update `client/.env.example`:
```env
REACT_APP_API_URL=https://eventhub-api.onrender.com
```

2. Create `client/.env.production`:
```env
REACT_APP_API_URL=https://eventhub-api.onrender.com
```

### Step 2: Deploy to Vercel
1. Go to [Vercel](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset:** Create React App
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

### Step 3: Set Environment Variables
In Vercel dashboard, add:
```env
REACT_APP_API_URL=https://eventhub-api.onrender.com
```

### Step 4: Deploy
1. Click "Deploy"
2. Wait for deployment (2-5 minutes)
3. Your app will be available at: `https://your-app.vercel.app`

### Step 5: Update Backend CORS
1. Go back to Render dashboard
2. Update `FRONTEND_URL` environment variable with your Vercel URL
3. Redeploy the backend

---

## Post-Deployment Configuration

### Update Backend CORS
In `server/server.js`, the CORS is already configured to accept your frontend URL from environment variable.

### Test the Application
1. Visit your Vercel URL
2. Register a new account
3. Create an event
4. Test RSVP functionality
5. Check all pages work correctly

---

## Environment Variables Summary

### Backend (.env)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eventhub
JWT_SECRET=your-secret-key
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (.env.production)
```env
REACT_APP_API_URL=https://eventhub-api.onrender.com
```

---

## Troubleshooting

### Backend Issues
- **500 Error:** Check Render logs for MongoDB connection errors
- **CORS Error:** Verify FRONTEND_URL is set correctly
- **JWT Error:** Ensure JWT_SECRET is set

### Frontend Issues
- **API Connection Failed:** Check REACT_APP_API_URL is correct
- **Build Failed:** Run `npm run build` locally to test
- **Blank Page:** Check browser console for errors

### Database Issues
- **Connection Timeout:** Verify IP whitelist includes 0.0.0.0/0
- **Authentication Failed:** Check username/password in connection string
- **Database Not Found:** MongoDB will create it automatically on first write

---

## Monitoring & Maintenance

### Render (Backend)
- Free tier sleeps after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds
- Upgrade to paid tier for always-on service

### Vercel (Frontend)
- Free tier includes:
  - 100 GB bandwidth
  - Unlimited deployments
  - Automatic HTTPS

### MongoDB Atlas (Database)
- Free tier includes:
  - 512 MB storage
  - Shared RAM
  - Sufficient for development/small apps

---

## Security Checklist

- ✅ Strong JWT_SECRET generated
- ✅ MongoDB user has limited permissions
- ✅ Environment variables not committed to Git
- ✅ CORS configured for specific domains
- ✅ HTTPS enabled (automatic on Vercel/Render)
- ✅ Input validation on all forms
- ✅ Password hashing with bcrypt

---

## Scaling Considerations

### When to Upgrade
- **Backend:** When you need always-on service or more RAM
- **Database:** When storage exceeds 512 MB
- **Frontend:** When bandwidth exceeds 100 GB/month

### Performance Tips
- Enable MongoDB indexes for faster queries
- Implement caching for frequently accessed data
- Use CDN for static assets
- Optimize images and bundle size

---

## Support & Resources

- **MongoDB Atlas:** https://docs.atlas.mongodb.com/
- **Render:** https://render.com/docs
- **Vercel:** https://vercel.com/docs
- **React:** https://react.dev/
- **Express:** https://expressjs.com/

---

## Quick Start Commands

### Local Development
```bash
# Backend
cd server
npm install
npm start

# Frontend
cd client
npm install
npm start
```

### Production URLs
- **Frontend:** https://your-app.vercel.app
- **Backend API:** https://eventhub-api.onrender.com
- **Database:** MongoDB Atlas Cloud

---

**🎉 Congratulations! Your EventHub application is now deployed and ready to use!**
