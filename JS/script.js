const CHAVE_ARMAZENAMENTO = "nexoraPlanner.tarefas";
const formTarefa = document.getElementById("formTarefa");
const campoNome = document.getElementById("nometarefa");
const campoData = document.getElementById("datalimite");
const campoDuracao = document.getElementById("duracao");
const campoPrioridade = document.getElementById("prioridade");
const campoCategoria = document.getElementById("categoria");
const campoTipo = document.getElementById("tipo");
const listaTarefas = document.getElementById("listaTarefas");
const listaVazia = document.getElementById("listaVazia");
const mensagem = document.getElementById("mensagem");
const prioridades = { baixa: "Baixa", media: "Média", alta: "Alta" };

const CATEGORIAS_TAREFA = {
    faculdade: "Faculdade", trabalho: "Trabalho", pessoal: "Pessoal",
    casa: "Casa", saude: "Saúde", outros: "Outros"
};
const TIPOS_TAREFA = {
    tarefa: "Tarefa", compra: "Compra", compromisso: "Compromisso pontual", pendencia: "Pendência"
};
const PADROES_TAREFA = { categoria: "outros", tipo: "tarefa" };

// Centraliza a compatibilidade sem regravar tarefas antigas ao carregar.
function classificacaoTarefa(tarefa) {
    return {
        categoria: Object.hasOwn(CATEGORIAS_TAREFA, tarefa.categoria)
            ? tarefa.categoria : PADROES_TAREFA.categoria,
        tipo: Object.hasOwn(TIPOS_TAREFA, tarefa.tipo)
            ? tarefa.tipo : PADROES_TAREFA.tipo
    };
}

function criarClassificacaoTarefa(tarefa) {
    const { categoria, tipo } = classificacaoTarefa(tarefa);
    const texto = document.createElement("p");
    texto.className = "classificacao-tarefa";
    texto.textContent = `Categoria: ${CATEGORIAS_TAREFA[categoria]} · Tipo: ${TIPOS_TAREFA[tipo]}`;
    return texto;
}

let tarefas = carregarTarefas();

function carregarTarefas() {
    try {
        const dados = JSON.parse(localStorage.getItem(CHAVE_ARMAZENAMENTO) || "[]");
        if (!Array.isArray(dados) || !dados.every(tarefaValida)) {
            throw new Error("Dados de tarefas inválidos.");
        }
        return dados;
    } catch {
        mensagem.textContent = "Não foi possível carregar as tarefas salvas. Verifique se o armazenamento do navegador está disponível.";
        return [];
    }
}

function tarefaValida(tarefa) {
    return tarefa && typeof tarefa.id === "string"
        && typeof tarefa.nome === "string" && tarefa.nome.trim().length > 0
        && typeof tarefa.dataLimite === "string" && /^\d{4}-\d{2}-\d{2}$/.test(tarefa.dataLimite)
        && Number.isSafeInteger(tarefa.duracao) && tarefa.duracao > 0
        && Object.hasOwn(prioridades, tarefa.prioridade)
        && typeof tarefa.concluida === "boolean";
}

// so atualiza a pagina depois que a alteração tiver salva
function salvarTarefas(novasTarefas) {
    try {
        localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(novasTarefas));
        tarefas = novasTarefas;
        mensagem.textContent = "";
        renderizarTarefas();
        return true;
    } catch {
        mensagem.textContent = "Não foi possível salvar. A alteração não foi aplicada. Verifique o armazenamento do navegador.";
        return false;
    }
}

function formatarData(data) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

function renderizarTarefas() {
    listaTarefas.replaceChildren();
    listaVazia.hidden = tarefas.length > 0;

    tarefas.forEach((tarefa) => {
        const item = document.createElement("li");
        item.className = tarefa.concluida ? "tarefa concluida" : "tarefa";

        const titulo = document.createElement("h3");
        titulo.textContent = tarefa.nome;

        const detalhes = document.createElement("p");
        detalhes.className = "detalhes-tarefa";
        const prazo = document.createElement("span");
        prazo.textContent = `Data limite: ${formatarData(tarefa.dataLimite)}`;
        const duracao = document.createElement("span");
        duracao.textContent = `Duração: ${tarefa.duracao} min`;
        const prioridade = document.createElement("span");
        prioridade.className = `prioridade prioridade-${tarefa.prioridade}`;
        prioridade.textContent = `Prioridade: ${prioridades[tarefa.prioridade]}`;
        detalhes.append(prazo, duracao, prioridade);

        const acoes = document.createElement("div");
        acoes.className = "acoes";

        const rotulo = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = tarefa.concluida;
        checkbox.setAttribute("aria-label", `Marcar ${tarefa.nome} como concluída`);
        checkbox.addEventListener("change", () => {
            const atualizado = salvarTarefas(tarefas.map((atual) =>
                atual.id === tarefa.id ? { ...atual, concluida: checkbox.checked } : atual
            ));
            if (!atualizado) checkbox.checked = tarefa.concluida;
        });
        rotulo.append(checkbox, " Concluída");

        const remover = document.createElement("button");
        remover.type = "button";
        remover.textContent = "Remover";
        remover.setAttribute("aria-label", `Remover ${tarefa.nome}`);
        remover.addEventListener("click", () => {
            salvarTarefas(tarefas.filter((atual) => atual.id !== tarefa.id));
        });

        acoes.append(rotulo, remover);
        item.append(titulo, detalhes, criarClassificacaoTarefa(tarefa), acoes);
        listaTarefas.append(item);
    });
}

campoNome.addEventListener("input", () => campoNome.setCustomValidity(""));

formTarefa.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const nome = campoNome.value.trim();
    campoNome.setCustomValidity(nome ? "" : "Digite um nome para a tarefa.");
    if (!formTarefa.reportValidity()) return;

    const novaTarefa = {
        id: crypto.randomUUID(),
        nome,
        dataLimite: campoData.value,
        duracao: Number(campoDuracao.value),
        prioridade: campoPrioridade.value,
        categoria: campoCategoria.value,
        tipo: campoTipo.value,
        concluida: false
    };

    if (!tarefaValida(novaTarefa)) {
        mensagem.textContent = "Confira os dados. A duração deve ser um número inteiro positivo.";
        return;
    }

    if (salvarTarefas([...tarefas, novaTarefa])) {
        formTarefa.reset();
        campoNome.focus();
    }
});

renderizarTarefas();

// Agenda fixa: armazenamento independente para preservar os dados das tarefas.
const CHAVE_HORARIOS = "nexoraPlanner.horarios";
const formHorario = document.getElementById("formHorario");
const nomeCompromisso = document.getElementById("nomeCompromisso");
const horaInicial = document.getElementById("horaInicial");
const horaFinal = document.getElementById("horaFinal");
const camposDias = [...formHorario.querySelectorAll('[name="diaSemana"]')];
const listaHorarios = document.getElementById("listaHorarios");
const horariosVazios = document.getElementById("horariosVazios");
const mensagemHorario = document.getElementById("mensagemHorario");
const nomesDias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const ordemDias = [1, 2, 3, 4, 5, 6, 0];

let horarios = carregarHorarios();

function horarioValido(horario) {
    const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/;
    return horario && typeof horario.id === "string"
        && typeof horario.nome === "string" && horario.nome.trim().length > 0
        && typeof horario.inicio === "string" && formatoHora.test(horario.inicio)
        && typeof horario.fim === "string" && formatoHora.test(horario.fim)
        && horario.fim > horario.inicio
        && Array.isArray(horario.dias) && horario.dias.length > 0
        && horario.dias.every((dia) => Number.isInteger(dia) && dia >= 0 && dia <= 6)
        && new Set(horario.dias).size === horario.dias.length;
}

function carregarHorarios() {
    try {
        const dados = JSON.parse(localStorage.getItem(CHAVE_HORARIOS) || "[]");
        if (!Array.isArray(dados) || !dados.every(horarioValido)) {
            throw new Error("Horários salvos inválidos.");
        }
        return dados;
    } catch {
        mensagemHorario.textContent = "Não foi possível carregar os horários salvos. Verifique o armazenamento do navegador.";
        return [];
    }
}

function salvarHorarios(novosHorarios) {
    try {
        localStorage.setItem(CHAVE_HORARIOS, JSON.stringify(novosHorarios));
        horarios = novosHorarios;
        mensagemHorario.textContent = "";
        renderizarHorarios();
        return true;
    } catch {
        mensagemHorario.textContent = "Não foi possível salvar. A alteração não foi aplicada. Verifique o armazenamento do navegador.";
        return false;
    }
}

function renderizarHorarios() {
    listaHorarios.replaceChildren();
    horariosVazios.hidden = horarios.length > 0;

    horarios.forEach((horario) => {
        const item = document.createElement("li");
        item.className = "tarefa horario";
        const titulo = document.createElement("h3");
        titulo.textContent = horario.nome;
        const detalhes = document.createElement("p");
        detalhes.className = "detalhes-tarefa";
        const dias = document.createElement("span");
        dias.textContent = ordemDias.filter((dia) => horario.dias.includes(dia))
            .map((dia) => nomesDias[dia]).join(", ");
        const periodo = document.createElement("span");
        periodo.textContent = `${horario.inicio} até ${horario.fim}`;
        detalhes.append(dias, periodo);
        const acoes = document.createElement("div");
        acoes.className = "acoes";
        const remover = document.createElement("button");
        remover.type = "button";
        remover.textContent = "Remover";
        remover.setAttribute("aria-label", `Remover horário ${horario.nome}`);
        remover.addEventListener("click", () => {
            salvarHorarios(horarios.filter((atual) => atual.id !== horario.id));
        });
        acoes.append(remover);
        item.append(titulo, detalhes, acoes);
        listaHorarios.append(item);
    });
}

nomeCompromisso.addEventListener("input", () => nomeCompromisso.setCustomValidity(""));
[horaInicial, horaFinal].forEach((campo) => {
    campo.addEventListener("input", () => horaFinal.setCustomValidity(""));
});
camposDias.forEach((campo) => {
    campo.addEventListener("change", () => camposDias[0].setCustomValidity(""));
});

formHorario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const nome = nomeCompromisso.value.trim();
    const dias = camposDias.filter((campo) => campo.checked).map((campo) => Number(campo.value));

    nomeCompromisso.setCustomValidity(nome ? "" : "Digite o nome do compromisso.");
    horaFinal.setCustomValidity(horaInicial.value && horaFinal.value && horaFinal.value <= horaInicial.value
        ? "A hora final deve ser posterior à hora inicial, no mesmo dia." : "");
    camposDias[0].setCustomValidity(dias.length ? "" : "Selecione pelo menos um dia da semana.");
    if (!formHorario.reportValidity()) return;

    const novoHorario = {
        id: crypto.randomUUID(),
        nome,
        inicio: horaInicial.value,
        fim: horaFinal.value,
        dias
    };
    if (!horarioValido(novoHorario)) {
        mensagemHorario.textContent = "Confira o nome, os horários e os dias selecionados.";
        return;
    }
    if (salvarHorarios([...horarios, novoHorario])) {
        formHorario.reset();
        nomeCompromisso.focus();
    }
});

renderizarHorarios();
