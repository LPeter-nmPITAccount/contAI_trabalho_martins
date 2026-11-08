(function () {
    "use strict"

    const $ = (seletor, contexto = document) => contexto.querySelector(seletor);
    const $$ = (seletor, contexto = document) => [...contexto.querySelectorAll(seletor)];
 
 
    $("#year").textContent = new Date().getFullYear();
 

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
})()