<div align="center">

# Postgres Management Studio

**Gerenciador de servidores PostgreSQL com interface inspirada no pgAdmin 4.**

Versão 0.5.0 • Stack: Go, React + TypeScript + Vite

![Go 1.27+](https://img.shields.io/badge/Go-1.27+-00ADD8)
![React 19+](https://img.shields.io/badge/React-19+-61DAFB)
![TypeScript 5+](https://img.shields.io/badge/TypeScript-5+-3178C6)
![Vite 8+](https://img.shields.io/badge/Vite-8+-646CFF)
![Version v0.5.0](https://img.shields.io/badge/Version-v0.5.0-2b7489)
![License MIT](https://img.shields.io/badge/License-MIT-007ec6)

</div>

---

## ✨ Características / Features

- 🚀 **Interface inspirada no pgAdmin 4** / pgAdmin 4-inspired interface
- 🔍 **Explorador de bancos com menus de contexto e submenus** / Database explorer with context menus and submenus
- 📊 **Visualização de tabelas, views e funções com seleção e cópia** / Browse tables, views and functions with row selection and copy
- ⚡ **Query Tool estilo SSMS** / SSMS-style Query Tool
  - **Seleção de coluna (retangular)** com Shift+Alt+Setas — seleciona caracteres por caractere, fixa a coluna ao navegar para baixo/cima / **Column (box) selection** with Shift+Alt+Arrows — select character by character, fix column when navigating down/up
  - **Mensagens por tipo de comando** — SELECT mostra grid, INSERT/UPDATE/DELETE/DDL mostra apenas mensagens / **Per-command messages** — SELECT shows grid, INSERT/UPDATE/DELETE/DDL shows messages only
  - **Tratamento de erros** com formatação estilo SSMS / **Error handling** with SSMS-style formatting
  - Autocomplete, EXPLAIN/EXPLAIN ANALYZE, exportação CSV / Autocomplete, EXPLAIN/EXPLAIN ANALYZE, CSV export
  - Gerenciamento de arquivos (Novo/Abrir/Salvar/Salvar Como) / File management (New/Open/Save/Save As)
  - Atalhos / Shortcuts: F5 (executar), Ctrl+S (salvar), Ctrl+Shift+S (salvar como), Ctrl+N (novo), Ctrl+O (abrir)
- 📝 **Criação e edição de objetos via Query Tool** / Object creation & editing via Query Tool
  - Procedures, functions, views, sequences, indexes, columns, constraints, triggers, policies e rules com templates prontos / Templates for procedures, functions, views, sequences, indexes, columns, constraints, triggers, policies and rules
  - **Edit** abre o DDL real gerado do catálogo para reexecutar / **Edit** opens real catalog-generated DDL for re-execution
- 🛡️ **Conexões seguras com gerenciamento de credenciais** / Secure connections with credential management
- 🌐 **App desktop nativa (WebView2) + servidor REST** / Native desktop app (WebView2) + REST server
- 🌍 **11 idiomas com troca instantânea** / 11 languages with instant switching
- 🎨 **Temas claro e escuro** / Light and dark themes

## 🛠️ Stack / Tech Stack

- **Backend:** Go, pgx (PostgreSQL), REST API, SQLite (config local)
- **Frontend:** React 19+, TypeScript 5+, Vite 8, Tailwind CSS 4, CodeMirror 6, i18next
- **Desktop:** WebView2 (go-webview2)

## 📋 Pré-requisitos / Prerequisites

- Go 1.27+, Node.js 18+, PostgreSQL 14+ (testes), Windows 10/11 + WebView2 (desktop)

## 🔧 Instalação / Installation

```bash
git clone https://github.com/efrare64-oss/postgres-management-studio.git
cd postgres-management-studio
go mod download
cp .env.example .env
cd web && npm install
```

**Backend:** `go run cmd/server/main.go`

**Frontend:** `cd web && npm run dev`

Acesse / Open `http://localhost:5173`

### App Desktop / Desktop App

```bash
.\build.ps1
# Gera PostgresManagementStudio.exe na raiz / Produces PostgresManagementStudio.exe at root
```

## 🚀 Como Usar / How to Use

1. Clique em **"Adicionar Servidor"** e preencha as credenciais / Click **"Add Server"** and fill in credentials
2. Navegue pela árvore à esquerda / Browse the tree on the left
3. Clique com botão direito → **"Query Tool"** para abrir o editor SQL / Right-click → **"Query Tool"** to open the SQL editor
4. Use **Shift+Alt+Setas** para seleção retangular estilo SSMS / Use **Shift+Alt+Arrows** for SSMS-style column selection
5. Execute com **F5** — SELECT mostra o grid, outros comandos mostram mensagens / Execute with **F5** — SELECT shows grid, other commands show messages

## 🤝 Contribuição / Contributing

1. Fork → Branch (`git checkout -b feature/AmazingFeature`)
2. Commit (`git commit -m 'Add AmazingFeature'`)
3. Push → Pull Request

**Estilo / Style:** Go conventions (gofmt) • ESLint + TypeScript

## ⚠️ Status

Versão 0.5.0 — Em desenvolvimento ativo / Under active development

## 📄 Licença / License

MIT — Veja [LICENSE](LICENSE)

---

**Contato / Contact:** Eduardo Frare — [efrare64@gmail.com](mailto:efrare64@gmail.com)

**Projeto / Project:** [github.com/efrare64-oss/postgres-management-studio](https://github.com/efrare64-oss/postgres-management-studio)
