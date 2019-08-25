import type from 'of-type';
import './selector.scss';

const { $iconSelect } = $icons;
const { $templater } = $utils;

class Selector {
  constructor({ header = '', options = [], allowMultiple = false, allowNone = false }) {
    this._config = { allowMultiple, allowNone };
    this._data = { options, header };
    this._state = { selectOpened: false };

    this._on = {
      _open: null,
      _close: null,
      _select: null,
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
      get select() {
        return this._select;
      },
      set select(fn) {
        this._select = fn;
      },
    };

    this._buildMaps();
    this._buildView();
    this._addListeners();
  }

  get view() {
    return this.html.template;
  }

  get on() {
    return this._on;
  }

  get header() {
    return this.dom.get('header-content');
  }

  set header(text) {
    return this.dom.get('header-content').innerHTML = text;
  }

  get selected() {
    if (this._config.allowMultiple) {
      let selected = [];
      this._data.selected.forEach((isSelected, index) => {
        if (isSelected) selected.push(index);
      })
      return selected;
    } else {
      let firstSelected = this._data.selected.indexOf(true);
      return firstSelected >= 0 ? firstSelected : null;
    }
  }

  get options() {
    return this._data.map;
  }

  get labels() {
    return this.dom.get('label');
  }

  open() {
    this._toggleSelect('open');
  }

  close() {
    this._toggleSelect('close');
  }

  toggle() {
    this._toggleSelect('toggle');
  }

  _buildMaps() {
    this._data.map = new Map();
    this._data.selected = [];
    this._data.options.forEach(({ id = null, selected = false, data = null, text = '' }, index) => {
      let _id = type(id, String) ? id : String(index);
      this._data.map.set(index, { id: _id, index, selected, data, text });
      this._data.selected.push(selected);
    });
  }

  _addListeners() {
    const { $on } = this.html;
    window.addEventListener('resize', () => this._fitSelectList());
    document.body.addEventListener('click', (event) => {
      const select = this.dom.get('header');
      const options = this.dom.get('options');
      if ((!select.contains(event.target) && !this._state.selectOpened) || options.contains(event.target)) return;
      this._toggleSelect(!select.contains(event.target) || this._state.selectOpened ? 'close' : 'open');
    });
    $on('option', ({ data }) => this._switchWordType(data));
  }

  _buildView() {
    const templater = $templater(({ list, child, on, classes, ref }) =>/*html*/`
      <div class="selector">
        <ul ${ref('header')} class="header">
          <li ${ref('header-content')} class="header-content">${this._data.header}</li>
          <li class="header-icon">${child($iconSelect())}</li>
        </ul>
        <div ${ref('options')} ${classes('options')} class="options">
          <ul class="list">
            ${list(this._data.map, ({ text, selected, index }) =>/*html*/`
              <li ${on(`option.${index}`, 'click', { data: index })}>
                <span ${ref(`label.${index}`)} class="label">${text}</span>
                <button class="switch-button" ${classes(`switch-button.${index}`, selected ? ['on'] : [])}>
                  <span></span>
                </button>
              </li>
            `)}
          </ul>
        </div>
      </div>
    `);
    this.html = templater;
    this.dom = templater.references;
    this.classes = templater.classes;
  }

  _fitSelectList() {
    if (this._state.selectOpened === false) return;
    if (this._state.fitDelayPending === true) return;
    const header = this.dom.get('header');
    const options = this.dom.get('options');

    this._state.fitDelayPending = true;
    setTimeout(() => {
      this._adjuster(document.body, header, options, 6);
      this._state.fitDelayPending = false;
    }, 50);
  }

  _toggleSelect(action) {
    const header = this.dom.get('header');
    const options = this.dom.get('options');
    const classes = this.classes.get('options');

    switch (action) {
      case 'open':
        this._resetSelectListPosition();
        this._adjuster(document.body, header, options, 6);
        classes.wait(10).add("visible");
        this._state.selectOpened = true;
        if (this.on.open) this.on.open(this._data.map);
        break;
      case 'close':
        classes.clear().remove('visible').wait(150).remove('displayed');
        this._state.selectOpened = false;
        if (this.on.close) this.on.close(this._data.map);
        break;
      case 'toggle':
        return this._toggleSelect(this._state.selectOpened ? 'close' : 'open');
    }
  }

  _resetSelectListPosition() {
    const styles = this.dom.get('options').style;
    const classes = this.classes.get('options');
    classes.clear().add('displayed').remove('visible');
    styles.top = '0px';
    styles.bottom = null;
    styles.left = '0px';
    styles.right = null;
  }

  _adjuster(container, header, options, topOffset = 0) {
    const style = options.style;
    const { left: headerLeft, top: headerTop, width: headerWidth, height: headerHeight } = header.getBoundingClientRect();
    const { left: containerLeft, top: containerTop, width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    const { width: listWidth, height: listHeight } = options.getBoundingClientRect();

    switch (true) {
      case (containerTop + containerHeight) - (headerTop + headerHeight) >= listHeight:
        style.top = (headerTop + headerHeight + topOffset) + 'px';
        break;
      case (headerTop - containerTop) >= listHeight:
        style.top = (headerTop - listHeight + topOffset) + 'px';
        break;
      default:
        style.top = (headerTop + headerHeight + topOffset) + 'px';
        break;
    }

    switch (true) {
      case (containerLeft + containerWidth) - (headerLeft) >= listWidth:
        style.left = (headerLeft) + 'px';
        style.right = null;
        break;
      case (headerLeft + headerWidth - containerLeft) >= listWidth:
        style.left = (headerLeft + headerWidth - listWidth) + 'px';
        style.right = null;
        break;
      default:
        style.left = '-0';
        style.right = '-0';
        break;
    }
  }

  _switchWordType(index) {
    const howManySelected = this._data.selected.filter((selected) => selected).length;
    const firstSelected = this._data.selected.indexOf(true);
    const isCurrentOn = this._data.selected[index];
    const allowMultiple = this._config.allowMultiple;
    const allowNone = this._config.allowNone;

    if (howManySelected === 1 && isCurrentOn && !allowNone) return;
    if (howManySelected === 1 && !isCurrentOn && !allowMultiple) {
      this._data.selected[firstSelected] = false;
      this._data.map.get(firstSelected).selected = false;
      this.classes.get('switch-button').get(String(firstSelected)).remove('on');
    }

    this._data.selected[index] = !this._data.selected[index];
    this._data.map.get(index).selected = this._data.selected[index];
    this.classes.get('switch-button').get(String(index)).toggle('on');
    if (this.on.select) this.on.select(this._data.map, this.selected);
  }
}

export default Selector;