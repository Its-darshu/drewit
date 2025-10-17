# Vercel Deployment Guide

## Environment Variables Setup

Add these environment variables in your Vercel dashboard (Project Settings → Environment Variables):

### Production Environment Variables
```
VITE_FIREBASE_API_KEY=AIzaSyArsrON4pdSGX6n5L64DHTUfXHFhf2dH8o
VITE_FIREBASE_AUTH_DOMAIN=drewit-7d6d9.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=drewit-7d6d9
VITE_FIREBASE_STORAGE_BUCKET=drewit-7d6d9.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=632636093624
VITE_FIREBASE_APP_ID=1:632636093624:web:90cb8d84a1c5bf4142ce5f
VITE_FIREBASE_MEASUREMENT_ID=G-R1F3T5ELH1
```

⚠️ **CRITICAL**: Make sure to set these as **Environment Variables** in Vercel, NOT as build-time variables.

## Deployment Steps

1. **Connect Repository**: Connect your GitHub repository to Vercel
2. **Environment Variables**: 
   - Go to Project Settings → Environment Variables
   - Add each Firebase variable above
   - Set environment to "Production" (and optionally "Preview")
3. **Build Settings**: Vercel should auto-detect Vite settings, but verify:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. **Deploy**: Trigger a new deployment after setting environment variables

## Firebase Domain Configuration

Don't forget to add your Vercel domain to Firebase Auth:

1. Go to Firebase Console → Authentication → Settings
2. Add your Vercel domain (e.g., `your-app.vercel.app`) to Authorized domains
3. Also add any custom domains you plan to use

## Troubleshooting

### "Missing Firebase config value" Error
This error occurs when environment variables aren't properly loaded:

1. **Check Environment Variables**: Ensure all Firebase variables are set in Vercel dashboard
2. **Redeploy**: After adding env vars, trigger a new deployment
3. **Check Logs**: Use `vercel logs` to see build-time errors
4. **Verify Naming**: All Firebase env vars must start with `VITE_`

### Build Logs to Check
```bash
# Check if env vars are available during build
vercel logs your-deployment-url

# Look for these logs:
# ✅ "Environment variables available: { VITE_FIREBASE_API_KEY: true }"
# ❌ "Missing Firebase config value: VITE_FIREBASE_API_KEY"
```

### Common Issues
- **Auth Issues**: Verify Firebase domain configuration
- **Routing Issues**: The `vercel.json` config handles SPA routing automatically
- **Chunk Size**: The optimized build configuration should resolve size warnings
- **Environment Variables**: Must be set in Vercel dashboard, not in code

## Alternative Deployment Platforms

### Netlify
```bash
# Add to Netlify environment variables
VITE_FIREBASE_API_KEY=your_value
VITE_FIREBASE_AUTH_DOMAIN=your_value
# ... etc
```

### Railway/Render
Same environment variables as Vercel. Make sure they're set in the platform's environment configuration.

## Performance Optimizations Applied

- ✅ Code splitting for vendor libraries
- ✅ Separate chunks for Firebase, Router, RoughJS
- ✅ Increased chunk size warning limit
- ✅ SPA routing configuration
- ✅ Gzip compression optimization
- ✅ Lazy Firebase initialization
- ✅ Environment variable fallback system