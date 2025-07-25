import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, getDocs, collection, updateDoc, arrayUnion, arrayRemove, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const cursosListaEl = document.getElementById("cursosLista");
const cursosAprovadosListEl = document.getElementById("cursosAprovadosList");
const cronogramaModal = document.getElementById("cronogramaModal");
const modalCursoTitulo = document.getElementById("modalCursoTitulo");
const cronogramaModalListEl = document.getElementById("cronogramaModalList").querySelector('tbody');

let currentUserData = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userDocRef = doc(db, "usuarios", user.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    alert("Perfil não encontrado.");
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }

  currentUserData = userDoc.data();
  document.getElementById("alunoNome").innerText = currentUserData.nome;
  carregarCursosDoAluno();
  criarBotaoSuporte();
});

function criarBotaoSuporte() {
  const botaoSuporte = document.createElement('a');
  botaoSuporte.href = 'https://wa.me/5521965128871';
  botaoSuporte.target = '_blank';
  botaoSuporte.className = 'btn-suporte';
  botaoSuporte.innerHTML = ' <img src="./assets/imgs/andresuporte.svg" alt="">';
  document.body.appendChild(botaoSuporte);
}

async function carregarCursosDoAluno() {
  const todosCursosSnapshot = await getDocs(query(collection(db, "cursos"), orderBy("nome")));
  
  // Limpar listas
  cursosListaEl.innerHTML = "";
  cursosAprovadosListEl.innerHTML = "";

  let temCursosAprovados = false;

  // Verificar primeiro se o usuário está suspenso globalmente
  const isSuspensoGlobal = currentUserData.status === "suspenso";

  for (const docSnap of todosCursosSnapshot.docs) {
    const curso = { id: docSnap.id, ...docSnap.data() };
    const inscricao = currentUserData.cursosInscritos?.find(c => c.cursoId === curso.id);
    
    // Se o usuário estiver suspenso globalmente, todos os cursos aparecem como suspensos
    const isSuspenso = isSuspensoGlobal || inscricao?.statusInscricao === "suspenso";
    const isAprovado = !isSuspenso && inscricao?.statusInscricao === "aprovado";
    const isPendente = !isSuspenso && inscricao?.statusInscricao === "pendente";

    if (isAprovado || isSuspenso) {
      temCursosAprovados = true;
      
      const cursoCard = document.createElement('div');
      cursoCard.className = 'curso-card';
      
      let statusBadge = '';
      if (isSuspenso) {
        statusBadge = `<span class="curso-status suspended">Suspenso <i class="fas fa-info-circle" title="Entre em contato com o suporte para solicitar reativação"></i></span>`;
      } else {
        statusBadge = `<span class="curso-status active">Ativo</span>`;
      }
      
      cursoCard.innerHTML = `
        <div class="curso-main">
        <h3>${curso.nome}</h3>
        <p>${curso.descricao}</p>
      </div> 
        <div class="curso-footer">
          ${statusBadge}
          <button onclick="abrirCronograma('${curso.id}', '${curso.nome}')" class="btn-primary" ${isSuspenso ? 'disabled' : ''}>
            <i class="fas fa-calendar-alt"></i> Cronograma
          </button>
        </div>
      `;
      cursosAprovadosListEl.appendChild(cursoCard);
    } else {
      const cursoCard = document.createElement('div');
      cursoCard.className = 'curso-card';
      
      let statusBadge = '';
      let actionButton = '';
      
      if (isPendente) {
        statusBadge = `<span class="curso-status pending">Pendente</span>`;
        actionButton = '<span class="curso-action">Aguardando aprovação</span>';
      } else {
        statusBadge = `<span class="curso-status available">Disponível</span>`;
        actionButton = `<button onclick="solicitarInscricao('${curso.id}')" class="btn-success" ${isSuspensoGlobal ? 'disabled' : ''}>
          <i class="fas fa-user-plus"></i> Solicitar Inscrição
        </button>`;
      }
      
      cursoCard.innerHTML = `
      <div class="curso-main">
        <h3>${curso.nome}</h3>
        <p>${curso.descricao}</p>
      </div> 
        <div class="curso-footer">
          ${statusBadge}
          ${actionButton}
        </div>
      `;
      cursosListaEl.appendChild(cursoCard);
    }
  }

  if (!temCursosAprovados) {
    cursosAprovadosListEl.innerHTML = '<div class="no-courses">Você não está inscrito em nenhum curso aprovado.</div>';
  }

  // Adicionar mensagem se o usuário estiver suspenso globalmente
  if (isSuspensoGlobal) {
    const mensagemSuspensao = document.createElement('div');
    mensagemSuspensao.className = 'alert alert-warning';
    mensagemSuspensao.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <strong>Sua conta está suspensa.</strong> Entre em contato com o suporte para mais informações.
    `;
    cursosAprovadosListEl.prepend(mensagemSuspensao);
  }
}

window.solicitarInscricao = async function(cursoId) {
  try {
    const userDocRef = doc(db, "usuarios", auth.currentUser.uid);
    await updateDoc(userDocRef, {
      cursosInscritos: arrayUnion({
        cursoId: cursoId,
        statusInscricao: "pendente",
        dataSolicitacao: new Date().toISOString()
      })
    });
    
    alert("Solicitação enviada! Aguarde aprovação.");
    const updatedUserDoc = await getDoc(userDocRef);
    currentUserData = updatedUserDoc.data();
    carregarCursosDoAluno();
  } catch (error) {
    console.error("Erro ao solicitar inscrição:", error);
    alert(`Erro: ${error.message}`);
  }
};

window.abrirCronograma = async function(cursoId, cursoNome) {
  modalCursoTitulo.innerText = cursoNome;
  cronogramaModal.style.display = "block";
  
  try {
    const q = query(collection(db, "cursos", cursoId, "cronogramas"), orderBy("dataAula"));
    const snapshot = await getDocs(q);

    cronogramaModalListEl.innerHTML = "";
    if (snapshot.empty) {
      cronogramaModalListEl.innerHTML = "<tr><td colspan='5'>Nenhuma aula programada para este curso.</td></tr>";
    }

    const agora = new Date();
    
    for (const docSnap of snapshot.docs) {
      const aula = docSnap.data();
      const dataAula = new Date(aula.dataAula);
      const dataFormatada = dataAula.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Buscar professor
      let botaoAjuda = '';
      if (aula.professorId) {
        try {
          const professorDoc = await getDoc(doc(db, "professores", aula.professorId));
          if (professorDoc.exists()) {
            const professor = professorDoc.data();
            if (professor.whatsapp) {
              const whatsappNum = professor.whatsapp.replace(/\D/g, '');
              botaoAjuda = `<a href="https://wa.me/${whatsappNum}?text=Olá professor(a), preciso de ajuda com a aula '${aula.tituloAula}' do curso '${cursoNome}'" 
                            target="_blank" class="btn-help">
                            <i class="fab fa-whatsapp"></i> Ajuda
                           </a>`;
            }
          }
        } catch (error) {
          console.error("Erro ao buscar professor:", error);
        }
      }

      // Restante do código...

      // Calcular tempo restante
      let status, tempoRestante = "", acao = "";
      const diferenca = dataAula - agora;
      
      if (diferenca > 0) {
        // Aula futura
        const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
        
        if (dias > 0) {
          tempoRestante = `Em ${dias} dia(s)`;
        } else if (horas > 0) {
          tempoRestante = `Em ${horas} hora(s)`;
        } else {
          tempoRestante = `Em ${Math.round(minutos)} minuto(s)`;
        }
        
        status = `<span class="status-tag status-upcoming">${tempoRestante}</span>`;
        
        // Verificar se está dentro da janela de 10 minutos antes
        const dezMinutosAntes = new Date(dataAula.getTime() - (10 * 60 * 1000));
        if (agora >= dezMinutosAntes && aula.linkAoVivo) {
          acao = `<a href="${aula.linkAoVivo}" target="_blank" class="btn-success">Participar</a>`;
        } else if (!aula.linkAoVivo) {
          acao = "Link não disponível";
        } else {
          acao = "Acesso em breve";
        }
      } else {
        // Aula passada
        status = '<span class="status-tag status-recorded">Realizada</span>';
        acao = aula.linkGravacao ? 
          `<a href="${aula.linkGravacao}" target="_blank" class="btn-primary">Assistir</a>` : 
          "Gravação não disponível";
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${aula.tituloAula}</td>
        <td>${dataFormatada}</td>
        <td>${status}</td>
        <td>${acao}</td>
        <td>${botaoAjuda}</td>
      `;
      cronogramaModalListEl.appendChild(tr);
    }
  } catch (error) {
    console.error("Erro ao carregar cronograma:", error);
    cronogramaModalListEl.innerHTML = "<tr><td colspan='5'>Erro ao carregar cronograma.</td></tr>";
  }
};

window.fecharModal = function() {
  cronogramaModal.style.display = "none";
};

window.logoutAluno = async function() {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    alert("Erro ao fazer logout.");
  }
};