// Kanban do Mercado - GH-900 (turma ao vivo)
// Estado persistido em localStorage, sem dependencias externas.

const STORAGE_KEY = "gh900-kanban-mercado";

const defaultState = {
  columns: [
    { id: cryptoId(), title: "Recebimento / Estoque", cards: [
      { id: cryptoId(), title: "Conferir carga de hortifruti", priority: "alta" },
      { id: cryptoId(), title: "Repor prateleira de bebidas", priority: "media" },
    ] },
    { id: cryptoId(), title: "Em Reposição", cards: [
      { id: cryptoId(), title: "Etiquetar promoção de laticínios", priority: "media" },
    ] },
    { id: cryptoId(), title: "Conferência de Preço", cards: [] },
    { id: cryptoId(), title: "Concluído", cards: [
      { id: cryptoId(), title: "Organizar gôndola de limpeza", priority: "baixa" },
    ] },
  ],
};

function cryptoId() {
  return (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.columns) throw new Error("formato invalido");
    return parsed;
  } catch (e) {
    console.warn("Estado corrompido, restaurando padrao", e);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

const board = document.getElementById("board");
const columnTemplate = document.getElementById("columnTemplate");
const cardTemplate = document.getElementById("cardTemplate");

function render() {
  board.innerHTML = "";
  state.columns.forEach((column) => board.appendChild(renderColumn(column)));
}

function renderColumn(column) {
  const node = columnTemplate.content.cloneNode(true);
  const section = node.querySelector(".column");
  section.dataset.columnId = column.id;

  const titleInput = node.querySelector(".column-title");
  titleInput.value = column.title;
  titleInput.addEventListener("input", () => {
    column.title = titleInput.value;
    saveState();
  });

  const deleteColumnBtn = node.querySelector(".delete-column");
  deleteColumnBtn.addEventListener("click", () => {
    if (!confirm(`Excluir a coluna "${column.title}" e todos os cartões dela?`)) return;
    state.columns = state.columns.filter((c) => c.id !== column.id);
    saveState();
    render();
  });

  const cardList = node.querySelector(".card-list");
  cardList.dataset.columnId = column.id;
  column.cards.forEach((card) => cardList.appendChild(renderCard(card, column)));
  attachDropzone(cardList, column);

  const countBadge = node.querySelector(".card-count");
  countBadge.textContent = column.cards.length;

  const addCardBtn = node.querySelector(".btn-add-card");
  addCardBtn.addEventListener("click", () => {
    const card = { id: cryptoId(), title: "Novo item", priority: "media" };
    column.cards.push(card);
    saveState();
    render();
  });

  return node;
}

function renderCard(card, column) {
  const node = cardTemplate.content.cloneNode(true);
  const article = node.querySelector(".card");
  article.dataset.cardId = card.id;

  const titleEl = node.querySelector(".card-title");
  titleEl.textContent = card.title;
  titleEl.addEventListener("blur", () => {
    card.title = titleEl.textContent.trim() || "Sem titulo";
    saveState();
  });
  titleEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); titleEl.blur(); }
  });

  const prioritySelect = node.querySelector(".card-priority");
  prioritySelect.value = card.priority;
  prioritySelect.addEventListener("change", () => {
    card.priority = prioritySelect.value;
    saveState();
  });

  const deleteBtn = node.querySelector(".delete-card");
  deleteBtn.addEventListener("click", () => {
    column.cards = column.cards.filter((c) => c.id !== card.id);
    saveState();
    render();
  });

  article.addEventListener("dragstart", () => {
    article.classList.add("dragging");
    article.dataset.fromColumn = column.id;
  });
  article.addEventListener("dragend", () => article.classList.remove("dragging"));

  return node;
}

function attachDropzone(listEl, column) {
  listEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    listEl.classList.add("drag-over");
  });
  listEl.addEventListener("dragleave", () => listEl.classList.remove("drag-over"));
  listEl.addEventListener("drop", (e) => {
    e.preventDefault();
    listEl.classList.remove("drag-over");
    const dragging = document.querySelector(".card.dragging");
    if (!dragging) return;
    const cardId = dragging.dataset.cardId;
    const fromColumnId = dragging.dataset.fromColumn;
    const fromColumn = state.columns.find((c) => c.id === fromColumnId);
    if (!fromColumn) return;
    const cardIndex = fromColumn.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return;
    const [card] = fromColumn.cards.splice(cardIndex, 1);
    column.cards.push(card);
    saveState();
    render();
  });
}

document.getElementById("addColumnBtn").addEventListener("click", () => {
  state.columns.push({ id: cryptoId(), title: "Nova coluna", cards: [] });
  saveState();
  render();
});

// Tema claro/escuro com persistencia
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const THEME_KEY = "gh900-kanban-theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem(THEME_KEY, theme);
}

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(localStorage.getItem(THEME_KEY) || (prefersDark ? "dark" : "light"));

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

render();
