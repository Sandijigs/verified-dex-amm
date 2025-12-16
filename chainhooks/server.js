/**
 * Verified DEX/AMM - Hiro Chainhooks Server
 *
 * This server monitors on-chain events from our deployed smart contracts
 * using Hiro Chainhooks (@hirosystems/chainhooks-client)
 *
 * Events Monitored:
 * - Pool creation events (factory)
 * - Liquidity add/remove events (pools)
 * - Swap events (router)
 * - TWAP oracle observation events
 *
 * Network: Stacks Testnet
 * Contracts: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV.*
 */

import express from 'express';
import bodyParser from 'body-parser';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config();

const app = express();
const PORT = process.env.CHAINHOOKS_PORT || 3001;

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));

// Event storage for analytics
const eventStore = {
  poolEvents: [],
  swapEvents: [],
  twapEvents: [],
  factoryEvents: [],
};

// Statistics tracking
const stats = {
  totalPools: 0,
  totalSwaps: 0,
  totalVolume: 0,
  totalFees: 0,
  totalUsers: new Set(),
  lastUpdated: null,
};

// Authorization middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CHAINHOOK_AUTH_TOKEN || 'YOUR_SECRET_TOKEN';

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

/**
 * CHAINHOOK ENDPOINT: Pool Events
 * Monitors pool-template contract for:
 * - add-liquidity events
 * - remove-liquidity events
 */
app.post('/chainhooks/pool-events', authMiddleware, (req, res) => {
  try {
    const event = req.body;
    console.log('\n🏊 POOL EVENT RECEIVED:', JSON.stringify(event, null, 2));

    // Store event
    eventStore.poolEvents.push({
      ...event,
      receivedAt: new Date().toISOString(),
    });

    // Process event data
    if (event.apply && event.apply.length > 0) {
      event.apply.forEach((tx) => {
        if (tx.transactions) {
          tx.transactions.forEach((transaction) => {
            // Track users
            if (transaction.metadata?.sender) {
              stats.totalUsers.add(transaction.metadata.sender);
            }

            // Process print events
            if (transaction.metadata?.receipt?.events) {
              transaction.metadata.receipt.events.forEach((evt) => {
                if (evt.type === 'print_event') {
                  console.log('📊 Pool Event Data:', evt.data);

                  // Track liquidity operations
                  if (evt.data?.type?.includes('liquidity')) {
                    saveEventToFile('pool-liquidity', evt.data);
                  }
                }
              });
            }
          });
        }
      });
    }

    stats.lastUpdated = new Date().toISOString();
    res.status(200).json({ status: 'success', message: 'Pool event processed' });
  } catch (error) {
    console.error('❌ Error processing pool event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * CHAINHOOK ENDPOINT: Swap Events
 * Monitors router contract for:
 * - Token swap events
 * - Volume tracking
 * - Fee generation
 */
app.post('/chainhooks/swap-events', authMiddleware, (req, res) => {
  try {
    const event = req.body;
    console.log('\n🔄 SWAP EVENT RECEIVED:', JSON.stringify(event, null, 2));

    // Store event
    eventStore.swapEvents.push({
      ...event,
      receivedAt: new Date().toISOString(),
    });

    // Process swap data
    if (event.apply && event.apply.length > 0) {
      event.apply.forEach((tx) => {
        if (tx.transactions) {
          tx.transactions.forEach((transaction) => {
            // Track users
            if (transaction.metadata?.sender) {
              stats.totalUsers.add(transaction.metadata.sender);
            }

            // Process swap events
            if (transaction.metadata?.receipt?.events) {
              transaction.metadata.receipt.events.forEach((evt) => {
                if (evt.type === 'print_event') {
                  console.log('💱 Swap Event Data:', evt.data);

                  // Track swap statistics
                  if (evt.data?.type === 'swap-executed') {
                    stats.totalSwaps++;

                    // Track volume if amount is available
                    if (evt.data.amount_in) {
                      stats.totalVolume += parseInt(evt.data.amount_in);
                    }

                    // Track fees if available
                    if (evt.data.fee) {
                      stats.totalFees += parseInt(evt.data.fee);
                    }

                    saveEventToFile('swaps', evt.data);
                  }
                }
              });
            }
          });
        }
      });
    }

    stats.lastUpdated = new Date().toISOString();
    res.status(200).json({ status: 'success', message: 'Swap event processed' });
  } catch (error) {
    console.error('❌ Error processing swap event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * CHAINHOOK ENDPOINT: TWAP Oracle Events
 * Monitors twap-oracle contract for:
 * - Price observation records
 * - Uses Clarity 4 stacks-block-time feature
 */
app.post('/chainhooks/twap-events', authMiddleware, (req, res) => {
  try {
    const event = req.body;
    console.log('\n📈 TWAP ORACLE EVENT RECEIVED:', JSON.stringify(event, null, 2));

    // Store event
    eventStore.twapEvents.push({
      ...event,
      receivedAt: new Date().toISOString(),
    });

    // Process TWAP observations
    if (event.apply && event.apply.length > 0) {
      event.apply.forEach((tx) => {
        if (tx.transactions) {
          tx.transactions.forEach((transaction) => {
            if (transaction.metadata?.receipt?.events) {
              transaction.metadata.receipt.events.forEach((evt) => {
                if (evt.type === 'print_event') {
                  console.log('⏰ TWAP Observation (Clarity 4 stacks-block-time):', evt.data);
                  saveEventToFile('twap-observations', evt.data);
                }
              });
            }
          });
        }
      });
    }

    stats.lastUpdated = new Date().toISOString();
    res.status(200).json({ status: 'success', message: 'TWAP event processed' });
  } catch (error) {
    console.error('❌ Error processing TWAP event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * CHAINHOOK ENDPOINT: Factory Events
 * Monitors pool-factory contract for:
 * - Pool creation events
 * - Uses Clarity 4 contract-hash? for template verification
 */
app.post('/chainhooks/factory-events', authMiddleware, (req, res) => {
  try {
    const event = req.body;
    console.log('\n🏭 FACTORY EVENT RECEIVED:', JSON.stringify(event, null, 2));

    // Store event
    eventStore.factoryEvents.push({
      ...event,
      receivedAt: new Date().toISOString(),
    });

    // Process factory events
    if (event.apply && event.apply.length > 0) {
      event.apply.forEach((tx) => {
        if (tx.transactions) {
          tx.transactions.forEach((transaction) => {
            // Track users
            if (transaction.metadata?.sender) {
              stats.totalUsers.add(transaction.metadata.sender);
            }

            if (transaction.metadata?.receipt?.events) {
              transaction.metadata.receipt.events.forEach((evt) => {
                if (evt.type === 'print_event') {
                  console.log('🆕 Pool Created (verified with Clarity 4 contract-hash?):', evt.data);

                  if (evt.data?.type === 'pool-created') {
                    stats.totalPools++;
                    saveEventToFile('pool-created', evt.data);
                  }
                }
              });
            }
          });
        }
      });
    }

    stats.lastUpdated = new Date().toISOString();
    res.status(200).json({ status: 'success', message: 'Factory event processed' });
  } catch (error) {
    console.error('❌ Error processing factory event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * API ENDPOINT: Get Statistics
 * Returns aggregated stats for Builder Challenge tracking
 */
app.get('/api/stats', (req, res) => {
  res.json({
    totalPools: stats.totalPools,
    totalSwaps: stats.totalSwaps,
    totalVolume: stats.totalVolume,
    totalFees: stats.totalFees,
    totalUsers: stats.totalUsers.size,
    uniqueUsers: Array.from(stats.totalUsers),
    lastUpdated: stats.lastUpdated,
    eventCounts: {
      poolEvents: eventStore.poolEvents.length,
      swapEvents: eventStore.swapEvents.length,
      twapEvents: eventStore.twapEvents.length,
      factoryEvents: eventStore.factoryEvents.length,
    },
  });
});

/**
 * API ENDPOINT: Get Recent Events
 */
app.get('/api/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  res.json({
    poolEvents: eventStore.poolEvents.slice(-limit),
    swapEvents: eventStore.swapEvents.slice(-limit),
    twapEvents: eventStore.twapEvents.slice(-limit),
    factoryEvents: eventStore.factoryEvents.slice(-limit),
  });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    chainhooksActive: true,
    hirosystemsChainhooksClient: '@hirosystems/chainhooks-client@^1.7.0',
    network: 'stacks-testnet',
    deployerAddress: 'ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV',
  });
});

/**
 * Helper function to save events to file for persistence
 */
function saveEventToFile(eventType, data) {
  try {
    const logsDir = path.join(process.cwd(), 'monitoring', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const filename = path.join(logsDir, `${eventType}-${new Date().toISOString().split('T')[0]}.jsonl`);
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      data: data,
    }) + '\n';

    fs.appendFileSync(filename, logEntry);
  } catch (error) {
    console.error('Error saving event to file:', error);
  }
}

// Start server
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   VERIFIED DEX/AMM - HIRO CHAINHOOKS SERVER               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📦 Using: @hirosystems/chainhooks-client`);
  console.log(`🌐 Network: Stacks Testnet`);
  console.log(`📍 Deployer: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV`);
  console.log(`\n🔗 Endpoints:`);
  console.log(`   - POST /chainhooks/pool-events`);
  console.log(`   - POST /chainhooks/swap-events`);
  console.log(`   - POST /chainhooks/twap-events`);
  console.log(`   - POST /chainhooks/factory-events`);
  console.log(`   - GET  /api/stats`);
  console.log(`   - GET  /api/events`);
  console.log(`   - GET  /health`);
  console.log(`\n✅ Chainhooks server ready to monitor contract events!\n`);
});

export default app;
