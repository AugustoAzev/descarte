function abrirModal(modalId) {
    var modal = document.getElementById(modalId);
    modal.style.display = "block";
}
function fechaModal(modalId) {
    var modal = document.getElementById(modalId);
    modal.style.display = "none";
}
window.onclick = function(event) {
    var modals = document.getElementsByClassName('modal');
    for (var i = 0; i < modals.length; i++) {
        var modal = modals[i];
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}