const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '20mb' })); 
app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));

// serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// middleware to parse JSON request bodies
app.use(express.json());

// endpoint to get the default data
app.get('/default-data', (req, res) => {
  const dataPath = path.join(__dirname, 'campus-data.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading campus-data.json:', err);
      res.status(500).send('Error loading default data');
    } else {
      res.json(JSON.parse(data));
    }
  });
});


app.post('/update-campus-graph', (req, res) => {
    const updatedGraph = req.body;
    console.log('[Server] /update-campus-graph endpoint called with updated campusGraph:', updatedGraph);
  
    const dataPath = path.join(__dirname, 'campus-data.json');
  
    fs.writeFile(dataPath, JSON.stringify(updatedGraph, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('[Server] Error writing updated campusGraph to campus-data.json:', writeErr);
        return res.status(500).send('Error saving data');
      }
  
      console.log('[Server] Updated campusGraph saved to campus-data.json successfully');
      res.json(updatedGraph);
    });
  });
  
  
  app.post('/update-buildings', (req, res) => {
    const newBuilding = req.body.building;
    console.log('[Server] /update-buildings endpoint called with new building:', newBuilding);
  
    const dataPath = path.join(__dirname, 'campus-data.json');
  
    // reads the existing campusGraph data from campus-data.json
    fs.readFile(dataPath, 'utf8', (err, data) => {
      if (err) {
        console.error('[Server] Error reading campus-data.json:', err);
        return res.status(500).send('Error reading data');
      }
  
      let campusGraph;
      try {
        campusGraph = JSON.parse(data); 
        console.log('[Server] Current data in campus-data.json before update:', campusGraph);
      } catch (parseErr) {
        console.error('[Server] Error parsing campus-data.json:', parseErr);
        return res.status(500).send('Error parsing data');
      }
  
      // adds new building to the campusGraph buildings
      campusGraph.buildings[newBuilding.id] = newBuilding;
  
      // saves the updated campusGraph back to campus-data.json
      fs.writeFile(dataPath, JSON.stringify(campusGraph, null, 2), (writeErr) => {
        if (writeErr) {
          console.error('[Server] Error writing to campus-data.json:', writeErr);
          return res.status(500).send('Error saving data');
        }
  
        console.log('[Server] Updated campusGraph saved to campus-data.json');
        res.json(campusGraph); 
      });
    });
  });
  
// endpoint to update the paths in campus-data.json
app.post('/update-paths', (req, res) => {
    const newPaths = req.body.paths;
    console.log('[Server] /update-paths endpoint called with new paths:', newPaths);
  
    const dataPath = path.join(__dirname, 'campus-data.json');
    
    // Read the existing campusGraph data from campus-data.json
    fs.readFile(dataPath, 'utf8', (err, data) => {
      if (err) {
        console.error('[Server] Error reading campus-data.json:', err);
        return res.status(500).send('Error reading data');
      }
  
      let campusGraph;
      try {
        campusGraph = JSON.parse(data); // Parse current campusGraph structure
        console.log('[Server] Current data in campus-data.json before update:', campusGraph);
      } catch (parseErr) {
        console.error('[Server] Error parsing campus-data.json:', parseErr);
        return res.status(500).send('Error parsing data');
      }
  
      // Update only the paths in the campusGraph object, retaining buildings
      campusGraph.paths = newPaths;
  
      // Save the updated campusGraph back to campus-data.json
      fs.writeFile(dataPath, JSON.stringify(campusGraph, null, 2), (writeErr) => {
        if (writeErr) {
          console.error('[Server] Error writing to campus-data.json:', writeErr);
          return res.status(500).send('Error saving data');
        }
  
        console.log('[Server] Updated campusGraph saved to campus-data.json');
        res.json(campusGraph); // Send back the entire updated campusGraph
      });
    });
  });
  


// serve index.html on all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is on port ${PORT}`);
});
