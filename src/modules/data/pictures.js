import $path from 'path-browserify';

const images = require.context('./../../../db/pictures/src', false, /\.jpg$/);
const imagesMap = new Map();

images.keys().forEach((_path) => {
  let id = $path.basename(_path, '.jpg');
  let imagePath = images(_path);
  imagesMap.set(id, imagePath.default);
});
export default imagesMap;