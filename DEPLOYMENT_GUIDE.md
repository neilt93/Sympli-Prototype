# 🚀 Deployment Guide - Sympli Health

This guide covers multiple hosting options for your Next.js Sympli Health application.

## 🎯 Quick Deploy Options

### 1. **Vercel (Recommended) - Easiest**
- **Free tier:** Yes
- **Automatic deployments:** Yes
- **Custom domain:** Yes
- **SSL:** Automatic

#### Setup Steps:
1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub
   - Click "New Project"
   - Import your repository
   - Vercel auto-detects Next.js
   - Click "Deploy"

3. **Environment Variables:**
   - Add your environment variables in Vercel dashboard:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY`

4. **Custom Domain (Optional):**
   - In Vercel dashboard → Settings → Domains
   - Add your custom domain

### 2. **Netlify - Great Alternative**
- **Free tier:** Yes
- **Automatic deployments:** Yes
- **Custom domain:** Yes
- **SSL:** Automatic

#### Setup Steps:
1. **Push to GitHub** (same as above)

2. **Deploy on Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub
   - Click "New site from Git"
   - Choose your repository
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Click "Deploy site"

3. **Environment Variables:**
   - Site settings → Environment variables
   - Add all required environment variables

### 3. **Railway - Full-Stack Ready**
- **Free tier:** Limited
- **Database hosting:** Yes
- **Custom domain:** Yes
- **SSL:** Automatic

#### Setup Steps:
1. **Push to GitHub**

2. **Deploy on Railway:**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your repository
   - Railway auto-detects Next.js

3. **Environment Variables:**
   - Add in Railway dashboard
   - All variables are automatically available

### 4. **Render - Simple & Reliable**
- **Free tier:** Yes
- **Automatic deployments:** Yes
- **Custom domain:** Yes
- **SSL:** Automatic

#### Setup Steps:
1. **Push to GitHub**

2. **Deploy on Render:**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub
   - Click "New Web Service"
   - Connect your repository
   - Build command: `npm run build`
   - Start command: `npm start`
   - Click "Create Web Service"

## 🔧 Pre-Deployment Checklist

### 1. **Environment Variables**
Create a `.env.local` file with:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

### 2. **Build Test**
Test locally before deploying:
```bash
npm run build
npm start
```

### 3. **Database Setup**
Ensure your Supabase database is:
- ✅ Created and configured
- ✅ Tables created (users, symptom_logs, etc.)
- ✅ Row Level Security (RLS) enabled
- ✅ API keys generated

### 4. **Code Optimization**
- ✅ Remove console.logs (or use production logging)
- ✅ Optimize images
- ✅ Check for unused dependencies

## 🌐 Custom Domain Setup

### 1. **Vercel:**
- Dashboard → Settings → Domains
- Add domain
- Update DNS records as instructed

### 2. **Netlify:**
- Site settings → Domain management
- Add custom domain
- Update DNS records

### 3. **Railway:**
- Project → Settings → Domains
- Add custom domain

## 🔒 Security Considerations

### 1. **Environment Variables**
- ✅ Never commit `.env` files
- ✅ Use production API keys
- ✅ Rotate keys regularly

### 2. **Database Security**
- ✅ Enable RLS in Supabase
- ✅ Use service role key only on server
- ✅ Validate user permissions

### 3. **API Security**
- ✅ Rate limiting
- ✅ Input validation
- ✅ CORS configuration

## 📊 Monitoring & Analytics

### 1. **Vercel Analytics**
- Built-in performance monitoring
- Real user metrics
- Error tracking

### 2. **Google Analytics**
Add to your app:
```javascript
// pages/_app.js
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    const handleRouteChange = (url) => {
      gtag.pageview(url)
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  return <Component {...pageProps} />
}
```

### 3. **Error Monitoring**
- **Sentry:** Error tracking
- **LogRocket:** Session replay
- **Bugsnag:** Error reporting

## 🚀 Performance Optimization

### 1. **Next.js Optimizations**
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-domain.com'],
  },
  compress: true,
  poweredByHeader: false,
}
```

### 2. **Database Optimization**
- ✅ Index frequently queried columns
- ✅ Use connection pooling
- ✅ Optimize queries

### 3. **CDN Setup**
- ✅ Enable Vercel/Netlify CDN
- ✅ Use image optimization
- ✅ Cache static assets

## 📱 Mobile Optimization

### 1. **PWA Setup**
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
})

module.exports = withPWA({
  // your config
})
```

### 2. **Responsive Design**
- ✅ Test on mobile devices
- ✅ Optimize touch targets
- ✅ Ensure readable text

## 🔄 Continuous Deployment

### 1. **GitHub Actions**
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
```

### 2. **Auto-deploy Branches**
- `main` → Production
- `develop` → Staging
- `feature/*` → Preview deployments

## 📈 Scaling Considerations

### 1. **Database Scaling**
- ✅ Supabase auto-scales
- ✅ Monitor usage limits
- ✅ Optimize queries

### 2. **Application Scaling**
- ✅ Vercel/Netlify auto-scale
- ✅ Use edge functions for global performance
- ✅ Implement caching strategies

### 3. **Cost Optimization**
- ✅ Monitor usage
- ✅ Use appropriate tiers
- ✅ Optimize API calls

## 🆘 Troubleshooting

### Common Issues:

1. **Build Failures:**
   - Check environment variables
   - Verify dependencies
   - Check for TypeScript errors

2. **Database Connection:**
   - Verify Supabase credentials
   - Check RLS policies
   - Test API endpoints

3. **Performance Issues:**
   - Optimize images
   - Implement caching
   - Use CDN

4. **Domain Issues:**
   - Check DNS settings
   - Verify SSL certificates
   - Clear browser cache

## 📞 Support Resources

- **Vercel:** [vercel.com/docs](https://vercel.com/docs)
- **Netlify:** [docs.netlify.com](https://docs.netlify.com)
- **Railway:** [docs.railway.app](https://docs.railway.app)
- **Supabase:** [supabase.com/docs](https://supabase.com/docs)
- **Next.js:** [nextjs.org/docs](https://nextjs.org/docs)

---

**Ready to deploy? Choose your platform and follow the steps above! 🚀**
