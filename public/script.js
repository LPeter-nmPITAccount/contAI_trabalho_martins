(function () {
    "use strict"
  /* ===================================================================
     1) UTILITÁRIOS E ANO DO RODAPÉ
     ===================================================================
*/
    const $ = (seletor, contexto = document) => contexto.querySelector(seletor);
    const $$ = (seletor, contexto = document) => [...contexto.querySelectorAll(seletor)];
 
 
    $("#year").textContent = new Date().getFullYear();
 /* ===================================================================
     2) MENU DO CELULAR
     ===================================================================
*/

    const menu = $("#nav");
    const botaoMenu = $("#menuToggle");
    
    function fecharMenu() {
        menu.classList.remove("is-open");
        botaoMenu.setAttribute("aria-expanded", "false");
    }
    
    botaoMenu.addEventListener("click", () => {
        const aberto = menu.classList.toggle("is-open");
        botaoMenu.setAttribute("aria-expanded", String(aberto));
    });
    
    $$("a", menu).forEach((link) => link.addEventListener("click", fecharMenu));
    
    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") fecharMenu();
    });

/* ===================================================================
     3) EFEITOS AO ROLAR A PÁGINA
     ===================================================================
*/
    /* --- 3.1 Sombra no cabeçalho --- */
    const cabecalho = $(".header");
    
    const aoRolar = () =>
        cabecalho.classList.toggle("is-scrolled", window.scrollY > 10);
    
    window.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();
    
    /* --- 3.2 Destacar no menu a seção que está na tela --- */
    const linksMenu = $$('.nav a[href^="#"]:not(.btn)');
    const secoes = linksMenu
        .map((link) => $(link.getAttribute("href")))
        .filter(Boolean);
    
    if ("IntersectionObserver" in window) {
        const vigia = new IntersectionObserver(
        (entradas) => {
            entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                linksMenu.forEach((link) =>
                link.classList.toggle(
                    "is-active",
                    link.getAttribute("href") === "#" + entrada.target.id
                )
                );
            }
            });
        },
        { rootMargin: "-45% 0px -50% 0px" }
        );
    
        secoes.forEach((secao) => vigia.observe(secao));
    }
    
    /* --- 3.3 Animação de entrada ("reveal") --- */
    const itensRevelar = $$(".reveal");
    
    if ("IntersectionObserver" in window) {
        const observador = new IntersectionObserver(
        (entradas) => {
            entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add("is-visible");
                observador.unobserve(entrada.target);
            }
            });
        },
        { threshold: 0.12 }
        );
    
        itensRevelar.forEach((elemento) => observador.observe(elemento));
    } else {
        itensRevelar.forEach((elemento) => elemento.classList.add("is-visible"));
    }

/* ===================================================================
 4) FAQ: ABRE UMA PERGUNTA POR VEZ
===================================================================
*/
    
    const itensFaq = $$(".faq details");
    
    itensFaq.forEach((item) => {
        item.addEventListener("toggle", () => {
        if (item.open) {
            itensFaq.forEach((outro) => {
            if (outro !== item) outro.open = false;
            });
        }
        });
    });
    
    
/* ===================================================================
    5) FORMULÁRIO DE CONTATO / LISTA DE ESPERA
    ===================================================================
*/
    
    const formulario = $("#form-contato");
    const elementoStatus = $("#formStatus");
    
    const regras = {
        nome: (elemento) =>
        elemento.value.trim().length < 3 ? "Informe seu nome completo." : "",
    
        email: (elemento) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(elemento.value.trim())
            ? ""
            : "Informe um e-mail válido.",
    
        assunto: (elemento) => (elemento.value ? "" : "Selecione um assunto."),
    
        mensagem: (elemento) =>
        elemento.value.trim().length < 10 ? "Escreva ao menos 10 caracteres." : "",
    
        consentimento: (elemento) =>
        elemento.checked ? "" : "É preciso concordar para enviar.",
    };
    
    function validar(elemento, mensagemExterna) {
        const mensagem = mensagemExterna ?? regras[elemento.name](elemento);
        const campo = elemento.closest(".field");
    
        campo.classList.toggle("has-error", Boolean(mensagem));
        $(".error", campo).textContent = mensagem;
        elemento.setAttribute("aria-invalid", mensagem ? "true" : "false");
    
        return !mensagem;
    }
    
    const campos = $$("input, select, textarea", formulario);
    
    campos.forEach((elemento) => {
        elemento.addEventListener("blur", () => validar(elemento));
    
        const reconferir = () => {
        if (elemento.closest(".field").classList.contains("has-error")) validar(elemento);
        };
    
        elemento.addEventListener("input", reconferir);
        elemento.addEventListener("change", reconferir);
    });
    
    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
    
        elementoStatus.textContent = "";
        elementoStatus.className = "form-status";
    
        const resultados = campos.map((elemento) => validar(elemento));
    
        if (resultados.includes(false)) {
        campos.find((elemento) => elemento.getAttribute("aria-invalid") === "true")?.focus();
        return;
        }
    
        const botao = $("button[type=submit]", formulario);
        const textoOriginal = botao.textContent;
        botao.disabled = true;
        botao.textContent = "Enviando...";
    
        const dadosFormulario = {
        nome: formulario.nome.value,
        email: formulario.email.value,
        assunto: formulario.assunto.value,
        mensagem: formulario.mensagem.value,
        consentimento: formulario.consentimento.checked,
        };
    
        try {
        const resposta = await fetch("/api/contato", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dadosFormulario),
        });
    
        const dados = await resposta.json().catch(() => ({}));
    
        if (!resposta.ok) {
            if (dados.campos) {
            Object.entries(dados.campos).forEach(([nome, mensagem]) => {
                if (formulario[nome]) validar(formulario[nome], mensagem);
            });
            }
            throw new Error(dados.erro || "Erro " + resposta.status);
        }
    
        elementoStatus.textContent =
            "Mensagem enviada! Responderemos o mais rápido possível. 💚";
        elementoStatus.classList.add("ok");
    
        formulario.reset();
        $$(".field", formulario).forEach((campo) => campo.classList.remove("has-error"));
        } catch (erro) {
        elementoStatus.textContent =
            "Não foi possível enviar agora. Confira se o servidor está ligado (npm start) e tente de novo.";
        elementoStatus.classList.add("fail");
        console.error(erro);
        } finally {
        botao.disabled = false;
        botao.textContent = textoOriginal;
        }
    }); 
/* ===================================================================
    6) CHAT COM A TAÍ (IA)
    ===================================================================
*/
 
    const botaoChat = $("#chat-toggle");
    const chat = $("#chat");
    const fechar = $("#fechar");
    const botaoEnviar = $("#enviar");
    const campoTexto = $("#input");
    const areaMensagens = $("#chat-box");
    const sugestoes = $("#chat-chips");
    
    const idSessao = crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random();
    
    function abrirChat() {
        chat.classList.remove("hidden");
        botaoChat.setAttribute("aria-expanded", "true");
        campoTexto.focus();
    }
    
    function fecharChat() {
        chat.classList.add("hidden");
        botaoChat.setAttribute("aria-expanded", "false");
    }
    
    botaoChat.addEventListener("click", () =>
        chat.classList.contains("hidden") ? abrirChat() : fecharChat()
    );
    
    fechar.addEventListener("click", fecharChat);
    
    $$("[data-open-chat]").forEach((botao) => botao.addEventListener("click", abrirChat));
    
    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && !chat.classList.contains("hidden")) fecharChat();
    });
    
    botaoEnviar.addEventListener("click", () => enviar());
    
    campoTexto.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") enviar();
    });
    
    sugestoes.addEventListener("click", (evento) => {
        const botao = evento.target.closest("button[data-pergunta]");
        if (botao) enviar(botao.dataset.pergunta);
    });
    
    function adicionarMensagem(tipo, texto) {
        const elementoMensagem = document.createElement("div");
        elementoMensagem.className = tipo;
        elementoMensagem.textContent = texto;
    
        areaMensagens.appendChild(elementoMensagem);
        areaMensagens.scrollTop = areaMensagens.scrollHeight;
    
        return elementoMensagem;
    }
    
    async function enviar(textoDireto) {
        const texto = (textoDireto ?? campoTexto.value).trim();
    
        if (!texto || campoTexto.disabled) return;
    
        adicionarMensagem("usuario", texto);
        campoTexto.value = "";
        sugestoes.classList.add("hidden");
    
        campoTexto.disabled = true;
        botaoEnviar.disabled = true;
        const digitando = adicionarMensagem("bot", "Digitando...");
    
        try {
        const resposta = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensagem: texto, sessionId: idSessao }),
        });
    
        const dados = await resposta.json().catch(() => ({}));
    
        if (!resposta.ok) throw new Error(dados.erro || "Erro " + resposta.status);
    
        digitando.remove();
        adicionarMensagem("bot", dados.resposta);
        } catch (erro) {
        digitando.remove();
        adicionarMensagem(
            "erro",
            "Ops! Não consegui responder agora. 😕 (" + erro.message + ")"
        );
        console.error(erro);
        } finally {
        campoTexto.disabled = false;
        botaoEnviar.disabled = false;
        campoTexto.focus();
        }
    }
})()