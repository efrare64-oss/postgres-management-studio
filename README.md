<div align="center">

# Postgres Management Studio

**Gerenciador de servidores PostgreSQL com interface inspirada no pgAdmin 4.**
**PostgreSQL server manager with a pgAdmin 4-inspired interface.**

Versão 0.2.0 • Stack: Go, React + TypeScript + Vite

![Go 1.27+](https://img.shields.io/badge/Go-1.27+-00ADD8)
![React 19+](https://img.shields.io/badge/React-19+-61DAFB)
![TypeScript 5+](https://img.shields.io/badge/TypeScript-5+-3178C6)
![Vite 8+](https://img.shields.io/badge/Vite-8+-646CFF)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind%20CSS-4-38BDF8)
![Version v0.2.0](https://img.shields.io/badge/Version-v0.2.0-2b7489)
![License MIT](https://img.shields.io/badge/License-MIT-007ec6)

</div>

---

## ✨ Características / Features

- 🚀 **Interface intuitiva similar ao pgAdmin 4** / Intuitive interface similar to pgAdmin 4
- 🔍 **Gerenciamento completo de múltiplos servidores** / Full management of multiple servers
- 📊 **Visualização de tabelas, views e funções com seleção e cópia** / Browse tables, views and functions with row selection and copy
- ⚡ **Query Tool com autocomplete, EXPLAIN, múltiplos resultados, exportação CSV e gerenciamento de arquivos** / Query Tool with autocomplete, EXPLAIN, multiple result grids, CSV export and file management
  - Atalhos / Shortcuts: F5 (executar), Ctrl+S (salvar), Ctrl+Shift+S (salvar como), Ctrl+N (novo), Ctrl+O (abrir)
- 🛡️ **Conexões seguras com gerenciamento de credenciais** / Secure connections with credential management
- 📁 **Gerenciamento de arquivos SQL** / SQL file management (New/Open/Save/Save As)
- 🖱️ **Menus de contexto completos com submenus** / Full context menus with submenus
- 🌐 **Aplicação desktop nativa (WebView2) + servidor REST** / Native desktop app (WebView2) + REST server

## 🛠️ Stack Tecnológica / Tech Stack

- **Backend:** Go, PostgreSQL Driver (pgx), REST API, SQLite (configuração local / local config)
- **Frontend:** React 19+, TypeScript 5+, Vite 8, Tailwind CSS 4, CodeMirror
- **Desktop:** WebView2 (go-webview2) com janela nativa maximizada

## 📋 Pré-requisitos / Prerequisites

- Go 1.27 ou superior / Go 1.27 or later
- Node.js 18+ e npm/pnpm / Node.js 18+ and npm/pnpm
- PostgreSQL 14+ (para testes / for testing)
- Windows 10/11 com WebView2 Runtime (para o app desktop / for the desktop app)

## 🔧 Instalação / Installation

### Desenvolvimento Local / Local Development

1. **Clone o repositório / Clone the repository**

```bash
git clone https://github.com/efrare64-oss/postgres-management-studio.git
cd postgres-management-studio
```

2. **Configurar o Backend / Set up the Backend**

```bash
go mod download
cp .env.example .env
```

3. **Configurar o Frontend / Set up the Frontend**

```bash
cd web
npm install
```

4. **Executar o Projeto / Run the Project**

Servidor (Backend):

```bash
go run cmd/server/main.go
```

Frontend (em outro terminal / in another terminal):

```bash
cd web
npm run dev
```

5. **Acesse / Open** `http://localhost:5173`

### 🖥️ Aplicativo Desktop (Windows) / Desktop App (Windows)

O app desktop único (com WebView2) é gerado pelo script `build.ps1`.
The single desktop app (WebView2) is produced by the `build.ps1` script.

```bash
.\build.ps1
# Gera PostgresManagementStudio.exe na raiz do projeto
# Produces PostgresManagementStudio.exe at the project root
```

## 📁 Estrutura do Projeto / Project Structure

```
postgres-management-studio/
├── cmd/
│   ├── server/            # Servidor REST / REST server
│   └── desktop/           # App desktop WebView2 / WebView2 desktop app
├── internal/
│   ├── app/               # Wire / injeção de dependências / dependency wiring
│   ├── application/       # Casos de uso / use cases
│   ├── domain/            # Entidades e interfaces / entities & interfaces
│   ├── infrastructure/
│   │   ├── database/      # SQLite local (config) + conexões PostgreSQL
│   │   ├── http/          # Handlers e rotas / handlers & routes
│   │   ├── persistence/   # Repositórios SQLite
│   │   └── remote/        # Acesso ao PostgreSQL (pgx)
│   ├── config/            # Configuração / configuration
│   └── assets/            # Assets embutidos / embedded assets
├── web/
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   │   ├── BrowserPanel.tsx   # Explorador de bancos com menus de contexto
│   │   │   ├── QueryTool.tsx      # Editor SQL com autocomplete e resultados
│   │   │   ├── QueryToolbar.tsx   # Barra de ferramentas do Query Tool
│   │   │   ├── ObjectPanel.tsx    # Painéis de detalhes de objetos
│   │   │   ├── DataGrid.tsx       # Grid de dados editável
│   │   │   ├── ContextMenu.tsx    # Menus de contexto
│   │   │   ├── Dialogs/          # Diálogos de criação/edição
│   │   │   └── ...               # Outros componentes
│   │   ├── types/         # Types TypeScript
│   │   ├── api.ts         # Cliente REST / REST client
│   │   └── App.tsx        # Componente raiz / root component
│   ├── package.json
│   └── vite.config.js
├── build.ps1              # Build do app desktop / desktop build
├── .env.example
├── go.mod
└── LICENSE
```

## 🚀 Como Usar / How to Use

### Conectando a um Servidor PostgreSQL / Connecting to a PostgreSQL Server

1. Clique em **"Adicionar Servidor" / Click "Add Server"**
2. Preencha as credenciais / Fill in the credentials:
   - Nome do Servidor / Server Name
   - Host/Porta / Host/Port
   - Usuário/Senha / Username/Password
   - Database padrão / Default database
3. Clique em **"Conectar" / Click "Connect"**

### Funcionalidades Principais / Main Features

- **Explorador de Banco / Database Explorer** — Navegue por bancos, schemas e tabelas com menus de contexto / browse databases, schemas and tables with context menus
- **Query Tool** — Execute SQL com autocomplete, EXPLAIN/EXPLAIN ANALYZE, múltiplos resultados, exportação CSV e gerenciamento de arquivos (Novo/Abrir/Salvar) / run SQL with autocomplete, EXPLAIN/EXPLAIN ANALYZE, multiple result grids, CSV export and file management (New/Open/Save)
  - Atalhos / Shortcuts: F5 (executar), Ctrl+S (salvar), Ctrl+Shift+S (salvar como), Ctrl+N (novo), Ctrl+O (abrir)
- **Visualização de Tabelas / Table View** — Veja propriedades, colunas, índices e estatísticas com seleção de linhas e cópia / view properties, columns, indexes and statistics with row selection and copy
- **Dashboards** — Servidor e banco com sessões ativas e tamanhos / server and database dashboards with active sessions and sizes

## 🤝 Contribuição / Contributing

Contribuições são muito bem-vindas! Por favor, siga estes passos:
Contributions are very welcome! Please follow these steps:

1. Fork o projeto / Fork the repo
2. Crie sua branch / Create your branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças / Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch / Push to the branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request / Open a Pull Request

### Guia de Estilo / Style Guide

- **Backend:** Siga as convenções do Go / Follow Go conventions (gofmt, golint)
- **Frontend:** Siga o ESLint + TypeScript configurados no projeto / Follow the ESLint + TypeScript configured in the project
- **Commits:** Mensagens claras e descritivas / Clear, descriptive messages

## 📝 Roadmap

- ✅ Conexão básica com PostgreSQL / Basic PostgreSQL connection
- ✅ Navegação por schemas e tabelas / Schema and table navigation
- ✅ Query tool com múltiplos resultados / Query tool with multiple result grids
- ✅ Exportação de dados (CSV) / Data export (CSV)
- ⬜ Backup automático / Automatic backup
- ⬜ Monitoramento de performance / Performance monitoring
- ⬜ Temas dark/light / Dark/light themes
- ⬜ Suporte a múltiplas conexões simultâneas / Support for multiple simultaneous connections

## ⚠️ Problemas Conhecidos / Known Issues

- Versão 0.2.0: Em desenvolvimento ativo / Version 0.2.0: under active development
- Autocomplete no query executor ainda em beta / Query tool autocomplete is still in beta
- Suporte limitado a roles e permissões / Limited support for roles and permissions

## 📄 Licença / License

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE) para mais informações.
Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

## 🙏 Agradecimentos / Acknowledgments

- Inspirado no / Inspired by [pgAdmin 4](https://www.pgadmin.org/)
- Stack construída com ferramentas open-source incríveis / Built with amazing open-source tools

---

**📞 Contato / Contact:** Eduardo Frare — [efrare64@gmail.com](mailto:efrare64@gmail.com)

**🔗 Link do Projeto / Project Link:** [https://github.com/efrare64-oss/postgres-management-studio](https://github.com/efrare64-oss/postgres-management-studio)