let restaurants,
    neighborhoods,
    cuisines;
var newMap;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    initMap(); // added
    fetchNeighborhoods();
    fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
    DBHelper.fetchNeighborhoods()
        .then(neighborhoods => {
            self.neighborhoods = neighborhoods;
            fillNeighborhoodsHTML();
        })
        .catch(error => console.error(error));
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
    const select = document.getElementById('neighborhoods-select');
    for (const neighborhood of neighborhoods) {
        const option = document.createElement('option');
        option.innerHTML = neighborhood;
        option.value = neighborhood;
        select.append(option);
    }
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
    DBHelper.fetchCuisines()
        .then(cuisines => {
            self.cuisines = cuisines;
            fillCuisinesHTML();
        })
        .catch(error => console.log(error));
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
    const select = document.getElementById('cuisines-select');

    for (const cuisine of cuisines) {
        const option = document.createElement('option');
        option.innerHTML = cuisine;
        option.value = cuisine;
        select.append(option);
    }
};

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
    self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
    });
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1Ijoibmltcm9kMTMiLCJhIjoiY2prcTM4MmUyMGoydjN3czczZHpybjJ1MyJ9.j-gsu2FhTyIPaDm7exwuwQ',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
    }).addTo(newMap);

    updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');

    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;

    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;

    DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
        .then(restaurants => {
            resetRestaurants(restaurants);
            fillRestaurantsHTML();
        })
        .catch(error => console.error(error));
};


/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
    // Remove all restaurants
    self.restaurants = [];
    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';

    // Remove all map markers
    if (self.markers) {
        self.markers.forEach(marker => marker.remove());
    }

    self.markers = [];
    self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
    const ul = document.getElementById('restaurants-list');

    for (const restaurant of restaurants) {
        ul.append(createRestaurantHTML(restaurant));
    }

    addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
    const li = document.createElement('li');

    const obj = DBHelper.addImageWithFallback(restaurant);
    li.append(obj);

    const div = document.createElement('div');
    div.className = 'restaurant-text-area';
    li.append(div);

    const name = document.createElement('h2');
    name.innerHTML = restaurant.name;
    div.append(name);

    const neighborhood = document.createElement('p');
    neighborhood.innerHTML = restaurant.neighborhood;
    div.append(neighborhood);

    const address = document.createElement('p');
    address.innerHTML = restaurant.address;
    div.append(address);

    addFavBtn(div, restaurant);
    addDetailsBtn(div, restaurant);

    return li;
};

addDetailsBtn = (div, restaurant) => {
    const details = document.createElement('button');
    details.innerHTML = 'View Details';
    details.className = 'btn';
    details.setAttribute('aria-label', `View details of ${restaurant.name} restaurant.`);
    details.onclick = () => {
        window.location = DBHelper.urlForRestaurant(restaurant);
    };

    div.append(details);
};

addFavBtn = (div, restaurant) => {
    const favBtn = document.createElement('button');
    favBtn.innerHTML = '❤';
    favBtn.classList.add("fav-btn");

    favBtn.onclick = () => {
        restaurant.is_favorite = !restaurant.is_favorite;
        DBHelper.toggleFavorite(restaurant.id, restaurant.is_favorite);
        favBtn.classList.toggle('mark-fav');
        favBtn.setAttribute('aria-label', restaurant.is_favorite ? 'remove from favorites' : 'add to favorites');
    };

    restaurant.is_favorite && favBtn.classList.add("mark-fav");
    favBtn.setAttribute('aria-label', restaurant.is_favorite ? 'remove from favorites' : 'add to favorites');
    div.append(favBtn);
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
    for (let restaurant of restaurants) {
        // Add marker to the map
        const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
        marker.on("click", onClick);

        function onClick() {
            window.location.href = marker.options.url;
        }
        self.markers.push(marker);
    }
};
