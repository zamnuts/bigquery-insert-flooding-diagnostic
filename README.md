# bigquery-insert-flooding-diagnostic

See [googleapis/nodejs-bigquery#624](https://github.com/googleapis/nodejs-bigquery/issues/624).

This sample project illustrates the effects of flooding the underlying HTTPS agent's
socket pool using an abundance of fire-and-forget BigQuery Table inserts.

## Illustration of Insert Flooding (Bad)
To show the effect, run: `npm run start:flood`.

See the relevant source code in [src/insertFlood.ts](src/insertFlood.ts).

Watch for the `measure` lines. You'll notice several things:
- Large increase in RAM usage by node, +/- 1 _gigabyte_
- Large number of pending SetTimeouts, 1000 to 2000
- Very long event loop lag, 30, 70, and upwards of 90 _seconds_ per loop (this is what causes the appearance of node/terminal the terminal hang)
- Large number of concurrent socket connections, 2000 to 4000
- Appears to finish very early, but actually takes several minutes

Log output snippet showing the early finish, but process continues.
```text
gh624_table2: row iterations complete
measure: heap=186 MB, rss=277 MB, handlesSockets=0, handlesSetTimeouts=0, shouldWarn=false, loopLag=0.000080ms, bqSocketType=, bqAgentSockets=0
main: finished
measure: heap=901 MB, rss=2.04 GB, handlesSockets=0, handlesSetTimeouts=1, shouldWarn=true, loopLagEXCEEDED=2.4e+4ms, bqSocketType=TLSSocket, bqAgentSockets=40001
measure: heap=971 MB, rss=2.12 GB, handlesSockets=0, handlesSetTimeouts=1001, shouldWarn=true, loopLagEXCEEDED=8.2e+4ms, bqSocketType=TLSSocket, bqAgentSockets=28230
measure: heap=1.03 GB, rss=2.23 GB, handlesSockets=0, handlesSetTimeouts=1001, shouldWarn=true, loopLagEXCEEDED=6.1e+3ms, bqSocketType=TLSSocket, bqAgentSockets=39998
measure: heap=835 MB, rss=2.26 GB, handlesSockets=0, handlesSetTimeouts=952, shouldWarn=true, loopLagEXCEEDED=1.3e+3ms, bqSocketType=TLSSocket, bqAgentSockets=13176
```

If the process is allowed to run through to completion (give it about 5 minutes),
the following errors will be presented:

TLS disconnect:
```text
request to https://bigquery.googleapis.com/bigquery/v2/projects/refined-kite-268605/datasets/gh624_dataset/tables/gh624_table2/insertAll failed
  reason: Client network socket disconnected before secure TLS connection was established
```

Outbound ephemeral port exhaustion:
```text
request to https://bigquery.googleapis.com/bigquery/v2/projects/refined-kite-268605/datasets/gh624_dataset/tables/gh624_table2/insertAll failed
  reason: connect EADDRNOTAVAIL 216.58.192.74:443 - Local (192.168.69.107:0)
```

Socket timeout:
```text
network timeout at: https://bigquery.googleapis.com/bigquery/v2/projects/refined-kite-268605/datasets/gh624_dataset/tables/gh624_table2/insertAll
```

## Illustration of Insert Awaiting (good)
To show the effect, run: `npm run start:await`.

See the relevant source code in [src/insertAwait.ts](src/insertAwait.ts).

Watch for the `measure` lines. You'll notice several things:
- Small increase in RAM usage by node, never more than 100 _megabytes_, usually around 30MB
- Small number of pending SetTimeouts, about 1
- Normal event loop duration between 0 and 4 _milliseconds_
- Steady number of concurrent socket connections at 1 to 2
- Stable completion in about 2 minutes

```text
measure: heap=42.4 MB, rss=103 MB, handlesSockets=0, handlesSetTimeouts=1, shouldWarn=false, loopLag=0.0ms, bqSocketType=TLSSocket, bqAgentSockets=1
```
