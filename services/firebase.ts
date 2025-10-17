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
  for (const key of requiredKeys) {
    const value = import.meta.env[key];
    if (!value) {
      throw new Error(`Missing Firebase config value: ${key}`);
    }
    config[key] = value;
  }

  const databaseUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL;
  if (databaseUrl) {
    config.VITE_FIREBASE_DATABASE_URL = databaseUrl;
  }

  return config;
};

const env = readConfig();

const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
};

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let database: Database | undefined;

const ensureInitialized = () => {
  if (!app) {
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
