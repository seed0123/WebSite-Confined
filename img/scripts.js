let scatterChart;
const deviceData = {};
const deviceIndexMap = {}; // Maps device index to original device name
let deviceNames = [];
let lastKnownTemperature = {}; // Track last known temperature for each device
let consecutiveSameTemperatureCount = {}; // Track consecutive same temperature counts
const initialCheckAttempts = {}; // Track initial check attempts for each device
const shapes = ['circle', 'triangle', 'rect', 'cross', 'star', 'line', 'dash'];
const minX = 2, maxX = 18, minY = 2, maxY = 18; // Coordinate boundaries

document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const permit = urlParams.get('permit');

    if (permit) {
        document.getElementById('permitTitle').textContent = permit.charAt(0).toUpperCase() + permit.slice(1) + " Devices";
        initializeScatterPlot();
        fetchAndRenderDevices(permit); // Initial fetch and render
        setInterval(() => fetchAndRenderDevices(permit), 15000); // Auto update every 15 seconds
        updateLastUpdatedTime(); // Update initial last updated time
        setInterval(updateLastUpdatedTime, 1000); // Update last updated time every second
        setInterval(updateDeviceCoordinates, 1500); // Update device coordinates every 500ms
    }

    const deviceForm = document.getElementById('deviceForm');
    deviceForm.addEventListener('submit', function(event) {
        event.preventDefault();
        deviceNames = [];
        const formData = new FormData(deviceForm);
        for (let [key, value] of formData.entries()) {
            deviceNames.push(value || `Device ${deviceNames.length + 1}`);
        }
        fetchAndRenderDevices(permit); // Re-fetch and render with new names
    });
});

function initializeScatterPlot() {
    const ctx = document.getElementById('movementChart').getContext('2d');
    scatterChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: '',
                data: [], // Empty initially
                backgroundColor: function(context) {
                    const isMoving = context.raw?.isMoving;
                    return isMoving === 2 ? 'green' : (isMoving === 1 ? 'orange' : 'red');
                },
                pointStyle: function(context) {
                    return shapes[context.dataIndex % shapes.length]; // Assign a shape based on device index
                }
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: minX-2,
                    max: maxX+2
                },
                y: {
                    type: 'linear',
                    min: minY-2,
                    max: maxY+2
                }
            },
            plugins: {
                // legend: {
                //     display: true,
                //     labels: {
                //         generateLabels: function(chart) {
                //             const data = chart.data.datasets[0].data;
                //             return data.map((device, index) => ({
                //                 text: deviceNames[index] || `Device ${index + 1}`,
                //                 fillStyle: chart.data.datasets[0].backgroundColor(index),
                //                 pointStyle: shapes[index % shapes.length], // Use the shape for the legend
                //                 hidden: false,
                //                 lineCap: 'butt',
                //                 lineDash: [],
                //                 lineDashOffset: 0,
                //                 lineJoin: 'miter',
                //                 lineWidth: 1
                //             }));
                //         }
                //     }
                // },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            const deviceIndex = tooltipItem.dataIndex;
                            const deviceName = deviceNames[deviceIndex] || `Device ${deviceIndex + 1}`;
                            return deviceName;
                        }
                    }
                },
                datalabels: {
                    align: 'end',
                    anchor: 'end',
                    formatter: function(value, context) {
                        const index = context.dataIndex;
                        return deviceNames[index] || `Device ${index + 1}`;
                    },
                    color: 'black'
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

async function fetchAndRenderDevices(permit) {
    const channels = {
        kilns: ['2573700', '2581068'],
        preheaters: ['2599736', '2573701'],
        crushers: ['2581072', '2581073']
    };

    const channelIds = channels[permit] || [];

    for (let index = 0; index < channelIds.length; index++) {
        const channelId = channelIds[index];
        try {
            const response = await fetch(`https://api.thingspeak.com/channels/${channelId}/feeds.json?results=1`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            const feeds = data.feeds;
            const originalDeviceName = `Device ${index + 1}`; // Use this as the key for deviceData
            const deviceName = deviceNames[index] || originalDeviceName;

            if (feeds.length > 0) {
                const lastFeed = feeds[0];
                let isMoving = mapMovementStatus(lastFeed.field2); // Map field2 to 0, 1, or 2
                const temperature = parseFloat(lastFeed.field1).toFixed(2);

                let xCoordinate, yCoordinate;

                // Determine if device is powered off
                let powerOffStatus = false;
                 
                if (lastKnownTemperature[originalDeviceName] === temperature) {
                    consecutiveSameTemperatureCount[originalDeviceName] = consecutiveSameTemperatureCount[originalDeviceName] ? consecutiveSameTemperatureCount[originalDeviceName] + 1 : 1;
                    if (consecutiveSameTemperatureCount[originalDeviceName] >= 3) {
                        powerOffStatus = true;
                    }
                } else {
                    lastKnownTemperature[originalDeviceName] = temperature;
                    consecutiveSameTemperatureCount[originalDeviceName] = 0;
                }

                if (powerOffStatus) {
                    // Retain the last known coordinates if the device is powered off
                    xCoordinate = deviceData[originalDeviceName]?.x || getRandomInRange(minX, maxX);
                    yCoordinate = deviceData[originalDeviceName]?.y || getRandomInRange(minY, maxY);
                    isMoving = 0; // Set isMoving to 0 if the device is powered off
                } else if (isMoving === 2 || !deviceData[originalDeviceName]) {
                    // Generate new random coordinates if device is moving or it has no previous data
                    xCoordinate = getRandomInRange(minX, maxX);
                    yCoordinate = getRandomInRange(minY, maxY);

                    // Update coordinates if the device is moving
                    if (isMoving === 2 && deviceData[originalDeviceName]) {
                        xCoordinate = deviceData[originalDeviceName].x + getRandomMovement();
                        yCoordinate = deviceData[originalDeviceName].y + getRandomMovement();
                    }

                    // Ensure coordinates stay within bounds
                    xCoordinate = Math.max(minX+5, Math.min(maxX-5, xCoordinate));
                    yCoordinate = Math.max(minY+5, Math.min(maxY-5, yCoordinate));
                } else {
                    // Retain the last known coordinates if the device is not moving
                    xCoordinate = deviceData[originalDeviceName].x;
                    yCoordinate = deviceData[originalDeviceName].y;
                }

                // Update device data for scatter plot
                deviceData[originalDeviceName] = { x: xCoordinate, y: yCoordinate, isMoving };

                deviceIndexMap[index] = originalDeviceName; // Map index to original device name

                renderOrUpdateDevice(deviceName, isMoving, temperature, index, powerOffStatus);

                // Send data to server after rendering device if not powered off
                if (!powerOffStatus) {
                    sendDataToServer(deviceName, isMoving, temperature);
                }
            }
        } catch (error) {
            console.error('Error fetching device data:', error);
        }
    }
    updateScatterPlot();
}

function mapMovementStatus(field2) {
    switch (field2) {
        case '0':
            return 0; // No Movement
        case '1':
            return 1; // Warning
        case '2':
            return 2; // Movement Detected
        default:
            return 0; // Default to No Movement
    }
}

function renderOrUpdateDevice(deviceName, isMoving, temperature, index, powerOffStatus) {
    const container = document.getElementById('deviceContainer');
    let deviceElement = document.querySelector(`.device[data-index="${index}"]`);

    if (!deviceElement) {
        // Create device element if it doesn't exist
        deviceElement = document.createElement('div');
        deviceElement.className = 'device';
        deviceElement.setAttribute('data-index', index);

        const deviceNameElement = document.createElement('div');
        deviceNameElement.className = 'device-name';
        deviceElement.appendChild(deviceNameElement);

        const deviceTemperatureElement = document.createElement('div');
        deviceTemperatureElement.className = 'device-temperature';
        deviceElement.appendChild(deviceTemperatureElement);

        const deviceMovementElement = document.createElement('div');
        deviceMovementElement.className = 'device-movement';
        deviceElement.appendChild(deviceMovementElement);

        const trafficLightElement = document.createElement('div');
        trafficLightElement.className = 'traffic-light';
        deviceElement.appendChild(trafficLightElement);

        container.appendChild(deviceElement);
    }

    updateDevice(deviceElement, deviceName, isMoving, temperature, powerOffStatus);
}

function trafficLightClass(isMoving, powerOffStatus) {
    if (powerOffStatus) {
        return 'red-light';
    } else {
        return isMoving === 2 ? 'green-light' : (isMoving === 1 ? 'orange-light' : 'red-light');
    }
}

function movementText(isMoving) {
    switch (isMoving) {
        case 0:
            return 'No Movement';
        case 1:
            return 'Warning';
        case 2:
            return 'Movement Detected';
        default:
            return 'Unknown';
    }
}

function updateDevice(deviceElement, deviceName, isMoving, temperature, powerOffStatus) {
    const deviceTemperatureElement = deviceElement.querySelector('.device-temperature');
    const deviceMovementElement = deviceElement.querySelector('.device-movement');
    const trafficLightElement = deviceElement.querySelector('.traffic-light');

    deviceElement.querySelector('.device-name').textContent = deviceName;
    deviceTemperatureElement.textContent = powerOffStatus ? 'Device Powered Off' : `Temperature: ${temperature}°C`;
    deviceMovementElement.textContent = powerOffStatus ? '' : `Movement: ${movementText(isMoving)}`;
    trafficLightElement.className = `traffic-light ${trafficLightClass(isMoving, powerOffStatus)}`;
}

function updateLastUpdatedTime() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = now.toLocaleString();
}

function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomMovement() {
    const movement = Math.random() * 2 - 1; // Random movement between -1 and 1
    return movement * 2; // Scale to -2 to 2
}

function updateDeviceCoordinates() {
    for (const deviceName in deviceData) {
        const device = deviceData[deviceName];
        if (device.isMoving === 2) {
            let xCoordinate = device.x + getRandomMovement();
            let yCoordinate = device.y + getRandomMovement();

            // Ensure coordinates stay within bounds
            xCoordinate = Math.max(minX, Math.min(maxX, xCoordinate));
            yCoordinate = Math.max(minY, Math.min(maxY, yCoordinate));

            device.x = xCoordinate;
            device.y = yCoordinate;
        }
    }
    updateScatterPlot();
}

function updateScatterPlot() {
    scatterChart.data.datasets[0].data = Object.values(deviceData);
    scatterChart.update();
}

function sendDataToServer(deviceName, isMoving, temperature) {
    fetch('/devices', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            device: deviceName,
            isMoving: isMoving,
            temperature: temperature
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to send data to the server');
        }
        return response.json();
    })
    .then(data => {
        console.log('Data successfully sent to the server:', data);
    })
    .catch(error => {
        console.error('Error sending data to the server:', error);
    });
}
