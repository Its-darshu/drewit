import { getFirebaseApp } from './firebase';

export const verifyFirebaseConfig = () => {
  try {
    const app = getFirebaseApp();
    const config = app.options;
    
    console.log('🔍 Firebase Configuration Check:');
    console.log('✓ Project ID:', config.projectId);
    console.log('✓ Auth Domain:', config.authDomain);
    console.log('✓ API Key:', config.apiKey ? '***' + config.apiKey.slice(-4) : 'Missing');
    console.log('✓ Storage Bucket:', config.storageBucket);
    console.log('✓ Messaging Sender ID:', config.messagingSenderId);
    console.log('✓ App ID:', config.appId);
    
    const missingFields = [];
    if (!config.projectId) missingFields.push('projectId');
    if (!config.authDomain) missingFields.push('authDomain');
    if (!config.apiKey) missingFields.push('apiKey');
    if (!config.storageBucket) missingFields.push('storageBucket');
    if (!config.messagingSenderId) missingFields.push('messagingSenderId');
    if (!config.appId) missingFields.push('appId');
    
    if (missingFields.length > 0) {
      console.error('❌ Missing Firebase config fields:', missingFields);
      return { valid: false, missing: missingFields };
    }
    
    console.log('✅ Firebase configuration is complete');
    return { valid: true, config };
  } catch (error) {
    console.error('❌ Firebase configuration error:', error);
    return { valid: false, error: error.message };
  }
};