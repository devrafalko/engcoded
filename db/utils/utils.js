export function w(content, index){
  return /*html*/`<span data-word="${index}">${content}</span>`;
}

export function k(word){
  return /*html*/`<span data-keyword>${word}</span>`;
}

export function p(word){
  return /*html*/`<span data-pronoun>${word}</span>`;
}

export function e(word){
  return /*html*/`<span data-explanation>(${word})</span>`;
}

export function list(){
  return ``;
}

export function header(content){
  return /*html*/`<h2>${content}</h2>`;
}

export function paragraph(content){
  return /*html*/`<p>${content}</p>`;
}