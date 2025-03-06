const DEFAULT_POSITION = { longitude: -58.43115058980902, latitude: -3.1431461340933424 };
const lastPosition = JSON.parse(localStorage.getItem('userPosition'));
let activeDestination = null;
let currentTheme = 'light_all';
let geoJsonLayer;
let currentPosition = {longitude: -58.43115058980902, latitude: -3.1431461340933424};
let userLayer;
let isFollowingUser = false;
const userData = document.getElementById("userData");
const userIsLogged = userData.getAttribute("data-logged") === "true";
const avatarUrl = userData.getAttribute("data-avatar");

const deckgl = new deck.DeckGL({
    container: 'map',
    initialViewState: {
        longitude: lastPosition ? lastPosition.longitude : DEFAULT_POSITION.longitude,
        latitude: lastPosition ? lastPosition.latitude : DEFAULT_POSITION.latitude,
        zoom: 16,
        pitch: 0,
        bearing: 0,
        transitionDuration: 5200
    },
    controller: true,
    layers: []
});

function createTileLayer(theme) {
    return new deck.TileLayer({
        id: 'tile-layer',
        data: `https://basemaps.cartocdn.com/${theme}/{z}/{x}/{y}.png`,
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,
        renderSubLayers: props => {
            const { bbox: { west, south, east, north } } = props.tile;

            return new deck.BitmapLayer(props, {
                data: null,
                image: props.data,
                bounds: [west, south, east, north]
            });
        }
    });
}
function updateTheme(newTheme) {
    currentTheme = newTheme;
    document.body.style.backgroundColor = newTheme === 'dark_all' ? 'black' : 'white';
    const buttonIcon = document.querySelector('#mudar-tema i');
    if (newTheme === 'dark_all') {
        buttonIcon.classList.remove('fa-moon');
        buttonIcon.classList.add('fa-sun');
    } else {
        buttonIcon.classList.remove('fa-sun');
        buttonIcon.classList.add('fa-moon');
    }

    const tileLayer = createTileLayer(newTheme);
    const currentLayers = deckgl.props.layers.filter(layer => layer.id !== 'tile-layer');
    currentLayers.unshift(tileLayer);
    deckgl.setProps({ layers: currentLayers });
}

fetch('/geojson-data')
    .then(response => response.json())
    .then(data => {
        if (!data || !data.features) {
            console.error("Erro: Nenhum dado GeoJSON recebido.");
            return;
        }
        const validFeatures = data.features.filter(feature =>
            feature && feature.properties && feature.properties.id &&
            feature.geometry && feature.geometry.coordinates &&
            feature.geometry.coordinates.length === 2 &&
            !isNaN(feature.geometry.coordinates[0]) &&
            !isNaN(feature.geometry.coordinates[1])
        );
        if (validFeatures.length === 0) {
            console.error("Erro: Nenhum dado válido no GeoJSON.");
            return;
        }
        geoJsonLayer = new deck.IconLayer({
            id: 'geojson-layer',
            data: validFeatures.map(feature => ({
                position: feature.geometry.coordinates,
                icon: 'img/icons/ponto.webp',
                size: 40,
                properties: feature.properties
            })),
            getPosition: d => d.position,
            getIcon: d => ({
                url: d.icon,
                width: 128,
                height: 128,
                anchorY: 128
            }),
            sizeScale: 40,
            pickable: true,
            onClick: (info) => {
                if (info.object) {
                    const { properties } = info.object;
                    const coordinates = info.object.position;
                    if (properties && coordinates && coordinates.length === 2) {
                        showModal(properties, coordinates);
                    } else {
                        console.error("Dados do ponto não encontrados.");
                    }
                }
            }
        });
        const currentLayers = deckgl.props.layers.filter(layer => layer.id !== 'geojson-layer');
        currentLayers.push(geoJsonLayer);
        deckgl.setProps({ layers: currentLayers });
}).catch(error => console.error('Erro ao carregar dados GeoJSON:', error));

function showModal(properties, coordinates) {
    const infoContent = document.getElementById("infoContent"); 
    infoContent.innerHTML = `
        <h4>${properties.titulo || 'Título não disponível'}</h4>
        <strong><p id="atributo">Resíduos: ${properties.residuo || 'Resíduo não disponível'}</p></strong>
        <strong><p id="atributo">Referência: ${properties.local || 'Referência não disponível'}</p></strong><br>
        <strong><p id="atributo" style="color: #fd15f1; font-size: x-small;">Enviado por: ${properties.solicitante || 'Desconhecido'}</p></strong>
        <div id="iconContainer">
            <button id="solicitarRemocao" style="background-color: red; color: white; padding: 7px; border: none; border-radius: 5px; cursor: pointer;">
                Este ponto não existe
            </button>
            <button id="routeIcon" style="background-color: blue; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">
                <strong>Me leve até lá!</strong>
            </button>
        </div>
    `;
    infoContent.dataset.pointId = properties.id;
    infoContent.dataset.coords = coordinates;
    document.getElementById("modal-info").style.display = "block";
    document.getElementById("routeIcon").onclick = () => {
        if (coordinates && coordinates.length === 2) {
            activeDestination = coordinates;
            createRoute(activeDestination);
            modalRouteStart();
            document.getElementById("modal-info").style.display = "none";
        } else {
            console.error("Coordenadas do destino não encontradas.");
        }
    };
}
function modalRouteStart(){
    const routeModal = document.getElementById("route-start-modal");
    const routeMStart = document.getElementById("route-m-start");
    routeMStart.innerText = 'Rota em curso, fique sempre alerta!';
    routeModal.style.display = "block";

    setTimeout(() => {
        routeModal.style.display = "none";
    }, 5000);
}
function modalRouteFinish(){
    const routeModalClose = document.getElementById("route-start-modal");
    routeModalClose.style.display = "none";
    const routeModal = document.getElementById("route-finish-modal");
    const routeMFinish = document.getElementById("route-m-finish");
    routeMFinish.innerText = 'Rota encerrada.';
    routeModal.style.display = "block";

    setTimeout(() => {
        routeModal.style.display = "none";
    }, 3000);
}

function calculateBearing(userPosition, destination) {
    const { latitude: userLat, longitude: userLon } = userPosition;
    const [destLon, destLat] = destination;

    const deltaLon = destLon - userLon;

    const y = Math.sin(deltaLon) * Math.cos(destLat);
    const x = Math.cos(userLat) * Math.sin(destLat) - 
              Math.sin(userLat) * Math.cos(destLat) * Math.cos(deltaLon);

    const bearing = Math.atan2(y, x) * (-180 / Math.PI);
    return (bearing + 360) % 360;
}

function updateUserLocation(position) {
    const { latitude, longitude } = position.coords;
    currentPosition = { latitude, longitude };
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
        sizeScale: 34,
        pickable: false
    });

    const layers = [createTileLayer(currentTheme), userLayer];
    if (geoJsonLayer) layers.push(geoJsonLayer);
    deckgl.setProps({ layers });
    if (isFollowingUser) {
        const bearing = activeDestination ? calculateBearing(currentPosition, activeDestination) : 0;
        deckgl.setProps({
            viewState: {
                longitude,
                latitude,
                zoom: 16,
                pitch: 0,
                bearing,
                transitionDuration: 1000
            }
        });
    }
    if (activeDestination) {
        createRoute(activeDestination);
    }
}
function startFollowingUser(destination) {
    isFollowingUser = true;
    activeDestination = destination;
}
function stopFollowingUser() {
    isFollowingUser = false;
    activeDestination = null;
    deckgl.setProps({
        viewState: {
            longitude: currentPosition.longitude,
            latitude: currentPosition.latitude,
            zoom: 16,
            pitch: 0,
            bearing: 0,
            transitionDuration: 2000
        }
    });
    deckgl.setProps({
        viewState: null
    });
}
if (lastPosition) {
    currentPosition = lastPosition;
    updateUserLocation({ coords: lastPosition });
}

async function createRoute(destination) {
    const { latitude, longitude } = currentPosition;
    startFollowingUser(destination);
    
    const bearing = calculateBearing(currentPosition, destination);
    
    deckgl.setProps({
        viewState: {
            longitude,
            latitude,
            zoom: 17,
            pitch: 70,
            bearing,
            transitionDuration: 1000
        }
    });

    const url = `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${destination[0]},${destination[1]}?overview=full&geometries=geojson`;
    
    try {
        document.getElementById("cancelRouteButton").style.display = "block";
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0].geometry;

            const routeLayer = new deck.PathLayer({
                id: 'route-layer',
                data: [{ path: route.coordinates }],
                getPath: d => d.path,
                getColor: [0, 128, 255, 180],
                widthMinPixels: 10,
                widthMaxPixels: 10,
                opacity: 2,
                jointRounded: true,
                capRounded: true,
                transitionDuration: 2000 
            });

            const currentLayers = deckgl.props.layers.filter(layer => layer.id !== 'route-layer');
            currentLayers.push(routeLayer);
            deckgl.setProps({ layers: currentLayers });
        } else {
            console.error("Rota não encontrada.");
        }
    }catch (error) {
        console.error("Erro ao obter rota do servidor OSRM:", error);
    }
}
function showRoute(routeGeometry){
    const routeLayer = new deck.PathLayer({
        id: 'route-layer',
        data: [{path: routeGeometry.coordinates}],
        getPath: d => d.path,
        getColor: [0, 128, 255, 180],
        widthMinPixels: 6,
        widthMaxPixels: 10,
        opacity: 1,
        rounded: true
});
    deckgl.setProps({
        layers: [tileLayer, geoJsonLayer, userLayer, routeLayer]
    });
}
function cancelRoute() {
    activeDestination = null;
    stopFollowingUser();
    modalRouteFinish();

    const layers = deckgl.props.layers.filter(layer => layer.id !== 'route-layer');
    deckgl.setProps({ layers });
    document.getElementById("cancelRouteButton").style.display = "none";
}
document.getElementById("cancelRouteButton").onclick = cancelRoute;

document.getElementById('mudar-tema').addEventListener('click', () => {
    const newTheme = currentTheme === 'dark_all' ? 'light_all' : 'dark_all';
    updateTheme(newTheme);
});
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        updateUserLocation,
        error => console.error("Erro ao acessar localização:", error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
} else {
    console.error("Geolocalização não suportada pelo navegador.");
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
            transitionDuration: 500
        }
    });

    setTimeout(() => {
        deckgl.setProps({ viewState: null });
    }, 1000);
}
if (navigator.geolocation) {
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.querySelector('.progress');
    const localMessageDiv = document.getElementById('localizacao-message');

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
                localMessageDiv.textContent = 'Não foi possivel pegar sua localização, conceda para este site nas configurações do seu navegador.'
                localMessageDiv.className = 'message error';
                localMessageDiv.style.display = 'block';
                setTimeout(() => {
                    localMessageDiv.style.display = 'none';
                }, 10000);
                console.error("Erro ao acessar a localização:", error);
                finishLoadingScreen();
            }
        );
} else {
    console.error("Geolocalização não suportada pelo navegador.");
    finishLoadingScreen();
}

document.body.addEventListener("click", function (event) {
    if (event.target && event.target.id === "solicitarRemocao") {
    const userInfoElement = document.getElementById("user-info");
    const userId = userInfoElement.getAttribute("data-user-id");

        if (!userId) {
            document.getElementById("modal-info").style.display = "none";
            document.getElementById("modal-entrar").style.display = "block";
            return;
        }
        solicitarRemocaoPonto();
    }
});


    function solicitarRemocaoPonto() {
        const userInfoElement = document.getElementById("user-info");
        const userId = userInfoElement.getAttribute("data-user-id");
        const pointId = document.getElementById("infoContent").dataset.pointId;
        const messageDiv =document.getElementById("remocao-message");
    
        if (!userId) {
            document.getElementById("modal-entrar").style.display = "block";
            return;
        }
    
        if (!pointId) {
            console.error("Erro: ID do ponto não encontrado.");
            return;
        }
    
        fetch("/solicitar-remocao", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, pointId })
        })
        .then(response => response.json())
        .then(data => {
            messageDiv.textContent = `${data.message}`;
            messageDiv.className = 'message success';
            document.getElementById("modal-info").style.display = "none";
            messageDiv.style.display = 'block';
            setTimeout(() => {
                messageDiv.style.display = 'none';
           }, 2000);
        })
        .catch(error => {
            messageDiv.textContent = `${error}`;
            messageDiv.className = 'message error';
            setTimeout(() => {
                messageDiv.style.display = 'none';
           }, 2000);
        });
    }    