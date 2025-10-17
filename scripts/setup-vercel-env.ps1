# Quick setup script for Vercel environment variables (PowerShell)
# Run this script after installing Vercel CLI: npm i -g vercel

Write-Host "🚀 Setting up Firebase environment variables for Vercel..." -ForegroundColor Green

Write-Host "Setting VITE_FIREBASE_API_KEY..." -ForegroundColor Yellow
"AIzaSyArsrON4pdSGX6n5L64DHTUfXHFhf2dH8o" | vercel env add VITE_FIREBASE_API_KEY production preview

Write-Host "Setting VITE_FIREBASE_AUTH_DOMAIN..." -ForegroundColor Yellow
"drewit-7d6d9.firebaseapp.com" | vercel env add VITE_FIREBASE_AUTH_DOMAIN production preview

Write-Host "Setting VITE_FIREBASE_PROJECT_ID..." -ForegroundColor Yellow
"drewit-7d6d9" | vercel env add VITE_FIREBASE_PROJECT_ID production preview

Write-Host "Setting VITE_FIREBASE_STORAGE_BUCKET..." -ForegroundColor Yellow
"drewit-7d6d9.firebasestorage.app" | vercel env add VITE_FIREBASE_STORAGE_BUCKET production preview

Write-Host "Setting VITE_FIREBASE_MESSAGING_SENDER_ID..." -ForegroundColor Yellow
"632636093624" | vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID production preview

Write-Host "Setting VITE_FIREBASE_APP_ID..." -ForegroundColor Yellow
"1:632636093624:web:90cb8d84a1c5bf4142ce5f" | vercel env add VITE_FIREBASE_APP_ID production preview

Write-Host "Setting VITE_FIREBASE_MEASUREMENT_ID..." -ForegroundColor Yellow
"G-R1F3T5ELH1" | vercel env add VITE_FIREBASE_MEASUREMENT_ID production preview

Write-Host "✅ All environment variables set!" -ForegroundColor Green
Write-Host "🔄 Triggering new deployment..." -ForegroundColor Blue
vercel --prod

Write-Host "🎉 Deployment triggered! Check your Vercel dashboard for progress." -ForegroundColor Green