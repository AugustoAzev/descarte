document.getElementById('viewRequestsButton').addEventListener('click', () => {
    const userInfoElement = document.getElementById("user-info");
    const userId = userInfoElement.getAttribute("data-user-id");

    carregarSolicitacoes(userId);
    document.getElementById('userRequestsContainer').style.display = 'block';
});

const messageDiv = document.getElementById('delete-ponto-message');

function carregarSolicitacoes(userId) {
    fetch(`/solicitacao-usuario/${userId}`)
        .then(response => response.json())
        .then(data => {
            const tableBody = document.querySelector('#userRequestsTable tbody');
            tableBody.innerHTML = '';
            
            data.forEach(request => {
                const row = document.createElement('tr');

                row.innerHTML = `
                    <td>${request.titulo}</td>
                    <td>${request.residuo}</td> 
                    <td>${request.local}</td>
                    <td>${request.votos_positivos}</td>
                    <td>${request.votos_negativos}</td>
                    <td>${request.status}</td>
                    <td>
                        <button class="deletar-solicitacao" data-id="${request.id}">
                            <img src="img/icons/close.png" alt="Excluir" width="16" height="16">
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            document.querySelectorAll('.deletar-solicitacao').forEach(button => {
                button.addEventListener('click', (e) => {
                    const requestId = e.currentTarget.getAttribute('data-id');
                    deletarSolicitacao(requestId, userId);
                });
            });
        })
        .catch(error => console.error('Erro ao carregar solicitações:', error));
}

function deletarSolicitacao(requestId, userId) {
    fetch(`/deletar-solicitacao/${requestId}`, { method: 'DELETE' })
        .then(response => response.json())
        .then(data => {
            if(data){
                messageDiv.textContent = "Solicitação excluída com sucesso!";
                    messageDiv.className = 'message success';
                    messageDiv.style.display = 'block';
                    setTimeout(() => {
                        messageDiv.style.display = 'none';
                    }, 5000);
            }

            if (userId) {
                carregarSolicitacoes(userId);
            } else {
                console.error('Elemento com ID "userId" não encontrado.');
            }
        })
        .catch(error => console.error('Erro ao excluir solicitação:', error));
}
