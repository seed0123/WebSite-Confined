// server/server.js

const { dir } = require('console');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000; // Choose your port

// Connect to SQLite database
const db = new sqlite3.Database(path.join(__dirname,'db', 'database.db'), err => {
    if (err) {
        console.error('Database connection error:', err.message);
        // console.log(dir);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Middleware to parse JSON bodies
app.use(express.json());

// API endpoint to save device data
app.post('/api/device-data', (req, res) => {
    const { deviceName, status, movement, temperature } = req.body;

    // Insert data into SQLite database
    db.run(
        'INSERT INTO devices (deviceName, status, movement, temperature) VALUES (?, ?, ?, ?)',
        [deviceName, status, movement, temperature],
        function (err) {
            if (err) {
                console.error('Error inserting data:', err.message);
                res.status(500).json({ error: 'Failed to insert data into database' });
            } else {
                console.log(`Device data inserted with ID: ${this.lastID}`);
                res.status(200).json({ message: 'Device data inserted successfully' });
            }
        }
    );
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '..')));

// Handle 404 errors
app.use((req, res, next) => {
    res.status(404).send('404 - Not Found');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
