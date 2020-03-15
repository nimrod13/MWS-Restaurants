/**
 * Common database helper functions.
 */
class DBHelper {

    /**
     * Database URL.
     */
    static get DATABASE_URL() {
        const port = 1337; // Change this to your server port
        return `http://localhost:${port}`;
    }

    static dbPromise() {
        // If the browser doesn't support service worker, no database necessary
        if (!navigator.serviceWorker) {
            return Promise.resolve();
        }

        return idb.open('mws-restaurant-db', 2, upgradeDb => {
            switch (upgradeDb.oldVersion) {
                case 0:
                    upgradeDb.createObjectStore('mws-restaurants',
                        {
                            keyPath: 'id'
                        });
                        break;
                case 1:
                    upgradeDb.createObjectStore('mws-reviews',
                        {
                            keyPath: 'id'
                        }).createIndex('restaurant', 'restaurant_id');
            }
        });
    }

    static toggleFavorite(restaurantId, isFav) {
        fetch(`${DBHelper.DATABASE_URL}/restaurants/${restaurantId}/?is_favorite=${isFav}`,
            {
                method: 'PUT'
            }).then(() => {
                this.dbPromise()
                    .then(db => {
                        const tx = db.transaction('mws-restaurants', 'readwrite');
                        const restaurantsStore = tx.objectStore('mws-restaurants');
                        restaurantsStore.get(restaurantId)
                            .then(restaurant => {
                                restaurant.is_favorite = isFav;
                                restaurantsStore.put(restaurant);
                            });
                    });
            });
    }

    /**
     * Fetch all restaurants.
     */
    static fetchRestaurants() {
        return this.dbPromise()
            .then(db => {
                const tx = db.transaction('mws-restaurants');
                const restaurantStore = tx.objectStore('mws-restaurants');
                return restaurantStore.getAll();
            })
            .then(data => {
                if (data && data.length !== 0) {
                    return Promise.resolve(data);
                }

                return fetch(`${DBHelper.DATABASE_URL}/restaurants`)
                    .then(fetchResponse => fetchResponse.json())
                    .then(restaurantsJson => {
                        return this.dbPromise()
                            .then(db => {
                                const tx = db.transaction('mws-restaurants', 'readwrite');
                                const restaurantStore = tx.objectStore('mws-restaurants');

                                for (const restaurant of restaurantsJson) {
                                    restaurantStore.put(restaurant);
                                }

                                return tx.complete.then(() => Promise.resolve(restaurantsJson));
                            });
                    });
            });
    }

    /**
     * Fetch all reviews.
     */
    //static fetchReviews() {
    //    return this.dbPromise()
    //        .then(db => {
    //            const tx = db.transaction('mws-reviews');
    //            const reviewStore = tx.objectStore('mws-reviews');
    //            return reviewStore.getAll();
    //        })
    //        .then(data => {
    //            if (data && data.length !== 0) {
    //                return Promise.resolve(data);
    //            }

    //            return fetch(`${DBHelper.DATABASE_URL}/reviews`)
    //                .then(fetchResponse => fetchResponse.json())
    //                .then(reviewsJson => {
    //                    return this.dbPromise()
    //                        .then(db => {
    //                            const tx = db.transaction('mws-reviews', 'readwrite');
    //                            const reviewStore = tx.objectStore('mws-reviews');

    //                            for (const review of reviewsJson) {
    //                                reviewStore.put(review);
    //                            }

    //                            return tx.complete.then(() => Promise.resolve(reviewsJson));
    //                        });
    //                });
    //        });
    //}

    /**
     * Fetch a restaurant by its ID.
     */
    static fetchRestaurantById(id) {
        return DBHelper.fetchRestaurants()
            .then(restaurants => restaurants.find(r => r.id === id));
    }

    /**
     * Fetch a restaurant by its ID.
     */
    static fetchReviewsByRestaurantId(id) {
        return fetch(`${DBHelper.DATABASE_URL}/reviews?restaurant_id=${id}`)
            .then(fetchResponse => fetchResponse.json())
            .then(reviews => {
                this.dbPromise()
                    .then(db => {
                        if (!db) {
                            return;
                        }

                        const tx = db.transaction('mws-reviews', 'readwrite');
                        const reviewStore = tx.objectStore('mws-reviews');

                        for (let r of reviews) {
                            r.restaurant_id === id && reviewStore.put(r);
                        }
                    });
                return Promise.resolve(reviews);
            }).catch(() => {
                this.dbPromise()
                    .then(db => {
                        if (!db) {
                            return null;
                        }

                        const store = db.transaction('restaurant').objectStore('restaurant');
                        const indexId = store.index('mws-reviews');
                        return indexId.getAll(id);
                    })
                    .then((storedReviews) => {
                        return Promise.resolve(storedReviews);
                    });
            });
    }

    /**
     * Fetch restaurants by a cuisine type with proper error handling.
     */
    static fetchRestaurantByCuisine(cuisine) {
        return DBHelper.fetchRestaurants()
            .then(restaurants => restaurants.filter(r => r.cuisine_type === cuisine));
    }

    /**
     * Delete review by id - testing purposes only
     */
    static deleteReviewById(id) {
        fetch(`${DBHelper.DATABASE_URL}/reviews/${id}`,
            {
                method: 'DELETE'
            }
        ).then((response) => {
            response.json().then(json => {
                console.log(`Review ${id} deleted`);
                return json;
            });
        }).catch(error => console.log('error:', error));
    }


    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     */
    static fetchRestaurantByNeighborhood(neighborhood) {
        return DBHelper.fetchRestaurants()
            .then(restaurants => restaurants.filter(r => r.neighborhood === neighborhood));
    }

    /**
    * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
    */
    static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
        return DBHelper.fetchRestaurants()
            .then(restaurants => {
                let results = restaurants;
                if (cuisine !== 'all') { // filter by cuisine
                    results = results.filter(r => r.cuisine_type === cuisine);
                }
                if (neighborhood !== 'all') { // filter by neighborhood
                    results = results.filter(r => r.neighborhood === neighborhood);
                }
                return results;
            });
    }

    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static fetchNeighborhoods() {
        // Fetch all restaurants
        return DBHelper.fetchRestaurants()
            .then(restaurants => {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) === i);
                return uniqueNeighborhoods;
            });
    }

    /**
     * Fetch all cuisines with proper error handling.
     */
    static fetchCuisines() {
        // Fetch all restaurants
        return DBHelper.fetchRestaurants()
            .then(restaurants => {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) === i);
                return uniqueCuisines;
            });
    }

    static addReview(review) {
        // Check if online
        if (!navigator.onLine) {
            DBHelper.sendReviewWhenOnline(review);
            return;
        }

        const reviewObj = {
            "restaurant_id": parseInt(review.restaurant_id),
            "name": review.name,
            "rating": parseInt(review.rating),
            "comments": review.comments
        };

        fetch(`${DBHelper.DATABASE_URL}/reviews`,
            {
                method: 'POST',
                body: JSON.stringify(reviewObj),
                headers: new Headers({ 'Content-Type': 'application/json' })
            }).then((response) => {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.indexOf('application/json') !== -1) {
                    return response.json();
                }
            }).catch(error => console.log('error:', error));
    }

    static sendReviewWhenOnline(review) {
        localStorage.setItem('data', JSON.stringify(review));
        window.addEventListener('online', () => {
            const data = JSON.parse(localStorage.getItem('data'));

            for (const el of document.querySelectorAll(".offline_mode")) {
                el.parentNode.removeChild(el);
            }

            if (data !== null) {
                DBHelper.addReview(review);
                localStorage.removeItem('data');
            }
        });
    }

    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
     * Restaurant image URL.
     */
    static imageUrlForRestaurant(restaurant) {
        return restaurant.photograph ? `/images/${restaurant.photograph}` : `/images/${restaurant.id}`;
    }

    static addImageWithFallback(restaurant) {
        //create img with fallback src
        const image = document.createElement('img');
        const imageUrlBase = DBHelper.imageUrlForRestaurant(restaurant);
        image.src = "images/fallback.png";
        image.className = "lazy";
        image.alt = `${restaurant.name} restaurant showcase`;

        //create wrapper object to first try the img src; if it fails, use the img fallback
        const obj = document.createElement('object');
        const imageUrl1X = `${imageUrlBase}_1x.webp`;
        const imageUrl2X = `${imageUrlBase}_2x.webp`;
        obj.data = imageUrl1X;
        obj.type = "image/png";
        obj.className = 'restaurant-img fullWidth lazy';
        obj.append(image);
        obj.srcset = `${imageUrl1X} 300w, ${imageUrl2X} 600w`;
        obj.alt = image.alt;

        return obj;
    }

    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
        // https://leafletjs.com/reference-1.3.0.html#marker
        const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
            {
                title: restaurant.name,
                alt: restaurant.name,
                url: DBHelper.urlForRestaurant(restaurant)
            });
        marker.addTo(map);
        return marker;
    }
}
