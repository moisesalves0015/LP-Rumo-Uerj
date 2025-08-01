import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, updateDoc,
  query, where, setDoc, addDoc, deleteDoc,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Elementos da interface
const listaCursosEl = document.getElementById("listaCursos").querySelector('tbody');
const listaSolicitacoesCursosEl = document.getElementById("listaSolicitacoesCursos").querySelector('tbody');
const listaProfessoresEl = document.getElementById("listaProfessores").querySelector('tbody');
const listaAlunosEl = document.getElementById("listaAlunos").querySelector('tbody');
const professorCursoSelect = document.getElementById("professorCurso");
const professorAulaSelect = document.getElementById("professorAula");
const editarProfessorCursoSelect = document.getElementById("editarProfessorCurso");
const selectCursoParaAluno = document.getElementById("selectCursoParaAluno");
const buscaAlunoNomeEl = document.getElementById("buscaAlunoNome");
const filtroStatusAlunoEl = document.getElementById("filtroStatusAluno");

// Variáveis de estado
let cursoSelecionadoParaCronograma = null;
let cursoSelecionadoParaEdicao = null;
let professorSelecionadoParaEdicao = null;
let alunoSelecionadoParaEdicao = null;
let termoBuscaAtual = '';

// Funções globais para modais
window.abrirModal = function(modalId) {
  document.getElementById(modalId).style.display = "block";
};

window.fecharModal = function() {
  document.querySelectorAll(".modal").forEach(modal => {
    modal.style.display = "none";
  });
};

// Verificação de autenticação
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "usuarios", user.uid));
  const userData = userDoc.data();

  if (userData.role !== "admin") {
    alert("Acesso negado. Apenas administradores.");
    await signOut(auth);
    window.location.href = "login.html";
    return;
  }

  document.getElementById("adminNome").innerText = `Bem-vindo, ${userData.nome}`;
  
  // Configurar abas
  setupTabs();
  
  // Configurar botões
  document.getElementById("btnNovoCurso").addEventListener("click", () => {
    document.getElementById("formNovoCurso").style.display = "block";
  });
  
  document.getElementById("btnNovoProfessor").addEventListener("click", () => {
    document.getElementById("formNovoProfessor").style.display = "block";
  });

  // Configurar busca por nome
  buscaAlunoNomeEl.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      buscarAlunosPorNome();
    }
  });

  // Carregar dados iniciais
  carregarProfessores();
  carregarCursos();
  carregarSolicitacoesCursos();
  carregarAlunos();
});

// Configuração das abas
function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");
  
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Remover classe active de todos
      tabBtns.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));
      
      // Adicionar classe active ao selecionado
      btn.classList.add("active");
      const tabId = btn.getAttribute("data-tab");
      document.getElementById(`${tabId}-tab`).classList.add("active");
    });
  });
}

// Funções para Professores
async function carregarProfessores() {
  const q = query(collection(db, "professores"), orderBy("nome"));
  const snapshot = await getDocs(q);

  listaProfessoresEl.innerHTML = "";
  professorCursoSelect.innerHTML = '<option value="">Selecione um professor</option>';
  professorAulaSelect.innerHTML = '<option value="">Selecione o professor</option>';
  editarProfessorCursoSelect.innerHTML = '<option value="">Selecione um professor</option>';

  if (snapshot.empty) {
    listaProfessoresEl.innerHTML = "<tr><td colspan='5'>Nenhum professor cadastrado.</td></tr>";
  }
  
  snapshot.forEach(docSnap => {
    const professor = docSnap.data();
    
    // Adicionar à lista de professores
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${professor.nome}</td>
      <td>${professor.email}</td>
      <td>${professor.whatsapp || 'N/A'}</td>
      <td>${professor.especialidade || 'N/A'}</td>
      <td>
        <button onclick="window.editarProfessor('${docSnap.id}')" class="btn-warning"><i class="fas fa-edit"></i></button>
        <button onclick="window.excluirProfessor('${docSnap.id}')" class="btn-danger"><i class="fas fa-trash"></i></button>
      </td>
    `;
    listaProfessoresEl.appendChild(tr);
    
    // Adicionar aos selects
    const option = `<option value="${docSnap.id}">${professor.nome}</option>`;
    professorCursoSelect.innerHTML += option;
    professorAulaSelect.innerHTML += option;
    editarProfessorCursoSelect.innerHTML += option;
  });
}

window.criarProfessor = async function() {
  const nome = document.getElementById("nomeProfessor").value.trim();
  const email = document.getElementById("emailProfessor").value.trim();
  const whatsapp = document.getElementById("whatsappProfessor").value.trim();
  const especialidade = document.getElementById("especialidadeProfessor").value.trim();

  if (!nome || !email) {
    alert("Por favor, preencha pelo menos o nome e e-mail do professor.");
    return;
  }

  try {
    await addDoc(collection(db, "professores"), {
      nome,
      email,
      whatsapp,
      especialidade,
      dataCadastro: new Date().toISOString()
    });

    alert(`Professor "${nome}" cadastrado com sucesso!`);
    document.getElementById("formNovoProfessor").reset();
    document.getElementById("formNovoProfessor").style.display = "none";
    carregarProfessores();
  } catch (error) {
    console.error("Erro ao cadastrar professor:", error);
    alert(`Erro ao cadastrar professor: ${error.message}`);
  }
};

// Funções para Cursos - ATUALIZADAS
window.criarCurso = async function() {
  // Obter valores dos campos
  const nome = document.getElementById("nomeNovoCurso").value.trim();
  const descricao = document.getElementById("descricaoNovoCurso").value.trim();
  const professorId = professorCursoSelect.value;
  const cargaHoraria = document.getElementById("cargaHorariaCurso").value;
  const valor = document.getElementById("valorCurso").value;

  // Validação básica
  if (!nome || !descricao || !professorId || !cargaHoraria || !valor) {
    alert("Por favor, preencha todos os campos obrigatórios.");
    return;
  }

  // Validação numérica
  if (isNaN(cargaHoraria) || cargaHoraria <= 0) {
    alert("Por favor, insira uma carga horária válida (maior que 0).");
    return;
  }

  if (isNaN(valor) || valor < 0) {
    alert("Por favor, insira um valor válido (maior ou igual a 0).");
    return;
  }

  try {
    // Mostrar feedback visual
    const botaoSalvar = document.querySelector('#formNovoCurso button[type="submit"]');
    const textoOriginal = botaoSalvar.innerHTML;
    botaoSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    botaoSalvar.disabled = true;

    // Criar o objeto do curso
    const novoCurso = {
      nome,
      descricao,
      professorId,
      cargaHoraria: parseInt(cargaHoraria),
      valor: parseFloat(valor),
      criadorUid: auth.currentUser.uid,
      dataCriacao: new Date().toISOString()
    };

    console.log("Tentando criar curso com:", novoCurso);

    // Adicionar ao Firestore
    const docRef = await addDoc(collection(db, "cursos"), novoCurso);
    
    console.log("Curso criado com ID:", docRef.id);
    alert(`Curso "${nome}" criado com sucesso!`);
    
    // Resetar o formulário
    document.getElementById("formNovoCurso").reset();
    document.getElementById("formNovoCurso").style.display = "none";
    
    // Recarregar a lista de cursos
    await carregarCursos();
  } catch (error) {
    console.error("Erro ao criar curso:", error);
    alert(`Erro ao criar curso: ${error.message}`);
  } finally {
    // Restaurar botão
    const botaoSalvar = document.querySelector('#formNovoCurso button[type="submit"]');
    if (botaoSalvar) {
      botaoSalvar.innerHTML = 'Salvar Curso';
      botaoSalvar.disabled = false;
    }
  }
};

async function carregarCursos() {
  try {
    const q = query(collection(db, "cursos"), orderBy("nome"));
    const snapshot = await getDocs(q);

    listaCursosEl.innerHTML = "";
    
    if (snapshot.empty) {
      listaCursosEl.innerHTML = "<tr><td colspan='5'>Nenhum curso cadastrado.</td></tr>";
      return;
    }
    
    for (const docSnap of snapshot.docs) {
      const curso = docSnap.data();
      
      // Buscar informações do professor
      let professorNome = "Não definido";
      if (curso.professorId) {
        const professorDoc = await getDoc(doc(db, "professores", curso.professorId));
        if (professorDoc.exists()) {
          professorNome = professorDoc.data().nome;
        }
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${curso.nome}</td>
        <td>${professorNome}</td>
        <td>${curso.cargaHoraria || 0}h</td>
        <td>R$ ${curso.valor ? curso.valor.toFixed(2) : '0,00'}</td>
        <td>
          <button onclick="window.editarCurso('${docSnap.id}')" class="btn-warning"><i class="fas fa-edit"></i></button>
          <button onclick="window.selecionarCursoParaCronograma('${docSnap.id}', '${curso.nome}')" class="btn-primary"><i class="fas fa-calendar-alt"></i></button>
          <button onclick="window.excluirCurso('${docSnap.id}')" class="btn-danger"><i class="fas fa-trash"></i></button>
        </td>
      `;
      listaCursosEl.appendChild(tr);
    }
  } catch (error) {
    console.error("Erro ao carregar cursos:", error);
    listaCursosEl.innerHTML = "<tr><td colspan='5'>Erro ao carregar cursos.</td></tr>";
  }
}

window.editarCurso = async function(cursoId) {
  try {
    const cursoDoc = await getDoc(doc(db, "cursos", cursoId));
    if (!cursoDoc.exists()) {
      alert("Curso não encontrado!");
      return;
    }

    const curso = cursoDoc.data();
    
    // Preencher modal de edição
    document.getElementById("editarNomeCurso").value = curso.nome;
    document.getElementById("editarDescricaoCurso").value = curso.descricao;
    document.getElementById("editarCargaHoraria").value = curso.cargaHoraria || "";
    document.getElementById("editarValorCurso").value = curso.valor || "";
    
    // Selecionar o professor atual
    if (curso.professorId) {
      document.getElementById("editarProfessorCurso").value = curso.professorId;
    }
    
    cursoSelecionadoParaEdicao = cursoId;
    window.abrirModal("modalEditarCurso");
  } catch (error) {
    console.error("Erro ao editar curso:", error);
    alert(`Erro ao editar curso: ${error.message}`);
  }
};

window.salvarEdicaoCurso = async function() {
  if (!cursoSelecionadoParaEdicao) return;

  const nome = document.getElementById("editarNomeCurso").value.trim();
  const descricao = document.getElementById("editarDescricaoCurso").value.trim();
  const professorId = editarProfessorCursoSelect.value;
  const cargaHoraria = document.getElementById("editarCargaHoraria").value;
  const valor = document.getElementById("editarValorCurso").value;

  if (!nome || !descricao || !professorId) {
    alert("Por favor, preencha o nome, descrição e selecione um professor para o curso.");
    return;
  }

  try {
    await updateDoc(doc(db, "cursos", cursoSelecionadoParaEdicao), {
      nome,
      descricao,
      professorId,
      cargaHoraria: parseInt(cargaHoraria) || 0,
      valor: parseFloat(valor) || 0
    });

    alert("Curso atualizado com sucesso!");
    window.fecharModal();
    carregarCursos();
  } catch (error) {
    console.error("Erro ao atualizar curso:", error);
    alert(`Erro ao atualizar curso: ${error.message}`);
  }
};

window.excluirCurso = async function(cursoId) {
  if (!confirm("Tem certeza que deseja excluir este curso e todo o seu cronograma?")) {
    return;
  }
  try {
    // Excluir aulas do cronograma
    const cronogramaSnapshot = await getDocs(collection(db, "cursos", cursoId, "cronogramas"));
    const deletePromises = [];
    cronogramaSnapshot.forEach(doc => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    await Promise.all(deletePromises);

    // Remover inscrições de alunos
    const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
    const updatePromises = [];
    usuariosSnapshot.forEach(userDoc => {
      const userData = userDoc.data();
      if (userData.cursosInscritos) {
        const novosCursos = userData.cursosInscritos.filter(c => c.cursoId !== cursoId);
        if (novosCursos.length !== userData.cursosInscritos.length) {
          updatePromises.push(updateDoc(userDoc.ref, { cursosInscritos: novosCursos }));
        }
      }
    });
    await Promise.all(updatePromises);

    // Excluir curso
    await deleteDoc(doc(db, "cursos", cursoId));
    alert("Curso excluído com sucesso!");
    carregarCursos();
    carregarSolicitacoesCursos();
  } catch (error) {
    console.error("Erro ao excluir curso:", error);
    alert(`Erro ao excluir curso: ${error.message}`);
  }
};



// Gerenciamento de cronograma
window.selecionarCursoParaCronograma = async function(cursoId, cursoNome) {
  cursoSelecionadoParaCronograma = { id: cursoId, nome: cursoNome };
  document.getElementById("cursoSelecionadoCronograma").innerText = cursoNome;
  
  // Limpar formulário
  document.getElementById("tituloAula").value = "";
  document.getElementById("dataAula").value = "";
  document.getElementById("linkGravacao").value = "";
  document.getElementById("linkAoVivo").value = "";
  document.getElementById("salvarAulaBtn").dataset.aulaId = "";
  document.getElementById("salvarAulaBtn").innerText = "Adicionar Aula";
  
  window.abrirModal("modalCronograma");
  carregarCronogramaDoCurso(cursoId);
};

async function carregarCronogramaDoCurso(cursoId) {
  const q = query(collection(db, "cursos", cursoId, "cronogramas"), orderBy("dataAula"));
  const snapshot = await getDocs(q);

  const tbody = document.getElementById("listaAulasCronograma").querySelector('tbody');
  tbody.innerHTML = "";
  
  if (snapshot.empty) {
    tbody.innerHTML = "<tr><td colspan='5'>Nenhuma aula cadastrada para este curso.</td></tr>";
    return;
  }
  
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

    // Buscar nome do professor
    let professorNome = "Não definido";
    if (aula.professorId) {
      const professorDoc = await getDoc(doc(db, "professores", aula.professorId));
      if (professorDoc.exists()) {
        professorNome = professorDoc.data().nome;
      }
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${aula.tituloAula}</td>
      <td>${professorNome}</td>
      <td>${dataFormatada}</td>
      <td>
        ${aula.linkGravacao ? '<a href="' + aula.linkGravacao + '" target="_blank">Gravação</a>' : 'Sem gravação'}<br>
        ${aula.linkAoVivo ? '<a href="' + aula.linkAoVivo + '" target="_blank">Ao Vivo</a>' : 'Sem link ao vivo'}
      </td>
      <td>
        <button onclick="window.editarAula('${docSnap.id}', '${aula.tituloAula}', '${aula.professorId || ''}', '${aula.dataAula}', '${aula.linkGravacao || ''}', '${aula.linkAoVivo || ''}')" class="btn-warning"><i class="fas fa-edit"></i></button>
        <button onclick="window.excluirAula('${docSnap.id}')" class="btn-danger"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}


window.salvarAula = async function() {
  if (!cursoSelecionadoParaCronograma) return;

  const tituloAula = document.getElementById("tituloAula").value.trim();
  const professorId = professorAulaSelect.value;
  const dataAula = document.getElementById("dataAula").value;
  const linkGravacao = document.getElementById("linkGravacao").value.trim();
  const linkAoVivo = document.getElementById("linkAoVivo").value.trim();

  if (!tituloAula || !dataAula || !professorId) {
    alert("Por favor, preencha o título, selecione o professor e a data da aula.");
    return;
  }

  const dataAulaTimestamp = new Date(dataAula).toISOString();
  const aulaId = document.getElementById("salvarAulaBtn").dataset.aulaId;

  try {
    if (aulaId) {
      // Atualizar aula existente
      await updateDoc(doc(db, "cursos", cursoSelecionadoParaCronograma.id, "cronogramas", aulaId), {
        tituloAula,
        professorId,
        dataAula: dataAulaTimestamp,
        linkGravacao,
        linkAoVivo
      });
      alert("Aula atualizada com sucesso!");
    } else {
      // Criar nova aula
      await addDoc(collection(db, "cursos", cursoSelecionadoParaCronograma.id, "cronogramas"), {
        tituloAula,
        professorId,
        dataAula: dataAulaTimestamp,
        linkGravacao,
        linkAoVivo,
        dataCadastro: new Date().toISOString()
      });
      alert("Aula adicionada com sucesso!");
    }

    // Limpar formulário
    document.getElementById("tituloAula").value = "";
    document.getElementById("dataAula").value = "";
    document.getElementById("linkGravacao").value = "";
    document.getElementById("linkAoVivo").value = "";
    document.getElementById("salvarAulaBtn").dataset.aulaId = "";
    document.getElementById("salvarAulaBtn").innerText = "Adicionar Aula";

    carregarCronogramaDoCurso(cursoSelecionadoParaCronograma.id);
  } catch (error) {
    console.error("Erro ao salvar aula:", error);
    alert(`Erro ao salvar aula: ${error.message}`);
  }
};

window.editarAula = function(aulaId, titulo, professorId, data, gravacao, aoVivo) {
  document.getElementById("tituloAula").value = titulo;
  document.getElementById("professorAula").value = professorId || "";
  document.getElementById("dataAula").value = data.substring(0, 16);
  document.getElementById("linkGravacao").value = gravacao;
  document.getElementById("linkAoVivo").value = aoVivo;
  document.getElementById("salvarAulaBtn").dataset.aulaId = aulaId;
  document.getElementById("salvarAulaBtn").innerText = "Atualizar Aula";
};

window.excluirAula = async function(aulaId) {
  if (!confirm("Tem certeza que deseja excluir esta aula?")) {
    return;
  }
  try {
    await deleteDoc(doc(db, "cursos", cursoSelecionadoParaCronograma.id, "cronogramas", aulaId));
    alert("Aula excluída com sucesso!");
    carregarCronogramaDoCurso(cursoSelecionadoParaCronograma.id);
  } catch (error) {
    console.error("Erro ao excluir aula:", error);
    alert(`Erro ao excluir aula: ${error.message}`);
  }
};

// Funções para Alunos
window.carregarAlunos = async function() {
  const statusFiltro = filtroStatusAlunoEl.value;
  let q;
  
  // Se há um termo de busca ativo
  if (termoBuscaAtual && termoBuscaAtual.length >= 2) {
    if (statusFiltro === "todos") {
      q = query(
        collection(db, "usuarios"),
        where("role", "==", "aluno"),
        where("nome", ">=", termoBuscaAtual),
        where("nome", "<=", termoBuscaAtual + '\uf8ff'),
        orderBy("nome")
      );
    } else {
      q = query(
        collection(db, "usuarios"),
        where("role", "==", "aluno"),
        where("status", "==", statusFiltro),
        where("nome", ">=", termoBuscaAtual),
        where("nome", "<=", termoBuscaAtual + '\uf8ff'),
        orderBy("nome")
      );
    }
  } else {
    // Sem termo de busca
    if (statusFiltro === "todos") {
      q = query(collection(db, "usuarios"), where("role", "==", "aluno"));
    } else {
      q = query(
        collection(db, "usuarios"), 
        where("role", "==", "aluno"),
        where("status", "==", statusFiltro)
      );
    }
  }

  try {
    const snapshot = await getDocs(q);
    const alunos = [];

    snapshot.forEach(docSnap => {
      alunos.push({ id: docSnap.id, ...docSnap.data() });
    });

    exibirAlunos(alunos);
  } catch (error) {
    console.error("Erro ao carregar alunos:", error);
    listaAlunosEl.innerHTML = "<tr><td colspan='6'>Erro ao carregar alunos.</td></tr>";
  }
};

// Função para exibir alunos
async function exibirAlunos(alunos) {
  listaAlunosEl.innerHTML = "";

  if (alunos.length === 0) {
    listaAlunosEl.innerHTML = "<tr><td colspan='6'>Nenhum aluno encontrado.</td></tr>";
    return;
  }

  for (const aluno of alunos) {
    const whatsappLink = aluno.whatsapp ? 
      `<a href="https://wa.me/${aluno.whatsapp.replace(/\D/g, '')}" target="_blank">${aluno.whatsapp}</a>` : 
      'N/A';

    // Buscar cursos do aluno
    let cursosHtml = "Nenhum curso";
    if (aluno.cursosInscritos && aluno.cursosInscritos.length > 0) {
      cursosHtml = "<ul>";
      for (const curso of aluno.cursosInscritos) {
        const cursoDoc = await getDoc(doc(db, "cursos", curso.cursoId));
        const cursoNome = cursoDoc.exists() ? cursoDoc.data().nome : "Curso não encontrado";
        cursosHtml += `<li>${cursoNome} (${curso.statusInscricao})</li>`;
      }
      cursosHtml += "</ul>";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${aluno.nome}</td>
      <td>${aluno.email}</td>
      <td>${whatsappLink}</td>
      <td>
        <span class="status-tag ${aluno.status === "ativo" ? "status-active" : "status-suspended"}">
          ${aluno.status === "ativo" ? "Ativo" : "Suspenso"}
        </span>
      </td>
      <td>${cursosHtml}</td>
      <td>
        <button onclick="window.gerenciarCursosAluno('${aluno.id}', '${aluno.nome}')" class="btn-primary">
          <i class="fas fa-book"></i> Cursos
        </button>
        <button onclick="window.alterarStatusAluno('${aluno.id}', '${aluno.status === "ativo" ? "suspenso" : "ativo"}')" class="btn-warning">
          ${aluno.status === "ativo" ? '<i class="fas fa-ban"></i>' : '<i class="fas fa-check"></i>'}
        </button>
      </td>
    `;
    listaAlunosEl.appendChild(tr);
  }
}

// Função de busca por nome
window.buscarAlunosPorNome = function() {
  termoBuscaAtual = buscaAlunoNomeEl.value.trim();
  
  if (termoBuscaAtual.length < 2) {
    alert("Digite pelo menos 2 caracteres para buscar");
    return;
  }

  carregarAlunos();
};

// Função para limpar busca
window.limparBuscaAlunos = function() {
  termoBuscaAtual = '';
  buscaAlunoNomeEl.value = '';
  carregarAlunos();
};

window.gerenciarCursosAluno = async function(alunoId, alunoNome) {
  alunoSelecionadoParaEdicao = alunoId;
  document.getElementById("alunoSelecionadoNome").innerText = alunoNome;
  
  // Carregar cursos disponíveis
  const cursosSnapshot = await getDocs(collection(db, "cursos"));
  selectCursoParaAluno.innerHTML = '<option value="">Selecione um curso</option>';
  
  cursosSnapshot.forEach(doc => {
    const curso = doc.data();
    selectCursoParaAluno.innerHTML += `<option value="${doc.id}">${curso.nome}</option>`;
  });
  
  // Carregar cursos do aluno
  const alunoDoc = await getDoc(doc(db, "usuarios", alunoId));
  const alunoData = alunoDoc.data();
  const tbody = document.getElementById("listaCursosAluno").querySelector('tbody');
  tbody.innerHTML = "";
  
  if (alunoData.cursosInscritos && alunoData.cursosInscritos.length > 0) {
    for (const inscricao of alunoData.cursosInscritos) {
      const cursoDoc = await getDoc(doc(db, "cursos", inscricao.cursoId));
      const cursoNome = cursoDoc.exists() ? cursoDoc.data().nome : "Curso não encontrado";
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${cursoNome}</td>
        <td>${inscricao.statusInscricao}</td>
        <td>${new Date(inscricao.dataInscricao).toLocaleDateString('pt-BR')}</td>
        <td>
          <button onclick="window.alterarStatusInscricao('${alunoId}', '${inscricao.cursoId}', '${inscricao.statusInscricao === "aprovado" ? "suspenso" : "aprovado"}')" class="btn-warning">
            ${inscricao.statusInscricao === "aprovado" ? "Suspender" : "Aprovar"}
          </button>
          <button onclick="window.removerCursoAluno('${alunoId}', '${inscricao.cursoId}')" class="btn-danger">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  } else {
    tbody.innerHTML = "<tr><td colspan='4'>Nenhum curso inscrito</td></tr>";
  }
  
  window.abrirModal("modalAlunoCursos");
};

window.adicionarCursoAluno = async function() {
  const cursoId = selectCursoParaAluno.value;
  if (!cursoId || !alunoSelecionadoParaEdicao) return;

  try {
    const alunoDocRef = doc(db, "usuarios", alunoSelecionadoParaEdicao);
    const alunoDoc = await getDoc(alunoDocRef);
    const alunoData = alunoDoc.data();

    let cursosInscritos = alunoData.cursosInscritos || [];
    
    // Verificar se o aluno já está inscrito neste curso
    if (cursosInscritos.some(c => c.cursoId === cursoId)) {
      alert("Este aluno já está inscrito neste curso!");
      return;
    }

    cursosInscritos.push({
      cursoId,
      statusInscricao: "aprovado",
      dataInscricao: new Date().toISOString()
    });

    await updateDoc(alunoDocRef, { cursosInscritos });
    alert("Curso adicionado ao aluno com sucesso!");
    window.gerenciarCursosAluno(alunoSelecionadoParaEdicao, document.getElementById("alunoSelecionadoNome").innerText);
  } catch (error) {
    console.error("Erro ao adicionar curso ao aluno:", error);
    alert(`Erro ao adicionar curso ao aluno: ${error.message}`);
  }
};

window.alterarStatusInscricao = async function(alunoId, cursoId, novoStatus) {
  try {
    const alunoDocRef = doc(db, "usuarios", alunoId);
    const alunoDoc = await getDoc(alunoDocRef);
    const alunoData = alunoDoc.data();

    if (alunoData.cursosInscritos) {
      const novosCursos = alunoData.cursosInscritos.map(inscricao => {
        if (inscricao.cursoId === cursoId) {
          return { 
            ...inscricao, 
            statusInscricao: novoStatus,
            [`data${novoStatus === "aprovado" ? "Aprovacao" : "Suspensao"}`]: new Date().toISOString()
          };
        }
        return inscricao;
      });

      await updateDoc(alunoDocRef, { cursosInscritos: novosCursos });
      alert(`Status da inscrição atualizado para ${novoStatus === "aprovado" ? "aprovado" : "suspenso"}!`);
      window.gerenciarCursosAluno(alunoId, document.getElementById("alunoSelecionadoNome").innerText);
    }
  } catch (error) {
    console.error("Erro ao alterar status da inscrição:", error);
    alert(`Erro ao alterar status da inscrição: ${error.message}`);
  }
};

window.removerCursoAluno = async function(alunoId, cursoId) {
  if (!confirm("Tem certeza que deseja remover este curso do aluno?")) return;

  try {
    const alunoDocRef = doc(db, "usuarios", alunoId);
    const alunoDoc = await getDoc(alunoDocRef);
    const alunoData = alunoDoc.data();

    if (alunoData.cursosInscritos) {
      const novosCursos = alunoData.cursosInscritos.filter(inscricao => inscricao.cursoId !== cursoId);
      await updateDoc(alunoDocRef, { cursosInscritos: novosCursos });
      alert("Curso removido do aluno com sucesso!");
      window.gerenciarCursosAluno(alunoId, document.getElementById("alunoSelecionadoNome").innerText);
    }
  } catch (error) {
    console.error("Erro ao remover curso do aluno:", error);
    alert(`Erro ao remover curso do aluno: ${error.message}`);
  }
};

window.alterarStatusAluno = async function(alunoId, novoStatus) {
  const acao = novoStatus === "ativo" ? "ativar" : "suspender";
  if (!confirm(`Tem certeza que deseja ${acao} este aluno?`)) return;

  try {
    await updateDoc(doc(db, "usuarios", alunoId), {
      status: novoStatus
    });
    alert(`Aluno ${acao === "ativar" ? "ativado" : "suspenso"} com sucesso!`);
    carregarAlunos();
  } catch (error) {
    console.error(`Erro ao ${acao} aluno:`, error);
    alert(`Erro ao ${acao} aluno: ${error.message}`);
  }
};

// Solicitações de cursos
async function carregarSolicitacoesCursos() {
  // Busca todos os usuários que têm pelo menos um curso pendente
  const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
  
  listaSolicitacoesCursosEl.innerHTML = "";
  let temSolicitacoes = false;

  for (const userDoc of usuariosSnapshot.docs) {
    const userData = userDoc.data();
    if (userData.cursosInscritos && userData.cursosInscritos.some(c => c.statusInscricao === "pendente")) {
      temSolicitacoes = true;
      
      // Para cada curso pendente deste usuário
      for (const inscricao of userData.cursosInscritos.filter(c => c.statusInscricao === "pendente")) {
        // Buscar informações do curso
        const cursoDoc = await getDoc(doc(db, "cursos", inscricao.cursoId));
        const cursoNome = cursoDoc.exists() ? cursoDoc.data().nome : "Curso não encontrado";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${userData.nome} (${userData.email})</td>
          <td>${cursoNome}</td>
          <td><span class="status-tag status-pending">Pendente</span></td>
          <td>
            <button onclick="window.aprovarSolicitacao('${userDoc.id}', '${inscricao.cursoId}')" class="btn-success">Aprovar</button>
            <button onclick="window.rejeitarSolicitacao('${userDoc.id}', '${inscricao.cursoId}')" class="btn-danger">Rejeitar</button>
          </td>
        `;
        listaSolicitacoesCursosEl.appendChild(tr);
      }
    }
  }

  if (!temSolicitacoes) {
    listaSolicitacoesCursosEl.innerHTML = "<tr><td colspan='4'>Nenhuma solicitação pendente.</td></tr>";
  }
}

window.aprovarSolicitacao = async function(alunoUid, cursoId) {
  try {
    const userDocRef = doc(db, "usuarios", alunoUid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();

    if (userData && userData.cursosInscritos) {
      const novosCursos = userData.cursosInscritos.map(c => {
        if (c.cursoId === cursoId && c.statusInscricao === "pendente") {
          return { ...c, statusInscricao: "aprovado", dataAprovacao: new Date().toISOString() };
        }
        return c;
      });
      
      await updateDoc(userDocRef, { cursosInscritos: novosCursos });
      alert("Solicitação aprovada com sucesso!");
      carregarSolicitacoesCursos();
    }
  } catch (error) {
    console.error("Erro ao aprovar solicitação:", error);
    alert(`Erro ao aprovar solicitação: ${error.message}`);
  }
};

window.rejeitarSolicitacao = async function(alunoUid, cursoId) {
  try {
    const userDocRef = doc(db, "usuarios", alunoUid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();

    if (userData && userData.cursosInscritos) {
      const novosCursos = userData.cursosInscritos.filter(c => 
        !(c.cursoId === cursoId && c.statusInscricao === "pendente")
      );
      
      await updateDoc(userDocRef, { cursosInscritos: novosCursos });
      alert("Solicitação rejeitada com sucesso!");
      carregarSolicitacoesCursos();
    }
  } catch (error) {
    console.error("Erro ao rejeitar solicitação:", error);
    alert(`Erro ao rejeitar solicitação: ${error.message}`);
  }
};


// Adicione estas funções ao seu código existente

window.editarProfessor = async function(professorId) {
  try {
    console.log(`Tentando editar professor ID: ${professorId}`); // Log para depuração
    
    const professorDoc = await getDoc(doc(db, "professores", professorId));
    if (!professorDoc.exists()) {
      alert("Professor não encontrado!");
      return;
    }

    const professor = professorDoc.data();
    
    // Preencher modal de edição
    document.getElementById("editarNomeProfessor").value = professor.nome || "";
    document.getElementById("editarEmailProfessor").value = professor.email || "";
    document.getElementById("editarWhatsappProfessor").value = professor.whatsapp || "";
    document.getElementById("editarEspecialidadeProfessor").value = professor.especialidade || "";
    
    professorSelecionadoParaEdicao = professorId;
    window.abrirModal("modalEditarProfessor");
    
    console.log("Modal de edição aberto com sucesso");
  } catch (error) {
    console.error("Erro ao editar professor:", error);
    alert(`Erro ao editar professor: ${error.message}`);
  }
};

window.salvarEdicaoProfessor = async function() {
  if (!professorSelecionadoParaEdicao) {
    alert("Nenhum professor selecionado para edição!");
    return;
  }

  const nome = document.getElementById("editarNomeProfessor").value.trim();
  const email = document.getElementById("editarEmailProfessor").value.trim();
  const whatsapp = document.getElementById("editarWhatsappProfessor").value.trim();
  const especialidade = document.getElementById("editarEspecialidadeProfessor").value.trim();

  if (!nome || !email) {
    alert("Por favor, preencha pelo menos o nome e e-mail do professor.");
    return;
  }

  try {
    // Feedback visual
    const botaoSalvar = document.querySelector('#modalEditarProfessor button[onclick="window.salvarEdicaoProfessor()"]');
    const textoOriginal = botaoSalvar.innerHTML;
    botaoSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    botaoSalvar.disabled = true;

    await updateDoc(doc(db, "professores", professorSelecionadoParaEdicao), {
      nome,
      email,
      whatsapp,
      especialidade,
      dataAtualizacao: new Date().toISOString()
    });

    alert("Professor atualizado com sucesso!");
    window.fecharModal();
    await carregarProfessores(); // Recarrega a lista
  } catch (error) {
    console.error("Erro ao atualizar professor:", error);
    alert(`Erro ao atualizar professor: ${error.message}`);
  } finally {
    // Restaurar botão
    const botaoSalvar = document.querySelector('#modalEditarProfessor button[onclick="window.salvarEdicaoProfessor()"]');
    if (botaoSalvar) {
      botaoSalvar.innerHTML = textoOriginal || "Salvar Alterações";
      botaoSalvar.disabled = false;
    }
  }
};

window.excluirProfessor = async function(professorId) {
  if (!confirm("Tem certeza que deseja excluir este professor? Esta ação é irreversível.")) {
    return;
  }

  try {
    console.log(`Tentando excluir professor ID: ${professorId}`); // Log para depuração

    // Verificar se o professor está associado a algum curso
    const q = query(collection(db, "cursos"), where("professorId", "==", professorId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const cursos = snapshot.docs.map(doc => doc.data().nome).join(", ");
      alert(`Este professor está associado aos seguintes cursos e não pode ser excluído: ${cursos}`);
      return;
    }

    // Feedback visual
    const botaoExcluir = document.querySelector(`button[onclick="window.excluirProfessor('${professorId}')"]`);
    if (botaoExcluir) {
      const textoOriginal = botaoExcluir.innerHTML;
      botaoExcluir.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      botaoExcluir.disabled = true;
    }

    await deleteDoc(doc(db, "professores", professorId));
    alert("Professor excluído com sucesso!");
    await carregarProfessores(); // Recarrega a lista
  } catch (error) {
    console.error("Erro ao excluir professor:", error);
    alert(`Erro ao excluir professor: ${error.message}`);
  }
};

// Logout
window.logoutAdmin = async function() {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    alert("Erro ao fazer logout.");
  }
};