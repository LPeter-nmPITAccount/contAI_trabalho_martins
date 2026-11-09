import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import Groq from "groq-sdk";
import { PERSONA, CONHECIMENTO, REGRAS } from "./persona.js";

dotenv.config({ quiet: true });

const diretorioAtual = path.dirname(fileURLToPath(import.meta.url));


/* =====================================================================
   CONFIGURAÇÕES
   =====================================================================
*/

const porta = process.env.PORT || 3000;
const modelo = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const maxCaracteresMensagem = 500;
const maxItensHistorico = 30;
const maxSessoes = 500;
const limiteRequisicoesPorMinuto = 20;

const arquivoInteresses = path.join(diretorioAtual, "interesses.json");
const arquivoContatos = path.join(diretorioAtual, "contatos.json");

if (!process.env.GROQ_API_KEY) {
  console.warn(
    "\n⚠️  GROQ_API_KEY não encontrada!\n" +
      "   Copie .env.exemplo para .env e cole sua chave (https://console.groq.com/keys).\n"
  );
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "sem-chave" });

const app = express();
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(diretorioAtual, "public")));


/* =====================================================================
   INSTRUÇÃO DE SISTEMA (persona da Taí) */

const instrucaoDeSistema = `
Você é ${PERSONA.nome}, atendente virtual do ${PERSONA.empresa} (${PERSONA.ramo}).
Seu objetivo: ${PERSONA.objetivo}.
Seu tom: ${PERSONA.tom}

=== CONHECIMENTO DO CONTAÍ ===
${CONHECIMENTO}

=== REGRAS ===
${REGRAS.map((regra, i) => `${i + 1}. ${regra}`).join("\n")}

Escreva em texto simples, sem markdown (não use **, # ou tabelas).
`;


/* =====================================================================
   FUNÇÕES DE APOIO
   =====================================================================
*/

function anexarJSON(arquivo, registro) {
  let lista = [];
  try {
    lista = JSON.parse(fs.readFileSync(arquivo, "utf-8"));
  } catch {
    lista = [];
  }
  lista.push(registro);
  fs.writeFileSync(arquivo, JSON.stringify(lista, null, 2));
  return lista.length;
}

const acessos = new Map();

function limitarRequisicoes(requisicao, resposta, proximo) {
  const agora = Date.now();
  const ip = requisicao.ip || "desconhecido";

  const recentes = (acessos.get(ip) || []).filter((t) => agora - t < 60_000);

  if (recentes.length >= limiteRequisicoesPorMinuto) {
    return resposta
      .status(429)
      .json({ erro: "Muitas mensagens em pouco tempo. Aguarde um instante." });
  }

  recentes.push(agora);
  acessos.set(ip, recentes);
  proximo();
}

const historicos = new Map();

function pegarHistorico(sessionId) {
  if (!historicos.has(sessionId)) {
    if (historicos.size >= maxSessoes) {
      historicos.delete(historicos.keys().next().value);
    }
    historicos.set(sessionId, []);
  }
  return historicos.get(sessionId);
}

function aparar(historico) {
  while (historico.length > maxItensHistorico) {
    historico.shift();
  }
  while (
    historico.length &&
    !(historico[0].role === "user" && historico[0].content)
  ) {
    historico.shift();
  }
}

const textoLimpo = (valor, max) =>
  typeof valor === "string" ? valor.trim().slice(0, max) : "";


/* =====================================================================
   FERRAMENTA DA IA: registrar_interesse
   =====================================================================
*/

const ferramentas = [
  {
    type: "function",
    function: {
      name: "registrar_interesse",
      description:
        "Registra o interesse de um visitante em entrar na lista de espera do beta do Contaí, quando ele já informou nome e um contato (WhatsApp ou e-mail).",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do visitante." },
          contato: { type: "string", description: "WhatsApp ou e-mail do visitante." },
          perfil: { type: "string", description: "Autônomo, MEI ou outro (opcional)." },
        },
        required: ["nome", "contato"],
      },
    },
  },
];

function executarFerramenta(nome, argumentos) {
  if (nome === "registrar_interesse") {
    const { nome: nomeVisitante, contato, perfil } = argumentos || {};

    const registro = {
      nome: textoLimpo(nomeVisitante, 120),
      contato: textoLimpo(contato, 120),
      perfil: textoLimpo(perfil, 60) || "não informado",
      origem: "chat",
      data: new Date().toLocaleString("pt-BR"),
    };

    if (!registro.nome || !registro.contato) {
      return { sucesso: false, aviso: "Faltam nome e contato." };
    }

    const total = anexarJSON(arquivoInteresses, registro);
    console.log("📥 NOVO INTERESSE (chat):", registro);

    return { sucesso: true, posicao_na_lista: total };
  }

  return { sucesso: false, aviso: `Ferramenta inexistente: ${nome}` };
}


/* =====================================================================
   ROTA DO CHAT: POST /api/chat
   =====================================================================
*/

app.post("/api/chat", limitarRequisicoes, async (requisicao, resposta) => {
  const mensagem = textoLimpo(requisicao.body?.mensagem, maxCaracteresMensagem);
  const sessionId = textoLimpo(requisicao.body?.sessionId, 64) || "anonimo";

  if (!mensagem) {
    return resposta.status(400).json({ erro: "Mensagem vazia." });
  }

  if (!process.env.GROQ_API_KEY) {
    return resposta
      .status(500)
      .json({ erro: "A chave da Groq não está configurada no .env." });
  }

  const historico = pegarHistorico(sessionId);
  const tamanhoAntes = historico.length;
  historico.push({ role: "user", content: mensagem });

  try {
    let textoFinal = "";

    for (let volta = 1; volta <= 3; volta++) {
      const respostaIA = await groq.chat.completions.create({
        model: modelo,
        messages: [{ role: "system", content: instrucaoDeSistema }, ...historico],
        tools: ferramentas,
        tool_choice: "auto",
      });

      const mensagemResposta = respostaIA.choices?.[0]?.message;
      const chamadas = mensagemResposta?.tool_calls;

      if (!chamadas || chamadas.length === 0) {
        textoFinal = mensagemResposta?.content ?? "";
        historico.push({ role: "assistant", content: textoFinal });
        break;
      }

      historico.push(mensagemResposta);

      for (const chamada of chamadas) {
        const argumentos = JSON.parse(chamada.function.arguments || "{}");
        const resultado = executarFerramenta(chamada.function.name, argumentos);

        historico.push({
          role: "tool",
          tool_call_id: chamada.id,
          content: JSON.stringify(resultado),
        });
      }
    }

    aparar(historico);

    return resposta.json({
      resposta: textoFinal || "Desculpe, não consegui responder agora. Pode repetir?",
    });
  } catch (erro) {
    console.error("❌ Erro ao falar com a Groq:", erro);
    historico.length = tamanhoAntes;

    return resposta
      .status(500)
      .json({ erro: "Não consegui falar com a IA agora. Tente novamente." });
  }
});


/* =====================================================================
   ROTA DO FORMULÁRIO: POST /api/contato
   =====================================================================
*/

const assuntos = [
  "Entrar na lista de espera",
  "Dúvida",
  "Sugestão",
  "Problema técnico",
  "Outro",
];

app.post("/api/contato", limitarRequisicoes, (requisicao, resposta) => {
  const nome = textoLimpo(requisicao.body?.nome, 120);
  const email = textoLimpo(requisicao.body?.email, 160);
  const assunto = textoLimpo(requisicao.body?.assunto, 60);
  const mensagem = textoLimpo(requisicao.body?.mensagem, 1000);
  const consentimento = requisicao.body?.consentimento === true;

  const erros = {};

  if (nome.length < 3) erros.nome = "Informe seu nome completo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) erros.email = "Informe um e-mail válido.";
  if (!assuntos.includes(assunto)) erros.assunto = "Selecione um assunto.";
  if (mensagem.length < 10) erros.mensagem = "Escreva ao menos 10 caracteres.";
  if (!consentimento) erros.consentimento = "É preciso concordar para enviar.";

  if (Object.keys(erros).length) {
    return resposta.status(400).json({ erro: "Dados inválidos.", campos: erros });
  }

  const registro = {
    nome,
    email,
    assunto,
    mensagem,
    consentimento,
    data: new Date().toLocaleString("pt-BR"),
  };

  anexarJSON(arquivoContatos, registro);
  console.log("📨 NOVO CONTATO:", { nome, email, assunto });

  return resposta.json({ ok: true });
});


/* =====================================================================
   LIGAR O SERVIDOR */

app.listen(porta, () => {
  console.log("Servidor rodando...");
  console.log(`Acesse http://localhost:${porta}`);
  console.log(`Atendente virtual: ${PERSONA.nome} (modelo ${modelo})`);
});