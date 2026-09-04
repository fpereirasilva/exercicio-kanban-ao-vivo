# Kanban Mercado Cloud — MVP Azure & Conteêneres Docker (Turma GH-900)

Exercício evoluído do curso **GH-900 (GitHub Foundations)**: um sistema Kanban completo com frontend web moderno (HTML5/CSS3/JavaScript, responsivo, tema claro/escuro), backend em **Python (FastAPI)** rodando em conteêneres **Docker**, proxy reverso com **Caddy** e **SSL Let's Encrypt**, com dados e imagens salvos no **Azure Blob Storage**.

---

## 🌐 Endpoints do Ambiente em Produção no Azure

- **Aplicação Web (HTTPS):** [https://gh900serverlab.eastus2.cloudapp.azure.com](https://gh900serverlab.eastus2.cloudapp.azure.com)
- **API Health Check:** `GET` [https://gh900serverlab.eastus2.cloudapp.azure.com/api/v1/health](https://gh900serverlab.eastus2.cloudapp.azure.com/api/v1/health)
- **Consulta de Administradores (API):** `GET` [https://gh900serverlab.eastus2.cloudapp.azure.com/api/v1/admins](https://gh900serverlab.eastus2.cloudapp.azure.com/api/v1/admins)
- **Estado do Quadro Kanban:** `GET / POST` [https://gh900serverlab.eastus2.cloudapp.azure.com/api/v1/board](https://gh900serverlab.eastus2.cloudapp.azure.com/api/v1/board)
- **Upload de Imagens:** `POST` [https://gh900serverlab.eastus2.cloudapp.azure.com/api/v1/upload](https://gh900serverlab.eastus2.cloudapp.azure.com/api/v1/upload)

---

## 🏛️ Arquitetura de Nuvem e Conteêneres

```
                       [ Usuário / Navegador Web ]
                                    │
                                HTTPS / 443
                                    ▼
                     ┌──────────────────────────────┐
                     │   kanban_proxy (Caddy 2.7)   │
                     │  SSL Let's Encrypt Automático│
                     └──────────────┬───────────────┘
                                    │ HTTP Interno (Porta 80)
                                    ▼
                     ┌──────────────────────────────┐
                     │   kanban_web (Nginx Alpine)  │
                     │ Servidor Web Frontend HTML/JS│
                     └──────────────┬───────────────┘
                                    │ Proxy /api/* (Porta 8000)
                                    ▼
                     ┌──────────────────────────────┐
                     │ kanban_backend (FastAPI / Py)│
                     │ API REST Python 3.11         │
                     └──────────────┬───────────────┘
                                    │ Azure Storage SDK
                                    ▼
                     ┌──────────────────────────────┐
                     │ Azure Blob Storage Account   │
                     │  - Container: kanbandata     │
                     │  - Container: kanbanimages   │
                     └──────────────┬───────────────┘
```

### Recursos na Microsoft Azure (`GH-900lab`):
- **Resource Group:** `GH-900lab` (`eastus2`)
- **Máquina Virtual:** `gh900serverlab` (`Standard_B2s`, Ubuntu 22.04 LTS)
- **IP Público:** `20.230.53.239`
- **DNS Azure:** `gh900serverlab.eastus2.cloudapp.azure.com`
- **Storage Account:** `stgh900kanban`
  - Container `kanbandata`: JSON do quadro e administradores
  - Container `kanbanimages`: Upload de imagens dos cartões

---

## 🚀 Como Rodar Localmente com Docker Compose

1. Clone o repositório:
```bash
git clone https://github.com/fpereirasilva/exercicio-kanban-ao-vivo.git
cd exercicio-kanban-ao-vivo
```

2. Crie o arquivo `.env` a partir do modelo:
```bash
cp .env.example .env
```

3. Preencha as credenciais do Azure Storage Account no `.env` e suba os conteêneres:
```bash
docker compose up -d --build
```

4. Acesse no navegador:
- Frontend: `http://localhost`
- API Backend: `http://localhost/api/v1/health`

---

## 📂 Estrutura do Projeto

```
.
├── backend/
│   ├── Dockerfile
│   ├── main.py          # API REST FastAPI + Azure Blob Storage SDK
│   └── requirements.txt
├── frontend/
│   ├── Dockerfile
│   ├── index.html       # UI do Kanban com Modal de Admins e Upload
│   ├── nginx.conf       # Nginx Reverse Proxy para /api/
│   ├── script.js        # Lógica JS, consumo de API REST e drag-and-drop
│   └── style.css        # Estilos responsivos com suporte a temas
├── proxy/
│   └── Caddyfile        # Proxy reverso e SSL Let's Encrypt
├── .env.example         # Exemplo de variáveis de ambiente
├── docker-compose.yml   # Orquestração dos 3 conteêneres (proxy, web, backend)
└── README.md
```

---

## 🤝 Como Contribuir (Turma GH-900)

1. Faça um fork do repositório.
2. Crie uma branch para sua funcionalidade (`git checkout -b feature/minha-melhoria`).
3. Commit suas alterações (`git commit -m "feat: adiciona nova funcionalidade"`).
4. Abra um Pull Request e solicite a revisão de um colega da turma!
2. **`kanban_web` (Nginx)**: Interface Web Frontend.
3. **`kanban_backend` (FastAPI Python 3.11)**: API REST e integração com o Azure SDK.

Veja a documentação completa em `DOCUMENTACAO_AMBIENTE.md`.
