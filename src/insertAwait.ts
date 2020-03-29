import { Dataset } from '@google-cloud/bigquery';
import * as pMap from 'p-map';

const chunk = require('lodash.chunk');

import { Gh624Row } from './common';
import { createTable, getRows } from './helpers';
import logger from './logger';

const batchInsertNumRows = 100;
const reportEveryNBatches = 100;

export async function copyDataInsertAwait(
  ds: Dataset,
  fromTableId: string,
  toTableId: string,
  numRows: number
): Promise<void> {
  const tableTo = await createTable(ds, toTableId);
  const rows = await getRows(ds, fromTableId, numRows);

  logger.log(`${toTableId}: got ${rows.length} rows from ${fromTableId}`);
  const batches = chunk(rows, batchInsertNumRows);

  await pMap(
    batches,
    async (rows: Gh624Row[], i: number) => {
      const shouldLog: boolean = i % reportEveryNBatches === 0;
      if (shouldLog) {
        logger.log(
          `${toTableId}: inserting ${rows.length} rows with offset ${i}`
        );
      }

      await tableTo.insert(rows);

      if (shouldLog) {
        logger.log(
          `${toTableId}: inserted ${rows.length} rows with offset ${i}`
        );
      }
    },
    { concurrency: 1 }
  );
  logger.log(`${toTableId}: row insertions complete`);
}
