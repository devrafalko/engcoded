export default function (arr) {
  let index = Math.round(Math.random() * (arr.length - 1));
  return arr[index];
}