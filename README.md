# Kanban do Mercado — Turma GH-900

Exercício ao vivo do curso **GH-900 (GitHub Foundations)**: um quadro Kanban 100% responsivo, em HTML5/CSS3/JavaScript puro (sem frameworks, sem build step), com tema claro/escuro.

## Como rodar

Basta abrir o `index.html` direto no navegador — não há dependências nem passo de build.

```bash
git clone https://github.com/fpereirasilva/exercicio-kanban-ao-vivo.git
cd exercicio-kanban-ao-vivo
# abra o index.html no navegador
```

## Funcionalidades

- Colunas e cartões editáveis (adicionar, renomear, excluir)
- Arrastar e soltar cartões entre colunas (drag-and-drop nativo)
- Prioridade por cartão (baixa/média/alta)
- Tema claro/escuro com persistência (`localStorage`)
- Layout responsivo (colunas em linha no desktop, empilhadas em telas < 720px)
- Estado do quadro salvo automaticamente em `localStorage`

## Estrutura

```
index.html   # estrutura da página e templates de coluna/cartão
style.css    # tema (variáveis CSS), layout e responsividade
script.js    # lógica do board, drag-and-drop e persistência
```

## Como contribuir (turma)

1. Faça um fork ou peça acesso de colaborador ao repositório.
2. Crie uma branch a partir da `main` (ex.: `minha-equipe/nome-da-feature`).
3. Abra um Pull Request descrevendo a mudança.
4. Peça revisão de outro colega antes do merge.

## Papéis relacionados (Copilot)

Este repositório é acompanhado por agentes/skill de apoio no workspace do curso:

- **Kanban Especialista** — metodologia Kanban (colunas, WIP, fluxo)
- **Kanban Dev** — implementação técnica do board
- **Design de Página** — UI/UX e responsividade
- **Segurança da Informação** — revisão de segurança do código
- Skill `/kanban` — retoma o contexto do exercício entre as aulas
