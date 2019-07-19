export default function (child, callback) {
  let stopped = false;
  let stop = () => stopped = true;
  let parent = child;
  while (true) {
    callback(parent, stop);
    if (stopped) return;
    parent = parent.parentElement;
    if (!parent) return;
  }
}