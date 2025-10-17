// Debug utility to check Firebase configuration
// Add this script to your app temporarily to debug env var issues

export const debugFirebaseConfig = () => {
  console.group('🔥 Firebase Configuration Debug');
  
  console.log('Environment Mode:', import.meta.env.MODE);
  console.log('Is Production:', import.meta.env.PROD);
  console.log('Is Development:', import.meta.env.DEV);
  
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN', 
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];
  
  console.log('📋 Environment Variables Check:');
  requiredVars.forEach(key => {
    const value = import.meta.env[key];
    const status = value ? '✅' : '❌';
    const displayValue = value ? `${value.substring(0, 10)}...` : 'undefined';
    console.log(`${status} ${key}: ${displayValue}`);
  });
  
  console.log('🔍 All Available Vite Env Vars:');
  const viteVars = Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'));
  console.log(viteVars);
  
  console.log('🌐 Fallback Config Available:', !!(window as any).__FIREBASE_CONFIG__);
  
  console.groupEnd();
};

// Uncomment this line to run debug on app load
// debugFirebaseConfig();