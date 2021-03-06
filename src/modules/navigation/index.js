import './navigation.scss';
const { $templater } = $utils;

class Navigation {
  constructor(buttons) {
    this._data = { buttons };
    this._state = {
      active: null,
      navigationOpened: false
    };
    this._buildView(buttons);
    this._addListeners();
  }

  _buildView(buttons) {
    const template = $templater(({ ref, list, classes, on }) =>/*html*/`
      <nav ${ref('section.navigation')} ${classes('section.navigation')} id="navigation-container">
        <ul class="navigation-panel">
          <li ${on('button.toggle','click')} class="toggle-menu">
            <div><i></i></div>
            <div><i></i></div>
            <div><i></i></div>
          </li>
          ${list(buttons, ({ name, content }) =>/*html*/`
            <li ${on(`button.${name}`,'click')} ${classes(`button.${name}`)} class="navigation-button">${content}</li>
          `)}
        </ul>
      </nav>
      <main ${ref('section.pages')} id="pages-container">
        <ul>
          ${list(buttons, ({ name }) =>/*html*/`
            <li ${ref(`page.${name}`)} ${classes(`page.${name}`)} class="navigation-page"></li>
          `)}
        </ul>
      </main>
    `);
    this.dom = template.references;
    this.classes = template.classes;
    this.html = template;
  }

  init() {
    for (let { name, active } of this._data.buttons) {
      if (active === true) return this.active = name;
    }
  }

  _addListeners() {
    const {$on} = this.html;

    $on('button',({last})=>{
      if(last==='toggle') return this.toggle('toggle');
      this.active = last;
    });

    window.addEventListener('resize', () => this.toggle('close'));
  }

  toggle(action) {
    const navigation = this.classes.get('section').get('navigation');
    switch (action) {
      case 'open':
        if (this._state.navigationOpened === true) return;
        navigation.add('opened');
        this._state.navigationOpened = true;
        break;
      case 'close':
        if (this._state.navigationOpened === false) return;
        navigation.remove('opened');
        this._state.navigationOpened = false;
        break;
      case 'toggle':
        const next = this._state.navigationOpened ? 'close' : 'open';
        this.toggle(next);
        break;
    }
  }

  get buttons() {
    return this.dom.get('section').get('navigation');
  }

  get pages() {
    return this.dom.get('section').get('pages');
  }

  get open() {
    return this._data.open || null;
  }

  set open(fn) {
    this._data.open = fn;
  }

  get close() {
    return this._data.close || null;
  }

  set close(fn) {
    this._data.close = fn;
  }

  set active(name) {
    const previous = this._state.active;
    if (previous === name) return;
    if (this.close && previous !== null) this.close(previous, this.dom, this.classes);
    this._state.active = name;
    if (this.open) this.open(name, this.dom, this.classes);
    this.toggle('close');
  }
}

export default Navigation;