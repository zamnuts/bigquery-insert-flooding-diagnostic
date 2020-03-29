import { BigQuery } from '@google-cloud/bigquery';

import { location } from './common';
import { loadData, maybeDeleteDataset } from './helpers';
import { copyDataInsertFlood } from './insertFlood';
import { copyDataInsertAwait } from './insertAwait';
import logger from './logger';
import { sampleDump, startContinuousSampling } from './sampler';

interface MainOptions {
  datasetId: string;
  numRows: number;
  tableId1: string;
  tableId2: string;
  reinsertAsFlood?: boolean;
}

export async function main({
  datasetId,
  numRows,
  tableId1,
  tableId2,
  reinsertAsFlood = false,
}: MainOptions): Promise<void> {
  logger.info(
    `main: will insert by ${reinsertAsFlood ? 'flooding' : 'awaiting'}`
  );

  sampleDump();

  const bigquery = new BigQuery();
  await maybeDeleteDataset(bigquery, datasetId);

  try {
    startContinuousSampling();

    const [dataset] = await bigquery.createDataset(datasetId, { location });
    await loadData(dataset, tableId1, numRows);

    if (reinsertAsFlood) {
      logger.info('main: inserting by flooding');
      await copyDataInsertFlood(dataset, tableId1, tableId2, numRows);
    } else {
      logger.info('main: inserting by awaiting');
      await copyDataInsertAwait(dataset, tableId1, tableId2, numRows);
    }

    sampleDump();
    logger.info('main: finished');
  } catch (err) {
    logger.error('stack:', err.stack);
    logger.error('errors:', err.errors);
  }

  await maybeDeleteDataset(bigquery, datasetId);
  sampleDump();
}
