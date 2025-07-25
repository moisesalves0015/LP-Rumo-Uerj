import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore();

window.login = async function () {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  try {
    const cred = await signInWithEmailAndPassword(auth, email, senha);
    const userDoc = await getDoc(doc(db, "usuarios", cred.user.uid));
    const role = userDoc.data().role;

    if (role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "aluno.html";
    }
  } catch (err) {
    alert("Erro ao fazer login: " + err.message);
  }
}