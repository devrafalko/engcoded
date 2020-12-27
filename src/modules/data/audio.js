import $path from 'path-browserify';

const sources = require.context('./../../../db/audio', false, /\.mp3$/);
const audioMap = new Map();

sources.keys().forEach((_path) => {
  let id = $path.basename(_path, '.mp3');
  let audioPath = sources(_path);
  audioMap.set(id, audioPath.default);
});

export default audioMap;