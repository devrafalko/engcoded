const { $templater } = $utils;
const { $iconMinimize } = $icons;

class VoiceTest {
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
    const { references, classes } = $templater(({ ref, child, classes }) =>/*html*/`
      <div ${ref('container')} ${classes('container')} class="pronunciation hidden">
        <nav ${ref('panel')} class="navigation-panel">
          <div class="controls game"></div>
          <div class="controls navigation">
            <ul>
              <li ${ref('button.close')} class="close">${child($iconMinimize())}</li>
            </ul>
          </div>
        </nav>
      </div>
    `);
    this.dom = references;
    this.classes = classes;
  }

  addListeners() {
    this.dom.get('button').get('close').addEventListener('click', () => this.close());
  }

  open() {
    if (this.on.open) this.on.open();
  }

  close() {
    if (this.on.close) this.on.close();
  }

}

export default VoiceTest;