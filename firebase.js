// Substitua com as suas credenciais do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyCql17GddmB_XlG5fetnG7jUeTG5UU0VU0",
    authDomain: "rumoauerj-andre.firebaseapp.com",
    projectId: "rumoauerj-andre",
    storageBucket: "rumoauerj-andre.firebasestorage.app",
    messagingSenderId: "732954582040",
    appId: "1:732954582040:web:6936246644747203c5b76d",
    measurementId: "G-GQL745HR4J"
  };


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };