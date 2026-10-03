// Cálculo puro: não altera tarefas, agenda ou armazenamento.
const PESOS_PRIORIDADE = { alta: 0, media: 1, baixa: 2 };

function ordenarTarefasPendentes(todasTarefas, data) {
    return todasTarefas.filter((tarefa) => !tarefa.concluida).sort((a, b) => {
        const atrasoA = a.dataLimite < data;
        const atrasoB = b.dataLimite < data;
        return Number(atrasoB) - Number(atrasoA)
            || a.dataLimite.localeCompare(b.dataLimite)
            || PESOS_PRIORIDADE[a.prioridade] - PESOS_PRIORIDADE[b.prioridade]
            || a.duracao - b.duracao;
        // Empate completo mantém a ordem original do cadastro.
    });
}

function escolherJanela(janelas, duracao) {
    return janelas.findIndex((janela) => janela.fim - janela.inicio >= duracao);
}

function encaixarTarefas(tarefasOrdenadas, periodosLivres) {
    const janelas = periodosLivres.map((periodo) => ({ ...periodo }));
    const encaixadas = [];
    const naoEncaixadas = [];
    tarefasOrdenadas.forEach((tarefa) => {
        const indice = escolherJanela(janelas, tarefa.duracao);
        if (indice === -1) {
            naoEncaixadas.push(tarefa);
            return;
        }
        const janela = janelas[indice];
        encaixadas.push({ tarefa, inicio: janela.inicio, fim: janela.inicio + tarefa.duracao });
        janela.inicio += tarefa.duracao;
    });
    // Tarefas menores podem aproveitar lacunas anteriores às tarefas maiores.
    encaixadas.sort((a, b) => a.inicio - b.inicio);
    return { encaixadas, naoEncaixadas };
}

function gerarPlanejamento(todasTarefas, agenda, data, janela = JANELA_DIARIA) {
    const pendentes = ordenarTarefasPendentes(todasTarefas, data);
    const disponibilidade = calcularDisponibilidade(agenda, data, janela);
    return encaixarTarefas(pendentes, disponibilidade.livres);
}

// Interface: usa a mesma data selecionada na disponibilidade.
const resumoPlanejamento = document.getElementById("resumoPlanejamento");
const resultadoPlanejamento = document.getElementById("resultadoPlanejamento");

function criarItemPlanejado(tarefa, data, periodo) {
    const item = document.createElement("li");
    if (periodo) {
        const horario = document.createElement("strong");
        horario.textContent = `${minutosEmHora(periodo.inicio)}–${minutosEmHora(periodo.fim)}`;
        item.append(horario);
    }
    const nome = document.createElement("span");
    nome.className = "nome-planejado";
    nome.textContent = tarefa.nome;
    const detalhes = document.createElement("p");
    detalhes.className = "detalhes-planejados";
    const prioridade = document.createElement("span");
    prioridade.className = `prioridade prioridade-${tarefa.prioridade}`;
    prioridade.textContent = `Prioridade: ${prioridades[tarefa.prioridade]}`;
    const prazo = document.createElement("span");
    prazo.textContent = `Prazo: ${formatarData(tarefa.dataLimite)}${tarefa.dataLimite < data ? " · Atrasada" : ""}`;
    const duracao = document.createElement("span");
    duracao.textContent = `${tarefa.duracao} min`;
    detalhes.append(prioridade, prazo, duracao);
    item.append(nome, detalhes);
    if (!periodo) {
        const motivo = document.createElement("p");
        motivo.textContent = "Sem janela contínua suficiente para esta tarefa.";
        item.append(motivo);
    }
    return item;
}

function renderizarPlanejamento(plano, data) {
    const listaEncaixadas = document.getElementById("tarefasEncaixadas");
    const listaNaoEncaixadas = document.getElementById("tarefasNaoEncaixadas");
    listaEncaixadas.replaceChildren();
    listaNaoEncaixadas.replaceChildren();
    plano.encaixadas.forEach((periodo) => listaEncaixadas.append(criarItemPlanejado(periodo.tarefa, data, periodo)));
    plano.naoEncaixadas.forEach((tarefa) => listaNaoEncaixadas.append(criarItemPlanejado(tarefa, data)));
    const vazio = document.getElementById("semEncaixadas");
    vazio.hidden = plano.encaixadas.length > 0;
    vazio.textContent = plano.naoEncaixadas.length
        ? "Nenhuma tarefa cabe nos períodos livres deste dia."
        : "Nenhuma tarefa pendente para planejar.";
    document.getElementById("semNaoEncaixadas").hidden = plano.naoEncaixadas.length > 0;
    resumoPlanejamento.textContent = `${formatarData(data)} · ${plano.encaixadas.length} sugerida(s) · ${plano.naoEncaixadas.length} não encaixada(s)`;
}

function atualizarPlanejamento() {
    if (!dataAnalise.value || !dataAnalise.validity.valid) {
        resultadoPlanejamento.hidden = true;
        resumoPlanejamento.textContent = "Selecione uma data válida na área de disponibilidade.";
        return;
    }
    resultadoPlanejamento.hidden = false;
    renderizarPlanejamento(gerarPlanejamento(tarefas, horarios, dataAnalise.value), dataAnalise.value);
}

dataAnalise.addEventListener("change", atualizarPlanejamento);
const observarPlanejamento = new MutationObserver(atualizarPlanejamento);
observarPlanejamento.observe(listaTarefas, { childList: true });
observarPlanejamento.observe(listaHorarios, { childList: true });
atualizarPlanejamento();
