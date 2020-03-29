import { BigQuery, Dataset, RowMetadata, Table } from '@google-cloud/bigquery';
import delay from 'delay';
import pEvent from 'p-event';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

import { Gh624Row, createTableDelaySec, location, schema } from './common';
import logger from './logger';

function* jsonRowGenerator(count: number) {
  for (let index = 0; index < count; index++) {
    const uuid = uuidv4();
    const ts = new Date();
    const row: Gh624Row = {
      index,
      ts,
      uuid,
    };
    const rowString = JSON.stringify(row);
    if (index % 1000 === 0) {
      logger.log(`yielding index ${index} using json: ${rowString}`);
    }
    yield `${rowString}${index + 1 < count ? '\n' : ''}`;
  }
}

export async function maybeDeleteDataset(
  bq: BigQuery,
  datasetId: string
): Promise<void> {
  try {
    await bq.dataset(datasetId).delete({ force: true });
    logger.info(`deleted the dataset ${datasetId}`);
  } catch (delErr) {
    if (delErr.code === 404) {
      logger.warn(`dataset ${datasetId} does not exist`);
      return;
    }
    logger.error(`trouble deleting the dataset ${datasetId}`, delErr);
  }
}

export async function createTable(
  ds: Dataset,
  tableId: string
): Promise<Table> {
  logger.log(`${tableId}: create table`);
  const [table] = await ds.createTable(tableId, {
    location,
    schema,
  });

  logger.log(`${tableId}: waiting ${createTableDelaySec}s for table sync`);
  await delay(createTableDelaySec * 1000);

  return table;
}

export async function loadData(
  ds: Dataset,
  tableId: string,
  numRows: number
): Promise<void> {
  const table = await createTable(ds, tableId);

  logger.log(`${tableId}: loading up data...`);
  const writableJob = Readable.from(jsonRowGenerator(numRows)).pipe(
    table.createWriteStream('json')
  );

  await pEvent(writableJob, 'complete');
  logger.log(`${tableId}: data load complete`);
}

export async function getRows(
  ds: Dataset,
  tableId: string,
  numRows: number
): Promise<RowMetadata[]> {
  logger.log(`${tableId}: fetching from table ${tableId}`);
  const table = ds.table(tableId);
  const [rows] = await table.getRows({
    autoPaginate: true,
    maxResults: numRows,
  });
  return rows;
}
