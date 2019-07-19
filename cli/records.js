const ncp = require('copy-paste');

const arg = Number(process.argv[2]);
const records = isNaN(arg) ? 1:arg;
let collection = '';

for(let i = 0; i < records; i++){
  collection += `{ index: ${i}, id: '', meaning: [] },\n`;
}

ncp.copy(collection, function () {
  console.log('records copied to clipboard.');
})