document.getElementById('cadastro-form').addEventListener('submit', function(event) {
    const password = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const message = document.getElementById('signup-message');

    if (password !== confirmPassword) {
        event.preventDefault();
        message.style.display = 'block';
    } else {
        message.style.display = 'none';
    }
});