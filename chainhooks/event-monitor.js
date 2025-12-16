/**
 * Event Monitor Dashboard
 *
 * Real-time monitoring dashboard for Verified DEX/AMM events
 * Powered by @hirosystems/chainhooks-client
 *
 * Usage: node event-monitor.js
 */

import axios from 'axios';
import { config } from 'dotenv';

config();

const SERVER_URL = process.env.CHAINHOOKS_SERVER || 'http://localhost:3001';
const REFRESH_INTERVAL = parseInt(process.env.REFRESH_INTERVAL) || 10000; // 10 seconds

/**
 * Fetch current statistics from chainhooks server
 */
async function fetchStats() {
  try {
    const response = await axios.get(`${SERVER_URL}/api/stats`);
    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Fetch recent events
 */
async function fetchEvents(limit = 10) {
  try {
    const response = await axios.get(`${SERVER_URL}/api/events?limit=${limit}`);
    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Display stats in console
 */
function displayStats(stats) {
  console.clear();
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   VERIFIED DEX/AMM - EVENT MONITOR DASHBOARD              ║');
  console.log('║   Powered by @hirosystems/chainhooks-client               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📊 LIVE STATISTICS\n');
  console.log(`🏊 Total Pools Created:      ${stats.totalPools}`);
  console.log(`🔄 Total Swaps Executed:     ${stats.totalSwaps}`);
  console.log(`💰 Total Trading Volume:     ${stats.totalVolume} µSTX`);
  console.log(`💵 Total Fees Generated:     ${stats.totalFees} µSTX`);
  console.log(`👥 Unique Users:             ${stats.totalUsers}`);
  console.log(`\n📈 EVENT COUNTS\n`);
  console.log(`   Pool Events:              ${stats.eventCounts.poolEvents}`);
  console.log(`   Swap Events:              ${stats.eventCounts.swapEvents}`);
  console.log(`   TWAP Events:              ${stats.eventCounts.twapEvents}`);
  console.log(`   Factory Events:           ${stats.eventCounts.factoryEvents}`);

  console.log(`\n🕐 Last Updated: ${stats.lastUpdated || 'Never'}`);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   CLARITY 4 FEATURES TRACKED                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('✅ contract-hash? - Pool template verification');
  console.log('✅ stacks-block-time - TWAP oracle timestamps\n');

  if (stats.uniqueUsers && stats.uniqueUsers.length > 0) {
    console.log('👥 Recent Users:\n');
    stats.uniqueUsers.slice(-5).forEach((user, i) => {
      console.log(`   ${i + 1}. ${user}`);
    });
  }

  console.log('\n🔄 Refreshing every 10 seconds... (Ctrl+C to exit)\n');
}

/**
 * Display recent events
 */
function displayRecentEvents(events) {
  if (!events) return;

  const allEvents = [
    ...events.poolEvents.map(e => ({ ...e, type: 'POOL' })),
    ...events.swapEvents.map(e => ({ ...e, type: 'SWAP' })),
    ...events.twapEvents.map(e => ({ ...e, type: 'TWAP' })),
    ...events.factoryEvents.map(e => ({ ...e, type: 'FACTORY' })),
  ];

  // Sort by received time
  allEvents.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

  if (allEvents.length > 0) {
    console.log('📝 RECENT EVENTS (Last 5):\n');
    allEvents.slice(0, 5).forEach((event, i) => {
      const icon = {
        POOL: '🏊',
        SWAP: '🔄',
        TWAP: '📈',
        FACTORY: '🏭',
      }[event.type];

      console.log(`   ${icon} [${event.type}] - ${event.receivedAt}`);
    });
    console.log('');
  }
}

/**
 * Monitor loop
 */
async function monitor() {
  const stats = await fetchStats();

  if (!stats) {
    console.clear();
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   VERIFIED DEX/AMM - EVENT MONITOR                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('❌ Cannot connect to chainhooks server');
    console.log(`   Server URL: ${SERVER_URL}`);
    console.log('\n💡 Make sure the server is running:');
    console.log('   cd chainhooks && npm start\n');
    console.log('🔄 Retrying in 10 seconds...\n');
  } else {
    displayStats(stats);

    const events = await fetchEvents(5);
    if (events) {
      displayRecentEvents(events);
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting Event Monitor...\n');

  // Initial check
  await monitor();

  // Set up periodic refresh
  setInterval(monitor, REFRESH_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Event monitor stopped\n');
  process.exit(0);
});

// Start monitoring
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
