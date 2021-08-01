/*
    Information about server communication. This sample webservice is provided by Wikitude and returns random dummy
    Places near given location.
 */
var ServerInformation = {
    POIDATA_SERVER: "https://mzk-ar-service.herokuapp.com/stops/search/findByStopLatBetweenAndStopLonBetween",
    POIDATA_SERVER_ARG_STOP_LAT_LEFT: "stopLatLeft",
    POIDATA_SERVER_ARG_STOP_LAT_RIGHT: "stopLatRight",
    POIDATA_SERVER_ARG__STOP_LON_DOWN: "stopLonDown",
    POIDATA_SERVER_ARG__STOP_LON_UP: "stopLonUp",
};

/* Implementation of AR-Experience (aka "World"). */

var World = {

    /*
        User's latest known location, accessible via userLocation.latitude, userLocation.longitude,
         userLocation.altitude.
     */
    userLocation: null,

    /* You may request new data from server periodically, however: in this sample data is only requested once. */
    isRequestingData: false,

    /* True once data was fetched. */
    initiallyLoadedData: false,

    /* Different POI-Marker assets. */
    markerDrawableIdle: null,
    markerDrawableSelected: null,
    markerDrawableDirectionIndicator: null,

    /* List of AR.GeoObjects that are currently shown in the scene / World. */
    markerList: [],

    /* the last selected marker. */
    currentMarker: null,

    selectedMarker: null,

    locationUpdateCounter: 0,
    updatePlacemarkDistancesEveryXLocationUpdates: 10,

    /* Called to inject new POI data. */
    loadPoisFromJsonData: function loadPoisFromJsonDataFn(poiData) {

        /* Empty list of visible markers. */
        World.markerList = [];

        /* Start loading marker assets. */
        World.markerDrawableIdle = new AR.ImageResource("assets/marker_idle.png", {
            onError: World.onError
        });
        World.markerDrawableSelected = new AR.ImageResource("assets/marker_selected.png", {
            onError: World.onError
        });
        World.markerDrawableDirectionIndicator = new AR.ImageResource("assets/indi.png", {
            onError: World.onError
        });

        var stops = poiData._embedded.stops;

        /* Loop through POI-information and create an AR.GeoObject (=Marker) per POI. */
        for (var currentPlaceNr = 0; currentPlaceNr < stops.length; currentPlaceNr++) {
            let description = stops[currentPlaceNr].trips.map(trip => trip.routeID).join([separator = ' | ']);
            let longDescription = stops[currentPlaceNr].trips.map(trip => trip.routeID + " | " + trip.direction).join([separator = '<br/>']);
            var singlePoi = {
                "id": stops[currentPlaceNr].stopID,
                "latitude": parseFloat(stops[currentPlaceNr].stopLat),
                "longitude": parseFloat(stops[currentPlaceNr].stopLon),
                "title": stops[currentPlaceNr].stopName,
                "description": description,
                "longDescription": longDescription


            };
            World.markerList.push(new Marker(singlePoi));
        }

        /* Updates distance information of all placemarks. */
        World.updateDistanceToUserValues();

        World.updateStatusMessage(currentPlaceNr + ' Wyświetlonych przystanków');

        /* Set distance slider to 100%. */
        document.getElementById("panelRangeSliderValue").innerHTML = 100;
    },

    /*
        Sets/updates distances of all makers so they are available way faster than calling (time-consuming)
        distanceToUser() method all the time.
     */
    updateDistanceToUserValues: function updateDistanceToUserValuesFn() {
        for (var i = 0; i < World.markerList.length; i++) {
            World.markerList[i].distanceToUser = World.markerList[i].markerObject.locations[0].distanceToUser();
        }
    },

    /* Updates status message shown in small "i"-button aligned bottom center. */
    updateStatusMessage: function updateStatusMessageFn(message, isWarning) {
        document.getElementById("popupButtonImage").src = isWarning ? "assets/warning_icon.png" : "assets/info_icon.png";
        document.getElementById("popupButtonTooltip").innerHTML = message;
    },

    /* Location updates, fired every time you call architectView.setLocation() in native environment. */
    locationChanged: function locationChangedFn(lat, lon, alt, acc) {

        /* Store user's current location in World.userLocation, so you always know where user is. */
        World.userLocation = {
            'latitude': lat,
            'longitude': lon,
            'altitude': alt,
            'accuracy': acc
        };


        /* Request data if not already present. */
        if (!World.initiallyLoadedData) {
            World.requestDataFromServer(lat, lon);
            World.initiallyLoadedData = true;
        } else if (World.locationUpdateCounter === 0) {
            /*
                Update placemark distance information frequently, you max also update distances only every 10m with
                some more effort.
             */
            World.updateDistanceToUserValues();
        }

        /* Helper used to update placemark information every now and then (e.g. every 10 location upadtes fired). */
        World.locationUpdateCounter =
            (++World.locationUpdateCounter % World.updatePlacemarkDistancesEveryXLocationUpdates);
    },


    onSelectPoiMarker: function onSelectPoiMarkerFn(marker) {

        World.currentMarker = marker;
        World.selectedMarker = marker;

        if (World.currentMarker) {
            if (World.currentMarker.poiData.id === marker.poiData.id) {
                return;
            }
        }
    },

        /*
            POIs usually have a name and sometimes a quite long description.
            Depending on your content type you may e.g. display a marker with its name and cropped description but
            allow the user to get more information after selecting it.
        */

    /* Fired when user pressed maker in cam. */
    onMarkerSelected: function onMarkerSelectedFn(marker) {
        World.closePanel();

        World.currentMarker = marker;


        /*
            In this sample a POI detail panel appears when pressing a cam-marker (the blue box with title &
            description), compare index.html in the sample's directory.
        */
        /* Update panel values. */
        document.getElementById("poiDetailTitle").innerHTML = marker.poiData.title;
        document.getElementById("poiDetailLongDescription").innerHTML = marker.poiData.longDescription;

        /*
            It's ok for AR.Location subclass objects to return a distance of `undefined`. In case such a distance
            was calculated when all distances were queried in `updateDistanceToUserValues`, we recalculate this
            specific distance before we update the UI.
         */
        if (undefined === marker.distanceToUser) {
            marker.distanceToUser = marker.markerObject.locations[0].distanceToUser();
        }

        /*
            Distance and altitude are measured in meters by the SDK. You may convert them to miles / feet if
            required.
        */
        var distanceToUserValue = (marker.distanceToUser > 999) ?
            ((marker.distanceToUser / 1000).toFixed(2) + " km") :
            (Math.round(marker.distanceToUser) + " m");

        document.getElementById("poiDetailDistance").innerHTML = distanceToUserValue;

        /* Show panel. */
        document.getElementById("panelPoiDetail").style.visibility = "visible";
    },

    closePanel: function closePanel() {
        /* Hide panels. */
        document.getElementById("panelPoiDetail").style.visibility = "hidden";
        document.getElementById("panelRange").style.visibility = "hidden";

        if (World.currentMarker != null && World.selectedMarker == null) {
            /* Deselect AR-marker when user exits detail screen div. */
            World.currentMarker.setDeselected(World.currentMarker);
            World.currentMarker = null;
        }
    },

    /* Screen was clicked but no geo-object was hit. */
    onScreenClick: function onScreenClickFn() {
        /* You may handle clicks on empty AR space too. */
        World.closePanel();
    },

    /* Returns distance in meters of placemark with maxdistance * 1.1. */
    getMaxDistance: function getMaxDistanceFn() {

        /* Sort places by distance so the first entry is the one with the maximum distance. */
        World.markerList.sort(World.sortByDistanceSortingDescending);

        /* Use distanceToUser to get max-distance. */
        var maxDistanceMeters = World.markerList[0].distanceToUser;

        /*
            Return maximum distance times some factor >1.0 so ther is some room left and small movements of user
            don't cause places far away to disappear.
            don't cause places far away to disappear.
         */
        return maxDistanceMeters * 1.1;
    },

    /* Updates values show in "range panel". */
    updateRangeValues: function updateRangeValuesFn() {

        /* Get current slider value (0..100);. */
        var slider_value = document.getElementById("panelRangeSlider").value;
        /* Max range relative to the maximum distance of all visible places. */
        var maxRangeMeters = Math.round(World.getMaxDistance() * (slider_value / 100));

        /* Range in meters including metric m/km. */
        var maxRangeValue = (maxRangeMeters > 999) ?
            ((maxRangeMeters / 1000).toFixed(2) + " km") :
            (Math.round(maxRangeMeters) + " m");

        /* Number of places within max-range. */
        var placesInRange = World.getNumberOfVisiblePlacesInRange(maxRangeMeters);

        /* Update UI labels accordingly. */
        document.getElementById("panelRangeValue").innerHTML = maxRangeValue;
        document.getElementById("panelRangePlaces").innerHTML = (placesInRange != 1) ?
            (placesInRange + " Przystanków") : (placesInRange + " Przystanek");
        document.getElementById("panelRangeSliderValue").innerHTML = slider_value;

        World.updateStatusMessage((placesInRange != 1) ?
            (placesInRange + " wyświetlonych przystanków") : (placesInRange + " wyświetlony przystanek"));

        /* Update culling distance, so only places within given range are rendered. */
        AR.context.scene.cullingDistance = Math.max(maxRangeMeters, 1);

    },

    /* Returns number of places with same or lower distance than given range. */
    getNumberOfVisiblePlacesInRange: function getNumberOfVisiblePlacesInRangeFn(maxRangeMeters) {

        /* Sort markers by distance. */
        World.markerList.sort(World.sortByDistanceSorting);

        /* Loop through list and stop once a placemark is out of range ( -> very basic implementation ). */
        for (var i = 0; i < World.markerList.length; i++) {
            if (World.markerList[i].distanceToUser > maxRangeMeters) {
                return i;
            }
        }

        /* In case no placemark is out of range -> all are visible. */
        return World.markerList.length;
    },



    /* Display range slider. */
    showRange: function showRangeFn() {
        if (World.markerList.length > 0) {
            World.closePanel();

            /* Update labels on every range movement. */
            World.updateRangeValues();

            /* Open panel. */
            document.getElementById("panelRange").style.visibility = "visible";
        } else {

            /* No places are visible, because the are not loaded yet. */
            World.updateStatusMessage('Brak przystanków w okolicy', true);
        }
    },


    /*
     You may need to reload POI information because of user movements or manually for various reasons.
     In this example POIs are reloaded when user presses the refresh button.
     The button is defined in index.html and calls World.reloadPlaces() on click.
 */

    /* Reload places from content source. */
    reloadPlaces: function reloadPlacesFn() {
        if (World.markerList.length > 0) {
            World.closePanel();
        }
        if (!World.isRequestingData) {
            if (World.userLocation) {
                World.requestDataFromServer(World.userLocation.latitude, World.userLocation.longitude);
            } else {
                World.updateStatusMessage('Nieznana lokalizacja użytkownika.', true);
            }
        } else {
            World.updateStatusMessage('Aktualizacja pozycji', true);
        }
    },


    /* Request POI data. */
    requestDataFromServer: function requestDataFromServerFn(lat, lon) {

        /* Set helper var to avoid requesting places while loading. */
        World.isRequestingData = true;
        World.updateStatusMessage('Pobieranie przystanków');

        /* Server-url to JSON content provider. */
        var serverUrl = ServerInformation.POIDATA_SERVER + "?" +
            ServerInformation.POIDATA_SERVER_ARG_STOP_LAT_LEFT + "=" +  (lat - 0.01) +
            "&" + ServerInformation.POIDATA_SERVER_ARG_STOP_LAT_RIGHT + "=" +  (lat +  0.01) +
            "&" + ServerInformation.POIDATA_SERVER_ARG__STOP_LON_DOWN + "=" +  (lon -  0.01 ) +
            "&" + ServerInformation.POIDATA_SERVER_ARG__STOP_LON_UP + "=" +  (lon +  0.01) ;


        /* Use GET request to fetch the JSON data from the server */
        var xhr = new XMLHttpRequest();
        xhr.open('GET', serverUrl, true);
        xhr.responseType = 'json';
        xhr.onload = function() {
            var status = xhr.status;
            if (status === 200) {
                World.loadPoisFromJsonData(xhr.response);
                World.isRequestingData = false;
            } else {
                World.updateStatusMessage("Nie można pobrać przystanków, spróbuj póżniej.", true);
                World.isRequestingData = false;
            }
        }
        xhr.send();
    },

    /* Helper to sort places by distance. */
    sortByDistanceSorting: function sortByDistanceSortingFn(a, b) {
        return a.distanceToUser - b.distanceToUser;
    },

    /* Helper to sort places by distance, descending. */
    sortByDistanceSortingDescending: function sortByDistanceSortingDescendingFn(a, b) {
        return b.distanceToUser - a.distanceToUser;
    },

    onError: function onErrorFn(error) {
        alert(error);
    }
};


/* Forward locationChanges to custom function. */
AR.context.onLocationChanged = World.locationChanged;

/* Forward clicks in empty area to World. */
AR.context.onScreenClick = World.onScreenClick;
