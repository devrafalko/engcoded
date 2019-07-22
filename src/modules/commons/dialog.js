import type from 'of-type';
import './dialog.scss';
import Crossword from './../games/crossword/index';
import Presentation from './../games/presentation/index';
import Pronunciation from './../games/pronunciation/index';
import Test from './../games/test/index';

const { Card } = $commons;
const { $templater } = $utils;
const { $iconGameCrossword, $iconGameHearing, $iconGameTest, $iconWordList, $iconAlignLeft, $iconAlignCenter, $iconSpy, $iconPalette, $iconTextSize, $iconClose } = $icons;

class Dialog {
  constructor() {
    this.data = { controllers: {} };
    this.games = {
      presentation: new Presentation(),
      pronunciation: new Pronunciation(),
      test: new Test(),
      crossword: new Crossword(this)
    };
    this.state = { fontSize: null, opened: false, currentContentElements: {}, navigationOpened: false, gameActive: false };
    this.events = { onClose: null, beforeClose: null, onStopSpy: null };
    this._renderView();
    this._addListeners();
    this._addGamesListeners();
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

  load({ name, container, content, words, cardArea, loaded, onClose, beforeClose, onStopSpy, viewSubtitles = true }) {
    const dialog = this.dom.get('dialog-box');
    if (this.state.currentContentElements.content !== content) {
      dialog.setAttribute('data-dialog', name);
      this.contentContainer.innerHTML = '';
      this.contentContainer.appendChild(content);
      this._findWordElements(content, words);
      this.data.words = words;
      this.state.currentContentElements.cardArea = cardArea;
      this.state.currentContentElements.container = container;
      this.state.currentContentElements.content = content;
    }
    container.appendChild(dialog);
    this.state.name = name;
    this.state.opened = true;
    this.subtitles = viewSubtitles;
    if (type(loaded, Function)) loaded();
    if (type(onClose, Function)) this.events.onClose = onClose;
    if (type(beforeClose, Function)) this.events.beforeClose = beforeClose;
    if (type(onStopSpy, Function)) this.events.onStopSpy = onStopSpy;
  }

  close() {
    const dialog = this.dom.get('dialog-box');
    if (!this.opened) return;
    if (this.events.beforeClose) this.events.beforeClose(dialog);
    this.state.currentContentElements.container.removeChild(dialog);
    this.state.opened = false;
    this.state.name = null;
    Card.hide(false);
    if (this.events.onClose) this.events.onClose(dialog);
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
    const button = this.dom.get('button');
    const buttonClasses = this.classes.get('button');
    const game = button.get('game');
    game.get('presentation').addEventListener('click', () => {
      toggleNavigation.call(this, 'close');
      Card.hide(false);
      this.games.presentation.open();
    });
    game.get('word-test').addEventListener('click', () => {
      toggleNavigation.call(this, 'close');
      Card.hide(false);
      this.games.test.open();
    });
    game.get('voice-test').addEventListener('click', () => {
      toggleNavigation.call(this, 'close');
      Card.hide(false);
      this.games.pronunciation.open();
    });
    game.get('crossword').addEventListener('click', () => {
      toggleNavigation.call(this, 'close');
      Card.hide(false);
      this.games.crossword.open(this.data.words.wordsMap);
    });
    button.get('color-text').addEventListener('click', () => colorText.call(this));
    button.get('close').addEventListener('click', () => this.close());
    button.get('text-small').addEventListener('click', () => fontSize.call(this, 'md-small', buttonClasses.get('text-small')));
    button.get('text-medium').addEventListener('click', () => fontSize.call(this, 'md-medium', buttonClasses.get('text-medium')));
    button.get('text-big').addEventListener('click', () => fontSize.call(this, 'md-big', buttonClasses.get('text-big')));
    button.get('align-left').addEventListener('click', () => subtitlesAlign.call(this, 'left', buttonClasses.get('align-left')));
    button.get('align-center').addEventListener('click', () => subtitlesAlign.call(this, 'center', buttonClasses.get('align-center')));
    button.get('spy-subtitles').addEventListener('click', () => this.spySubtitles(null));
    button.get('font-select').addEventListener('change', (event) => fontFamily.call(this, event.target.selectedIndex));
    button.get('toggle').addEventListener('click', () => toggleNavigation.call(this, 'toggle'));
    window.addEventListener('resize', () => toggleNavigation.call(this, 'close'));
    this.contentContainer.addEventListener('click', (event) => {
      if (event.target.hasAttribute('data-word')) {
        Card.refresh({
          container: this.state.currentContentElements.cardArea,
          scroll: false,
          index: Number(event.target.getAttribute('data-word')),
          words: this.data.words
        });
      }
    });

    subtitlesAlign.call(this, 'left', buttonClasses.get('align-left'));
    colorText.call(this);
    fontSize.call(this, 'md-medium', buttonClasses.get('text-medium'));
    fontFamily.call(this, 0);
    this.spySubtitles(true);

    function subtitlesAlign(align, classes) {
      if (this.state.alignClasses === classes) return;
      classes.add('active');
      if (this.state.alignClasses) this.state.alignClasses.remove('active');
      this.contentContainer.setAttribute('data-align', align);
      this.state.alignClasses = classes;
    }

    function colorText() {
      const classes = this.classes.get('content-container');
      const colored = classes.has('color-text');
      this.classes.get('button').get('color-text')[colored ? 'remove' : 'add']('active');
      classes[colored ? 'remove' : 'add']('color-text');
      Card.fit();
    }

    function fontSize(size, classes) {
      if (this.state.fontSizeClasses === classes) return;
      classes.add('active');
      if (this.state.fontSizeClasses) this.state.fontSizeClasses.remove('active');
      this.contentContainer.setAttribute('data-size', size);
      this.state.fontSizeClasses = classes;
      Card.fit();
    }

    function fontFamily(index) {
      this.dom.get('button').get('font-select').style.fontFamily = this.fonts[index].family;
      this.contentContainer.style.fontFamily = this.fonts[index].family;
      Card.fit();
    }

    function toggleNavigation(action) {
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
          toggleNavigation.call(this, next);
          break;
      }
    }
  }

  _addGamesListeners() {
    this.games.crossword.on.open = () => this.state.gameActive = this.games.crossword;
    this.games.crossword.on.close = () => this.state.gameActive = null;
    this.games.pronunciation.on.open = () => this.state.gameActive = this.games.pronunciation;
    this.games.pronunciation.on.close = () => this.state.gameActive = null;
    this.games.test.on.open = () => this.state.gameActive = this.games.test;
    this.games.test.on.close = () => this.state.gameActive = null;
    this.games.presentation.on.open = () => this.state.gameActive = this.games.presentation;
    this.games.presentation.on.close = () => this.state.gameActive = null;
  }

  seekOccurrence(id) {
    Card.refresh({
      container: this.state.currentContentElements.cardArea,
      scroll: true,
      index: this.data.words.idMap.get(id)[0].index,
      words: this.data.words
    });
  }

  spySubtitles(action) {
    this.state.spySubtitles = typeof action === 'boolean' ? action : !this.state.spySubtitles;
    this.classes.get('button').get('spy-subtitles')[this.state.spySubtitles ? 'add' : 'remove']('active');
    this.contentContainer[this.state.spySubtitles ? 'setAttribute' : 'removeAttribute']('data-spy', 'true');
    if (this.state.spySubtitles === false && this.events.onStopSpy) this.events.onStopSpy();
  }

  _renderView() {
    const { references, classes } = $templater(({ child, ref, classes, list, when }) => {
      return /*html*/`
        <div ${ref('dialog-box')} class="dialog-box">
          <nav ${ref('navigation-panel')} ${classes('navigation-panel')} class="navigation-panel">
            <div class="controls game">
              <ul>
                <li ${ref('button.game.presentation')}>${child($iconWordList())}</li>
                <li ${ref('button.game.word-test')}>${child($iconGameTest())}</li>
                <li ${ref('button.game.voice-test')}>${child($iconGameHearing())}</li>
                <li ${ref('button.game.crossword')}>${child($iconGameCrossword())}</li>
              </ul>
            </div>
            <div class="controls text">
              <ul ${classes('section.subtitles')} class="section-subtitles">
                <li ${ref('button.align-left')} ${classes('button.align-left')}>${child($iconAlignLeft())}</li>
                <li ${ref('button.align-center')} ${classes('button.align-center')}>${child($iconAlignCenter())}</li>
                <li ${ref('button.spy-subtitles')} ${classes('button.spy-subtitles')}>${child($iconSpy())}</li>
              </ul>
              <ul class="section-font">
                <li ${ref('button.color-text')} ${classes('button.color-text')}>${child($iconPalette())}</li>
                <li class="font-select">
                  <select ${ref('button.font-select')}>
                    ${list(this.fonts, ({ name, family }, iter) =>/*html*/`
                      <option ${when(iter === 0, () => `selected`)} style="font-family: ${family}">${name}</option>
                    `)}
                  </select>
                </li>
                <li ${ref('button.text-small')} ${classes('button.text-small')} class="font-size-button text-small">${child($iconTextSize())}</li>
                <li ${ref('button.text-medium')} ${classes('button.text-medium')} class="font-size-button text-medium">${child($iconTextSize())}</li>
                <li ${ref('button.text-big')} ${classes('button.text-big')} class="font-size-button text-big">${child($iconTextSize())}</li>
              </ul>
            </div>
            <div class="controls navigation">
              <ul>
                <li class="toggle-menu" ${ref('button.toggle')}>
                  <div><i></i></div>
                  <div><i></i></div>
                  <div><i></i></div>
                </li>
                <li ${ref('button.close')} class="close">${child($iconClose())}</li>
              </ul>
            </div>
          </nav>
          <div ${ref('content-container')} ${classes('content-container')} class="content-container">
          </div>
          ${child(this.games.crossword.view)}
          ${child(this.games.presentation.view)}
          ${child(this.games.test.view)}
          ${child(this.games.pronunciation.view)}
        </div>
      `;
    });
    this.classes = classes;
    this.dom = references;
  }
}

export default new Dialog();