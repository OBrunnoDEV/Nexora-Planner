// Cálculo puro: não altera tarefas, agenda ou armazenamento.
// Pontuação = urgência do prazo + prioridade manual.
// Prazo próximo: +30 em 2 dias, +25 em 3 dias, até +5 em 7 dias;
// a partir de 8 dias, apenas a prioridade manual contribui.
const PESOS_PLANEJAMENTO = {
    atrasada: 100,
    prazoHoje: 70,
    prazoAmanha: 40,
    prazoProximo: 30,
    reducaoPorDia: 5,
    prioridade: { alta: 30, media: 15, baixa: 5 }
};

function diferencaDiasPrazo(prazo, data) {
    // Usa dias de calendário em UTC: não depende de horário ou horário de verão.
    const numeroDia = (valor) => {
        const [ano, mes, dia] = valor.split("-").map(Number);
        const calendario = new Date(0);
        calendario.setUTCFullYear(ano, mes - 1, dia);
        calendario.setUTCHours(0, 0, 0, 0);
        return calendario.getTime() / 86400000;
    };
    return numeroDia(prazo) - numeroDia(data);
}

function calcularPontuacaoTarefa(tarefa, data) {
    const dias = diferencaDiasPrazo(tarefa.dataLimite, data);
    let urgencia;
    if (dias < 0) urgencia = PESOS_PLANEJAMENTO.atrasada;
    else if (dias === 0) urgencia = PESOS_PLANEJAMENTO.prazoHoje;
    else if (dias === 1) urgencia = PESOS_PLANEJAMENTO.prazoAmanha;
    else urgencia = Math.max(0, PESOS_PLANEJAMENTO.prazoProximo
        - (dias - 2) * PESOS_PLANEJAMENTO.reducaoPorDia);
    // Duração só desempata; nunca aumenta a pontuação de urgência.
    return urgencia + PESOS_PLANEJAMENTO.prioridade[tarefa.prioridade];
}

function ordenarTarefasPendentes(todasTarefas, data) {
    return todasTarefas.filter((tarefa) => !tarefa.concluida)
        .map((tarefa) => ({ tarefa, pontuacao: calcularPontuacaoTarefa(tarefa, data) }))
        .sort((a, b) => b.pontuacao - a.pontuacao
            || a.tarefa.dataLimite.localeCompare(b.tarefa.dataLimite)
            || a.tarefa.duracao - b.tarefa.duracao)
        .map(({ tarefa }) => tarefa);
    // Empate completo mantém a ordem original do cadastro.
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
