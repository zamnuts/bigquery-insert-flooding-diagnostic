import { Dataset } from '@google-cloud/bigquery';

import { createTable, getRows } from './helpers';
import logger from './logger';

const reportEveryNRows = 1000;

export async function copyDataInsertFlood(
  ds: Dataset,
  fromTableId: string,
  toTableId: string,
  numRows: number
): Promise<void> {
  const rows = await getRows(ds, fromTableId, numRows);
  const tableTo = await createTable(ds, toTableId);

  logger.log(`${toTableId}: got ${rows.length} rows from ${fromTableId}`);
  rows.forEach((row, i) => {
    if (!row) {
      logger.error(`${toTableId}: no row, how in the world?`);
    }

    const { index, ts, uuid } = row;

    if (i % reportEveryNRows === 0) {
      logger.log(`${toTableId}: inserting row ${i} with index ${index}`);
    }

    tableTo
      .insert({
        index,
        ts,
        uuid,
      })
      .then(() => {
        if (i % reportEveryNRows === 0) {
          logger.log(
            `${toTableId}: completed insert for row ${i} with index ${index}`
          );
        }
      })
      .catch((err: Error) => {
        logger.error(`${toTableId}: row:${i} index:${index}, ${err.message}`);
      });
  });
  logger.log(`${toTableId}: row iterations complete`);
}
