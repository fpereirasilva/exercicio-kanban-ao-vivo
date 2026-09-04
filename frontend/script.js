// State & Configuration
const API_BASE_URL = window.location.origin; // Same origin via Reverse Proxy or local dev
let currentBoard = { columns: [] };
let activeCardForImage = null;

// DOM Elements
const boardEl = document.getElementById('board');
const columnTemplate = document.getElementById('columnTemplate');
const cardTemplate = document.getElementById('cardTemplate');
const addColumnBtn = document.getElementById('addColumnBtn');
const saveBoardBtn = document.getElementById('saveBoardBtn');
const openAdminsBtn = document.getElementById('openAdminsBtn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const apiStatusEl = document.getElementById('apiStatus');
const statusTextEl = document.getElementById('statusText');

// Modals
const adminModal = document.getElementById('adminModal');
const closeAdminModal = document.getElementById('closeAdminModal');
const addAdminForm = document.getElementById('addAdminForm');
const adminsTableBody = document.getElementById('adminsTableBody');

const imageModal = document.getElementById('imageModal');
const closeImageModal = document.getElementById('closeImageModal');
const imageInput = document.getElementById('imageInput');
const uploadImageBtn = document.getElementById('uploadImageBtn');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('gh900-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeIcon.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
}

themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('gh900-theme', newTheme);
  themeIcon.textContent = newTheme === 'dark' ? '🌙' : '☀️';
});

// API Connection & Status
async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/health`);
    if (res.ok) {
      const data = await res.json();
      const dot = apiStatusEl.querySelector('.status-dot');
      dot.className = 'status-dot online';
      statusTextEl.textContent = `Online (Azure Blob: ${data.azure_blob_storage})`;
      return true;
    }
  } catch (err) {
    console.warn("API offline or proxying error:", err);
  }
  const dot = apiStatusEl.querySelector('.status-dot');
  dot.className = 'status-dot offline';
  statusTextEl.textContent = "API Desconectada";
  return false;
}

// Load Board State from API / Azure Blob Storage
async function loadBoard() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/board`);
    if (res.ok) {
      currentBoard = await res.json();
      renderBoard();
      return;
    }
  } catch (err) {
    console.error("Erro ao carregar quadro do backend:", err);
  }
  // Default fallback board
  currentBoard = {
    columns: [
      {
        id: "col-1",
        title: "Recebimento / Estoque",
        cards: [
          { id: "c-1", title: "Conferir nota fiscal #1042", priority: "alta" },
          { id: "c-2", title: "Organizar lote de laticínios", priority: "media" }
        ]
      },
      {
        id: "col-2",
        title: "Em Reposição",
        cards: [{ id: "c-3", title: "Repor gôndola de grãos", priority: "baixa" }]
      },
      { id: "col-3", title: "Conferência de Preço", cards: [] },
      { id: "col-4", title: "Concluído", cards: [] }
    ]
  };
  renderBoard();
}

// Save Board State to Azure Blob Storage via API
async function saveBoardToAzure() {
  saveBoardBtn.textContent = "⏳ Salvando...";
  saveBoardBtn.disabled = true;

  // Extract current board state from DOM
  const columns = [];
  document.querySelectorAll('.column').forEach((colEl) => {
    const colId = colEl.dataset.id;
    const title = colEl.querySelector('.column-title').value;
    const cards = [];
    
    colEl.querySelectorAll('.card').forEach((cardEl) => {
      const cardId = cardEl.dataset.id;
      const cardTitle = cardEl.querySelector('.card-title').textContent.trim();
      const priority = cardEl.querySelector('.card-priority').value;
      const imgEl = cardEl.querySelector('.card-img');
      const imageUrl = imgEl && imgEl.src && !cardEl.querySelector('.card-image-wrapper').classList.contains('hidden') ? imgEl.src : null;

      cards.push({ id: cardId, title: cardTitle, priority, imageUrl });
    });

    columns.push({ id: colId, title, cards });
  });

  currentBoard.columns = columns;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentBoard)
    });
    if (res.ok) {
      alert("✅ Quadro salvo com sucesso no Azure Blob Storage!");
    } else {
      alert("❌ Erro ao salvar quadro no Azure.");
    }
  } catch (err) {
    alert("❌ Falha na conexão ao salvar quadro: " + err.message);
  } finally {
    saveBoardBtn.textContent = "☁️ Salvar no Azure";
    saveBoardBtn.disabled = false;
  }
}

// Render Board UI
function renderBoard() {
  boardEl.innerHTML = '';
  currentBoard.columns.forEach((colData) => {
    const colFragment = columnTemplate.content.cloneNode(true);
    const colEl = colFragment.querySelector('.column');
    colEl.dataset.id = colData.id;

    const titleInput = colEl.querySelector('.column-title');
    titleInput.value = colData.title;

    const cardListEl = colEl.querySelector('.card-list');
    const cardCountEl = colEl.querySelector('.card-count');

    // Cards
    colData.cards.forEach((cardData) => {
      const cardEl = createCardElement(cardData);
      cardListEl.appendChild(cardEl);
    });

    cardCountEl.textContent = colData.cards.length;

    // Add Card button
    colEl.querySelector('.btn-add-card').addEventListener('click', () => {
      const newCardData = {
        id: `card-${Date.now()}`,
        title: "Novo item de estoque",
        priority: "media",
        imageUrl: null
      };
      const cardEl = createCardElement(newCardData);
      cardListEl.appendChild(cardEl);
      updateCardCounts();
    });

    // Delete Column button
    colEl.querySelector('.delete-column').addEventListener('click', () => {
      if (confirm(`Excluir coluna "${titleInput.value}"?`)) {
        colEl.remove();
      }
    });

    // Setup Drag & Drop zone
    setupDropzone(cardListEl);

    boardEl.appendChild(colEl);
  });
}

function createCardElement(cardData) {
  const fragment = cardTemplate.content.cloneNode(true);
  const cardEl = fragment.querySelector('.card');
  cardEl.dataset.id = cardData.id || `card-${Date.now()}`;

  const titleEl = cardEl.querySelector('.card-title');
  titleEl.textContent = cardData.title;

  const prioritySelect = cardEl.querySelector('.card-priority');
  prioritySelect.value = cardData.priority || 'media';

  const imgWrapper = cardEl.querySelector('.card-image-wrapper');
  const imgEl = cardEl.querySelector('.card-img');
  if (cardData.imageUrl) {
    imgEl.src = cardData.imageUrl;
    imgWrapper.classList.remove('hidden');
  }

  // Delete Card
  cardEl.querySelector('.delete-card').addEventListener('click', () => {
    cardEl.remove();
    updateCardCounts();
  });

  // Attach Image Button
  cardEl.querySelector('.attach-image-btn').addEventListener('click', () => {
    activeCardForImage = cardEl;
    imageModal.classList.remove('hidden');
  });

  // Drag Events
  cardEl.addEventListener('dragstart', (e) => {
    cardEl.classList.add('dragging');
    e.dataTransfer.setData('text/plain', cardEl.dataset.id);
  });

  cardEl.addEventListener('dragend', () => {
    cardEl.classList.remove('dragging');
    updateCardCounts();
  });

  return cardEl;
}

function setupDropzone(dropzoneEl) {
  dropzoneEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    const draggingCard = document.querySelector('.dragging');
    if (draggingCard) {
      dropzoneEl.appendChild(draggingCard);
    }
  });
}

function updateCardCounts() {
  document.querySelectorAll('.column').forEach((colEl) => {
    const count = colEl.querySelectorAll('.card').length;
    colEl.querySelector('.card-count').textContent = count;
  });
}

// Add Column
addColumnBtn.addEventListener('click', () => {
  const newCol = {
    id: `col-${Date.now()}`,
    title: "Nova Etapa",
    cards: []
  };
  currentBoard.columns.push(newCol);
  renderBoard();
});

// Admin Modal Management
openAdminsBtn.addEventListener('click', () => {
  adminModal.classList.remove('hidden');
  fetchAdmins();
});

closeAdminModal.addEventListener('click', () => {
  adminModal.classList.add('hidden');
});

async function fetchAdmins() {
  adminsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Carregando administradores...</td></tr>';
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admins`);
    if (res.ok) {
      const admins = await res.json();
      renderAdminsTable(admins);
    } else {
      adminsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Erro ao carregar administradores.</td></tr>';
    }
  } catch (err) {
    adminsTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Falha na API: ${err.message}</td></tr>`;
  }
}

function renderAdminsTable(admins) {
  if (!admins || admins.length === 0) {
    adminsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum administrador cadastrado.</td></tr>';
    return;
  }
  adminsTableBody.innerHTML = admins.map(a => `
    <tr>
      <td><code>${a.id}</code></td>
      <td><strong>${a.nome}</strong></td>
      <td>${a.email}</td>
      <td>${a.cargo}</td>
      <td><span class="badge-azure">${a.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <button class="btn-icon-sm" onclick="deleteAdmin('${a.id}')" title="Excluir">🗑️</button>
      </td>
    </tr>
  `).join('');
}

addAdminForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('adminNome').value;
  const email = document.getElementById('adminEmail').value;
  const cargo = document.getElementById('adminCargo').value;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, cargo })
    });
    if (res.ok) {
      addAdminForm.reset();
      fetchAdmins();
    } else {
      alert("Erro ao cadastrar administrador.");
    }
  } catch (err) {
    alert("Falha na requisição: " + err.message);
  }
});

async function deleteAdmin(adminId) {
  if (confirm("Deseja realmente remover este administrador?")) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admins/${adminId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAdmins();
      }
    } catch (err) {
      alert("Erro ao excluir: " + err.message);
    }
  }
}
window.deleteAdmin = deleteAdmin;

// Image Upload Modal
closeImageModal.addEventListener('click', () => {
  imageModal.classList.add('hidden');
  imageInput.value = '';
  imagePreviewContainer.classList.add('hidden');
});

imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreviewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
});

uploadImageBtn.addEventListener('click', async () => {
  const file = imageInput.files[0];
  if (!file) {
    alert("Selecione um arquivo de imagem para enviar!");
    return;
  }

  uploadImageBtn.textContent = "⏳ Enviando para Azure...";
  uploadImageBtn.disabled = true;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/upload`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      const result = await res.json();
      if (activeCardForImage) {
        const imgWrapper = activeCardForImage.querySelector('.card-image-wrapper');
        const imgEl = activeCardForImage.querySelector('.card-img');
        imgEl.src = result.url;
        imgWrapper.classList.remove('hidden');
      }
      alert("✅ Imagem enviada para o Azure Blob Storage!");
      imageModal.classList.add('hidden');
      imageInput.value = '';
      imagePreviewContainer.classList.add('hidden');
    } else {
      alert("❌ Falha ao enviar imagem.");
    }
  } catch (err) {
    alert("❌ Erro de upload: " + err.message);
  } finally {
    uploadImageBtn.textContent = "Enviar para Azure Blob Storage";
    uploadImageBtn.disabled = false;
  }
});

saveBoardBtn.addEventListener('click', saveBoardToAzure);

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkApiHealth();
  loadBoard();
  setInterval(checkApiHealth, 10000);
});
