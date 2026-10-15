# 🟠 Shopee Time Tracking System (Shopee Page Control)

> **Sistema Corporativo de Gerenciamento de Ausências, Ponto e Banco de Horas**  
> Solução interna e funcional voltada para a gestão otimizada da jornada de trabalho, controle de ausências e acompanhamento de horas extras de colaboradores e agentes Shopee.

---

## 📋 Sobre o Projeto

O **Shopee Page Control** é um sistema completo e centralizado criado para atender às demandas de gestão de pessoas e controle operacional interno da Shopee. A aplicação divide-se em duas visões principais:

1. **Visão do Funcionário / Agente:** Permite ao colaborador agendar ausências futuras (consultas médicas, problemas técnicos/energia, atestados ou imprevistos), acompanhar o envio de comprovantes e gerar relatórios em PDF do seu histórico.
2. **Visão Administrativa (Gestor):** Oferece um dashboard analítico detalhado com métricas consolidadas (métricas gerais, gráficos de ausências por motivo, rastro de horas extras, banco de horas, gestão de feriados e controle de acessos), além da capacidade de exportar planilhas gerenciais.

---

## 📸 Demonstração do Sistema

### 👤 Portal do Funcionário

#### 1. Painel de Gerenciamento de Ausências
Exibição clara e simplificada das ausências registradas, status de envio de comprovantes, horários agendados e opções para geração de relatórios ou cancelamento.
<img width="1918" height="909" alt="image" src="https://github.com/user-attachments/assets/02661da8-7b70-4f20-a8e6-8ea4a23484f6" />



#### 2. Registro de Ausências Futuras
Modal intuitivo com validação de horários de saída e retorno, categorizado pelos principais motivos corporativos (Consulta Médica, Energia/Internet, Atestado/Emergencial, Outro).
<img width="1911" height="910" alt="image" src="https://github.com/user-attachments/assets/ac7b2ace-bb95-4730-b802-00119f186ba5" />


#### 3. Emissão de Relatório Individual
Filtro rápido por mês para geração e download de relatórios consolidados em formato PDF.
<img width="1911" height="910" alt="image" src="https://github.com/user-attachments/assets/46fa9a55-621f-4523-a59a-397f55785628" />

<img width="802" height="850" alt="image" src="https://github.com/user-attachments/assets/18b3d1cc-e1b5-4070-b5cc-2e0ce11b27f4" />


---

### 🛡️ Dashboard Administrativo

#### 4. Visão Geral e Analytics de Gestão
Painel administrativo completo exibindo indicadores estratégicos em tempo real:
- **KPIs Globais:** Total de ausências, horas extras acumuladas, total de agentes ativos e feriados cadastrados.
- **Gráficos e Insights:** Distribuição de ausências por motivo (Consulta Médica, Atestado, Falha de Energia/Internet, Outros) e ranking de Horas Extras.
- **Ferramentas de Gestão:** Busca por agente/motivo, ordenação mensal, controle de acessos e exportação de planilhas.
<img width="1915" height="912" alt="image" src="https://github.com/user-attachments/assets/09144064-b4b7-4f84-98ee-5db2d0d0d991" />

---

## ✨ Funcionalidades Principais

### 👤 Área do Colaborador
- [x] **Agendamento de Ausências Futuras:** Cadastro com data, horário de saída/retorno e seleção de motivo padronizado.
- [x] **Anexo de Comprovantes:** Confirmação e validação do envio de documentos/atestados.
- [x] **Histórico de Ausências:** Visualização clara das solicitações passadas e futuras.
- [x] **Exportação de Relatórios:** Impressão/Geração de PDF individual filtrado por mês.

### 🛡️ Painel Administrativo
- [x] **Visão Geral e Metrificação:** Cards informativos com totalizadores corporativos em tempo real.
- [x] **Relatórios Analíticos (Insights):** Gráficos comparativos por tipo de ausência e utilização de banco de horas.
- [x] **Exportação de Dados:** Botão de exportação rápida de relatórios para planilhas (.xlsx / .csv).
- [x] **Gestão Operacional:** Controle de feriados corporativos, cálculo automático de Horas Extras e Gestão de Férias.
- [x] **Controle de Acessos:** Gerenciamento granular de permissões entre Administrador e Funcionário.

---

## 🛠️ Tecnologias Utilizadas

A stack foi selecionada visando máxima performance, tipagem estática robusta e facilidade de manutenção em escala corporativa:

| Categoria | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Framework Web** | [Next.js 15 (App Router)](https://nextjs.org/) | Renderização híbrida (SSR/Server Components), rotas otimizadas e alta performance. |
| **Biblioteca de UI** | [React 19](https://react.dev/) | Construção de interfaces dinâmicas e reativas. |
| **Linguagem** | [TypeScript](https://www.typescriptlang.org/) | Tipagem estática end-to-end, garantindo maior confiabilidade no código. |
| **Backend & Banco de Dados** | [Supabase](https://supabase.com/) | Banco de dados PostgreSQL, autenticação corporativa e armazenamento de comprovantes. |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com/) | Estilização utility-first rápida, responsiva e padronizada com a identidade visual Shopee. |
| **Componentes Acessíveis** | [Radix UI](https://www.radix-ui.com/) | Componentes primitivos sem estilo (modais, dropdowns, popovers) com foco em acessibilidade (WAI-ARIA). |
| **Ícones** | [Lucide React](https://lucide.dev/) | Pacote de ícones leves e consistentes para toda a interface. |

---

## 🚀 Deploy e Integração Contínua

- **Hospedagem:** [Vercel](https://vercel.com/)
- **CI/CD:** Pipelines de build e deployment automáticos integrados a cada *push* no repositório.

---

## 🔧 Como Executar o Projeto Localmente

### Pré-requisitos

- **Node.js** (v18.x ou superior)
- **npm**, **yarn** ou **pnpm**
- Conta e projeto configurado no **Supabase**

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/MateusdeLima/shopee-time-tracking.git](https://github.com/MateusdeLima/shopee-time-tracking.git)
   cd shopee-time-tracking
