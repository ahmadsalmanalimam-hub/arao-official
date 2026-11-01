import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAZp4LnE9ITfExb72_DBGSRP5a171W_gvs",
  authDomain: "arao-79bee.firebaseapp.com",
  projectId: "arao-79bee",
  storageBucket: "arao-79bee.firebasestorage.app",
  messagingSenderId: "66128613083",
  appId: "1:66128613083:web:2ce98eb4829efeea7d46fe"
};

// Initialize Firebase once
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
