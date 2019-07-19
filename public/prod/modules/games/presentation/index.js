const { $templater } = $utils;
const { $iconMinimize } = $icons;

class Presentation {
  constructor() {
    this.buildView();
    this.addListeners();
  }

  get view() {
    return this.dom.get('container');
  }

  buildView() {
    const { references, classes } = $templater(({ ref, child, classes }) =>/*html*/`
      <div ${ref('container')} ${classes('container')} class="game-container hidden">
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
    this.classes.get('container').remove('hidden');
  }

  close() {
    this.classes.get('container').add('hidden');
  }

}

export default new Presentation();