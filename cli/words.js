const ncp = require('copy-paste');
const uniq = require('uniqid');

const arg = Number(process.argv[2]);
const words = isNaN(arg) ? 1:arg;
let collection = '';

for(let i = 0; i < words; i++){
  collection += `{ id: '${uniq()}', word: '', meaning: [''], definition: '', img: '', audio: '' },\n`;
}

ncp.copy(collection, function () {
  console.log('records copied to clipboard.');
})


