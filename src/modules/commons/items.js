import './items.scss';

const { $templater } = $utils;
const { $images } = $data;

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
    const template = $templater(({ ref, list, on }) =>/*html*/`
      <div ${ref('items-container')} class="items-container">
        <ul class="centered">
          ${list(this.data.items, ({ thumbnail, title, url }, name, iter) =>/*html*/`
            <li ${on(`item.${name}`, 'click')} class="item">
              <div class="outline">
                <header>
                  <div class="image-container">
                    <img src="${$images.get(thumbnail)}"/>
                  </div>
                  <h1>${title}</h1>
                </header>
                <footer>
                  <address>
                    <a class="url" href="${url}" target="_blank">${(new URL(url)).hostname}</a>
                  </address>
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