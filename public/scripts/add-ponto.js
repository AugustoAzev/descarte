document.getElementById("addPointForm").onsubmit = (e) => {
    e.preventDefault();
    const addPointModal = document.getElementById("addPointModal");
    const messageDiv = document.getElementById('add-ponto-message');
    const userInfoElement = document.getElementById("user-info");
    const user_id = userInfoElement.getAttribute("data-user-id");
    const latitude = document.getElementById("selected-latitude").value;
    const longitude = document.getElementById("selected-longitude").value;

        const pointData = {
            titulo: document.getElementById("titulo").value,
            residuo: document.getElementById("residuo").value,
            local: document.getElementById("local").value,
            latitude,
            longitude, 
            user_id
        };

        fetch('/adicionar-ponto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pointData)
        })
        .then(response => response.json())
        .then(data => {
            if(data){
                    messageDiv.textContent = "Solicitação foi enviada com sucesso! Acompanhe suas solicitações pelo seu perfil.";
                    messageDiv.className = 'message success';
                    messageDiv.style.display = 'block';
                    setTimeout(() => {
                        messageDiv.style.display = 'none';
                    }, 5000);
            }
            addPointModal.style.display = "none";
        })
        .catch(error => {console.error('Erro ao enviar solicitação:', error),
            messageDiv.textContent = "Erro ao adicionar ponto!";
            messageDiv.className = 'message error';
            messageDiv.style.display = 'block';
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        });
};