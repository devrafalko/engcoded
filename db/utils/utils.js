export function w(content, index) {
  return /*html*/`<span data-word="${index}">${content}</span>`;
}

export function l(content, index, word = null) {
  return /*html*/`<span data-local="${index}" ${word !== null ? `data-word="${word}"` : ''}>${content}</span>`;
}

export function lk(content, index, word = null) {
  return /*html*/`
    <span data-local="${index}" data-keyword ${word !== null ? `data-word="${word}"` : ''}>
      <svg data-key viewBox="-40 -100 400  800">
        <path style="transform:rotate(-45deg); transform-origin:center" 
          d="M353.812,0C263.925,0,191.25,72.675,191.25,162.562c0,19.125,3.825,38.25,9.562,57.375L0,420.75v95.625h95.625V459H153
          v-57.375h57.375l86.062-86.062c17.213,5.737,36.338,9.562,57.375,9.562c89.888,0,162.562-72.675,162.562-162.562S443.7,0,353.812,0
          z M401.625,172.125c-32.513,0-57.375-24.862-57.375-57.375s24.862-57.375,57.375-57.375S459,82.237,459,114.75
          S434.138,172.125,401.625,172.125z"/>
      </svg> ${content}</span>`;
}

export function k(word) {
  return /*html*/`<span data-keyword>${word}</span>`;
}

export function p(word) {
  return /*html*/`<span data-pronoun>${word}</span>`;
}

export function e(word) {
  return /*html*/`<span data-explanation>(${word})</span>`;
}

export function list(items) {
  let list = '';
  for (let item of items) list += /*html*/`<li>${item}</li>`
  return /*html*/`<ol data-list>${list}</ol>`;
}

export function dialogue() {
  let list = '';
  switch (typeof arguments[0]) {
    case 'string':
      [...arguments].forEach((item, iter) => {
        let isEven = Math.round(iter / 2) === iter / 2;
        list += /*html*/`<li>
          <h1>${isEven ? 'A:' : 'B:'}</h1>
          <p>${item}</p>
        </li>`;
      });
      break;
    default:
      arguments[0].forEach((item, iter) => {
        list +=/*html*/`<li>
          <h1>${item[0]}</h1>
          <p>${item[1]}</p>
        </li>`;
      });

  }
  return /*html*/`<ul data-dialogue>${list}</ul>`;
}

export function header(content) {
  return /*html*/`<h2>${content}</h2>`;
}

export function paragraph(content) {
  return /*html*/`<p>${content}</p>`;
}