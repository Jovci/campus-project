/*  toggle sidebar visibility
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("collapsed");
  } */
  
// logs algorithm steps with vertical formatting
function logAlgorithmStep(nodes, index) {
    const outputArea = document.getElementById("outputArea");
  
    // checks if nodes is an array of arrays (for multiple paths in DFS) or a single path
    let formattedStep;
    if (Array.isArray(nodes)) {
      formattedStep = `<strong>Path ${index + 1}:</strong><br>` + nodes.join('<br>');
    } else {
      formattedStep = `<strong>Step ${index + 1}:</strong> ${nodes}`;
    }
  
    outputArea.innerHTML += `<div style="margin-bottom: 10px;">${formattedStep}</div>`;
    outputArea.scrollTop = outputArea.scrollHeight; // Auto-scroll to the latest entry
  }
  

  function blockPath() {
    const start = document.getElementById('blockStart').value;
    const end = document.getElementById('blockEnd').value;

    if (!start || !end) {
        alert("Please select both start and end buildings to block the path.");
        return;
    }

    // remove path from campusGraph
    campusGraph.paths = campusGraph.paths.filter(path => 
        !(path.start === start && path.end === end) &&
        !(path.start === end && path.end === start)
    );

    console.log(`Path from ${start} to ${end} blocked and removed from campusGraph.`);
    saveCampusGraphToServer(); 
    renderAllPaths(); 
}

  
// includes formatted logging of algorithm steps and final distance
function findPath() {
    const startBuilding = document.getElementById('startBuilding').value;
    const endBuilding = document.getElementById('endBuilding').value;
    const algorithm = document.getElementById('algorithmSelect').value;
  
    if (!startBuilding || !endBuilding) {
      alert("Please select both start and end buildings.");
      return;
    }
  
    // call the algorithms and retrieve the result
    const result = executeAlgorithm(campusGraph, algorithm, startBuilding, endBuilding);
  
    const paths = result.path;
    const totalDistance = result.distance;
  
    // clear previous output
    const outputArea = document.getElementById("outputArea");
    outputArea.innerHTML = "";
  
    if (paths) {
      // if paths[0] is an array, we treat it as multiple paths (for DFS)
      if (Array.isArray(paths[0])) {
        paths.forEach((path, index) => {
          outputArea.innerHTML += `<div style="margin-bottom: 15px;"><strong>Path ${index + 1}:</strong><br>${path.join('<br>')}</div>`;
        });
      } else {
        // otherwise, treat it as a single path (for BFS and Dijkstra)
        outputArea.innerHTML += `<div style="margin-bottom: 15px;"><strong>Path:</strong><br>${paths.join('<br>')}</div>`;
      }
  
      // displays total distance if provided (Dijkstra)
      if (totalDistance !== null) {
        outputArea.innerHTML += `<div><strong>Total Distance:</strong><br>${totalDistance} meters</div>`;
      }
      drawPathOnMap(paths);
    } else {
      outputArea.innerHTML = "<div><strong>Path Not Found</strong></div>";
    }
  }
  
  

  
  
  
  // draws path on map using GeoJSON LineString
  function drawPathOnMap(paths) {
    if (!Array.isArray(paths[0])) {
      paths = [paths];
    }
  
    const features = paths.map(path => {
      const coordinates = [];
  
      path.forEach((node, index) => {
        if (index < path.length - 1) {
          const nextNode = path[index + 1];
          const edge = campusGraph.paths.find(
            p => (p.start === node && p.end === nextNode) || (p.start === nextNode && p.end === node)
          );
  
          if (edge) {
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
  function populateBuildingDropdowns() {
    const startDropdown = document.getElementById('startBuilding');
    const endDropdown = document.getElementById('endBuilding');
    const blockStartDropdown = document.getElementById('blockStart');
    const blockEndDropdown = document.getElementById('blockEnd');

    startDropdown.innerHTML = '<option value="">Select Start Building</option>';
    endDropdown.innerHTML = '<option value="">Select End Building</option>';
    blockStartDropdown.innerHTML = '<option value="">Select Start Building</option>';
    blockEndDropdown.innerHTML = '<option value="">Select End Building</option>';

    const sortedBuildingNames = Object.keys(campusGraph.buildings).sort();
    sortedBuildingNames.forEach(building => {
        const buildingName = campusGraph.buildings[building].name || building;

        [startDropdown, endDropdown, blockStartDropdown, blockEndDropdown].forEach(dropdown => {
            const option = document.createElement('option');
            option.value = building;
            option.textContent = buildingName;
            dropdown.appendChild(option);
        });
    });
}

  
  
  // call this function after loading the campusGraph data
window.addEventListener('DOMContentLoaded', () => {
    fetch('/default-data')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load default data');
        }
        return response.json();
      })
      .then(data => {
        console.log('Loaded default dataset:', data);
        campusGraph = data; 
        renderLoadedData(); 
      })
      .catch(error => {
        console.error('Error loading default dataset:', error);
      });
  });
  

  function saveCampusGraphToServer() {
    console.log('[Client] Sending full campusGraph to server:', campusGraph);
  
    fetch('/update-campus-graph', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(campusGraph),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to save campusGraph');
      }
      return response.json();
    })
    .then(data => {
      console.log('[Client] Full campusGraph saved successfully, received from server:', data);
      campusGraph = data; // update local data to keep in sync with the server
      renderLoadedData(); // re-render the map with updated buildings and paths
    })
    .catch(error => {
      console.error('[Client] Error saving campusGraph:', error);
    });
  }
  
  
  function addBuildingMarker(buildingData) {
    // adds building to campusGraph
    campusGraph.buildings[buildingData.id] = buildingData;
  
    // renders new marker immediately on the map
    const marker = new mapboxgl.Marker()
      .setLngLat(buildingData.coordinates)
      .setPopup(new mapboxgl.Popup().setText(buildingData.name))
      .addTo(map);
    markers.push(marker);
  
    // saves the updated campusGraph (including new building) to the server
    saveCampusGraphToServer();
  }
  function updatePathsOnServer(newPaths) {
    console.log('[Client] Sending updated paths to server:', newPaths);
  
    fetch('/update-paths', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paths: newPaths }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to update paths');
        }
        return response.json(); // retrieve the updated campusGraph
      })
      .then(data => {
        console.log('[Client] Updated campusGraph received from server:', data);
        
        // update entire campusGraph (both buildings and paths)
        campusGraph = data;
        renderLoadedData(); // re-render map with updated buildings and paths
      })
      .catch(error => {
        console.error('[Client] Error updating paths:', error);
      });
  }
  
  
  
  
  
  
  // modifies a path and updates the server
function addNewPath(newPath) {
    campusGraph.paths.push(newPath); // modify the paths on the client side
  
    // sends the updated paths to the server
    updatePathsOnServer(campusGraph.paths);
  }
  
  function loadUpdatedData() {
    fetch('/default-data')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load updated data');
        }
        return response.json();
      })
      .then(data => {
        console.log('Loaded updated dataset:', data);
        campusGraph = data; 
        renderLoadedData(); 
      })
      .catch(error => {
        console.error('Error loading updated dataset:', error);
      });
  }
  
  