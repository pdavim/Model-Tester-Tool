import fetch from 'node-fetch';
import fs from 'fs';

async function testDiscovery() {
  try {
    console.log("Calling /api/hf/models...");
    const response = await fetch('http://localhost:3767/api/hf/models');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(`Received ${data.length} models.`);
    fs.writeFileSync('discovery_debug.json', JSON.stringify(data.slice(0, 5), null, 2));
    
    console.log("Response headers:", JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
  } catch (error) {
    console.error("Discovery test failed:", error);
    fs.writeFileSync('discovery_error.txt', error.stack || error.message);
  }
}

testDiscovery();
