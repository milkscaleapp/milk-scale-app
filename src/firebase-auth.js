import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut
} from 'firebase/auth';

// Firebase web configuration for the existing Milk Scale project.
const firebaseConfig = {
  apiKey: 'AIzaSyC0ppOgik5r-4dO66DH1VOn-748iErjxS8',
  authDomain: 'milk-scale-b4ec4.firebaseapp.com',
  projectId: 'milk-scale-b4ec4',
  storageBucket: 'milk-scale-b4ec4.firebasestorage.app',
  messagingSenderId: '919647485111',
  appId: '1:919647485111:web:74dceafb3d44d5bb536132'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(error => {
  console.warn('Could not set local auth persistence:', error?.code || error);
});

function getCurrentUser() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      resolve(user || null);
    }, () => {
      unsubscribe();
      resolve(null);
    });
  });
}

function validateCredentials(email, password) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('सही ईमेल पता दर्ज करें।');
  }
  if (typeof password !== 'string' || password.length < 6) {
    throw new Error('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।');
  }
}

async function createAccount(email, password) {
  email = String(email || '').trim();
  validateCredentials(email, password);
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

async function signIn(email, password) {
  email = String(email || '').trim();
  validateCredentials(email, password);
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

async function sendPasswordReset(email) {
  email = String(email || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('पासवर्ड रीसेट करने के लिए सही ईमेल पता दर्ज करें।');
  }
  return sendPasswordResetEmail(auth, email);
}

async function signOut() {
  await firebaseSignOut(auth);
}

window.MilkScaleAuth = { getCurrentUser, createAccount, signIn, sendPasswordReset, signOut };
