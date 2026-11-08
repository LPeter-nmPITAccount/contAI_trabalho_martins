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
})()