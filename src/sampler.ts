import { TLSSocket } from 'tls';
import * as prettyBytes from 'pretty-bytes';

const checkLag = require('event-loop-lag')(1000) as () => number;
const inspector = require('event-loop-inspector')();
const { getAgent } = require('teeny-request/build/src/agents');

function sampleBqAgentSockets(warnThresholdCount = 1000) {
  // probe the agent to watch for socket usage
  const agent = getAgent('https://only-the-proto-matters', { forever: true });
  const bqSockets = agent.sockets[
    'bigquery.googleapis.com:443::::::::::::::::::'
  ] as TLSSocket[];

  if (!bqSockets || !Array.isArray(bqSockets)) {
    return {
      bqSocketType: '',
      bqAgentSockets: 0,
    };
  } else {
    return {
      shouldWarn: bqSockets.length > warnThresholdCount,
      bqSocketType: bqSockets[0].constructor.name,
      bqAgentSockets: bqSockets.length,
    };
  }
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
    sampleBqAgentSockets()
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
