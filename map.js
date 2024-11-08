mapboxgl.accessToken = 'pk.eyJ1Ijoiam92Y2kiLCJhIjoiY2x2dWV2NXUzMWh0dTJrbWcxZWR2MTgwaiJ9.ohGxmEhB6ewHGG_SFL5wkQ';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/jovci/cm36bigry00na01q2bi3yhozr',
  center: [-117.88565650911957, 33.88322362233695], 
  zoom: 15.5
});


let campusGraph = { buildings: {}, paths: [] };
let isPathMode = false;
let currentPath = [];
let pathLineLayerId = 'path-lines';
let startBuilding = '';
let endBuilding = '';
let addBuildingMode = false;
let pathsVisible = true;
let markersVisible = true;
let markers = []; 


// toggles path visibility
function togglePathsVisibility() {
    pathsVisible = !pathsVisible;
    if (map.getLayer('all-paths')) {
      map.setLayoutProperty('all-paths', 'visibility', pathsVisible ? 'visible' : 'none');
    }
    console.log(`Paths are now ${pathsVisible ? 'visible' : 'hidden'}.`);
  }
  
  
  
  // toggles marker visibility
  function toggleMarkersVisibility() {
    markersVisible = !markersVisible;
    markers.forEach(marker => {
      marker.getElement().style.display = markersVisible ? 'block' : 'none';
    });
    console.log(`Markers are now ${markersVisible ? 'visible' : 'hidden'}.`);
  }
  

  



// adds building mode and wait for a map click to get coordinates
function addBuildingPoint() {
    addBuildingMode = true;
    console.log("Add building mode activated. Click on the map to place the building.");
  }
  
  map.on('click', (e) => {
    if (addBuildingMode) {
      const lngLat = e.lngLat;
      const buildingName = document.getElementById('buildingName').value.trim();
      if (!buildingName) {
        alert("Please enter a building name!");
        return;
      }
  
      const buildingId = buildingName.replace(/\s+/g, '_').toLowerCase();
      const newBuilding = { id: buildingId, coordinates: [lngLat.lng, lngLat.lat], name: buildingName };
      campusGraph.buildings[buildingId] = newBuilding;
  
      // adds marker on the map
      new mapboxgl.Marker()
        .setLngLat([lngLat.lng, lngLat.lat])
        .setPopup(new mapboxgl.Popup().setText(buildingName))
        .addTo(map);
  
      addBuildingToDropdown(buildingId, buildingName);
      console.log(`Building added: ${buildingName}`, newBuilding);
  
      // send building data to the server
      updateBuildingOnServer(newBuilding);
  
      addBuildingMode = false;
    } else if (isPathMode) {
      addPathPoint(e.lngLat);
    }
  });
  
  function updateBuildingOnServer(building) {
    fetch('/update-buildings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ building }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to update buildings');
        }
        return response.json(); 
      })
      .then(data => {
        console.log('[Client] Updated campusGraph with buildings received from server:', data);
        campusGraph = data;
        renderLoadedData();
      })
      .catch(error => {
        console.error('[Client] Error updating buildings:', error);
      });
  }
  
  
  map.on('click', (e) => {
    if (addBuildingMode) {
      const lngLat = e.lngLat;
      const buildingName = document.getElementById('buildingName').value.trim();
      if (!buildingName) {
        alert("Please enter a building name!");
        return;
      }
      
      const buildingId = buildingName.replace(/\s+/g, '_').toLowerCase();
      campusGraph.buildings[buildingId] = { coordinates: [lngLat.lng, lngLat.lat], name: buildingName };
      document.getElementById('buildingName').value = ''; // Clear the input
  
      new mapboxgl.Marker()
        .setLngLat([lngLat.lng, lngLat.lat])
        .setPopup(new mapboxgl.Popup().setText(buildingName))
        .addTo(map);
  
      addBuildingToDropdown(buildingId, buildingName);
      console.log(`Building added: ${buildingName}`, campusGraph.buildings[buildingId]);
      
      saveCampusGraphToServer();
      
      addBuildingMode = false;
    } else if (isPathMode) {
      addPathPoint(e.lngLat);
    }
  });
  

// click event to get coordinates when adding a building or path points
map.on('click', (e) => {
  if (addBuildingMode) {
    const lngLat = e.lngLat;
    const buildingName = document.getElementById('buildingName').value.trim();
    if (!buildingName) {
      alert("Please enter a building name!");
      return;
    }
    
    const buildingId = buildingName.replace(/\s+/g, '_').toLowerCase();
    campusGraph.buildings[buildingId] = { coordinates: [lngLat.lng, lngLat.lat], name: buildingName };
    document.getElementById('buildingName').value = ''; 

    new mapboxgl.Marker()
      .setLngLat([lngLat.lng, lngLat.lat])
      .setPopup(new mapboxgl.Popup().setText(buildingName))
      .addTo(map);

    addBuildingToDropdown(buildingId, buildingName);
    console.log(`Building added: ${buildingName}`, campusGraph.buildings[buildingId]);
    
    addBuildingMode = false;
  } else if (isPathMode) {
    // if in the path mode, add intermediate points
    addPathPoint(e.lngLat);
  }
});

// starts creating a path between selected buildings for better tracking
function startPath() {
  const startSelect = document.getElementById('startBuilding');
  const endSelect = document.getElementById('endBuilding');
  
  startBuilding = startSelect.value;
  endBuilding = endSelect.value;

  if (!startBuilding || !endBuilding) {
    alert("Please select both start and end buildings.");
    return;
  }

  isPathMode = true;
  currentPath = [];
  console.log(`Path mode activated from ${startBuilding} to ${endBuilding}. Click on map to add points.`);
}

// completes and saves the current path, with start and end labels
function endPath() {
    isPathMode = false;
  
    if (currentPath.length < 1) {
      alert("Path must contain at least one intermediate point.");
      return;
    }
  
    const path = {
      start: startBuilding,
      end: endBuilding,
      points: currentPath.map(point => point.coordinates),
      distance: calculateTotalDistance([campusGraph.buildings[startBuilding].coordinates, ...currentPath.map(point => point.coordinates), campusGraph.buildings[endBuilding].coordinates])
    };
  
    campusGraph.paths.push(path);
    renderPath(); 
    console.log(`Path created from ${startBuilding} to ${endBuilding} and saved.`);
    
    saveCampusGraphToServer();
    
    currentPath = [];
  }
  
// adds an intermediate point to the current path without creating a marker
function addPathPoint(lngLat) {
  currentPath.push({ coordinates: [lngLat.lng, lngLat.lat] });
  renderPath(); // Render the path in real-time
  console.log("Intermediate path point added:", lngLat);
}

async function renderAllPaths() {
  await waitForMapStyleToLoad(map); 

  if (!campusGraph.paths || campusGraph.paths.length === 0) {
      console.warn("No paths available to render.");
      return;
  }

  const pathFeatures = campusGraph.paths.map(path => {
      console.log(`Rendering path from ${path.start} to ${path.end}`);
      return {
          type: 'Feature',
          geometry: {
              type: 'LineString',
              coordinates: [
                  campusGraph.buildings[path.start].coordinates,
                  ...path.points,
                  campusGraph.buildings[path.end].coordinates
              ]
          }
      };
  });

  const pathGeoJSON = {
      type: 'FeatureCollection',
      features: pathFeatures
  };

  if (map.getSource('all-paths')) {
      map.getSource('all-paths').setData(pathGeoJSON);
  } else {
      map.addSource('all-paths', { type: 'geojson', data: pathGeoJSON });
      map.addLayer({
          id: 'all-paths',
          type: 'line',
          source: 'all-paths',
          layout: {
              'line-join': 'round',
              'line-cap': 'round'
          },
          paint: {
              'line-color': '#007cbf',
              'line-width': 3
          }
      });
  }
}

  

// renders the current path as a line on the map
function renderPath() {
  const pathGeoJSON = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          campusGraph.buildings[startBuilding].coordinates,
          ...currentPath.map(point => point.coordinates),
          campusGraph.buildings[endBuilding].coordinates
        ]
      }
    }]
  };

  if (map.getSource(pathLineLayerId)) {
    map.getSource(pathLineLayerId).setData(pathGeoJSON);
  } else {
    map.addSource(pathLineLayerId, { type: 'geojson', data: pathGeoJSON });
    map.addLayer({
      id: pathLineLayerId,
      type: 'line',
      source: pathLineLayerId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#007cbf',
        'line-width': 3
      }
    });
  }
}


function waitForMapStyleToLoad(map) {
  return new Promise((resolve) => {
      if (map.isStyleLoaded()) {
          resolve();
      } else {
          const checkStyle = setInterval(() => {
              if (map.isStyleLoaded()) {
                  clearInterval(checkStyle);
                  resolve();
              }
          }, 100); // Check every 100ms
      }
  });
}

// saves the graph data to a JSON file
function saveToJSON() {
  const jsonContent = JSON.stringify(campusGraph, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'campus-map.json';
  a.click();
  URL.revokeObjectURL(url);
}

// utility functions to add buildings to dropdowns
function addBuildingToDropdown(buildingId, buildingName) {
  const startSelect = document.getElementById('startBuilding');
  const endSelect = document.getElementById('endBuilding');
  const option = new Option(buildingName, buildingId);
  startSelect.add(option.cloneNode(true));
  endSelect.add(option.cloneNode(true));
}

// calculation for total distance of the path
function calculateTotalDistance(coordsArray) {
  let distance = 0;
  for (let i = 0; i < coordsArray.length - 1; i++) {
    distance += calculateDistance(coordsArray[i], coordsArray[i + 1]);
  }
  return distance;
}

function calculateDistance(coord1, coord2) {
  const dx = coord1[0] - coord2[0];
  const dy = coord1[1] - coord2[1];
  return Math.sqrt(dx * dx + dy * dy) * 111000; // Rough conversion to meters
}



function findPath() {
    const startBuilding = document.getElementById('startBuilding').value;
    const endBuilding = document.getElementById('endBuilding').value;
    const algorithm = document.getElementById('algorithmSelect').value;
  
    if (!startBuilding || !endBuilding) {
      alert("Please select both start and end buildings.");
      return;
    }
  
    const path = executeAlgorithm(campusGraph, algorithm, startBuilding, endBuilding);
  
    if (path) {
      console.log(`Path found using ${algorithm}:`, path);
      drawPathOnMap(path);
    } else {
      alert("No path found between the selected buildings.");
    }
  }
  
  function drawPathOnMap(paths) {
    // if only a single path is passed, wrap it in an array for consistency
    if (!Array.isArray(paths[0])) {
      paths = [paths];
    }
  
    const features = paths.map(path => {
      const coordinates = [];
  
      path.forEach((node, index) => {
        if (index < path.length - 1) {
          const nextNode = path[index + 1];
  
          // finds the edge between the current node and the next node
          const edge = campusGraph.paths.find(
            p => (p.start === node && p.end === nextNode) || (p.start === nextNode && p.end === node)
          );
  
          if (edge) {
            // determines if we need to reverse the edge points
            let edgePoints = edge.points.slice();
            if (edge.start === nextNode && edge.end === node) {
              edgePoints.reverse();
            }
  
            if (coordinates.length === 0) {
              coordinates.push(campusGraph.buildings[node].coordinates);
            }
            coordinates.push(...edgePoints, campusGraph.buildings[nextNode].coordinates);
          } else {
            console.warn(`Edge not found between ${node} and ${nextNode}`);
          }
        }
      });
  
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates
        }
      };
    });
  
    const pathGeoJSON = {
      type: 'FeatureCollection',
      features
    };
  
    if (map.getSource('path')) {
      map.getSource('path').setData(pathGeoJSON);
    } else {
      map.addSource('path', { type: 'geojson', data: pathGeoJSON });
      map.addLayer({
        id: 'path',
        type: 'line',
        source: 'path',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#FF0000',
          'line-width': 3
        }
      });
    }
  }
  


// loads JSON data and renders it on the map
function loadFromFile() {
    const fileInput = document.getElementById('loadFile');
    const file = fileInput.files[0];
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (!data.buildings || !data.paths) {
            throw new Error("JSON file must contain 'buildings' and 'paths' keys.");
          }
  
          campusGraph = data;
          renderLoadedData();
          console.log('Loaded campus data:', campusGraph);
  
        } catch (error) {
          alert("Error: " + error.message);
          console.error("Error parsing JSON:", error);
        }
      };
      reader.readAsText(file);
    }
  }
  
  // render loaded data on the map
  async function renderLoadedData() {
    await waitForMapStyleToLoad(map);

    console.log("Map style has loaded. Rendering data now.");
    clearMap(); 

    for (let buildingId in campusGraph.buildings) {
        const building = campusGraph.buildings[buildingId];
        const marker = new mapboxgl.Marker()
            .setLngLat(building.coordinates)
            .setPopup(new mapboxgl.Popup().setText(building.name || buildingId))
            .addTo(map);
        markers.push(marker); 
    }

    populateBuildingDropdowns(); 
    renderAllPaths();
}
  

  
  // utility function to clear all markers and paths from the map
  function clearMap() {
    if (map.getLayer(pathLineLayerId)) {
      map.removeLayer(pathLineLayerId);
      map.removeSource(pathLineLayerId);
    }
  }
  

  
  // populates dropdown options for buildings
  function addBuildingToDropdown(buildingId, buildingName) {
    const startSelect = document.getElementById('startBuilding');
    const endSelect = document.getElementById('endBuilding');
    const option = new Option(buildingName, buildingId);
    startSelect.add(option.cloneNode(true));
    endSelect.add(option.cloneNode(true));
  }
  