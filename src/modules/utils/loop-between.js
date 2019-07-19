export default function (initial, final, start, callback) {
  let shouldBreak = false;
  if (initial < final) {
    for (let i = start + 1; i <= final; i++) {
      if (shouldBreak) return;
      callback(i, () => shouldBreak = true);
    }
    for (let i = initial; i <= start; i++) {
      if (shouldBreak) return;
      callback(i, () => shouldBreak = true);
    }
  } else if (initial > final) {
    for (let i = start - 1; i >= final; i--) {
      if (shouldBreak) return;
      callback(i, () => shouldBreak = true);
    }
    for (let i = initial; i >= start; i--) {
      if (shouldBreak) return;
      callback(i, () => shouldBreak = true);
    }
  }
}