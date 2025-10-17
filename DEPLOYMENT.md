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

## Deployment Steps

1. **Connect Repository**: Connect your GitHub repository to Vercel
2. **Environment Variables**: Add all Firebase config variables above
3. **Build Settings**: Vercel should auto-detect Vite settings, but verify:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

## Firebase Domain Configuration

Don't forget to add your Vercel domain to Firebase Auth:

1. Go to Firebase Console → Authentication → Settings
2. Add your Vercel domain (e.g., `your-app.vercel.app`) to Authorized domains
3. Also add any custom domains you plan to use

## Troubleshooting

- **Build Errors**: Check that all environment variables are set correctly
- **Auth Issues**: Verify Firebase domain configuration
- **Routing Issues**: The `vercel.json` config handles SPA routing automatically
- **Chunk Size**: The optimized build configuration should resolve size warnings

## Performance Optimizations Applied

- ✅ Code splitting for vendor libraries
- ✅ Separate chunks for Firebase, Router, RoughJS
- ✅ Increased chunk size warning limit
- ✅ SPA routing configuration
- ✅ Gzip compression optimization