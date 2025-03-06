const entrarForm = document.getElementById('entrar-form');
const cadastrarForm = document.getElementById('cadastro-form');
const entrarMessageDiv = document.getElementById('entrar-message');
const cadastrarMessageDiv = document.getElementById('cadastrar-message');

entrarForm.addEventListener('submit', async (event) => {
    event.preventDefault(); //evita recarregar a página
    const formData = new FormData(entrarForm);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    try {
        const response = await fetch('/entrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success){
            entrarMessageDiv.textContent = 'Login bem-sucedido! Redirecionando...';
            entrarMessageDiv.className = 'message success';
            entrarMessageDiv.style.display = 'block';
            setTimeout(() => {
                 window.location.href = result.redirectUrl;
            }, 2000);
        } else {
            entrarMessageDiv.textContent = result.message;
            entrarMessageDiv.className = 'message error';
            entrarMessageDiv.style.display = 'block';
            setTimeout(() => {
                entrarMessageDiv.style.display = 'none';
            }, 3000);
        }
    } catch (error) {
        //erros de rede
        entrarMessageDiv.textContent = 'Erro ao conectar ao servidor. Tente novamente.';
        entrarMessageDiv.className = 'message error';
        entrarMessageDiv.style.display = 'block';
        setTimeout(() => {
            entrarMessageDiv.style.display = 'none';
        }, 3000);
    }
});
cadastrarForm.addEventListener('submit', async (event) => {
    event.preventDefault(); //evita recarregar a página
    const formData = new FormData(cadastrarForm);
    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
    };
    try {
        const response = await fetch('/cadastrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success){
            cadastrarMessageDiv.textContent = 'Cadastro bem-sucedido! Aguarde...';
            cadastrarMessageDiv.className = 'message success';
            cadastrarMessageDiv.style.display = 'block';
            setTimeout(() => {
                 window.location.href = result.redirectUrl;
            }, 2000);
        } else {
            cadastrarMessageDiv.textContent = result.message;
            cadastrarMessageDiv.className = 'message error';
            cadastrarMessageDiv.style.display = 'block';
            setTimeout(() => {
                cadastrarMessageDiv.style.display = 'none';
            }, 3000);
        }
    } catch (error) {
        //erros de rede
        cadastrarMessageDiv.textContent = 'Erro ao conectar ao servidor. Tente novamente.';
        cadastrarMessageDiv.className = 'message error';
        cadastrarMessageDiv.style.display = 'block';
        setTimeout(() => {
            cadastrarMessageDiv.style.display = 'none';
        }, 3000);
    }
});