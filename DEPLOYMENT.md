# Vercel Deployment Guide

## Environment Variables Setup

⚠️ **IMPORTANT**: You must set these environment variables directly in the Vercel dashboard, NOT as secrets.

### Step-by-Step Vercel Environment Variables Setup

1. **Go to your Vercel Dashboard**
2. **Navigate to your project**
3. **Go to Settings → Environment Variables**
4. **Add each variable below individually**:

   **Variable Name**: `VITE_FIREBASE_API_KEY`  
   **Value**: `AIzaSyArsrON4pdSGX6n5L64DHTUfXHFhf2dH8o`  
   **Environment**: Production, Preview (check both)

   **Variable Name**: `VITE_FIREBASE_AUTH_DOMAIN`  
   **Value**: `drewit-7d6d9.firebaseapp.com`  
   **Environment**: Production, Preview (check both)

   **Variable Name**: `VITE_FIREBASE_PROJECT_ID`  
   **Value**: `drewit-7d6d9`  
   **Environment**: Production, Preview (check both)

   **Variable Name**: `VITE_FIREBASE_STORAGE_BUCKET`  
   **Value**: `drewit-7d6d9.firebasestorage.app`  
   **Environment**: Production, Preview (check both)

   **Variable Name**: `VITE_FIREBASE_MESSAGING_SENDER_ID`  
   **Value**: `632636093624`  
   **Environment**: Production, Preview (check both)

   **Variable Name**: `VITE_FIREBASE_APP_ID`  
   **Value**: `1:632636093624:web:90cb8d84a1c5bf4142ce5f`  
   **Environment**: Production, Preview (check both)

   **Variable Name**: `VITE_FIREBASE_MEASUREMENT_ID`  
   **Value**: `G-R1F3T5ELH1`  
   **Environment**: Production, Preview (check both)

5. **Save all variables**
6. **Trigger a new deployment** (Go to Deployments → Click "..." → Redeploy)

## Deployment Steps

1. **Connect Repository**: Connect your GitHub repository to Vercel
2. **Environment Variables**: Follow the setup above (CRITICAL)
3. **Build Settings**: Vercel should auto-detect Vite settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. **Deploy**: Trigger a new deployment after setting environment variables

## Firebase Domain Configuration

After successful deployment, add your Vercel domain to Firebase Auth:

1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your Vercel domain (e.g., `your-app.vercel.app`)
3. Also add any custom domains you plan to use

## Troubleshooting

### "Environment Variable references Secret which does not exist"
This error means the `vercel.json` had secret references. This is now fixed - use direct environment variables instead.

### "Missing Firebase config value" Error
1. **Verify Environment Variables**: Check all 7 Firebase variables are set in Vercel dashboard
2. **Check Environment Scope**: Ensure variables are set for both Production and Preview
3. **Redeploy**: After adding env vars, trigger a new deployment from Vercel dashboard
4. **Check Build Logs**: Look for environment variable loading messages

### Build Verification
After deployment, check the build logs for:
```
✅ Environment variables available: { VITE_FIREBASE_API_KEY: true }
```

If you see:
```
❌ Missing Firebase config value: VITE_FIREBASE_API_KEY
```

Then the environment variables weren't set correctly in Vercel.

## Quick Setup Commands

If you prefer using Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Set environment variables via CLI
vercel env add VITE_FIREBASE_API_KEY
# Enter value: AIzaSyArsrON4pdSGX6n5L64DHTUfXHFhf2dH8o
# Select environments: Production, Preview

vercel env add VITE_FIREBASE_AUTH_DOMAIN
# Enter value: drewit-7d6d9.firebaseapp.com

vercel env add VITE_FIREBASE_PROJECT_ID
# Enter value: drewit-7d6d9

vercel env add VITE_FIREBASE_STORAGE_BUCKET
# Enter value: drewit-7d6d9.firebasestorage.app

vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
# Enter value: 632636093624

vercel env add VITE_FIREBASE_APP_ID
# Enter value: 1:632636093624:web:90cb8d84a1c5bf4142ce5f

vercel env add VITE_FIREBASE_MEASUREMENT_ID
# Enter value: G-R1F3T5ELH1

# Redeploy
vercel --prod
```

## Performance Optimizations Applied

- ✅ Code splitting for vendor libraries
- ✅ Separate chunks for Firebase, Router, RoughJS
- ✅ Increased chunk size warning limit
- ✅ SPA routing configuration
- ✅ Gzip compression optimization
- ✅ Lazy Firebase initialization
- ✅ Environment variable fallback system