# 🚀 Sympli Deployment Guide

## Pre-Deployment Checklist

### ✅ Environment Variables
Make sure these are set in your hosting platform:
```
OPENAI_API_KEY=sk-your-openai-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MONGODB_URI=your-mongodb-connection-string (if using MongoDB)
```

### ✅ Database Setup
1. Ensure your Supabase database is properly configured
2. Run any necessary migrations
3. Test database connections

### ✅ API Keys
1. Verify OpenAI API key is valid
2. Check Supabase credentials
3. Test API endpoints locally

## Deployment Options

### 1. Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

### 2. Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables in Netlify dashboard
```

### 3. Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables in Railway dashboard
```

### 4. Render
1. Push code to GitHub
2. Connect repo to Render
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Add environment variables

## Post-Deployment

### ✅ Test Your App
1. Test voice transcription
2. Test symptom logging
3. Test PDF generation
4. Test authentication flow

### ✅ Monitor Performance
1. Check API response times
2. Monitor error rates
3. Test on mobile devices

### ✅ Security
1. Verify HTTPS is enabled
2. Check CORS settings
3. Validate API key security

## Troubleshooting

### Common Issues:
1. **Environment variables not loading**: Check hosting platform settings
2. **API errors**: Verify API keys and quotas
3. **Database connection issues**: Check connection strings
4. **Build failures**: Check Node.js version compatibility

### Support:
- Vercel: https://vercel.com/docs
- Netlify: https://docs.netlify.com
- Railway: https://docs.railway.app
- Render: https://render.com/docs
