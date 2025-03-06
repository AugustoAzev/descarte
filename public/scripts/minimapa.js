document.addEventListener("DOMContentLoaded", function() {
    const miniMap = new deck.DeckGL({
        container: 'mini-map',
        initialViewState: {
            longitude: -58.431150,
            latitude: -3.143146,
            zoom: 14,
            maxZoom: 16,
            pitch: 0,
            bearing: 0
        },
        controller: true,
        layers: []
    });

    const tileLayer = new deck.TileLayer({
        id: 'tile-layer',
        data: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
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

    let selectedMarker = null;

    miniMap.setProps({
        layers: [tileLayer],
        onClick: (info) => {
            if (!info.coordinate) return;

            const [longitude, latitude] = info.coordinate;

            console.log("Coordenadas selecionadas:", latitude, longitude);

            document.getElementById('selected-latitude').value = latitude;
            document.getElementById('selected-longitude').value = longitude;

            selectedMarker = new deck.ScatterplotLayer({
                id: 'selected-marker',
                data: [{ position: [longitude, latitude] }],
                getPosition: d => d.position,
                getFillColor: [255, 0, 0],
                radiusMinPixels: 8,
                pickable: false
            });

            miniMap.setProps({ layers: [tileLayer, selectedMarker] });
        }
    });
});