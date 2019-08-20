import type from 'of-type';
import './items.scss';

const { $templater } = $utils;
const { $thumbs } = $data;

class Items {
  constructor({ id, items, open }) {
    this.data = { id, items };
    this.events = { open };
    this.dom = {
      table: null,
      headers: {}
    };

    this._renderView();
    this._addListeners();
  }

  get view() {
    return this.dom.get('items-container');
  }

  _addListeners() {
    const { $on } = this.html;
    $on('item', ({ event, last }) => {
      if (event.target.tagName === 'A') return;
      this.events.open(last);
    });
  }

  _renderView() {
    const template = $templater(({ ref, list, on, when }) =>/*html*/`
      <div ${ref('items-container')} class="items-container">
        <ul class="centered">
          ${list(this.data.items, ({ thumbnail, title, author, link }, name, iter) =>/*html*/`
            <li ${on(`item.${name}`, 'click')} class="item">
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
                    <address>by <a class="url" href="${author.url}" target="_blank">${author.name}</a></address>
                  `)}
                  ${when(type(link, Object), () =>/*html*/`
                    <address>from <a class="url" href="${link.url}" target="_blank">${link.name}</a></address>
                  `)}
                </footer>
              </div>
            </li>
          `)}
        </ul>
      </div>
    `);
    this.dom = template.references;
    this.html = template;
  }
}

export default Items;