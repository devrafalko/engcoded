import path from 'path';

const images = require.context('./../../../db/thumbs', false, /\.jpg$/);
const imagesMap = new Map();

images.keys().forEach((_path) => {
  let id = path.basename(_path, '.jpg');
  let imagePath = images(_path);
  imagesMap.set(id, imagePath);
});

export default imagesMap;