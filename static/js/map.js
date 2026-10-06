console.log('map.js loaded');


// ============================================================
// 1. INITIALISE LEAFLET MAP
// ============================================================

// Create map centred on Dublin
const map = L.map('map').setView(
    [53.3498, -6.2603],
    6
);


// Add OpenStreetMap base layer
L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 2
    }
).addTo(map);


// ============================================================
// 2. APPLICATION STATE
// ============================================================

// All cities loaded from Django REST API
let citiesData = [];

// Currently displayed markers
let markers = {};

// Heatmap layer
let heatLayer = null;

// Whether the heatmap is currently visible
let heatmapVisible = false;


// IMPORTANT:
// This matches your Week 3 Cities API.
const API_URL = '/api/cities/';


// ============================================================
// 3. LOAD CITIES FROM REST API
// ============================================================

async function initMap() {

    showLoading(true);

    try {

        console.log('Fetching cities from:', API_URL);

        const response = await fetch(API_URL);

        console.log('API response status:', response.status);

        if (!response.ok) {
            throw new Error(
                `HTTP error! Status: ${response.status}`
            );
        }

        const data = await response.json();

        console.log('API data received:', data);

        // Your API uses pagination:
        //
        // {
        //     count: 20,
        //     results: [...]
        // }
        //
        // This also allows a plain array if pagination changes later.
        citiesData = data.results || data;

        console.log(
            `Loaded ${citiesData.length} cities`
        );


        // Update information panel
        document.getElementById(
            'cityCount'
        ).textContent = citiesData.length;

        document.getElementById(
            'visibleCityCount'
        ).textContent = citiesData.length;


        // Draw markers
        addMarkersToMap(citiesData);

    }
    catch (error) {

        console.error(
            'Error loading cities:',
            error
        );

        alert(
            'Failed to load city data. ' +
            'Check the browser console and make sure the API is running.'
        );

    }
    finally {

        showLoading(false);

    }
}


// ============================================================
// 4. DISPLAY CITY MARKERS
// ============================================================

function addMarkersToMap(cities) {

    console.log(
        `Displaying ${cities.length} markers`
    );


    // Remove previous markers
    Object.values(markers).forEach(
        marker => map.removeLayer(marker)
    );

    markers = {};


    cities.forEach(city => {

        const lat = parseFloat(city.latitude);
        const lng = parseFloat(city.longitude);


        // Skip invalid coordinates
        if (isNaN(lat) || isNaN(lng)) {

            console.warn(
                `Invalid coordinates for ${city.name}`,
                city
            );

            return;
        }


        // Create Leaflet circle marker
        const marker = L.circleMarker(
            [lat, lng],
            {
                radius: 7,
                fillColor: '#007bff',
                color: '#0056b3',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }
        );


        // Add marker to map
        marker.addTo(map);


        // Attach popup
        marker.bindPopup(
            createPopupContent(city)
        );


        // Store marker using database city ID
        markers[city.id] = marker;

    });


    // Update visible count
    document.getElementById(
        'visibleCityCount'
    ).textContent = cities.length;


    // If heatmap is active,
    // update it so it represents the same visible cities.
    if (heatmapVisible) {

        updateHeatmap(cities);

    }
}


// ============================================================
// 5. CITY POPUPS
// ============================================================

function createPopupContent(city) {

    const lat = parseFloat(city.latitude);
    const lng = parseFloat(city.longitude);


    return `
        <div class="city-popup">

            <h3>${city.name}</h3>

            <p>
                <strong>Country:</strong>
                ${city.country}
            </p>

            ${
                city.region
                    ? `
                        <p>
                            <strong>Region:</strong>
                            ${city.region}
                        </p>
                    `
                    : ''
            }

            <p>
                <strong>Population:</strong>
                ${formatNumber(city.population)}
            </p>

            <p>
                <strong>Coordinates:</strong>
                ${lat.toFixed(4)},
                ${lng.toFixed(4)}
            </p>

            ${
                city.founded_year
                    ? `
                        <p>
                            <strong>Founded:</strong>
                            ${city.founded_year}
                        </p>
                    `
                    : ''
            }

            ${
                city.timezone
                    ? `
                        <p>
                            <strong>Timezone:</strong>
                            ${city.timezone}
                        </p>
                    `
                    : ''
            }

            ${
                city.is_capital
                    ? `
                        <p>
                            <strong>Capital:</strong>
                            Yes
                        </p>
                    `
                    : ''
            }

        </div>
    `;
}


// ============================================================
// 6. NUMBER FORMATTING
// ============================================================

function formatNumber(number) {

    if (
        number === null ||
        number === undefined
    ) {
        return 'N/A';
    }


    return Number(number).toLocaleString();

}


// ============================================================
// 7. SEARCH FUNCTIONALITY
// ============================================================

document
    .getElementById('searchInput')
    .addEventListener(
        'input',
        function(event) {

            const query =
                event.target.value
                    .trim()
                    .toLowerCase();


            const resultsDiv =
                document.getElementById(
                    'results'
                );


            // Empty search:
            // restore all cities
            if (query.length === 0) {

                resultsDiv.innerHTML = '';

                addMarkersToMap(
                    citiesData
                );

                return;
            }


            // Search both city name and country
            const filtered =
                citiesData.filter(city => {

                    const name =
                        city.name
                            ? city.name.toLowerCase()
                            : '';

                    const country =
                        city.country
                            ? city.country.toLowerCase()
                            : '';

                    return (
                        name.includes(query) ||
                        country.includes(query)
                    );

                });


            console.log(
                `Search "${query}" returned ${filtered.length} cities`
            );


            // No results
            if (filtered.length === 0) {

                resultsDiv.innerHTML =
                    '<p style="color:#777; padding:8px;">No cities found</p>';


                // Clear map markers
                Object.values(markers).forEach(
                    marker => map.removeLayer(marker)
                );

                markers = {};


                document.getElementById(
                    'visibleCityCount'
                ).textContent = '0';


                // Clear/update heatmap too
                if (heatmapVisible) {

                    updateHeatmap([]);

                }


                return;
            }


            // Show only matching markers
            addMarkersToMap(filtered);


            // Create clickable search results
            resultsDiv.innerHTML =
                filtered
                    .map(city => `
                        <div
                            class="search-result"
                            onclick="goToCity(${city.id})"
                        >
                            <strong>
                                ${city.name}
                            </strong>,
                            ${city.country}
                        </div>
                    `)
                    .join('');

        }
    );


// ============================================================
// 8. GO TO CITY FROM SEARCH RESULT
// ============================================================

function goToCity(cityId) {

    const city =
        citiesData.find(
            city => city.id === cityId
        );


    if (!city) {

        console.warn(
            'City not found:',
            cityId
        );

        return;
    }


    const lat =
        parseFloat(city.latitude);

    const lng =
        parseFloat(city.longitude);


    if (
        isNaN(lat) ||
        isNaN(lng)
    ) {
        return;
    }


    // Zoom to selected city
    map.setView(
        [lat, lng],
        10
    );


    // Open marker popup
    if (markers[cityId]) {

        markers[cityId].openPopup();

    }
}


// ============================================================
// 9. RESET MAP
// ============================================================

document
    .getElementById('resetBtn')
    .addEventListener(
        'click',
        function() {

            console.log(
                'Resetting map'
            );


            // Return map to Dublin / Europe view
            map.setView(
                [53.3498, -6.2603],
                6
            );


            // Clear search
            document.getElementById(
                'searchInput'
            ).value = '';


            // Clear search results
            document.getElementById(
                'results'
            ).innerHTML = '';


            // Restore all markers
            addMarkersToMap(
                citiesData
            );

        }
    );


// ============================================================
// 10. HEATMAP
// ============================================================

function updateHeatmap(cities) {

    // Remove previous heatmap
    if (heatLayer) {

        map.removeLayer(
            heatLayer
        );

        heatLayer = null;
    }


    // Nothing to display
    if (cities.length === 0) {

        return;

    }


    const heatData =
        cities
            .map(city => {

                const lat =
                    parseFloat(city.latitude);

                const lng =
                    parseFloat(city.longitude);


                if (
                    isNaN(lat) ||
                    isNaN(lng)
                ) {
                    return null;
                }


                /*
                    Third value is heat intensity.

                    We keep it at 0.8 for each city,
                    following the basic lab approach.
                */
                return [
                    lat,
                    lng,
                    0.8
                ];

            })
            .filter(
                item => item !== null
            );


    heatLayer =
        L.heatLayer(
            heatData,
            {
                radius: 25,
                blur: 15,
                maxZoom: 10,
                minOpacity: 0.2
            }
        );


    heatLayer.addTo(map);

}


// ============================================================
// 11. HEATMAP BUTTON
// ============================================================

document
    .getElementById('heatmapBtn')
    .addEventListener(
        'click',
        function() {

            const button = this;


            // Hide heatmap
            if (heatmapVisible) {

                if (heatLayer) {

                    map.removeLayer(
                        heatLayer
                    );

                    heatLayer = null;
                }


                heatmapVisible = false;

                button.textContent =
                    'Show Heatmap';

                console.log(
                    'Heatmap hidden'
                );

                return;
            }


            // Determine currently visible cities
            const query =
                document
                    .getElementById(
                        'searchInput'
                    )
                    .value
                    .trim()
                    .toLowerCase();


            let visibleCities =
                citiesData;


            if (query.length > 0) {

                visibleCities =
                    citiesData.filter(
                        city => {

                            const name =
                                city.name
                                    ? city.name.toLowerCase()
                                    : '';

                            const country =
                                city.country
                                    ? city.country.toLowerCase()
                                    : '';

                            return (
                                name.includes(query) ||
                                country.includes(query)
                            );

                        }
                    );

            }


            updateHeatmap(
                visibleCities
            );


            heatmapVisible = true;

            button.textContent =
                'Hide Heatmap';


            console.log(
                'Heatmap displayed'
            );

        }
    );


// ============================================================
// 12. LOADING INDICATOR
// ============================================================

function showLoading(show) {

    document.getElementById(
        'loading'
    ).style.display =
        show
            ? 'block'
            : 'none';

}


// ============================================================
// 13. START APPLICATION
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    function() {

        console.log(
            'DOM loaded - starting map application'
        );

        initMap();

    }
);