import { main } from './main';

const reinsertAsFlood = process.argv
  .slice(2)
  .some(arg => arg.toLowerCase() === 'flood');

main({
  datasetId: 'gh624_dataset',
  numRows: 4e4,
  tableId1: 'gh624_table1',
  tableId2: 'gh624_table2',
  reinsertAsFlood,
}).catch((err: Error) => console.error(err));
