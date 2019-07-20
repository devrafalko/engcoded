import type from 'of-type';
import './slider.scss';

const { $templater } = $utils;
const { $images } = $data;

export default class Slider {
  constructor() {
    this._data = {};
    this._buildView();
    this._addListeners();
  }

  set image(next) {
    const previous = this._data.current;
    const image = this.dom.get('image');
    image.src = $images.get(this._data.list[next]);
    this._data.current = String(next);
    if (this._data.list.length <= 1) return;
    if (this.buttons.has(previous)) this.buttons.get(previous).remove('active');
    this.buttons.get(this._data.current).add('active');
  }

  get image() {
    return this._data.current;
  }

  get view() {
    return this.dom.get('container');
  }

  update(sources) {
    this._data.list = type(sources, Array) ? sources : [sources];
    const navigation = this.dom.get('navigation');
    navigation.innerHTML = '';
    if (this._data.list.length > 1) navigation.appendChild(this._buttonsView(this._data.list.length));
    this.image = 0;
  }

  next() {
    if (this._data.list.length <= 1) return;
    let next = Number(this._data.current) + 1;
    if (next === this._data.list.length) next = 0;
    this.image = next;
  }

  _buttonsView(number) {
    const { template, classes } = $templater(({ loop, classes }) => /*html*/`
      ${loop(number, (index) =>/*html*/`
        <li><span data-image="${index}" ${classes(`${index}`)}></span></li>
      `)}
    `);
    this.buttons = classes;
    return template;
  }

  _buildView() {
    const { references, classes } = $templater(({ ref, classes }) => /*html*/`
      <div ${ref('container')} class="image-slider">
        <ul ${ref('navigation')} ${classes('navigation')} class="image-navigation"></ul>
        <img ${ref('image')} src="" class="image-element"></img>
      </div>
    `);
    this.dom = references;
    this.classes = classes;
  }

  _addListeners() {
    this.dom.get('navigation').addEventListener('click', (event) => {
      if (event.target.hasAttribute('data-image')) {
        this.image = event.target.getAttribute('data-image');
      }
    });
  }

}