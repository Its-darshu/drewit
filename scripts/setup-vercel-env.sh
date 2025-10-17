#!/bin/bash
# Quick setup script for Vercel environment variables
# Run this script after installing Vercel CLI: npm i -g vercel

echo "🚀 Setting up Firebase environment variables for Vercel..."

echo "Setting VITE_FIREBASE_API_KEY..."
echo "AIzaSyArsrON4pdSGX6n5L64DHTUfXHFhf2dH8o" | vercel env add VITE_FIREBASE_API_KEY production preview

echo "Setting VITE_FIREBASE_AUTH_DOMAIN..."
echo "drewit-7d6d9.firebaseapp.com" | vercel env add VITE_FIREBASE_AUTH_DOMAIN production preview

echo "Setting VITE_FIREBASE_PROJECT_ID..."
echo "drewit-7d6d9" | vercel env add VITE_FIREBASE_PROJECT_ID production preview

echo "Setting VITE_FIREBASE_STORAGE_BUCKET..."
echo "drewit-7d6d9.firebasestorage.app" | vercel env add VITE_FIREBASE_STORAGE_BUCKET production preview

echo "Setting VITE_FIREBASE_MESSAGING_SENDER_ID..."
echo "632636093624" | vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID production preview

echo "Setting VITE_FIREBASE_APP_ID..."
echo "1:632636093624:web:90cb8d84a1c5bf4142ce5f" | vercel env add VITE_FIREBASE_APP_ID production preview

echo "Setting VITE_FIREBASE_MEASUREMENT_ID..."
echo "G-R1F3T5ELH1" | vercel env add VITE_FIREBASE_MEASUREMENT_ID production preview

echo "✅ All environment variables set!"
echo "🔄 Triggering new deployment..."
vercel --prod

echo "🎉 Deployment triggered! Check your Vercel dashboard for progress."