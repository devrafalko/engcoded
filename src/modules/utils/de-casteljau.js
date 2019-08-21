export default function(coords, time) {
  const res = reduce(coords);
  return res[1];
  function reduce(coords) {
    const reduced = [];
    for (let i = 0; i < coords.length - 3; i += 2) {
      reduced.push(coords[i] + ((coords[i + 2] - coords[i]) * time));
      reduced.push(coords[i + 1] + ((coords[i + 3] - coords[i + 1]) * time));
    }
    return reduced.length > 2 ? reduce(reduced) : reduced;
  }
}