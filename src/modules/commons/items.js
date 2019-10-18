import type from 'of-type';
import './items.scss';

const { $templater } = $utils;
const { $thumbs } = $data;

class Items {
  constructor({ id, items, open }) {
    this.data = { id, items };
    this.events = { open };
    this.state = { columns: null };
    this.dom = {
      table: null,
      headers: {}
    };

    this._renderView();
    this._renderItems();
    this._addListeners();
    this.active = true;
  }

  get active() {
    return this.state.active;
  }

  set active(val) {
    this.state.active = val;
    if (val === true) this.update();
  }

  get view() {
    return this.dom.get('items-container');
  }

  get grid() {
    const width = document.body.clientWidth;
    switch (true) {
      case width <= 768:
        return 1;
      case width > 768 && width <= 992:
        return 2;
      case width > 992:
        return 3;
    }
  }

  update() {
    if (!this.active || this.grid === this.state.columns) return;
    this.state.columns = this.grid;
    const container = this.dom.get('columns-container');
    const items = this.items.references.get('item');
    const { columns, template } = this._renderColumns();
    const heights = new Array(this.grid).fill(0);

    container.innerHTML = '';
    container.appendChild(template);
    appendItem([...items.keys()], 0);

    function appendItem(collection, index) {
      let key = collection[index];
      let item = items.get(key);
      let nextIndex = min(heights);
      let columnElement = columns.get(String(nextIndex));
      columnElement.appendChild(item);
      setTimeout(() => {
        heights[nextIndex] += columnElement.offsetHeight;
        if (collection.length - 1 > index) appendItem(collection, index + 1);
      }, 50);
    }

    function min(heights) {
      let index = null;
      let min = Infinity;
      heights.forEach((value, iter) => {
        if (value < min) {
          index = iter;
          min = value;
        }
      })
      return index;
    }

  }

  _addListeners() {
    const { $on } = this.items;
    $on('item', ({ event, last }) => {
      if (event.target.tagName === 'A') return;
      this.events.open(last);
    });
    window.addEventListener('resize', () => this.update());
  }

  _renderItems() {
    const delegate = this.dom.get('items-container');
    const template = $templater(({ ref, list, on, when }) =>/*html*/`
      <ul>
        ${list(this.data.items, ({ thumbnail, title, author, link }, name) =>/*html*/`
          <li ${ref(`item.${name}`)} ${on(`item.${name}`, 'click', { delegate })} class="item">
            <div class="outline">
              <header>
                <div class="image-container">
                  <img src="${$thumbs.get(thumbnail)}"/>
                </div>
                ${when(type(title, String), () =>/*html*/`
                  <h1>${title}</h1>
                `)}
              </header>
              <footer>
                ${when(type(author, Object), () =>/*html*/`
                  <address>by <a class="url" ${author.url ? /*html*/`href="${author.url}"` : ''} target="_blank">${author.name}</a></address>
                `)}
                ${when(type(link, Object), () =>/*html*/`
                  <address>from <a class="url" ${link.url ? /*html*/`href="${link.url}"` : ''} target="_blank">${link.name}</a></address>
                `)}
              </footer>
            </div>
          </li> 
        `)}
      </ul>
    `);
    this.items = template;
  }

  _renderColumns() {
    const number = this.grid;
    const { references, template } = $templater(({ ref, loop }) =>/*html*/`
      ${loop(number, (iter) =>/*html*/`
        <li style="width:${100 / number}%">
          <ul ${ref(`column.${iter}`)}></ul>
        </li>
      `)}
    `);
    return { columns: references.get('column'), template };
  }

  _renderView() {
    const template = $templater(({ ref }) =>/*html*/`
      <div ${ref('items-container')} class="items-container">
        <ul ${ref('columns-container')} class="centered"></ul>
      </div>
    `);
    this.dom = template.references;
    this.html = template;
  }
}

export default Items;