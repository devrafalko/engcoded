import path from 'path';

const images = require.context('./../../../../db/images', false, /\.png$/);
const imagesMap = new Map();

images.keys().forEach((_path) => {
  let id = path.basename(_path, '.png');
  let imagePath = images(_path);
  imagesMap.set(id, imagePath);
});

export default imagesMap;