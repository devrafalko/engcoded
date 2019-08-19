export default function (a) {
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    let t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
}