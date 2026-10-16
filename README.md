# QDC Studio — Planejador de Quadros de Distribuição Elétrica (NBR 5410)

Aplicação web interativa desenvolvida com **React**, **TypeScript**, **Tailwind CSS** e **Vite** para planejamento, simulação e projeto visual de quadros de distribuição de circuitos (QDC) residenciais e comerciais em conformidade com as normas brasileiras (**NBR 5410** e **NBR IEC 61643-1**).

---

## ⚡ Principais Funcionalidades

- **Duas Topologias de QDC**:
  - **Espinha de Peixe**: Barramento central de cobre (R, S, T) com disjuntores DIN montados horizontalmente nas calhas laterais e trilho superior de proteção (Geral, IDR e DPS).
  - **DIN Horizontal**: Trilhos DIN modulares (2 a 4 fileiras) com barramento tipo pente e barramentos dedicados de Neutro e Terra.
- **Dimensionamento Personalizável**:
  - Ajuste de capacidade do barramento central (8 a 16 posições por lado) ou número de fileiras e módulos por fileira (12 a 24 módulos).
  - Redimensionamento dinâmico automático do gabinete e calhas.
- **Fiação Não-Sobreposta com Roteamento Ortogonal**:
  - Canais de fiação inteligentes por fase (R, S, T), neutro e terra.
  - Atravessamento dinâmico (`pass-through`) em vãos vazios entre disjuntores, garantindo que nenhum cabo passe sobre o corpo dos componentes.
  - Ferramenta de **Fiação Manual** e geração automática (**Auto-Fios**), preservando 100% dos fios manuais do usuário.
- **Cálculos Elétricos e Balanceamento de Fases**:
  - Cálculo de corrente individual de circuito ($I = P/V$), bifásico ($I = P/V_{FF}$) e trifásico.
  - Algoritmo de balanceamento de fases com cálculo de desbalanceamento conforme NBR 5410.
  - Janela modal explicativa exibindo o passo a passo da redistribuição de cargas e identificação dos circuitos de cada fase.
- **Proteção Completa NBR 5410**:
  - Disjuntor Geral (1P, 2P ou 3P).
  - Interruptor Diferencial Residual (IDR) 30mA (2P ou 4P).
  - Dispositivo de Proteção contra Surtos (DPS) unificado Classe II (275V, 20kA) para fases e neutro.
- **Exportação e Relatórios**:
  - **Download do Diagrama em Vetor (.SVG)** para impressão ou inclusão em projetos técnicos.
  - **Quadro de Cargas** e resumo elétrico por fase.
  - **Lista de Materiais (BOM)** detalhada e estimativa de condutores por bitola ($mm^2$).
  - **Folha de Etiquetas** para marcação e identificação dos circuitos no painel físico.
  - **Salvar / Carregar Projeto (.JSON)** com validação de esquema.

---

## 🚀 Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- npm, yarn ou pnpm

### Instalação e Execução

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Gerar build de produção
npm run build
```

---

## 🛠️ Tecnologias Utilizadas

- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Lucide React** (Ícones)
- **Vite**
