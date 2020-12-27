const fs = require('fs');
const path = require('path');
const uniq = require('uniqid');

createFile({
  src: process.argv[2],
  title: process.argv[3] || '',
  url: process.argv[4] || ''
});

function createFile({ src, title, url }) {
  if (typeof src !== 'string') return console.error('Error: Incorrect <src> argument. Run:\nnpm run article <src> <title> <url>');
  const directory = path.resolve('./db/articles');
  const fileName = `${src}.js`;
  const filePath = path.resolve(directory, fileName);

  fs.stat(filePath, (err, stats) => {
    if (!err) console.error(`The file '${fileName}' already exists or the path is inaccessible.`);
    else {
      fs.writeFile(filePath, jsTemplate(title, url), 'utf8', (err) => {
        if (err) console.error('Error: The article file could not be created.');
        else console.log('Article template file create.');
      });
    }
  });
}

function jsTemplate(title, url) {
  return `
import { w, list, header } from './../utils/utils.js';

export default {
  title: '',
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


