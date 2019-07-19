const uniq = require('uniqid');
const ncp = require('copy-paste');

ncp.copy(uniq(), function () {
  console.log('id copied to clipboard.');
})