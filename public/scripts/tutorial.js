const iniciaTutorial = document.getElementById("inicia-tutorial");
const overlayTutorial = document.getElementById("overlay-tutorial");
const cardTutorial = document.querySelectorAll(".card-tutorial");
const botaoProximo = document.querySelectorAll("[id^='prox']");
const fechaTutorial = document.getElementById("fecha-tutorial");

let cardAtual = 0;

//exibe
iniciaTutorial.addEventListener("click", () =>{
    overlayTutorial.style.display = "flex";
    cardTutorial[cardAtual].classList.add("active");
});
//avanca
botaoProximo.forEach((button, index) =>{
    button.addEventListener("click", ()=>{
        cardTutorial[cardAtual].classList.remove("active");
        cardAtual++;
        if(cardAtual < cardTutorial.length){
            cardTutorial[cardAtual].classList.add("active");
        }
    });
});
//finaliza
fechaTutorial.addEventListener("click", ()=>{
    overlayTutorial.style.display = "none";
    cardTutorial[cardAtual].classList.remove("active");
    cardAtual = 0;
});