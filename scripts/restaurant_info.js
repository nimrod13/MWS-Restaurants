let restaurant;
let newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setTimeout(() => fetchReviewsForRestaurant().catch(error => console.error(error)), 500); //wait until restaurants are fetched
});

/**
 * Initialize leaflet map
 */
initMap = () => {
    fetchRestaurantFromURL().then(restaurant => {
        self.newMap = L.map('map', {
            center: [restaurant.latlng.lat, restaurant.latlng.lng],
            zoom: 16,
            scrollWheelZoom: false
        });
        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
            mapboxToken: 'pk.eyJ1Ijoibmltcm9kMTMiLCJhIjoiY2prcTM4MmUyMGoydjN3czczZHpybjJ1MyJ9.j-gsu2FhTyIPaDm7exwuwQ',
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            id: 'mapbox.streets'
        }).addTo(self.newMap);
        fillBreadcrumb();
        DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }).catch(error => console.error(error));
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = () => {
    if (self.restaurant) { // restaurant already fetched!
        return Promise.resolve(self.restaurant);
    }
    const id = parseInt(getParameterByName('id'));
    if (!id || id === NaN) { // no id found in URL
        return Promise.reject('No restaurant id in URL');
    } else {
        return DBHelper.fetchRestaurantById(id)
            .then(restaurant => {
                if (!restaurant) {
                    return Promise.reject(`Restaurant ${id} was not found`);
                }
                self.restaurant = restaurant;
                fillRestaurantHTML();
                return restaurant;
            });
    }
}

/**
 * Get reviews for current restaurant from API.
 */
fetchReviewsForRestaurant = () => {
    if (self.restaurant && self.restaurant.reviews) { // review already fetched!
        return Promise.resolve(self.restaurant.reviews);
    }
    const id = parseInt(getParameterByName('id'));
    if (!id || id === NaN) { // no id found in URL
        return Promise.reject('No restaurant id in URL');
    } else {
        return DBHelper.fetchReviewsByRestaurantId(id)
            .then(reviews => {
                if (!reviews) {
                    return Promise.reject(`Reviews for restaurant ${id} was not found`);
                }

                self.restaurant.reviews = self.restaurant.reviews ? self.restaurant.reviews.concat(reviews).reverse(0) : reviews.reverse();
                fillReviewsHTML();
                return reviews;
            });
    }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;

    const address = document.getElementById('restaurant-address');
    address.innerHTML = restaurant.address;

    const obj = DBHelper.addImageWithFallback(restaurant);
    document.getElementById('image-container').append(obj);

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;

    // fill operating hours
    if (restaurant.operating_hours) {
        fillRestaurantHoursHTML();
    }
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
    const hours = document.getElementById('restaurant-hours');
    for (let key in operatingHours) {
        const row = document.createElement('tr');

        const day = document.createElement('td');
        day.innerHTML = key.trim();
        row.appendChild(day);

        const time = document.createElement('td');
        time.innerHTML = operatingHours[key].trim();
        row.appendChild(time);

        hours.appendChild(row);
    }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
    const container = document.getElementById('reviews-container');
    const title = document.createElement('h3');
    title.innerHTML = 'Reviews';
    container.appendChild(title);

    if (!reviews) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        container.appendChild(noReviews);
        return;
    }

    const ul = document.getElementById('reviews-list');

    for (const review of reviews) {
        ul.appendChild(createReviewHTML(review));
    };

    container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
    const li = document.createElement('li');

    if (!navigator.onLine) {
        const offlineMode = document.createElement('p');
        offlineMode.className = "offline-mode";
        offlineMode.innerHTML = "Offline";
        li.appendChild(offlineMode);
    }

    const name = document.createElement('p');
    name.innerHTML = review.name;
    name.className = 'restaurant-review-heading';
    li.appendChild(name);

    const dateofCreation = document.createElement('p');
    dateofCreation.innerHTML = `<i>Date created:</i> ${new Date(review.createdAt).toLocaleString()}`;
    li.appendChild(dateofCreation);

    const rating = document.createElement('p');
    rating.innerHTML = `<i>Rating:</i> <span class="restaurant-review-heading">${review.rating}</span>`;
    li.appendChild(rating);

    const comments = document.createElement('p');
    comments.innerHTML = `<q>${review.comments}</q>`;
    comments.className = "mb20";
    li.appendChild(comments);

    return li;
}

createReviewFromSubmittedData = (name, reviewMessage) => {
    const restaurantId = getParameterByName('id');
    const rating = document.querySelector('#rating option:checked').value;

    return {
        restaurant_id: parseInt(restaurantId),
        name: name,
        createdAt: new Date(),
        rating: parseInt(rating),
        comments: reviewMessage
    };
}

prependReviewToList = (review) => {
    document.getElementById('no-review') && document.getElementById('no-review').remove();
    const reviewsList = document.getElementById('reviews-list');
    const reviewHtml = createReviewHTML(review);
    reviewsList.insertBefore(reviewHtml, reviewsList.childNodes[0]);
}

submitReview = () => {
    event.preventDefault();

    const name = document.getElementById('full-name');
    const nameValue = name.value;
    const reviewMessage = document.getElementById('review');
    const reviewMessageValue = document.getElementById('review').value.substring(0, 500);

    if (nameValue.length === 0 || reviewMessageValue.length === 0) {
        name.className = "mb10 p10 invalid";
        reviewMessage.className = "mb10 p10 invalid";
        return;
    }

    const reviewObject = createReviewFromSubmittedData(nameValue, reviewMessageValue);
    DBHelper.addReview(reviewObject); // send review to backend
    prependReviewToList(reviewObject);
    document.getElementById('add-reviews-form').reset();
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = window.location;
    a.innerHTML = restaurant.name;
    a.setAttribute('aria-current', 'page');
    li.appendChild(a);
    breadcrumb.appendChild(li);
}


/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
    if (!url)
        url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
        results = regex.exec(url);
    if (!results)
        return null;
    if (!results[2])
        return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
