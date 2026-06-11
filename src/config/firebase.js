import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC6V0ED0Y-PRobDxu5xS6_ttedLzHotSBE",
  authDomain: "dalseaverias.firebaseapp.com",
  databaseURL: "https://dalseaverias-default-rtdb.firebaseio.com",
  projectId: "dalseaverias",
  storageBucket: "dalseaverias.firebasestorage.app",
  messagingSenderId: "336154134474",
  appId: "1:336154134474:web:35f3c7e0b30931e6b3f133",
  measurementId: "G-4ZR63WXZ7L",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
