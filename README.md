# 🚀 ShapeOS - Ficha Técnica

O **ShapeOS** é um sistema desenvolvido para conectar personal trainers e alunos, otimizando o acompanhamento de treinos com fichas dinâmicas e rotativas semanais para potencializar os resultados de quem busca o desenvolvimento físico.

---

## 🎯 Objetivo e Descrição da Proposta

Facilitar a gestão e prescrição de treinos por parte dos personal trainers, oferecendo uma rotina de exercícios atualizada semanalmente. O sistema busca garantir que os alunos executem treinos estruturados, acompanhem sua evolução física e mantenham a consistência necessária para alcançar suas metas de performance. O aplicativo funciona num modelo B2B2C, onde o Personal Trainer se cadastra e convida seus alunos para a plataforma.

---

## 🛠️ Tecnologias Utilizadas

O projeto adota uma arquitetura de Monorepo utilizando ferramentas modernas:
O projeto adota uma arquitetura de "Monorepo" (vários projetos juntos) utilizando ferramentas modernas:
* **Linguagem Principal:** TypeScript
* **Gerenciador de Pacotes:** pnpm e Turborepo
* **Front-end Web:** Next.js (React) com Tailwind CSS v4
* **Backend, Banco de Dados & Auth:** Supabase (abstraindo PostgreSQL)
* **Testes E2E:** Playwright
* **Front-end Web:** Next.js (React) com Tailwind CSS
* **Banco de Dados & Login:** Supabase

---

## ⚙️ Pré-requisitos de Ambiente
## 👶 Como Rodar o Projeto (Guia para Iniciantes)

Para executar o projeto localmente, sua máquina precisa ter instalados:
* **Node.js**: Versão `>=20.0.0`
* **pnpm**: Versão `9.x` (Gerenciador de pacotes oficial do projeto)
* **Git**: Para clonamento do repositório
* **Supabase CLI** *(Opcional)*: Caso precise rodar o banco de dados e os serviços do Supabase de forma totalmente local na sua máquina.

> 💡 **Nota:** Se este é o seu primeiro contacto com o projeto ou com desenvolvimento, siga o passo a passo detalhado abaixo.

---
### 📍 Passo 1: Instalar os programas básicos (Pré-requisitos)
Antes de tudo, o seu computador precisa ter três coisas instaladas:
1. **Node.js**: É o motor que faz o projeto rodar. Acesse [nodejs.org](https://nodejs.org/) e baixe a versão **LTS** (Recomendada para a maioria dos usuários). Instale normalmente (só ir clicando em "Avançar" / "Next").
2. **Git**: Usado para baixar o código do projeto. Acesse [git-scm.com](https://git-scm.com/downloads) e instale.
3. **Editor de Código (Recomendado)**: Baixe o [Visual Studio Code (VS Code)](https://code.visualstudio.com/) para conseguir visualizar os arquivos e digitar os comandos com facilidade.

## 🚀 Como Rodar a Aplicação Localmente (Passo a Passo)
### 📍 Passo 2: Instalar o gerenciador "pnpm"
Com o Node.js instalado, você precisará de uma ferramenta chamada `pnpm`.
1. Abra o **Terminal** do seu computador (pode pesquisar por "Prompt de Comando" ou "cmd" no menu Iniciar, ou abrir o terminal dentro do VS Code).
2. Digite o seguinte comando e aperte **Enter**:
```bash
npm install -g pnpm
```

Siga as instruções abaixo para configurar e executar a aplicação no seu ambiente de desenvolvimento:

**1. Clone o repositório**
### 📍 Passo 3: Baixar o código do projeto
Ainda no Terminal, escolha uma pasta onde deseja salvar o projeto e digite o comando abaixo, apertando **Enter**:
```bash
git clone https://github.com/leon-bs17/shapeos-fichafacil.git
```
Digite o comando abaixo para adentrar na pasta, apertando **Enter**:
```bash
cd shapeos-fichafacil
```
*(O comando `cd` serve para entrar dentro da pasta que acabamos de baixar).*

**2. Instale as dependências**
O projeto utiliza o `pnpm` como gerenciador de pacotes. Na raiz do projeto (`shapeos-fichafacil`), execute:
### 📍 Passo 4: Instalar os "pedaços" do projeto (Dependências)
Agora que você está dentro da pasta do projeto, o sistema precisa baixar os arquivos complementares (dependências). Digite:
```bash
pnpm install
```
*Aguarde a barra de carregamento terminar. Pode levar 1 ou 2 minutos.*

### 📍 Passo 5: Configurar as senhas (Variáveis de Ambiente)
O projeto precisa se conectar ao banco de dados (Supabase). Para isso:
1. Pelo terminal do VS Code, abra a pasta `shapeos-fichafacil` > `apps` > `web`.
2. Lá dentro, você verá um arquivo chamado `.env.example`.
3. **Faça uma cópia desse arquivo** e renomeie a cópia para `.env.local` (exatamente assim, com ponto no começo).
4. Abra esse novo arquivo `.env.local` e coloque a URL e a Anon Key do seu banco de dados do Supabase.
    * Acesse a plataforma [supabase.com](https://supabase.com/) e crie uma conta gratuita.
    * Crie um novo projeto através do painel administrativo.
    * Navegue até **Project Settings** > **API** e obtenha os valores da **Project URL** e da **Anon Key**.

**3. Inicie o servidor de desenvolvimento**
Volte para a pasta raiz do projeto (`shapeos-fichafacil`) e inicie a aplicação:
### 📍 Passo 6: Rodar o site!
Pronto! Volte para o Terminal (certifique-se de estar na pasta principal `shapeos-fichafacil`) e digite o comando para ligar o projeto:
```bash
pnpm run dev
```
*(Para rodar apenas a versão web, você pode utilizar o comando `pnpm run dev:web`)*.

1. **Aguarde a inicialização:** Espere o terminal concluir o processamento inicial.
2. **Abra o navegador:** Utilize o navegador de sua preferência (Google Chrome, Edge, Safari, etc.).
3. **Acesse o endereço:** Navegue para **`http://localhost:3000`** 

O projeto deve aparecer funcionando na sua tela!

---

## 👥 Público-Alvo

* **Personal Trainers:** Profissionais que buscam praticidade na criação, personalização e rotação semanal das fichas de treino dos seus alunos.
* **Alunos e Praticantes de Atividade Física:** Pessoas que buscam desenvolvimento físico, hipertrofia ou condicionamento, e precisam de um acompanhamento estruturado para manter o foco na rotina.

---

## 🔗 Links Úteis

* Gestão do Projeto: [Trello](https://trello.com/b/F5UphKlA/shapeos-fichafácil)
