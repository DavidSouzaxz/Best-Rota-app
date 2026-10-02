# 🚗 Best Rota - Otimizador de Ganhos Inteligente

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android Native Java" />
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
</p>

## 📌 Sobre o Projeto

O **Best Rota** (anteriormente _UberCalcCloud_) é uma aplicação móvel focada em motoristas de aplicativos (como a Uber). O aplicativo funciona em segundo plano e, através de Serviços de Acessibilidade nativos do Android, captura os dados de uma corrida em tempo real, calcula os gastos com combustível e exibe um **pop-up ultra-compacto flutuante** com o Lucro Líquido exato, o valor por Hora e a Margem de Lucro da viagem.

O projeto foi arquitetado como um modelo **SaaS (Software as a Service)**, contendo uma barreira de autenticação por Token, preparando o terreno para a futura integração com uma API em Spring Boot e PostgreSQL.

## ✨ Principais Funcionalidades

- **🔍 Captura Automática (AccessibilityService):** Lê silenciosamente o ecrã do motorista para extrair quilometragem, tempo e valor bruto das chamadas sem a necessidade de intervenção manual.
- **💬 Pop-up de Decisão Rápida (WindowManager):** Um alerta flutuante e fino surge por cima da Uber colorindo as chamadas de acordo com a rentabilidade (ex: Verde para > R$ 1.80/km, Amarelo para corridas medianas).
- **🫧 Bolha Inteligente Dinâmica:** Uma bolha de atalho com o logótipo da app que surge nativamente quando o utilizador minimiza o Best Rota e navega para outras apps (controlado via `AppState`).
- **⛽ Calculadora Flex Dinâmica:** Analisa o preço e consumo de Etanol vs Gasolina e sugere em tempo real qual utilizar para obter a maior margem, mostrando a economia em R$/km.
- **🎯 Dashboard de Metas Bruta e Líquida:** Baseado na autonomia atual do painel do carro, divide o faturamento necessário em "Meta Bruta", "Dinheiro da Bomba" e "Lucro Livre".
- **🤖 Histórico Automatizado:** Interceta cliques do motorista no botão "Aceitar" da Uber e guarda a corrida automaticamente no histórico do aplicativo.
- **🔐 Sistema de Assinaturas (MVP):** Tela de bloqueio inicial que requer validação de uma licença VIP (Token) para libertar o uso do motor.

## 🛠️ Tecnologias Utilizadas

**Frontend / Lógica Core:**

- React Native
- React Navigation (Expo Router)
- AsyncStorage (Persistência de dados locais)

**Backend Integrado (Módulos Nativos Android):**

- **Java Native (Android SDK):** Lógica profunda do sistema operativo não suportada por padrão no React Native.
- **AccessibilityService:** Para leitura do DOM nativo do Android.
- **WindowManager (SYSTEM_ALERT_WINDOW):** Para desenho de Canvas e Layouts (Views flutuantes) sobrepondo outros aplicativos.
- **BroadcastReceiver / NativeEventEmitter:** Para ponte de comunicação bidirecional de dados entre o Java (Native) e o JavaScript (React Native).

## ⚠️ Aviso Crítico para Desenvolvedores

Este projeto utiliza uma **Pasta Nativa Android customizada**. Grande parte da magia do aplicativo acontece dentro de `android/app/src/main/java/com/dvddoido/UberCalcCloud/`.

- **NUNCA** execute o comando `npx expo prebuild --clean` ou tente deletar a pasta `android`. Isso destruirá todos os módulos nativos de Acessibilidade e Sobreposição escritos em Java.
- Alterações de ícone, nome e splash screen devem ser feitas nativamente nas pastas `mipmap` e ficheiros `.xml` (como `strings.xml`), pois o Expo ignorará o `app.json` nesses requisitos.

## 🚀 Como Executar e Compilar

1. **Clonar o repositório e instalar as dependências:**
   ```bash
   git clone https://github.com/davidsouzaxz/Best-Rota-app.git
   cd best-rota
   npm install
   ```
