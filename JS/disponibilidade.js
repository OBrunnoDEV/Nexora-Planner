// Funções de cálculo independentes da interface e do armazenamento.
const JANELA_DIARIA = { inicio: "08:00", fim: "23:00" };

function horaEmMinutos(hora) {
    const [horas, minutos] = hora.split(":").map(Number);
    return horas * 60 + minutos;
}

function minutosEmHora(minutos) {
    return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

function diaDaSemana(data) {
    // Componentes locais evitam que a conversão UTC desloque o dia escolhido.
    const [ano, mes, dia] = data.split("-").map(Number);
    const dataLocal = new Date(0);
    dataLocal.setFullYear(ano, mes - 1, dia);
    dataLocal.setHours(12, 0, 0, 0);
    return dataLocal.getDay();
}

function obterPeriodosDoDia(agenda, dia, janela) {
    const inicioJanela = horaEmMinutos(janela.inicio);
    const fimJanela = horaEmMinutos(janela.fim);
    return agenda.filter((compromisso) => compromisso.dias.includes(dia))
        .map((compromisso) => ({
            inicio: Math.max(inicioJanela, horaEmMinutos(compromisso.inicio)),
            fim: Math.min(fimJanela, horaEmMinutos(compromisso.fim)),
            nomes: [compromisso.nome]
        }))
        .filter((periodo) => periodo.inicio < periodo.fim)
        .sort((a, b) => a.inicio - b.inicio || a.fim - b.fim);
}

function unirPeriodosOcupados(periodosOrdenados) {
    const unidos = [];
    periodosOrdenados.forEach((periodo) => {
        const ultimo = unidos[unidos.length - 1];
        if (ultimo && periodo.inicio <= ultimo.fim) {
            ultimo.fim = Math.max(ultimo.fim, periodo.fim);
            ultimo.nomes = [...new Set([...ultimo.nomes, ...periodo.nomes])];
        } else {
            unidos.push({ ...periodo, nomes: [...periodo.nomes] });
        }
    });
    return unidos;
}

function obterPeriodosLivres(ocupados, janela) {
    const livres = [];
    let cursor = horaEmMinutos(janela.inicio);
    const fimJanela = horaEmMinutos(janela.fim);
    ocupados.forEach((periodo) => {
        if (cursor < periodo.inicio) livres.push({ inicio: cursor, fim: periodo.inicio });
        cursor = Math.max(cursor, periodo.fim);
    });
    if (cursor < fimJanela) livres.push({ inicio: cursor, fim: fimJanela });
    return livres;
}

// Retorna intervalos em minutos, prontos para uso pelo futuro planejador.
function calcularDisponibilidade(agenda, data, janela = JANELA_DIARIA) {
    if (horaEmMinutos(janela.fim) <= horaEmMinutos(janela.inicio)) {
        throw new Error("A janela diária deve terminar depois de começar.");
    }
    const dia = diaDaSemana(data);
    const ocupados = unirPeriodosOcupados(obterPeriodosDoDia(agenda, dia, janela));
    return { dia, ocupados, livres: obterPeriodosLivres(ocupados, janela) };
}

// Interface: lê a agenda já carregada, sem alterar tarefas ou compromissos.
const dataAnalise = document.getElementById("dataAnalise");
const resumoDia = document.getElementById("resumoDia");
const resultadoDisponibilidade = document.getElementById("resultadoDisponibilidade");

function renderizarPeriodos(periodos, listaId, vazioId) {
    const lista = document.getElementById(listaId);
    lista.replaceChildren();
    document.getElementById(vazioId).hidden = periodos.length > 0;
    periodos.forEach((periodo) => {
        const item = document.createElement("li");
        const horario = document.createElement("strong");
        horario.textContent = `${minutosEmHora(periodo.inicio)}–${minutosEmHora(periodo.fim)}`;
        item.append(horario);
        if (periodo.nomes) {
            const nomes = document.createElement("p");
            nomes.textContent = periodo.nomes.join(" • ");
            item.append(nomes);
        }
        lista.append(item);
    });
}

function atualizarDisponibilidade() {
    if (!dataAnalise.value || !dataAnalise.validity.valid) {
        resultadoDisponibilidade.hidden = true;
        resumoDia.textContent = "Selecione uma data válida para analisar.";
        return;
    }
    resultadoDisponibilidade.hidden = false;
    const resultado = calcularDisponibilidade(horarios, dataAnalise.value);
    resumoDia.textContent = `${formatarData(dataAnalise.value)} · ${nomesDias[resultado.dia]} · Janela: ${JANELA_DIARIA.inicio}–${JANELA_DIARIA.fim}`;
    renderizarPeriodos(resultado.ocupados, "periodosOcupados", "semOcupados");
    renderizarPeriodos(resultado.livres, "periodosLivres", "semLivres");
}

function dataLocalHoje() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

dataAnalise.value = dataLocalHoje();
dataAnalise.addEventListener("change", atualizarDisponibilidade);
// Atualiza a análise após cadastrar/remover horários, sem mudar a lógica da agenda.
new MutationObserver(atualizarDisponibilidade).observe(listaHorarios, { childList: true });
atualizarDisponibilidade();
