const fs = require('fs');
const path = require('path');
const uniq = require('uniqid');

createFile({
  src: process.argv[2],
  header: process.argv[3] || '',
  title: process.argv[4] || '',
  url: process.argv[5] || ''
});

function createFile({ src, header, title, url }) {
  if (typeof src !== 'string') return console.error('Error: Incorrect <src> argument. Run:\nnpm run article <src> <title> <url>');
  const directory = path.resolve('./db/articles');
  const fileName = `${src}.js`;
  const filePath = path.resolve(directory, fileName);

  fs.stat(filePath, (err, stats) => {
    if (!err) console.error(`The file '${fileName}' already exists or the path is inaccessible.`);
    else {
      fs.writeFile(filePath, jsTemplate(header, title, url), 'utf8', (err) => {
        if (err) console.error('Error: The article file could not be created.');
        else console.log('Article template file create.');
      });
    }
  });
}

function jsTemplate(header, title, url) {
  return `
import { w, list, header } from './../utils/utils.js';

export default {
  title: '${header}',
  type: 'article',
  id: '${uniq()}',
  thumbnail: '',
  tags: [''],
  header: \`${title}\`,
  author: { name: '', url: ''},
  link: { name: '', url: '${url}'},
  text: [
    \`\`, //\$\{w('', 0)\}
  ],
  words: [
    { index: 0, id: '', meaning: [0] },
  ]
};`;
};


