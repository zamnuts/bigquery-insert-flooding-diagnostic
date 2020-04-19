import { TLSSocket } from 'tls';
import * as prettyBytes from 'pretty-bytes';
import { Agent as HTTPAgent, globalAgent as globalHttpAgent } from 'http';
import { globalAgent as globalHttpsAgent } from 'https';

const checkLag = require('event-loop-lag')(1000) as () => number;
const inspector = require('event-loop-inspector')();
const { getAgent } = require('teeny-request/build/src/agents');

function sampleBqAgentSockets(warnThresholdCount = 1000) {
  // probe the agent to watch for socket usage
  const agent = getAgent('https://only-the-proto-matters', { forever: true });
  const bqSocket = agent.sockets[
    'bigquery.googleapis.com:443::::::::::::::::::'
  ] as TLSSocket[];

  if (!bqSocket || !Array.isArray(bqSocket)) {
    return {
      bqSocketType: '',
      bqAgentRequests: 0,
    };
  } else {
    return {
      shouldWarn: bqSocket.length > warnThresholdCount,
      bqSocketType: bqSocket[0].constructor.name,
      bqAgentRequests: bqSocket.length,
    };
  }
}

export interface ConnectionStatistics {
  numRequests: number;
  numSockets: number;
}

function countConnections(): ConnectionStatistics {
  return ([
    globalHttpAgent,
    globalHttpsAgent,
    getAgent('https://only-the-proto-matters', { forever: true }),
    getAgent('http://only-the-proto-matters', { forever: true }),
  ] as HTTPAgent[]).reduce(
    (stats, agent) => {
      if (!agent || !agent.sockets) {
        return stats;
      }

      const sockets = Object.values(agent.sockets);
      const numConnections = sockets.reduce(
        (sum, socket) => sum + ((socket && socket.length) || 0),
        0
      );
      return {
        numRequests: stats.numRequests + numConnections,
        numSockets: stats.numSockets + sockets.length,
      };
    },
    { numRequests: 0, numSockets: 0 } as ConnectionStatistics
  );
}

function sampleLoopLag(warnThresholdMs = 50) {
  const lag = checkLag();
  const shouldWarn = lag > warnThresholdMs;
  return {
    shouldWarn,
    [`loopLag${shouldWarn ? 'EXCEEDED' : ''}`]: `${lag.toPrecision(2)}ms`,
  };
}

function sampleMemory() {
  const mem = process.memoryUsage();
  return {
    heap: prettyBytes(mem.heapUsed),
    rss: prettyBytes(mem.rss),
  };
}

function sampleLoop() {
  const { handles: { Socket = [], setTimeout = [] } = {} } = inspector.dump();
  return {
    handlesSockets: Socket.length,
    handlesSetTimeouts: setTimeout.length,
  };
}

export function sampleDump() {
  const samples = Object.assign(
    {},
    sampleMemory(),
    sampleLoop(),
    sampleLoopLag(),
    sampleBqAgentSockets(),
    countConnections()
  );
  const out = Object.keys(samples).reduce(
    (out, key) => `${out}${out.length ? ', ' : ''}${key}=${samples[key]}`,
    ''
  );
  const consoleMethod = samples.shouldWarn ? 'warn' : 'log';
  console[consoleMethod](`measure: ${out}`);
}

export function startContinuousSampling(sampleEveryMs = 2000) {
  setInterval(() => {
    sampleDump();
  }, sampleEveryMs).unref();
}
