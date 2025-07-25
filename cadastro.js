import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

window.cadastrar = async function () {
  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const tipo = document.getElementById("tipo").value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    await setDoc(doc(db, "usuarios", cred.user.uid), {
      nome,
      email,
      role: tipo,
      status: tipo === "aluno" ? "ativo" : "ativo",
    });
    alert("Cadastro realizado com sucesso!");
    window.location.href = "login.html";
  } catch (err) {
    alert("Erro ao cadastrar: " + err.message);
  }
}