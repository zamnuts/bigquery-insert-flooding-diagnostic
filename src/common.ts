import { TableField } from '@google-cloud/bigquery';

export interface Gh624Row {
  index: number;
  ts: Date;
  uuid: string;
}

export const schema: TableField[] = [
  { name: 'index', type: 'NUMERIC' },
  { name: 'ts', type: 'TIMESTAMP' },
  { name: 'uuid', type: 'STRING' },
];

export const location = 'US';

export const createTableDelaySec = 10;
