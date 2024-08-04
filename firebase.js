// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "collabo-b5110.firebaseapp.com",
  projectId: "collabo-b5110",
  storageBucket: "collabo-b5110.appspot.com",
  messagingSenderId: "1047201243856",
  appId: "1:1047201243856:web:2e4aaeb6a9a4d3dceaf4d5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
