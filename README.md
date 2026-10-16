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

### 4. Cálculos Elétricos e Dimensionamento Rigoroso (NBR 5410)
- **Cálculo de Correntes e Fator de Potência ($\cos \varphi$)**:
  - Circuitos monopolares: $I = \frac{P}{V_{FN} \times \cos \varphi}$
  - Circuitos bipolares: $I = \frac{P}{V_{FF} \times \cos \varphi}$
  - Circuitos tripolares/tetrapolares: $I = \frac{P}{\sqrt{3} \times V_{FF} \times \cos \varphi}$
  - Detecção inteligente de cargas indutivas (motores, bombas, ar-condicionado) com $\cos \varphi = 0,85$ padrão.
- **Fatores de Correção por Agrupamento (FCA — Tabela 42 NBR 5410)**:
  - Aplicação automática de derating térmico para cabos em eletroduto (de 1 a $\ge 20$ circuitos agrupados, FCA de 1,00 a 0,38).
- **Critério de Queda de Tensão Máxima ($\Delta V \le 4,0\%$)**:
  - Cálculo contínuo baseado na resistividade do cobre a 20°C ($\rho = 0,01724\,\Omega\cdot\text{mm}^2/\text{m}$) e comprimento $L$ até a carga:
    - Monofásico / Bifásico: $\Delta V = \frac{2 \times \rho \times L \times I}{S}$
    - Trifásico equilibrado: $\Delta V = \frac{\sqrt{3} \times \rho \times L \times I}{S}$
- **Espaço de Reserva Obrigatório no QDC (Tabela 59 NBR 5410)**:
  - Validação em tempo real da capacidade do quadro:
    - Até 6 circuitos: reserva mínima de 2 módulos
    - De 7 a 12 circuitos: reserva mínima de 3 módulos
    - De 13 a 30 circuitos: reserva mínima de 4 módulos
    - Mais de 30 circuitos: reserva mínima de $0,15 \times N$ módulos
- **Proteção DR Obrigatória (item 5.1.3.2.2)**:
  - Detecção automática de pontos que exigem IDR $\le 30\text{mA}$ (banheiros, chuveiros, cozinhas, lavanderias, garagens e tomadas externas).
  - Suporte a IDRs setoriais com alerta de sobrecarga ($I_{\text{total}} > I_{n\,\text{IDR}}$).
  - Verificação de conexão e aterramento do condutor PEN no QDC para esquemas TN-C-S.
- **Recálculo Inteligente de Disjuntores e Cabos**:
  - Ferramenta com modal comparativo de prévia (*diff*) que dimensiona disjuntores e bitolas de condutores segundo o cruzamento entre ampacidade, agrupamento e queda de tensão.

### 5. Disjuntores Diferenciais Residuais (RCBO / DDR)
- Módulos híbridos compactos que integram proteção contra sobrecorrentes (disjuntor termomagnético) e proteção contra choques e fugas de corrente (diferencial residual de 30mA).
- Suporte a modelos monopolares, bipolares e tripolares/tetrapolares em curvas B, C e D.
- Simulação funcional com botão de teste ("T") operacional no simulador interativo.

### 6. Diagrama Unifilar Interativo (Single-Line Diagram)
- **Visualização Técnica Especializada**:
  - Geração automática e dinâmica do unifilar a partir da configuração do quadro e circuitos cadastrados.
  - Representação gráfica de condutores de alimentação (fases R, S, T, neutro e PE), proteção geral, DPS e ramificações.
  - Destaque claro de IDRs setoriais e circuitos protegidos por RCBO.
- **Dois Modos Visuais**:
  - **Engenharia Técnico** (fundo branco de alto contraste para plotagem e documentação).
  - **Blueprint Clássico** (estilo prancha azul de engenharia).
- **Ferramentas de Navegação e Apresentação**:
  - Zoom dinâmico ($0,5\times$ a $2,5\times$), notas técnicas automáticas da NBR 5410 e legenda de condutores/símbolos.
  - Carimbo técnico de projeto de engenharia com dados da instalação, tensão, esquema de aterramento e capacidade.
- **Exportação Vetorial e Documento PDF**:
  - Download em formato **.SVG** vetorial puro para edição em CAD/Inkscape/Illustrator.
  - Exportação direta para **.PDF** técnico de engenharia (formatos A3 ou A4 em orientação paisagem) via renderização vetorial com `jspdf` e `svg2pdf.js`.

### 7. Proteção Padronizada e Limpa (Sem Marcas Comerciais)
- **DPS Unificado**: Módulo Classe II (275V, 20kA) padronizado em invólucro vermelho para fases e neutro.
- **Design Neutro**: Nenhuma menção a marcas comerciais específicas, preservando foco puramente normativo e técnico.
- **Legibilidade Total**: Identificação dos circuitos com número (`C1`, `C2`...) e identificador visual acomodados com alto contraste.

### 8. Relatórios, Documentação e Exportação
- **Diagrama do Quadro em Vetor (.SVG)**: Download do painel físico montado em alta resolução.
- **Quadro de Cargas Interativo**: Planilha dinâmica com edição em tempo real de potência, tensão, curva, bitola, agrupamento e queda de tensão.
- **Lista de Materiais (BOM)**: Especificação completa de disjuntores, DDRs, barramentos, DPS, cabos por bitola ($mm^2$) e componentes do aterramento.
- **Folha de Etiquetas**: Etiquetas padronizadas DIN para recorte e identificação frontal dos circuitos.
- **Salvar e Carregar Projeto (.JSON)**: Importação e exportação completas com validação de esquema.

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

# 3. Executar os testes automatizados da NBR 5410
npm test

# 4. Executar o servidor de desenvolvimento
npm run dev

# 5. Gerar build estático para produção
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
- **jsPDF** & **svg2pdf.js** (Geração e exportação vetorial de diagramas técnicos em PDF A3/A4)
- **Vitest** (Suíte de testes automatizados com cobertura completa das regras elétricas NBR 5410)

---

## 📜 Normas de Referência
- **ABNT NBR 5410**: Instalações elétricas de baixa tensão (Tabelas 36, 42 e 59; critérios de proteção contra choques e sobrecorrentes).
- **ABNT NBR IEC 60947-2 / NBR NM 60898**: Disjuntores para proteção contra sobrecorrentes.
- **ABNT NBR IEC 61643-1**: Dispositivos de proteção contra surtos (DPS) conectados a sistemas elétricos de baixa tensão.
- **ABNT NBR NM 61008**: Interruptores a corrente diferencial-residual sem proteção contra sobrecorrente (IDR).
- **ABNT NBR NM 61009**: Disjuntores a corrente diferencial-residual com proteção contra sobrecorrente incorporada (DDR / RCBO).

