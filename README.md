# Contaí — seu financeiro no WhatsApp

Site de apresentação (landing page) do **Contaí**, um assistente financeiro com inteligência artificial para **autônomos e MEIs**. A ideia do produto é simples: a pessoa registra entradas e saídas de dinheiro conversando no WhatsApp (texto, áudio ou foto de comprovante), e uma IA organiza tudo, separando o **dinheiro do trabalho** do **dinheiro pessoal**.

O site apresenta o produto, os planos previstos e uma lista de espera para o beta, e conta com a **Taí**, atendente virtual com IA (Groq) para tirar dúvidas dos visitantes.

> Projeto acadêmico — AV3 de *Desenvolvimento Web para IA* e projeto de *Ferramentas de IA e Chatbots* (Tecnólogo em Inteligência Artificial, PIT).

## Integrantes

- Verônica Maria Silva Cardoso
- Pedro Gabriel do Nascimento Matos
- Ricardo Rafael Carneiros de Vasconcelos

## Tecnologias utilizadas

| Camada | Tecnologia |
| --- | --- |
| Front-end | HTML5, CSS3 (Grid e Flexbox, layout responsivo) e JavaScript puro |
| Back-end | Node.js 20+ e Express 5 |
| Inteligência artificial | API da Groq (SDK `groq-sdk`), modelo `openai/gpt-oss-120b` |
| Configuração | `dotenv` (chave da API no arquivo `.env`) |
| Versionamento | Git e GitHub |

## Instalação e execução

Pré-requisitos: **Node.js 20 ou mais recente** e uma chave gratuita da Groq em <https://console.groq.com/keys>.

```bash
# 1. instalar as dependências
npm install

# 2. criar o arquivo .env a partir do modelo
cp .env.exemplo .env        # no Windows: copy .env.exemplo .env

# 3. abrir o .env e colar a sua chave:
#    GROQ_API_KEY=sua_chave_aqui

# 4. ligar o servidor
npm start
```

Abra **http://localhost:3000**. Não abra o `index.html` com dois cliques nem pelo Live Server: o chat e o formulário precisam do servidor ligado.

Se aparecer `model not found` (ou erro 404 dizendo que você não tem acesso ao modelo), troque o modelo no `.env` (por exemplo `GROQ_MODEL=openai/gpt-oss-20b`) conforme a lista de modelos de produção em <https://console.groq.com/docs/models> — modelos marcados como "Enterprise" não funcionam em contas comuns. Depois de mudar o `persona.js`, o `server.js` ou o `.env`, pare o servidor (Ctrl + C) e rode `npm start` de novo.

> Nunca coloque a chave no `script.js`, no HTML ou no GitHub. Ela fica só no `.env`, que está no `.gitignore`.

## Principais funcionalidades

**Site**
- Cabeçalho com logomarca e menu de navegação funcional (Início, Sobre, Funcionalidades, Planos, FAQ, Contato), com menu "hambúrguer" no celular.
- Seções: apresentação do sistema e público-alvo, como funciona, funcionalidades do MVP em cards (CSS Grid), painel de demonstração, planos, privacidade, perguntas frequentes e formulário.
- Painel de demonstração interativo, com dados fictícios, separando gastos profissionais e pessoais, gráfico por categoria e barra do limite anual do MEI.
- Formulário de contato e lista de espera, com validação no navegador e no servidor, consentimento (LGPD) e gravação em `contatos.json`.
- Layout responsivo, foco visível, textos alternativos e respeito à preferência de menos animações.

**Chat com a Taí (IA)**
- Botão flutuante que abre o chat, com sugestões de perguntas.
- Memória da conversa por visitante.
- Registro de interesse na lista de espera feito pela própria IA (ferramenta `registrar_interesse`), gravado em `interesses.json`.

## Integração com Inteligência Artificial

```
[Navegador] --POST /api/chat--> [server.js] --SDK--> [Groq]
   (script.js)                  (guarda a chave)         |
        ^------------------ resposta da Taí <------------+
```

1. O `script.js` envia a mensagem e um `sessionId` para o nosso servidor. O navegador **nunca** fala direto com a Groq, então a chave não fica exposta.
2. O `server.js` monta a **instrução de sistema** a partir do `persona.js` e envia à Groq (como mensagem `system`) junto com o histórico da conversa daquele visitante.
3. **Persona:** a Taí é simpática, direta e usa linguagem simples, com respostas curtas. O arquivo `persona.js` define três blocos: `PERSONA` (quem ela é e como fala), `CONHECIMENTO` (tudo o que ela sabe sobre o Contaí, baseado no Termo de Abertura do projeto) e `REGRAS` (o que ela pode e não pode fazer).
4. **Coerência com o contexto:** a IA responde só com o que está no `CONHECIMENTO`, não inventa preços ou funcionalidades, não dá consultoria tributária nem recomendação de investimento, não aceita dados sensíveis (CPF, senhas, cartão), volta ao assunto quando a conversa foge do tema e ignora pedidos para trocar de personagem.
5. **Function calling:** quando o visitante quer entrar na lista de espera e informa nome e contato, a IA pede para usar a ferramenta `registrar_interesse`. Quem grava o registro é o nosso código, não a IA.
6. **Proteções:** limite de 500 caracteres por mensagem, no máximo 20 requisições por minuto por IP e histórico com tamanho limitado.

## Estrutura de pastas

```
contai/
├── public/                  site entregue ao navegador
│   ├── index.html           estrutura e conteúdo da página
│   ├── styles.css           estilos e responsividade
│   ├── script.js            menu, painel de demonstração, formulário e chat
│   └── img/                 logo, mascote e favicon
├── server.js                servidor Express: /api/chat e /api/contato
├── persona.js               persona, conhecimento e regras da Taí
├── package.json             dependências e script npm start
├── .env.exemplo             modelo do arquivo de configuração
├── .gitignore               ignora node_modules, .env e os JSON gerados
└── README.md
```

Arquivos criados em tempo de execução (não vão para o GitHub): `.env`, `contatos.json` e `interesses.json`.

## Observações sobre o produto

- O Contaí ainda está em validação. O MVP está previsto para até 20/11/2026.
- Os valores dos planos (R$ 19,90/mês e R$ 199/ano) são hipóteses a validar no beta.
- Os dados do painel de demonstração são fictícios.
- Cálculos tributários são estimativas. O Contaí não substitui o contador e não oferece consultoria tributária nem recomendação de investimentos.

## Fluxo de trabalho no GitHub

Cada integrante trabalha em commits pequenos e com mensagem clara (por exemplo: `feat: seção de planos`, `fix: validação do e-mail`, `docs: README`), distribuídos ao longo do desenvolvimento.