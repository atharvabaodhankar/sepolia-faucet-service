#!/usr/bin/env node

/**
 * Test script for Multi-Network Faucet Status Endpoint
 * Tests both local and production endpoints
 */

const https = require('https');
const http = require('http');

// Test configurations
const ENDPOINTS = [
  {
    name: 'Local Development',
    url: 'http://localhost:3000/api/status',
    protocol: http
  },
  {
    name: 'Production (if deployed)',
    url: 'https://your-domain.vercel.app/api/status', // Update with your actual domain
    protocol: https
  }
];

/**
 * Make HTTP request and return promise
 */
function makeRequest(url, protocol) {
  return new Promise((resolve, reject) => {
    const request = protocol.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            data: jsonData
          });
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Validate status response structure
 */
function validateStatusResponse(data) {
  const errors = [];
  
  // Check required fields
  if (typeof data.configured !== 'boolean') {
    errors.push('Missing or invalid "configured" field');
  }
  
  if (!data.timestamp) {
    errors.push('Missing "timestamp" field');
  }
  
  if (!data.networks || typeof data.networks !== 'object') {
    errors.push('Missing or invalid "networks" field');
  } else {
    // Check Sepolia network
    if (!data.networks.sepolia) {
      errors.push('Missing Sepolia network status');
    } else {
      const sepolia = data.networks.sepolia;
      if (sepolia.currency !== 'ETH') {
        errors.push(`Sepolia currency should be ETH, got: ${sepolia.currency}`);
      }
      if (sepolia.name !== 'Sepolia') {
        errors.push(`Sepolia name should be "Sepolia", got: ${sepolia.name}`);
      }
    }
    
    // Check Polygon network
    if (!data.networks.polygon) {
      errors.push('Missing Polygon network status');
    } else {
      const polygon = data.networks.polygon;
      if (polygon.currency !== 'POL') {
        errors.push(`Polygon currency should be POL, got: ${polygon.currency}`);
      }
      if (polygon.name !== 'Polygon Amoy') {
        errors.push(`Polygon name should be "Polygon Amoy", got: ${polygon.name}`);
      }
    }
  }
  
  if (!data.overallStatus) {
    errors.push('Missing "overallStatus" field');
  }
  
  if (!Array.isArray(data.supportedNetworks)) {
    errors.push('Missing or invalid "supportedNetworks" field');
  } else {
    const expectedNetworks = ['sepolia', 'polygon'];
    const missingNetworks = expectedNetworks.filter(net => !data.supportedNetworks.includes(net));
    if (missingNetworks.length > 0) {
      errors.push(`Missing supported networks: ${missingNetworks.join(', ')}`);
    }
  }
  
  return errors;
}

/**
 * Test a single endpoint
 */
async function testEndpoint(endpoint) {
  console.log(`\n🧪 Testing ${endpoint.name}...`);
  console.log(`📡 URL: ${endpoint.url}`);
  
  try {
    const startTime = Date.now();
    const response = await makeRequest(endpoint.url, endpoint.protocol);
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ Status Code: ${response.statusCode}`);
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    
    if (response.statusCode === 200) {
      console.log(`📊 Response Data:`);
      
      // Validate response structure
      const validationErrors = validateStatusResponse(response.data);
      
      if (validationErrors.length === 0) {
        console.log(`✅ Response structure is valid`);
        
        // Display key information
        console.log(`🔧 Configured: ${response.data.configured}`);
        console.log(`📈 Overall Status: ${response.data.overallStatus}`);
        console.log(`🌐 Supported Networks: ${response.data.supportedNetworks.join(', ')}`);
        
        // Display network details
        Object.entries(response.data.networks).forEach(([networkKey, networkData]) => {
          console.log(`\n  ${networkKey.toUpperCase()}:`);
          console.log(`    Name: ${networkData.name}`);
          console.log(`    Currency: ${networkData.currency}`);
          console.log(`    Status: ${networkData.status}`);
          
          if (networkData.faucet) {
            console.log(`    Balance: ${networkData.faucet.balance} ${networkData.currency}`);
            console.log(`    Address: ${networkData.faucet.address}`);
          }
          
          if (networkData.capacity) {
            console.log(`    Requests Remaining: ${networkData.capacity.requestsRemaining}`);
            console.log(`    Amount Per Request: ${networkData.capacity.amountPerRequest} ${networkData.currency}`);
          }
          
          if (networkData.error) {
            console.log(`    ❌ Error: ${networkData.error}`);
          }
        });
        
      } else {
        console.log(`❌ Response validation failed:`);
        validationErrors.forEach(error => console.log(`   - ${error}`));
      }
      
    } else {
      console.log(`❌ Unexpected status code: ${response.statusCode}`);
      console.log(`📄 Response:`, JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚰 Multi-Network Faucet Status Endpoint Test');
  console.log('='.repeat(50));
  
  for (const endpoint of ENDPOINTS) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n✨ Test completed!');
  console.log('\n💡 Tips:');
  console.log('   - If local test fails, make sure your dev server is running: npm run dev');
  console.log('   - Update the production URL in this script with your actual domain');
  console.log('   - Check that environment variables are properly set');
}

// Run tests
runTests().catch(console.error);