const DEFAULT_POSITION = { longitude: -58.43115058980902, latitude: -3.1431461340933424 };
const lastPosition = JSON.parse(localStorage.getItem('userPosition'));
let activeDestination = null;
let pendingLayer;
let currentPosition = {longitude: -58.43115058980902, latitude: -3.1431461340933424};
let userLayer;
const userData = document.getElementById("userData");
const userIsLogged = userData.getAttribute("data-logged") === "true";
const avatarUrl = userData.getAttribute("data-avatar");

const deckgl = new deck.DeckGL({
    container: 'map',
    initialViewState: {
        longitude: lastPosition ? lastPosition.longitude : DEFAULT_POSITION.longitude,
        latitude: lastPosition ? lastPosition.latitude : DEFAULT_POSITION.latitude,
        zoom: 12,
        pitch: 0,
        bearing: 0
    },
    controller: true,
    layers: [] 
});

const tileLayer = new deck.TileLayer({
    id: 'tile-layer',
    data: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 17,
    tileSize: 256,
    renderSubLayers: props => {
        const {bbox:{ west, south, east, north}} = props.tile;

        return new deck.BitmapLayer(props, {
            data: null,
            image: props.data,
            bounds: [west, south, east, north]
        });
    }
});

function updatePendingPoints() {
    fetch('/pontos-pendentes')
        .then(response => response.json())
        .then(data => {
            pendingLayer = new deck.IconLayer({
                id: 'pending-layer',
                data: data.map(d => ({
                    position: [parseFloat(d.longitude), parseFloat(d.latitude)],
                    icon: 'img/icons/vote-icon.webp',
                    size: 40,
                    id: d.id,
                    titulo: d.titulo,
                    residuo: d.residuo,
                    local: d.local,
                    votos_positivos: d.votos_positivos,
                    votos_negativos: d.votos_negativos,
                    solicitante: d.solicitante
                })),
                getPosition: d => d.position,
            getIcon: d => ({
                url: d.icon,
                width: 128,
                height: 128,
                anchorY: 128
            }),
                sizeScale: 25,
                pickable: true,
                onClick: (info) => showVotingModal(info.object)
            });

            const currentLayers = deckgl.props.layers.filter(layer => layer.id !== 'pending-layer');
            currentLayers.push(pendingLayer);

            deckgl.setProps({ layers: currentLayers });
        })
        .catch(error => console.error('Erro ao buscar pontos pendentes:', error));
}

function castVote(pointId, vote, user_id) {
    const modalVote = document.getElementById('modal-info');
    const messageDiv = document.getElementById('vote-ponto-message');

    fetch('/votos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            user_id: user_id,
            vote,
            pointId
        })
    })
    .then(response => {
        if (response.status === 403) {
            messageDiv.textContent = "Você já votou neste ponto!";
            messageDiv.className = 'message error';
            messageDiv.style.display = 'block';
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
            throw new Error("Acesso negado, você ja votou neste ponto (403)");
        }
    
        return response.json();
    })
    .then(data => {
        if (data) {
            messageDiv.textContent = "Voto registrado com sucesso!";
            messageDiv.className = 'message success';
            messageDiv.style.display = 'block';
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        }
        modalVote.style.display = "none";
        updatePendingPoints();
    })
    .catch(error => {
        console.error('Erro ao registrar voto:', error);
        if (!messageDiv.textContent){
            messageDiv.textContent = "Erro ao registrar voto!";
            messageDiv.className = 'message error';
            messageDiv.style.display = 'block';
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        }
    });
}

function showVotingModal(point) {
    const infoContent = document.getElementById("infoContent");
    const userInfoElement = document.getElementById("user-info");
    const user_id = userInfoElement.getAttribute("data-user-id");

    infoContent.innerHTML = `
        <h4>Ponto em votação!</h4><br>
        <strong><p id="atributo">Título: ${point.titulo || "Título não disponível"}</p></strong>
        <strong><p id="atributo">Resíduos: ${point.residuo || "Resíduo não disponível"}</p></strong>
        <strong><p id="atributo">Referência: ${point.local || "Referência não disponível"}</p></strong>
        <strong><p id="atributo">Votos positivos: ${point.votos_positivos || "0"}</p></strong>
        <strong><p id="atributo">Votos negativos: ${point.votos_negativos || "0"}</p></strong><br>
        <strong><p id="atributo" style="color: #fd15f1; font-size: x-small;">Solicitado por: ${point.solicitante || 'Desconhecido'}</p></strong>
        <div id="iconContainer">
        <button id="votePositive" style="margin-right: 10px;">Votar Positivo</button>
        <button id="voteNegative">Votar Negativo</button>
        </div>
    `;
    document.getElementById("modal-info").style.display = "block";
    document.getElementById("votePositive").onclick = () => castVote(point.id, "positivo", user_id);
    document.getElementById("voteNegative").onclick = () => castVote(point.id, "negativo", user_id);
}

document.addEventListener("DOMContentLoaded", () => {
    updatePendingPoints();
});

function updateUserLocation(position) {
    const { latitude, longitude } = position.coords;
    currentPosition = { latitude, longitude };

    localStorage.setItem('userPosition', JSON.stringify(currentPosition));

    userLayer = new deck.IconLayer({
        id: 'user-location',
        data: [{
            position: [longitude, latitude],
            icon: avatarUrl,
            size: 34
        }],
        getPosition: d => d.position,
        getIcon: d => ({
            url: d.icon,
            width: 128,
            height: 128,
            anchorY: 128
        }),
        sizeScale: 40,
        pickable: false
    });

    deckgl.setProps({
        initialViewState: {
            longitude,
            latitude,
            zoom: 16,
            pitch: 0,
            bearing: 0,
            transitionDuration: 1200
        },
        layers: [userLayer, ...(pendingLayer ? [pendingLayer] : [])]
    });

    const layers = [tileLayer, userLayer];
    if (pendingLayer) {
        layers.push(pendingLayer);
    }

    deckgl.setProps({ layers });

    if(activeDestination){
        createRoute(activeDestination);
    }else{
        deckgl.setProps({layers});
    }
}

document.getElementById("centralizar").onclick = centerMapOnUser;

function centerMapOnUser() {
    deckgl.setProps({
        viewState: {
            longitude: currentPosition.longitude,
            latitude: currentPosition.latitude,
            zoom: 17,
            pitch: 0,
            bearing: 0,
            transitionDuration: 1000
        }
    });

    setTimeout(() => {
        deckgl.setProps({ viewState: null });
    }, 1000);
}

if (navigator.geolocation) {
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.querySelector('.progress');

    let hasInteracted = false;

    const maxWaitTime = 10000;
    const timeout = setTimeout(() => {
        console.warn('Tempo de espera esgotado. Continuando sem localização...');
        finishLoadingScreen();
    }, maxWaitTime);

    progressBar.style.width = '1%';

    function finishLoadingScreen() {
        if (hasInteracted) return;
        hasInteracted = true;

        clearTimeout(timeout);
        progressBar.style.width = '100%';

        loadingScreen.style.transition = 'opacity 0.5s';
        loadingScreen.style.opacity = '0';

        setTimeout(() => {
            loadingScreen.remove();
        }, 500);
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            updateUserLocation(position);
            finishLoadingScreen();
        },
        (error) => {
            console.error("Erro ao acessar a localização:", error);
            finishLoadingScreen();
        }
    );
} else {
    console.error("Geolocalização não suportada pelo navegador.");
    finishLoadingScreen();
}