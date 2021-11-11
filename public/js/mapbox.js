
const mapBox = document.getElementById("map")

const displayMap = locations => {
  mapboxgl.accessToken = 'pk.eyJ1IjoiYWVtb24iLCJhIjoiY2t2bW50MXd6MHg4bzJ1bzVmYzM0OGxjNSJ9.qlghDQAUi8CVJ5VLrHrJJQ';

  var map = new mapboxgl.Map({
    // Nous oblige à bien poser une div avec un id "map" dans notre fichier view (ligne 74 tour.pug)
    container: 'map',
    style: 'mapbox://styles/aemon/ckvmpccw6225014mwo88hkyv3',
    // interactive: false
    scrollZoom: false
  });

  const bounds = new mapboxgl.LngLatBounds()

  locations.forEach(loc => {
    // Create marker
    const el = document.createElement("div");
    el.className = "marker"

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: "bottom"
    }).setLngLat(loc.coordinates).addTo(map)

    // Add popup
    new mapboxgl.Popup({
      offset: 30
    }).setLngLat(loc.coordinates).setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`).addTo(map)


    // Extend map bounds to include current location
    bounds.extend(loc.coordinates)
  })

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  })
}

if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations)

  displayMap(locations)
}