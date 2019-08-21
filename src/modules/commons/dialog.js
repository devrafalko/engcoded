import type from 'of-type';
import './dialog.scss';
import Crossword from './../games/crossword/index';
import Presentation from './../games/presentation/index';
import Test from './../games/test/index';

const { Card } = $commons;
const { $templater } = $utils;
const { $iconGameCrossword, $iconGameTest, $iconWordList, $iconAlignLeft,
  $iconAlignCenter, $iconSpy, $iconPalette, $iconTextSize, $iconClose,
  $iconPrevious, $iconNext, $iconResize, $iconLabels } = $icons;

class Dialog {
  constructor() {
    this.data = { controllers: {} };
    this.state = { fontSize: null, opened: false, currentContentElements: {}, navigationOpened: false, gameActive: null };
    this.events = { onClose: null, beforeClose: null, onStopSpy: null };
    this._renderView();
    this._addListeners();
    this._setInitialState();
  }

  get fonts() {
    return [
      { name: 'PT Serif', family: 'PT Serif' },
      { name: 'EB Garamond', family: 'EB Garamond' },
      { name: 'Cardo', family: 'Cardo' },
      { name: 'Source Sans Pro', family: 'Source Sans Pro' },
      { name: 'Open Sans', family: 'Open Sans' },
    ];
  }

  get opened() {
    return this.state.opened;
  }

  get name() {
    return this.state.name;
  }

  get contentContainer() {
    return this.dom.get('content-container');
  }

  get subtitles() {
    return this.classes.get('section').get('subtitles');
  }

  set subtitles(value) {
    const classes = this.classes.get('section').get('subtitles');
    classes[value ? 'add' : 'remove']('displayed');
  }

  get text() {
    return this.classes.get('section').get('fonts');
  }

  set text(value) {
    const classes = this.classes.get('section').get('fonts');
    classes[value ? 'add' : 'remove']('displayed');
  }

  get pictures() {
    return this.classes.get('controls').get('pictures');
  }

  set pictures(value) {
    const classes = this.classes.get('controls').get('pictures');
    classes[value ? 'add' : 'remove']('displayed');
  }

  load({ name, container, content, contentData, cardArea, loaded, onClose, beforeClose, onStopSpy, mode }) {
    const dialog = this.dom.get('dialog-box');
    if (this.state.currentContentData !== contentData) {
      dialog.setAttribute('data-dialog', name);
      this.contentContainer.innerHTML = '';
      this.contentContainer.appendChild(content);
      this._findWordElements(content, contentData);
      this.state.currentContentData = contentData;
      this.state.currentContentElements.cardArea = cardArea;
      this.state.currentContentElements.container = container;
      this.state.currentContentElements.content = content;
    }
    container.appendChild(dialog);
    this.state.name = name;
    this.state.opened = true;
    this._navigationMode(mode);
    if (type(loaded, Function)) loaded();
    if (type(onClose, Function)) this.events.onClose = onClose;
    if (type(beforeClose, Function)) this.events.beforeClose = beforeClose;
    if (type(onStopSpy, Function)) this.events.onStopSpy = onStopSpy;
  }

  close() {
    const dialog = this.dom.get('dialog-box');
    if (!this.opened) return;
    if (this.events.beforeClose) this.events.beforeClose(dialog);
    if (this.state.gameActive) this.state.gameActive.close();
    Card.hide(false);
    this.state.currentContentElements.container.removeChild(dialog);
    this.state.opened = false;
    this.state.name = null;
    if (this.events.onClose) this.events.onClose(dialog);
  }

  _navigationMode(mode) {
    switch (mode) {
      case 'articles':
        this.subtitles = false;
        this.text = true;
        this.pictures = false;
        break;
      case 'youtube':
        this.subtitles = true;
        this.text = true;
        this.pictures = false;
        break;
      case 'podcasts':
        this.subtitles = true;
        this.text = true;
        this.pictures = false;
        break;
      case 'pictures':
        this.subtitles = false;
        this.text = false;
        this.pictures = true;
        break;
    }
  }

  _findWordElements(content, words) {
    if (words.occurrenceMap) return;
    const occurrenceMap = new Map();
    content.querySelectorAll('[data-word]').forEach((element) => {
      let index = Number(element.getAttribute('data-word'));
      if (!occurrenceMap.has(index)) occurrenceMap.set(index, []);
      occurrenceMap.get(index).push(element);
    });
    words.occurrenceMap = occurrenceMap;
  }

  _addListeners() {
    const { $on } = this.html;
    window.addEventListener('resize', () => this._toggleNavigation('close'));

    $on('button.game', ({ data }) => {
      const container = this.dom.get('game-container');
      const { name, instance } = data;
      const { games, words } = this.state.currentContentData;
      const classes = this.classes.get('game-container');
      this._toggleNavigation('close');
      Card.hide(false);
      if (!games[name]) {
        games[name] = new instance(this, words, games);
        games[name].on.close = () => {
          this.state.gameActive = null;
          classes.add('hidden');
        };
      }
      games[name].open();
      this.state.gameActive = games[name];
      container.innerHTML = '';
      container.appendChild(games[name].view);
      classes.remove('hidden');
    });

    $on('button.viewer', ({ last }) => {
      const { viewer } = this.state.currentContentData;
      if (last === 'previous') return viewer.previous();
      if (last === 'next') return viewer.next();
      if (last === 'resize') return viewer.adjust();
      if (last === 'spy') this._togglePictureSpy(viewer);
      if (last === 'labels') this._togglePictureLabels(viewer);
    });

    $on('button', ({ id, last, data, target }) => {
      if (id.startsWith('button.size')) this._fontSize(data, last);
      if (id.startsWith('button.align')) this._subtitlesAlign(last);
      if (last === 'font') this._fontFamily(target.selectedIndex);
      if (last === 'color-text') this._colorText();
      if (last === 'close') this.close();
      if (last === 'spy-subtitles') this.spySubtitles(null);
      if (last === 'toggle') this._toggleNavigation(last);
    });

    $on('content-container', ({ event }) => {
      if (!event.target.hasAttribute('data-word')) return;
      Card.refresh({
        container: this.state.currentContentElements.cardArea,
        scroll: false,
        index: Number(event.target.getAttribute('data-word')),
        contentData: this.state.currentContentData
      });
    });
  }

  _togglePictureSpy(viewer) {
    const classes = this.classes.get('button').get('viewer').get('spy');
    const isSpied = classes.has('active');
    classes.toggle('active');
    viewer.spy(!isSpied);
  }

  _togglePictureLabels(viewer) {
    const classes = this.classes.get('button').get('viewer').get('labels');
    const areVisible = classes.has('active');
    classes.toggle('active');
    viewer.labels(!areVisible);
  }

  _setInitialState() {
    this._subtitlesAlign('left');
    this._colorText();
    this._fontSize('md-medium', 'text-medium');
    this._fontFamily(0);
    this.spySubtitles(true);
  }

  _toggleNavigation(action) {
    const navigation = this.classes.get('navigation-panel');
    switch (action) {
      case 'open':
        if (this.state.navigationOpened === true) return;
        navigation.add('opened');
        this.state.navigationOpened = true;
        break;
      case 'close':
        if (this.state.navigationOpened === false) return;
        navigation.remove('opened');
        this.state.navigationOpened = false;
        break;
      case 'toggle':
        const next = this.state.navigationOpened ? 'close' : 'open';
        this._toggleNavigation(next);
        break;
    }
  }

  _fontFamily(index) {
    this.dom.get('button').get('font-select').style.fontFamily = this.fonts[index].family;
    this.contentContainer.style.fontFamily = this.fonts[index].family;
    Card.fit();
  }

  _subtitlesAlign(align) {
    const classes = this.classes.get('button').get('align').get(align);
    if (this.state.alignClasses === classes) return;
    classes.add('active');
    if (this.state.alignClasses) this.state.alignClasses.remove('active');
    this.contentContainer.setAttribute('data-align', align);
    this.state.alignClasses = classes;
  }

  _colorText() {
    const classes = this.classes.get('content-container');
    const colored = classes.has('color-text');
    this.classes.get('button').get('color-text')[colored ? 'remove' : 'add']('active');
    classes[colored ? 'remove' : 'add']('color-text');
    Card.fit();
  }

  _fontSize(size, name) {
    const classes = this.classes.get('button').get(name);
    if (this.state.fontSizeClasses === classes) return;
    classes.add('active');
    if (this.state.fontSizeClasses) this.state.fontSizeClasses.remove('active');
    this.contentContainer.setAttribute('data-size', size);
    this.state.fontSizeClasses = classes;
    Card.fit();
  }

  seekOccurrence(id) {
    Card.refresh({
      container: this.state.currentContentElements.cardArea,
      scroll: true,
      index: this.state.currentContentData.words.identifiers.get(id)[0],
      contentData: this.state.currentContentData
    });
  }

  spySubtitles(action) {
    this.state.spySubtitles = typeof action === 'boolean' ? action : !this.state.spySubtitles;
    this.classes.get('button').get('spy-subtitles')[this.state.spySubtitles ? 'add' : 'remove']('active');
    this.contentContainer[this.state.spySubtitles ? 'setAttribute' : 'removeAttribute']('data-spy', 'true');
    if (this.state.spySubtitles === false && this.events.onStopSpy) this.events.onStopSpy();
  }

  _renderView() {
    const template = $templater(({ child, ref, classes, list, when, on }) => {
      return /*html*/`
        <div ${ref('dialog-box')} class="dialog-box">
          <nav ${ref('navigation-panel')} ${classes('navigation-panel')} class="navigation-panel">
            <div class="controls game">
              <ul>
                <li ${on('button.game.presentation', 'click', { data: { name: 'presentation', instance: Presentation } })}>${child($iconWordList())}</li>
                <li ${on('button.game.word-test', 'click', { data: { name: 'test', instance: Test } })}>${child($iconGameTest())}</li>
                <li ${on('button.game.crossword', 'click', { data: { name: 'crossword', instance: Crossword } })}>${child($iconGameCrossword())}</li>
              </ul>
            </div>
            <div class="controls pictures section-pictures" ${classes('controls.pictures')}>
              <ul>
                <li ${on('button.viewer.previous', 'click')}>${child($iconPrevious())}</li>
                <li ${on('button.viewer.next', 'click')}>${child($iconNext())}</li>
                <li ${on('button.viewer.spy', 'click')} ${classes('button.viewer.spy', ['active'])}>${child($iconSpy())}</li>
                <li ${on('button.viewer.resize', 'click')}>${child($iconResize())}</li>
                <li ${on('button.viewer.labels', 'click')} ${classes('button.viewer.labels', ['active'])}>${child($iconLabels())}</li>
              </ul>
              <ul class="info">
                <li>Word:</li>
                <li ${ref('viewer.output.current')} class="output score">1</li>
                <li>/</li>
                <li ${ref('viewer.output.total')} class="output total">22</li>
              </ul>
            </div>
            <div class="controls text">
              <ul ${classes('section.subtitles')} class="section-subtitles">
                <li ${on('button.align.left', 'click')} ${classes('button.align.left')}>${child($iconAlignLeft())}</li>
                <li ${on('button.align.center', 'click')} ${classes('button.align.center')}>${child($iconAlignCenter())}</li>
                <li ${on('button.spy-subtitles', 'click')} ${classes('button.spy-subtitles')}>${child($iconSpy())}</li>
              </ul>
              <ul ${classes('section.fonts')} class="section-font">
                <li ${on('button.color-text', 'click')} ${classes('button.color-text')}>${child($iconPalette())}</li>
                <li class="font-select">
                  <select ${on('button.font', 'change')} ${ref('button.font-select')}>
                    ${list(this.fonts, ({ name, family }, iter) =>/*html*/`
                      <option ${when(iter === 0, () => `selected`)} style="font-family: ${family}">${name}</option>
                    `)}
                  </select>
                </li>
                <li ${on('button.size.text-small', 'click', { data: 'md-small' })} ${classes('button.text-small')} class="font-size-button text-small">${child($iconTextSize())}</li>
                <li ${on('button.size.text-medium', 'click', { data: 'md-medium' })} ${classes('button.text-medium')} class="font-size-button text-medium">${child($iconTextSize())}</li>
                <li ${on('button.size.text-big', 'click', { data: 'md-big' })} ${classes('button.text-big')} class="font-size-button text-big">${child($iconTextSize())}</li>
              </ul>
            </div>
            <div class="controls navigation">
              <ul>
                <li class="toggle-menu" ${on('button.toggle', 'click')}>
                  <div><i></i></div>
                  <div><i></i></div>
                  <div><i></i></div>
                </li>
                <li ${on('button.close', 'click')} class="close">${child($iconClose())}</li>
              </ul>
            </div>
          </nav>
          <div ${on('content-container', 'click')} ${ref('content-container')} ${classes('content-container')} class="content-container"></div>
          <div ${ref('game-container')} ${classes('game-container', ['hidden'])} class="game-container"></div>
        </div>
      `;
    });
    this.classes = template.classes;
    this.dom = template.references;
    this.html = template;
  }
}

export default new Dialog();