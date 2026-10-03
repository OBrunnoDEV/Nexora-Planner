const CHAVE_ARMAZENAMENTO = "nexoraPlanner.tarefas";
const formTarefa = document.getElementById("formTarefa");
const campoNome = document.getElementById("nometarefa");
const campoData = document.getElementById("datalimite");
const campoDuracao = document.getElementById("duracao");
const campoPrioridade = document.getElementById("prioridade");
const listaTarefas = document.getElementById("listaTarefas");
const listaVazia = document.getElementById("listaVazia");
const mensagem = document.getElementById("mensagem");
const prioridades = { baixa: "Baixa", media: "Média", alta: "Alta" };

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
        item.append(titulo, detalhes, acoes);
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

