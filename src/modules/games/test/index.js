import './test.scss';

const { $templater } = $utils;
const { $iconMinimize } = $icons;

class WordTest {
  constructor() {
    this._on = {
      _open: null,
      _close: null,
      get open() {
        return this._open;
      },
      set open(fn) {
        this._open = fn;
      },
      get close() {
        return this._close;
      },
      set close(fn) {
        this._close = fn;
      },
    };

    this.buildView();
    this.addListeners();
  }

  get view() {
    return this.dom.get('container');
  }

  get on() {
    return this._on;
  }

  buildView() {
    const template = $templater(({ ref, child, classes, on }) =>/*html*/`
      <div ${ref('container')} ${classes('container')} class="test hidden">
        <nav ${ref('panel')} class="navigation-panel">
          <div class="controls game"></div>
          <div class="controls navigation">
            <ul>
              <li ${on('button.close', 'click')} class="close">${child($iconMinimize())}</li>
            </ul>
          </div>
        </nav>
      </div>
    `);
    this.dom = template.references;
    this.classes = template.classes;
    this.html = template;
  }

  addListeners() {
    const { $on } = this.html;
    $on('button', ({ last }) => {
      if (last === 'close') this.close();
    });
  }

  open() {
    if (this.on.open) this.on.open();
  }

  close() {
    if (this.on.close) this.on.close();
  }

}

export default WordTest;