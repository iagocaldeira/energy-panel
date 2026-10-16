# QDC Studio — Planejador de Quadros de Distribuição Elétrica (NBR 5410)

[![Deploy to GitHub Pages](https://github.com/iagocaldeira/energy-panel/actions/workflows/deploy.yml/badge.svg)](https://github.com/iagocaldeira/energy-panel/actions/workflows/deploy.yml)
[![Aplicação Online](https://img.shields.io/badge/Acessar-QDC%20Studio%20Online-amber?style=flat&logo=github)](https://iagocaldeira.github.io/energy-panel/)

Aplicação web interativa desenvolvida com **React**, **TypeScript**, **Tailwind CSS** e **Vite** para planejamento, simulação e projeto visual de quadros de distribuição de circuitos (QDC) residenciais e comerciais em estrita conformidade com as normas brasileiras (**NBR 5410** e **NBR IEC 61643-1**).

---

## 🌐 Acesso Online

A aplicação está disponível publicamente e pronta para uso em:  
👉 **[https://iagocaldeira.github.io/energy-panel/](https://iagocaldeira.github.io/energy-panel/)**

---

## ⚡ Principais Funcionalidades

### 1. Topologias de QDC Selecionáveis
- **Espinha de Peixe (Vertical)**:
  - Barramento central em cobre eletrolítico (R, S, T) com disjuntores DIN laterais.
  - Trilho DIN superior de proteção dedicado para Disjuntor Geral, IDR e DPS.
  - Capacidade configurável de 8 a 16 posições por lado (até 32 disjuntores).
- **DIN Horizontal (Modular)**:
  - Trilhos DIN 35mm em fileiras horizontais (2 a 4 fileiras configuráveis).
  - Barramentos tipo pente bifásicos/trifásicos e barramentos dedicados de Neutro e Terra.
  - Largura configurável de 12 a 24 módulos por fileira com expansão dinâmica do gabinete.

### 2. Suporte Completo aos 5 Esquemas de Aterramento (NBR 5410)
- **TN-S**: Condutores Neutro (N) e Proteção (PE) distintos em toda a instalação a partir do BEP. Padrão de máxima segurança para IDR e DPS.
- **TN-C-S**: Condutor PEN bifurcado no QDC na barra de equipotencialização antes do IDR. A jusante, N e PE não se reconectam.
- **TN-C**: Condutor PEN único combinado em toda a instalação.  
  ⚠️ *NBR 5410 (item 5.1.3.2.2.4)*: **IDR é estritamente proibido** no TN-C (o PEN causa desarmes intempestivos do DR).
- **TT**: Eletrodo de aterramento local independente do neutro da concessionária.  
  ⚠️ *NBR 5410 (item 5.1.3.2.3.1)*: **IDR é obrigatório** em todos os circuitos para garantir proteção contra choques.
- **IT**: Neutro isolado ou aterrado por alta impedância e massas aterradas localmente. Exige Dispositivo Supervisor de Isolamento (DSI) para continuidade de serviço em ambientes hospitalares/industriais.

### 3. Fiação Inteligente com Roteamento Ortogonal Não-Sobreposto
- **Passagem Livre (`Pass-Through`)**: Algoritmo que detecta vãos vazios entre disjuntores no trilho DIN, garantindo que nenhum cabo passe sobre o corpo dos componentes.
- **Separação de Canais**: Canaletas ortogonais dedicadas por fase (R, S, T), neutro e terra.
- **Fiação Manual e Automática Integrada**:
  - A ferramenta de **Fio Manual** permite conectar qualquer borne a qualquer borne/calha.
  - A geração automática (**Auto-Fios**) preserva 100% dos fios manuais inseridos pelo usuário.
  - Exclusão intuitiva de fios através de clique direto com hit-target ampliado.

### 4. Cálculos Elétricos e Balanceamento de Cargas
- **Cálculo de Correntes**:
  - Circuitos monopolares: $I = \frac{P}{V_{FN}}$
  - Circuitos bipolares: $I = \frac{P}{V_{FF}}$
  - Circuitos tripolares: $I = \frac{P}{\sqrt{3} \times V_{FF}}$
- **Algoritmo de Balanceamento de Fases**:
  - Redistribuição balanceada minimizando o desbalanceamento percentual conforme NBR 5410.
  - Modal explicativo exibindo o passo a passo da redistribuição, corrente por fase e circuitos alocados.
  - Destaque automático de fase sobrecarregada em relação ao disjuntor geral.

### 5. Proteção Padronizada e Limpa (Sem Marcas Comerciais)
- **DPS Unificado**: Módulo Classe II (275V, 20kA) padronizado em invólucro vermelho para fases e neutro.
- **Design Neutro**: Nenhuma menção a marcas específicas (Steck, WEG, Clamper, etc.), preservando foco puramente normativo e técnico.
- **Legibilidade Total**: Identificação dos circuitos com número (`C1`, `C2`...) e nome acomodados com alto contraste dentro da face do componente ou nas calhas, sem sobreposições.

### 6. Relatórios, Documentação e Exportação
- **Diagrama em Vetor (.SVG)**: Download em alta resolução pronto para impressão e plotagem.
- **Quadro de Cargas Interativo**: Planilha dinâmica com edição em tempo real de potência, tensão, curva e bitola.
- **Lista de Materiais (BOM)**: Especificação completa de disjuntores, barramentos, DPS, cabos internos por bitola ($mm^2$) e componentes do sistema de aterramento selecionado.
- **Folha de Etiquetas**: Etiquetas padronizadas DIN para recorte e aplicação na tampa/painel físico.
- **Salvar e Carregar Projeto (.JSON)**: Importação com validação de esquema e sanitização para prevenir erros.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- npm, yarn ou pnpm

### Passos para Instalação e Execução

```bash
# 1. Clonar o repositório
git clone https://github.com/iagocaldeira/energy-panel.git
cd energy-panel

# 2. Instalar as dependências
npm install

# 3. Executar o servidor de desenvolvimento
npm run dev

# 4. Gerar build estático para produção
npm run build
```

---

## 📦 Deploy Contínuo (CI/CD)

O projeto é hospedado de forma **100% estática** no **GitHub Pages** através do workflow automatizado em [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).  
Qualquer commit enviado para a branch `main` dispara automaticamente a compilação e publicação da nova versão em menos de 1 minuto.

---

## 🛠️ Tecnologias Utilizadas

- **React 18** (Interface declarativa e reativa)
- **TypeScript** (Tipagem estática estrita e validação de modelos)
- **Tailwind CSS** (Estilização moderna e responsiva com suporte a impressão `@media print`)
- **Lucide React** (Ícones técnicos de engenharia)
- **Vite** (Build tool e empacotamento estático ultra-rápido)

---

## 📜 Normas de Referência
- **ABNT NBR 5410**: Instalações elétricas de baixa tensão.
- **ABNT NBR IEC 60947-2 / NBR NM 60898**: Disjuntores para proteção contra sobrecorrentes.
- **ABNT NBR IEC 61643-1**: Dispositivos de proteção contra surtos (DPS) conectados a sistemas elétricos de baixa tensão.
- **ABNT NBR NM 61008 / NBR NM 61009**: Dispositivos a corrente diferencial-residual (IDR).
