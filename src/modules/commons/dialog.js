import type from 'of-type';
import './dialog.scss';
import Crossword from './../games/crossword/index';
import Presentation from './../games/presentation/index';
import Test from './../games/test/index';

const { Card, Selector } = $commons;
const { $templater } = $utils;
const { $iconGameCrossword, $iconGameTest, $iconWordList, $iconAlignLeft,
  $iconAlignCenter, $iconSpy, $iconPalette, $iconTextSize, $iconClose,
  $iconPrevious, $iconNext, $iconResize, $iconLabels, $iconKeyword, $iconBrush } = $icons;

class Dialog {
  constructor() {
    this.data = { controllers: {} };
    this.state = { fontSize: null, opened: false, currentContentElements: {}, navigationOpened: false, gameActive: null };
    this.events = { onClose: null, beforeClose: null, onStopSpy: null };
    this._createFontSelector();
    this._renderView();
    this._addListeners();
    this._setInitialState();
  }

  get fonts() {
    return [
      { name: 'PT Serif', family: 'PT Serif', medium: 19 },
      { name: 'EB Garamond', family: 'EB Garamond', medium: 21 },
      { name: 'Cardo', family: 'Cardo', medium: 20 },
      { name: 'Source Sans Pro', family: 'Source Sans Pro', medium: 20 },
      { name: 'Open Sans', family: 'Open Sans', medium: 19 },
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

  get sentences() {
    return this.classes.get('section').get('sentences');
  }

  set sentences(value) {
    const classes = this.classes.get('section').get('sentences');
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
    classes.forEach((instance) => instance[value ? 'add' : 'remove']('displayed'));
  }

  load({ name, container, content, contentData, cardArea, loaded, onGame, onClose, beforeClose, onStopSpy, mode }) {
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
    this.state.mode = mode;
    this.state.opened = true;
    this._navigationMode(mode);
    if (type(loaded, Function)) loaded();
    if (type(onClose, Function)) this.events.onClose = onClose;
    if (type(onGame, Function)) this.events.onGame = onGame;
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

  _createFontSelector() {
    const options = this.fonts.map(({ name, family, medium }, iter) => ({
      content: $templater(() =>/*html*/`
        <span class="label" style="font-family: ${family}">${name}</span>
      `),
      data: { name, family, medium },
      selected: iter === 0
    }));

    this.selector = new Selector({
      allowMultiple: false,
      allowNone: false,
      options
    });

    this.selector.on.select = (map, selected) => {
      const { family, name, medium } = map.get(selected).data;
      this._selectFont(name, family, medium);
      Card.fit();
    }
  }

  _navigationMode(mode) {
    switch (mode) {
      case 'articles':
        this.subtitles = false;
        this.text = true;
        this.sentences = false;
        this.pictures = false;
        break;
      case 'youtube':
        this.subtitles = true;
        this.text = true;
        this.sentences = false;
        this.pictures = false;
        break;
      case 'podcasts':
        this.subtitles = true;
        this.text = true;
        this.sentences = false;
        this.pictures = false;
        break;
      case 'pictures':
        this.subtitles = false;
        this.text = false;
        this.sentences = false;
        this.pictures = true;
        break;
      case 'sentences':
        this.subtitles = false;
        this.text = true;
        this.sentences = true;
        this.pictures = false;
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
      if (type(this.events.onGame, Function)) this.events.onGame();
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
      if (last === 'resize') return viewer.reset();
      if (last === 'spy') this._togglePictureSpy(viewer);
      if (last === 'labels') this._togglePictureLabels(viewer);
    });

    $on('button', ({ id, last, data, target }) => {
      if (id.startsWith('button.size')) this._fontSize(data, last);
      if (id.startsWith('button.align')) this._subtitlesAlign(last);
      if (last === 'highlight-keywords') this._highlightKeywords();
      if (last === 'show-words') this._showWords();
      if (last === 'color-text') this._colorText();
      if (last === 'color-local') this._colorLocal();
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
    this._colorLocal();
    this._showWords();
    this._fontSize('md-medium', 'text-medium');
    this._selectFont(this.fonts[0].name, this.fonts[0].family, this.fonts[0].medium);
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

  _colorLocal() {
    const classes = this.classes.get('content-container');
    const colored = classes.has('color-local');
    this.classes.get('button').get('color-local')[colored ? 'remove' : 'add']('active');
    classes[colored ? 'remove' : 'add']('color-local');
    Card.fit();
  }

  _highlightKeywords() {
    const classes = this.classes.get('content-container');
    const colored = classes.has('highlight-keywords');
    this.classes.get('button').get('highlight-keywords')[colored ? 'remove' : 'add']('active');
    classes[colored ? 'remove' : 'add']('highlight-keywords');
  }

  _showWords() {
    const classes = this.classes.get('content-container');
    const colored = classes.has('show-words');
    this.classes.get('button').get('show-words')[colored ? 'remove' : 'add']('active');
    classes[colored ? 'remove' : 'add']('show-words');
  }

  _selectFont(name, family, medium) {
    this.selector.header.innerHTML = name
    this.selector.header.style.fontFamily = family;
    this.contentContainer.style.fontFamily = family;
    this.contentContainer.style.fontSize = `${medium}px`;
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
    switch (this.state.mode) {
      case 'pictures':
        this.state.currentContentData.viewer.seek(id);
        break;
      default:
        Card.refresh({
          container: this.state.currentContentElements.cardArea,
          scroll: true,
          index: this.state.currentContentData.words.identifiers.get(id)[0],
          contentData: this.state.currentContentData
        });
    }
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
            <div class="controls game">
              <ul>
                <li ${on('button.game.presentation', 'click', { data: { name: 'presentation', instance: Presentation } })}>${child($iconWordList())}</li>
                <li ${on('button.game.word-test', 'click', { data: { name: 'test', instance: Test } })}>${child($iconGameTest())}</li>
                <li ${on('button.game.crossword', 'click', { data: { name: 'crossword', instance: Crossword } })}>${child($iconGameCrossword())}</li>
              </ul>
            </div>
            <div class="controls pictures switch" ${classes('controls.pictures.switch')}>
              <ul>
                <li ${on('button.viewer.previous', 'click')}>${child($iconPrevious())}</li>
                <li ${on('button.viewer.next', 'click')}>${child($iconNext())}</li>
              </ul>
            </div>
            <div class="controls pictures config" ${classes('controls.pictures.config')}>
              <ul>
                <li ${on('button.viewer.spy', 'click')} ${classes('button.viewer.spy', ['active'])}>${child($iconSpy())}</li>
                <li ${on('button.viewer.resize', 'click')}>${child($iconResize())}</li>
                <li ${on('button.viewer.labels', 'click')} ${classes('button.viewer.labels', ['active'])}>${child($iconLabels())}</li>
              </ul>
            </div>
            <div class="controls pictures info" ${classes('controls.pictures.info')}>
              <ul class="content">
                <li>Word:</li>
                <li ${ref('viewer.output.current')} class="output score"></li>
                <li>/</li>
                <li ${ref('viewer.output.total')} class="output total"></li>
              </ul>
            </div>
            <div class="controls text" ${classes('section.subtitles')}>
              <ul>
                <li ${on('button.align.left', 'click')} ${classes('button.align.left')}>${child($iconAlignLeft())}</li>
                <li ${on('button.align.center', 'click')} ${classes('button.align.center')}>${child($iconAlignCenter())}</li>
                <li ${on('button.spy-subtitles', 'click')} ${classes('button.spy-subtitles')}>${child($iconSpy())}</li>
              </ul>
            </div>
            <div class="controls font" ${classes('section.sentences')}>
              <ul>
                <li ${on('button.show-words', 'click')} ${classes('button.show-words')}>${child($iconSpy())}</li>
                <li ${on('button.highlight-keywords', 'click')} ${classes('button.highlight-keywords')}>${child($iconKeyword())}</li>
                <li ${on('button.color-local', 'click')} ${classes('button.color-local')}>${child($iconBrush())}</li>
              </ul>
            </div>
            <div class="controls font" ${classes('section.fonts')}>
              <ul>
                <li ${on('button.color-text', 'click')} ${classes('button.color-text')}>${child($iconPalette())}</li>
                <li class="font-select">
                  ${child(this.selector.view)}
                </li>
                <li ${on('button.size.text-small', 'click', { data: 'md-small' })} ${classes('button.text-small')} class="font-size-button text-small">${child($iconTextSize())}</li>
                <li ${on('button.size.text-medium', 'click', { data: 'md-medium' })} ${classes('button.text-medium')} class="font-size-button text-medium">${child($iconTextSize())}</li>
                <li ${on('button.size.text-big', 'click', { data: 'md-big' })} ${classes('button.text-big')} class="font-size-button text-big">${child($iconTextSize())}</li>
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