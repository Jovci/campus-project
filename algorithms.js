// parse JSON data into an adjacency list
function parseGraph(data) {
    const graph = {};
  
    data.paths.forEach(path => {
      const { start, end, points, distance } = path;
  
      // initialize nodes in the graph if they dont exist
      if (!graph[start]) graph[start] = [];
      if (!graph[end]) graph[end] = [];
  
      // adds edges for both directions
      graph[start].push({ node: end, distance, points });
      graph[end].push({ node: start, distance, points });
    });
  
    return graph;
  }
  

/*(Breadth-First Search)
    BFS only needs an adjacency list with buildings (nodes) and their neighbors.
    BFS starts at the start building and explores all direct neighbors level by level, keeping track of visited nodes to avoid loops.
    It stops once it reaches the end building, outputting the path from start to end.
  Implementation:
    The adjacency list created by parseGraph for BFS as it iterates through each neighbor finding the shortest path without weights. */
  function bfs(graph, start, end) {
    const queue = [[start]]; // initializes queue of paths to explore
    const visited = new Set();
    visited.add(start);
    console.log(`Starting BFS from ${start} to ${end}`);
    while (queue.length > 0) {
      const path = queue.shift(); // gets the next path to explore
      const node = path[path.length - 1]; // last node in the path
      console.log(`Visiting node: ${node}, Current path: ${path.join(' -> ')}`);
      // checks if it has reached the end
      if (node === end) {
        console.log(`Path found by BFS: ${path.join(' -> ')}`);
        return path; // return the path as soon as it reaches the end node
      }
  
      // explore neighbors
      for (let neighbor of graph[node]) {
        if (!visited.has(neighbor.node)) {
          visited.add(neighbor.node);
          const newPath = path.concat(neighbor.node);
          queue.push(newPath);
          console.log(`Enqueueing new path: ${newPath.join(' -> ')}`);
        }
      }
    }
    console.warn("No path found by BFS.");
    return null; // return null if no path is found
  }
  
/*DFS (Depth-First Search)
    Similar to BFS, DFS needs only an adjacency list without weights.
    DFS recursively explores as far down a path as possible before backtracking. This approach finds all possible paths between start and end.
    Each time a path from start to end is found, it is stored in an array of paths.
  Implementation:
    The adjacency list is sufficient for DFS, and the recursive nature of DFS helps store all paths, allowing users to explore alternate routes. */

  function dfsAllPaths(graph, start, end, path = [], visited = new Set(), allPaths = []) {
    path.push(start);
    visited.add(start);
    console.log(`Exploring node: ${start}, Current path: ${path.join(' -> ')}`);
    // if it reaches the end node then add the current path to allPaths
    if (start === end) {
      allPaths.push([...path]);
      console.log(`Path found by DFS: ${path.join(' -> ')}`);
    } else {
      // continues exploring neighbors
      for (let neighbor of graph[start]) {
        if (!visited.has(neighbor.node)) {
          dfsAllPaths(graph, neighbor.node, end, path, visited, allPaths);
        }
      }
    }
    // backtrack
    path.pop();
    visited.delete(start);
    // log when all paths are fully explored
    if (path.length === 0) {
      console.log("All paths found by DFS:", allPaths);
    }
    return allPaths;
  }

  class PriorityQueue {
    constructor() {
      this.items = [];
    }
  
    enqueue(element, priority) {
      // create a new object for the queue item
      const queueElement = { element, priority };
      let added = false;
  
      // inserts the item based on its priority
      for (let i = 0; i < this.items.length; i++) {
        if (queueElement.priority < this.items[i].priority) {
          this.items.splice(i, 0, queueElement);
          added = true;
          break;
        }
      }
  
      // if it is not added then it has the highest priority, so push it to the end
      if (!added) {
        this.items.push(queueElement);
      }
    }
    dequeue() {
      // remove and return the item with the highest priority (lowest value)
      return this.items.shift();
    }
    isEmpty() {
      return this.items.length === 0;
    }
  }
  
/*Dijkstra’s Algorithm
    Dijkstra’s requires both the adjacency list and edge weights (distances) to prioritize shorter paths.
    Dijkstra uses a priority queue, starting from the start building and calculating the cumulative distance to each neighboring building.
    It continuously updates the shortest distance to each node until it reaches the end building.
    The algorithm outputs the path with the smallest total distance along with the total distance.
  Implementation:
    The adjacency list for Dijkstra includes weights for each edge, which is used to update the cumulative distance deciding on the shortest distanced path. */
  function dijkstra(graph, start, end) {
    const distances = {}; // stores the shortest distance to each node
    const previous = {}; // stores the previous node for each node in the shortest path
    const queue = new PriorityQueue(); // priority queue to select the node with the smallest distance
    const path = []; // to store the final path
    
    // initialize distances to infinity for all nodes except the start node
    for (let node in graph) {
      distances[node] = Infinity;
      previous[node] = null;
    }
    distances[start] = 0;
    queue.enqueue(start, 0);
    
    while (!queue.isEmpty()) {
      const currentNode = queue.dequeue().element;
      console.log(`Processing node: ${currentNode}, Distance from start: ${distances[currentNode]}`);
      
      // stop if it reaches the end node
      if (currentNode === end) {
        let temp = end;
        while (temp) {
          path.unshift(temp);
          temp = previous[temp];
        }
        console.log("Path found:", path);
        console.log(`Total distance from start to end: ${distances[end]}`);
        return { path, distance: distances[end] }; // return both path and total distance
      }
  
      // process each neighbor of the current node
      for (let neighbor of graph[currentNode]) {
        const neighborNode = neighbor.node;
        const distance = neighbor.distance;
  
        console.log(`Checking neighbor: ${neighborNode}, Edge weight: ${distance}`);
  
        if (typeof distance !== 'number' || distance <= 0) {
          console.warn(`Invalid or missing edge weight from ${currentNode} to ${neighborNode}. Skipping this edge.`);
          continue;
        }
  
        const newDistance = distances[currentNode] + distance;
  
        // if a shorter path to the neighbor is found, update distances and enqueue it
        if (newDistance < distances[neighborNode]) {
          distances[neighborNode] = newDistance;
          previous[neighborNode] = currentNode;
          queue.enqueue(neighborNode, newDistance);
          console.log(`Updated distance for ${neighborNode}: ${newDistance}`);
        }
      }
    }
    console.warn("No path found from start to end.");
    return { path: null, distance: Infinity }; 
  }
  
// execute the selected with switches algorithm
  function executeAlgorithm(data, algorithm, start, end) {
    const graph = parseGraph(data);
  
    switch (algorithm) {
      case 'bfs':
        const bfsPath = bfs(graph, start, end);
        return { path: bfsPath, distance: null }; 
      case 'dfs':
        const dfsPaths = dfsAllPaths(graph, start, end);
        return { path: dfsPaths, distance: null }; 
      case 'dijkstra':
        return dijkstra(graph, start, end); 
      default:
        return { path: null, distance: null };
    }
  }
  