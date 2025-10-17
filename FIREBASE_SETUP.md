# Firebase Database Integration Setup Guide

## Current Status ✅
- Firebase SDK installed and configured
- Environment variables properly set
- Code integration complete
- Build successful

## Potential Issues & Solutions

### 1. Firestore Security Rules
Your Firestore database needs proper security rules to allow authenticated users to read/write data.

**In Firebase Console:**
1. Go to Firestore Database
2. Click "Rules" tab
3. Replace the rules with the content from `firestore.rules` in this project
4. Click "Publish"

### 2. Firestore Database Not Enabled
**In Firebase Console:**
1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (temporary)
4. Select a region close to your users

### 3. Authentication Not Configured
**In Firebase Console:**
1. Go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Google" provider
5. Add your domain (localhost:3001 for development)

### 4. Firebase Configuration Mismatch
Verify these values in Firebase Console → Project Settings:
- API Key: `AIzaSyArsrON4pdSGX6n5L64DHTUfXHFhf2dH8o`
- Project ID: `drewit-7d6d9`
- Auth Domain: `drewit-7d6d9.firebaseapp.com`

## Testing the Integration

1. **Start the app**: `npm run dev`
2. **Open**: http://localhost:3001
3. **Sign in with Google**
4. **Create a board** - should save to Firestore
5. **Draw something** - should auto-save

## Error Debugging

Check browser console (F12) for errors like:
- `Missing or insufficient permissions`
- `Firestore: PERMISSION_DENIED`
- `Firebase: Error (auth/unauthorized-domain)`

## Deploy to Production

For Vercel deployment, ensure environment variables are set:
```bash
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_AUTH_DOMAIN
vercel env add VITE_FIREBASE_PROJECT_ID
vercel env add VITE_FIREBASE_STORAGE_BUCKET
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
vercel env add VITE_FIREBASE_APP_ID
```