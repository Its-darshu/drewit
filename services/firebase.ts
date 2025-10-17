import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getDatabase, type Database } from 'firebase/database';

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

type RequiredEnvKey = (typeof requiredKeys)[number];

type Config = Record<RequiredEnvKey, string> & {
  VITE_FIREBASE_DATABASE_URL?: string;
};

const readConfig = (): Config => {
  const config = {} as Config;
  
  // Debug: Log available environment variables
  console.log('Environment variables available:', {
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE,
    PROD: import.meta.env.PROD,
    DEV: import.meta.env.DEV,
    envKeys: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
  });
  
  for (const key of requiredKeys) {
    const value = import.meta.env[key];
    if (!value) {
      console.error(`Missing Firebase config value: ${key}`);
      console.error('Available env vars:', Object.keys(import.meta.env));
      
      // Fallback: Try to get from window object (for Vercel deployment)
      const fallbackValue = (window as any).__FIREBASE_CONFIG__?.[key];
      if (fallbackValue) {
        console.log(`Using fallback config for ${key}`);
        config[key] = fallbackValue;
        continue;
      }
      
      throw new Error(`Missing Firebase config value: ${key}. Make sure to set environment variables in your deployment platform.`);
    }
    config[key] = value;
  }

  const databaseUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL;
  if (databaseUrl) {
    config.VITE_FIREBASE_DATABASE_URL = databaseUrl;
  }

  return config;
};

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let database: Database | undefined;
let config: Config | undefined;

const ensureInitialized = () => {
  if (!app) {
    if (!config) {
      config = readConfig();
    }
    
    const firebaseConfig: FirebaseOptions = {
      apiKey: config.VITE_FIREBASE_API_KEY,
      authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: config.VITE_FIREBASE_PROJECT_ID,
      storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: config.VITE_FIREBASE_APP_ID,
      databaseURL: config.VITE_FIREBASE_DATABASE_URL,
    };

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
    if (firebaseConfig.databaseURL) {
      database = getDatabase(app, firebaseConfig.databaseURL);
    }
  }
};

export const getFirebaseApp = (): FirebaseApp => {
  ensureInitialized();
  return app;
};

export const getFirebaseAuth = (): Auth => {
  ensureInitialized();
  return auth;
};

export const getFirestoreDb = (): Firestore => {
  ensureInitialized();
  return firestore;
};

export const getRealtimeDb = (): Database | undefined => {
  ensureInitialized();
  return database;
};
