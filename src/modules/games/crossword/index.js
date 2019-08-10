import type from 'of-type';
import './../buttons.scss';
import './../game.scss';
import './navigation.scss';
import './config.scss';
import './crossword.scss';
import './buttons.scss';

const { Slider, Scroller } = $commons;
const { $randomItem, $templater, $loopParents, $loopBetween } = $utils;
const { $iconCheckIn, $iconCheckOut, $iconConfig, $iconGameCrossword, $iconPrevious, $iconNext, $iconStar,
  $iconMinimize, $iconWarning, $iconGameFinish, $iconQuestionMark, $iconGameTranslate, $iconOccurrence,
  $iconGameDefinition, $iconGamePronunciation, $iconGameImage, $iconClose, $iconVolume, $iconKeyboard } = $icons;

class Game {
  constructor(crossword, { totalNumber }) {
    this.crossword = crossword;
    this.scroller = new Scroller({
      container: this.crossword.ref.grid.dom.get('container'),
      scrollTime: 800,
      fps: 32,
      offset: .1,
      horizontally: true,
      vertically: true
    });
    this.data = { totalNumber };
    this.state = {
      currentIndex: null,
      resolvedNumber: 0,
    };
    this._addListeners();
    this.restart();
    this._resetResolved();
  }

  get index() {
    return this.state.currentIndex || 0;
  }

  set index(i) {
    this.state.currentIndex = i;
  }

  get word() {
    return this.crossword.ref.virtual.word.get(this.index || 0);
  }

  _addListeners() {
    const { $on } = this.crossword.ref.grid.html;

    $on('table.cell', ({ target }) => {
      if (this.crossword.ref.virtual.cell.has(target)) {
        this.chooseWord(this.crossword.ref.virtual.cell.get(target));
      }
    });

    this.crossword.ref.keyboard.on.keydown = (data) => {
      if (data.keyCode === 8) this.word.backspace();
      else if (data.keyCode === 46) this.word.delete();
      else this.word.type(data, () => this.crossword.ref.hint.switch('toggle'));
    };

    this.crossword.ref.keyboard.on.open = () => this.crossword.ref.hint.switch('close');
    this.crossword.ref.hint.on.open = () => this.crossword.ref.keyboard.switch('close');
  }

  restart() {
    this.word.active = true;
    setTimeout(() => this.scrollView(), 100);
    this.crossword.ref.hint.update(this.word);
    this.crossword.ref.hint.switch('open');
  }

  switchWord(shift) {
    const size = this.crossword.ref.virtual.word.size - 1;
    const loopSide = shift > 0 ? [0, size] : [size, 0];
    $loopBetween(...loopSide, this.index, (next, stop) => {
      let word = this.crossword.ref.virtual.word.get(next);
      if (!word.state.resolved || this.crossword.state.finished) {
        if (this.index === next) return;
        this.word.active = false;
        this.index = next;
        this.word.active = true;
        this.scrollView();
        this.crossword.ref.hint.update(this.word);
        this.crossword.ref.hint.switch('open');
        return stop();
      }
    });
  }

  chooseWord(words) {
    let thesame = false;
    for (let word of words) {
      if (this.index === word.index) {
        thesame = true;
        continue;
      }
      thesame = false;
      this.word.active = false;
      this.index = word.index;
      this.word.active = true;
      this.crossword.ref.hint.update(this.word);
      break;
    }

    if (thesame && words.length === 1) this.crossword.ref.hint.switch('toggle');
    else this.crossword.ref.hint.switch('open');
  }

  gameOver() {
    if (this.crossword.state.finished) return;
    this.crossword.ref.virtual.word.forEach((word) => {
      if (!word.state.resolved) word.fix();
    });
    this.crossword.ref.hint.switchOccurrence(true);
  }

  scrollView() {
    this.scroller.scroll(this.word.clue.cell);
  }

  _resetResolved() {
    const score = this.crossword.dom.get('score');
    const total = this.crossword.dom.get('total');
    this.state.resolvedNumber = 0;
    score.innerHTML = this.state.resolvedNumber;
    total.innerHTML = this.data.totalNumber;
  }

  updateResolved() {
    const scoreElement = this.crossword.dom.get('score');
    const scoreClasses = this.crossword.classes.get('score');
    const totalClasses = this.crossword.classes.get('total');
    this.state.resolvedNumber++;
    scoreElement.innerHTML = this.state.resolvedNumber;
    scoreClasses.add('resolved').wait(1200).remove('resolved');
    if (this.state.resolvedNumber === this.data.totalNumber) {
      totalClasses.add('resolved').wait(2200).remove('resolved');
      this.crossword.state.finished = true;
    }
  }
}

class VirtualKeyboard {
  constructor() {
    this.state = { opened: false };
    this._on = {
      _keydown: null,
      _open: null,
      get keydown() {
        return this._keydown;
      },
      set keydown(fn) {
        this._keydown = fn;
      },
      get open() {
        return this._open;
      },
      set open(fn) {
        this._open = fn;
      }
    };
    this._buildMaps();
    this._buildView();
    this._addListeners();
  }

  get on() {
    return this._on;
  }

  get view() {
    return this.dom.get('container');
  }

  get letters() {
    return [
      { key: 'q', keyCode: 81, row: 0, index: 0 },
      { key: 'w', keyCode: 87, row: 0, index: 1 },
      { key: 'e', keyCode: 69, row: 0, index: 2 },
      { key: 'r', keyCode: 82, row: 0, index: 3 },
      { key: 't', keyCode: 84, row: 0, index: 4 },
      { key: 'y', keyCode: 89, row: 0, index: 5 },
      { key: 'u', keyCode: 85, row: 0, index: 6 },
      { key: 'i', keyCode: 73, row: 0, index: 7 },
      { key: 'o', keyCode: 79, row: 0, index: 8 },
      { key: 'p', keyCode: 80, row: 0, index: 9 },
      { key: '⌫', keyCode: 8, row: 0, index: 10, classList: ['special'] },
      { key: 'a', keyCode: 65, row: 1, index: 0 },
      { key: 's', keyCode: 83, row: 1, index: 1 },
      { key: 'd', keyCode: 68, row: 1, index: 2 },
      { key: 'f', keyCode: 70, row: 1, index: 3 },
      { key: 'g', keyCode: 71, row: 1, index: 4 },
      { key: 'h', keyCode: 72, row: 1, index: 5 },
      { key: 'j', keyCode: 74, row: 1, index: 6 },
      { key: 'k', keyCode: 75, row: 1, index: 7 },
      { key: 'l', keyCode: 76, row: 1, index: 8 },
      { key: '␡', keyCode: 46, row: 1, index: 9, classList: ['special'] },
      { key: 'z', keyCode: 90, row: 2, index: 0 },
      { key: 'x', keyCode: 88, row: 2, index: 1 },
      { key: 'c', keyCode: 67, row: 2, index: 2 },
      { key: 'v', keyCode: 86, row: 2, index: 3 },
      { key: 'b', keyCode: 66, row: 2, index: 4 },
      { key: 'n', keyCode: 78, row: 2, index: 5 },
      { key: 'm', keyCode: 77, row: 2, index: 6 },
    ];
  }

  _buildMaps() {
    this.rows = new Map();
    this.codes = new Map();
    this.letters.forEach((o) => {
      if (!this.rows.has(o.row)) this.rows.set(o.row, new Map());
      this.rows.get(o.row).set(o.index, o);
      this.codes.set(o.keyCode, o);
    });
  }

  _buildView() {
    const template = $templater(({ ref, child, classes, list, on }) =>/*html*/`
      <ul ${ref('container')} ${classes('container')} class="keyboard-box">
        <li ${on('keyboard.button', 'click')} class="keyboard-button">
          <div>
            <ul class="sprite">
              <li class="open">${child($iconKeyboard())}</li>
              <li class="close">${child($iconClose())}</li>
            </ul>
          </div>
        </li>
        <li class="keyboard-dialog">
          ${list(this.rows, (letters) =>
            /*html*/`<ul class="row">
              ${list(letters, ({ key, keyCode, classList }) =>
              /*html*/`<li  ${on(`keyboard.letter.${key}`, 'click', { data: keyCode })} data-key="${keyCode}" ${classList ? classes(`key.${keyCode}`, classList) : ''}><span>${key}</span></li>`)}
            </ul>`)}
        </li>
      </ul>
    `);
    this.dom = template.references;
    this.classes = template.classes;
    this.html = template;
  }

  _addListeners() {
    const { $on } = this.html;
    $on('keyboard', ({ id, last, data }) => {
      if (last === 'button') this.switch('toggle');
      if (id.startsWith('keyboard.letter')) this.on.keydown(this.codes.get(data));
    });
  }

  switch(action) {
    const classes = this.classes.get('container');
    switch (action) {
      case 'open':
        this.state.opened = true;
        if (this.on.open) this.on.open();
        return classes.add('displayed').wait(10).add('visible');
      case 'close':
        this.state.opened = false;
        return classes.remove('visible').wait(480).remove('displayed');
      case 'toggle':
        return this.switch(classes.has('displayed') ? 'close' : 'open');
    }
  }
}

class Hint {
  constructor(crossword) {
    this.crossword = crossword;
    this.slider = new Slider();
    this.data = {};
    this.state = {
      classes: null,
      element: null,
      currentAudioIndex: Infinity,
      autoplay: false,
      opened: false
    };

    this._on = {
      _open: null,
      get open() {
        return this._open;
      },
      set open(fn) {
        this._open = fn;
      }
    };

    this._buildView();
    this._addListeners();
  }

  get on() {
    return this._on;
  }

  set active(name) {
    const element = this.dom.get(name);
    const classes = this.classes.get(name);
    if (this.state.element === element) return;
    if (this.state.classes) this.state.classes.remove('active');
    this.state.element = element;
    this.state.classes = classes;
    this.state.classes.add('active');
  }

  get active() {
    return { classes: this.state.classes, element: this.state.element };
  }

  get view() {
    return this.dom.get('container');
  }

  perform() {
    if (!this.state.opened) return;
    if (this.state.clueType === 'audio') this._playAudio();
    if (this.state.clueType === 'img') this.slider.next();
  }

  switch(action) {
    const classes = this.classes.get('container');
    switch (action) {
      case 'open':
        if (this.state.opened === true) return;
        this.state.opened = true;
        if (this.on.open) this.on.open();
        return classes.clear().add('displayed').wait(10).add('visible');
      case 'close':
        if (this.state.opened === false) return;
        this.state.opened = false;
        return classes.clear().remove('visible').wait(480).remove('displayed');
      case 'toggle':
        return this.switch(classes.has('displayed') ? 'close' : 'open');
    }
  }

  update(word) {
    this.switchOccurrence(word.state.resolved);
    this._loadWordType(word);
    this.data.player.pause();
    this.classes.get('player').remove('playing');
    this.state.clueType = word.clue.type;
    this.state.currentWord = word;
    switch (word.clue.type) {
      case 'meaning':
        this._loadContent({
          element: this._meaningView(word),
          type: 'meaning'
        });
        break;
      case 'definition':
        this._loadContent({
          element: this._definitionView(word),
          type: 'definition'
        });
        break;
      case 'img':
        this.slider.update(word.record.img);
        this._loadContent({
          element: null,
          type: 'img'
        });
        break;
      case 'audio':
        this._loadAudio(word);
        this._loadContent({
          element: null,
          type: 'audio'
        });
        break;
    }
  }

  switchOccurrence(action) {
    const button = this.classes.get('occurrence');
    switch (action) {
      case true:
        button.add('displayed').wait(50).add('visible');
        break;
      case false:
        button.remove('displayed', 'visible');
        break;
    }
  }

  _addListeners() {
    const player = this.classes.get('player');
    const { $on } = this.html;
    $on('hint', ({ event, last, type, target }) => {
      if (last === 'button') this.switch('toggle');
      if (last === 'autoplay') this._toggleAutoplay();
      if (last === 'occurrence') this.seekOccurrence(event);
      if (last === 'player') this._playAudio();
      if (last === 'audio' && type === 'play') player.add('playing');
      if (last === 'audio' && type === 'ended') {
        if (this.state.currentAudioIndex < this.data.audioSources.length - 1) {
          this.state.currentAudioIndex++;
          target.src = this.data.audioSources[this.state.currentAudioIndex];
          target.play();
        } else {
          player.remove('playing');
          this.state.currentAudioIndex = Infinity;
        }
      }
    });
  }

  seekOccurrence(event) {
    if (!this.state.currentWord.state.resolved) return;
    event.preventDefault();
    this.crossword.close();
    this.crossword.ref.dialog.seekOccurrence(this.state.currentWord.record.id);
  }

  _toggleAutoplay() {
    this.state.autoplay = !this.state.autoplay;
    this.classes.get('autoplay')[this.state.autoplay ? 'add' : 'remove']('on');
  }

  _playAudio() {
    this.state.currentAudioIndex = 0;
    this.data.player.src = this.data.audioSources[0];
    this.data.player.play();
  }

  _loadAudio(word) {
    const audio = word.record.audio;
    const sources = type(audio, String) ? [audio] : audio.filter((item) => type(item, Array)).map(([word, source]) => source);
    this.data.audioSources = sources;
    if (this.state.autoplay) this._playAudio();
  }

  _loadContent({ element, type }) {
    this.active = type;
    if (!element) return;
    this.active.element.innerHTML = '';
    this.active.element.appendChild(element);
  }

  _loadWordType(word) {
    const element = this.dom.get('word-type');
    element.innerHTML = word.record.type;
  }

  _meaningView(word) {
    return $templater(({ list }) =>/*html*/`
      <ul class="meaning-list">
        ${list(word.record.meaning, (meaning) =>/*html*/`
          <li>${meaning}</li>
        `)}
      </ul>
    `).template;
  }

  _definitionView(word) {
    const definition = word.record.definition;
    const collection = type(definition, Array) ? definition : [definition];
    const { template } = $templater(({ list }) =>/*html*/`
      <ul class="definition-list">
        ${list(collection, (definition) =>/*html*/`
          <li>${definition}</li>
        `)}
      </ul>
    `);

    for (let element of template.querySelectorAll('[data-keyword]')) {
      element.innerHTML = element.innerHTML.replace(/[A-Za-z0-9]/g, '_');
    }
    return template;
  }

  _buildView() {
    const template = $templater(({ ref, child, classes, on }) =>/*html*/`
      <ul ${ref('container')} ${classes('container')} class="hint-box">
        <li ${on('hint.button', 'click')} class="hint-button">
          <div>
            <ul class="sprite">
              <li class="open">${child($iconQuestionMark())}</li>
              <li class="close">${child($iconClose())}</li>
            </ul>
          </div>
        </li>
        <li class="hint-dialog">
          <ul class="list">
            <li ${ref('meaning')} ${classes('meaning')} class="card meaning">a</li>
            <li ${ref('definition')} ${classes('definition')} class="card definition">b</li>
            <li ${ref('img')} ${classes('img')} class="card image">
              ${child(this.slider.view)}
            </li>
            <li ${ref('audio')} ${classes('audio')} class="card audio">
              <div class="section button">
                <span ${on('hint.player', 'click')} ${classes('player')} class="button player">
                  ${child($iconVolume())}
                </span>
                <audio ${ref('audio-element')} ${on('hint.audio', ['play', 'ended'])}></audio>
              </div>
              <div ${on('hint.autoplay', 'click')} ${classes('autoplay')} class="section autoplay">
                <span class="check on">${child($iconCheckIn())}</span>
                <span class="check off">${child($iconCheckOut())}</span>
                <span class="label">autoplay</span>
              </div>
            </li>
          </ul>
          <p ${ref('word-type')} class="word-type"></p>
          <div ${on('hint.occurrence', 'click')} ${classes('occurrence')} class="find-occurrence">
            <div>
              ${child($iconOccurrence())}
            </div>
          </div>
        </li>
      </ul>
    `);
    this.dom = template.references;
    this.data.player = this.dom.get('audio-element');
    this.classes = template.classes;
    this.html = template;
  }
}

class Grid {
  constructor(crossword) {
    this.crossword = crossword;
    this._buildCrosswordView();
    this._addElementsReferences();
  }

  _addElementsReferences() {
    this.crossword.ref.virtual.word.forEach((word) => {
      let clueCell = this.getCellByCoords(word.clue.x, word.clue.y, 'clue');
      let clueClasses = this.getClassesByCoords(word.clue.x, word.clue.y, 'clue');
      word.clue.cell = clueCell;
      word.clue.classes = clueClasses;
      this.crossword.ref.virtual.addCell(clueCell, word);
      word.letters.forEach((letter) => {
        let letterCell = this.getCellByCoords(letter.x, letter.y, 'letter');
        let letterInput = this.getCellByCoords(letter.x, letter.y, 'input');
        let letterClasses = this.getClassesByCoords(letter.x, letter.y, 'letter');
        letter.classes = letterClasses;
        letter.input = letterInput;
        letter.cell = letterCell;
        this.crossword.ref.virtual.addCell(letterCell, word);
      });
    });
  }

  _buildCrosswordView() {
    const template = $templater(({ ref, child }) =>/*html*/`
      <div ${ref('content')}>
        <div ${ref('container')} tabindex="0" class="crossword">
          ${child(this._crossword())}
        </div>
        <div class="buttons">
          ${child(this.crossword.ref.hint.view)}
          ${child(this.crossword.ref.keyboard.view)}
        </div>
      </div>
    `);
    this.dom = template.references;
    this.classes = template.classes;
    this.html = template;
  }

  getCellByCoords(x, y, name) {
    return this.dom.get(name).get(String(x)).get(String(y));
  }

  getClassesByCoords(x, y, name) {
    return this.classes.get(name).get(String(x)).get(String(y));
  }

  _crossword() {
    return $templater(({ loop, ref, child }) =>/*html*/`
      <table id="crossword-table">
        <tbody>
          ${loop(this.crossword.ref.virtual.rows.size, (y) =>/*html*/`
            ${child(this._row(y))}
          `)}
        </tbody>
      </table>
    `);
  }

  _row(y) {
    return $templater(({ child, loop }) =>/*html*/`
    <tr>
      ${loop(this.crossword.ref.virtual.columns.size, (x) => /*html*/`
        ${child(this._cell(x, y))}
      `)}
    </tr>
    `);
  }

  _cell(x, y) {
    let column = this.crossword.ref.virtual.edges.left + x;
    let row = this.crossword.ref.virtual.edges.top + y;
    let letter = this.crossword.ref.virtual.hasLetter(column, row);
    let keyword = this.crossword.ref.virtual.hasKeyword(column, row);
    const cell = $templater(({ ref, when, child, classes, on }) =>/*html*/`
      ${when(keyword, () =>/*html*/`
        <td ${on(`table.cell.${column}.${row}`, 'click')} class="clue-cell ${keyword.side}" ${ref(`clue.${column}.${row}`)} ${classes(`clue.${column}.${row}`)}>
          ${child(this._clue(keyword.clue.type, keyword.side))}
        </td>
      `)}
      ${when(letter, () =>/*html*/`
        <td ${on(`table.cell.${column}.${row}`, 'click')} class="letter-cell" ${ref(`letter.${column}.${row}`)} ${classes(`letter.${column}.${row}`)}>
          <div>
            <span ${ref(`input.${column}.${row}`)}></span>
          </div>
        </td>
      `)}
      ${when(!keyword && !letter, () =>/*html*/`<td></td>`)}
    `);
    return cell;
  }

  _arrow(side) {
    switch (side) {
      case 'horizontal':
        return $templater(() =>/*html*/`
        <svg height="14" width="7" viewBox="0 0 70 140" x="0px" y="0px">
          <path d="M0 0 L70 70 L0 140 Z" />
        </svg>
        `);
      case 'vertical':
        return $templater(() =>/*html*/`
        <svg height="7" width="14" viewBox="0 0 140 70" x="0px" y="0px">
          <path d="M0 0 L140 0 L70 70 Z" />
        </svg>
        `);
    }
  }

  _clue(type, side) {
    switch (type) {
      case 'meaning':
        return $templater(({ child }) =>/*html*/`
          <div>
            <ul>
              <li class="cell">${child($iconGameTranslate())}</li>
              <li class="arrow">${child(this._arrow(side))}</li>
            </ul>
          </div>
        `);
      case 'definition':
        return $templater(({ child }) =>/*html*/`
          <div>
            <ul>
              <li class="cell">${child($iconGameDefinition())}</li>
              <li class="arrow">${child(this._arrow(side))}</li>
            </ul>
          </div>
        `);
      case 'img':
        return $templater(({ child }) =>/*html*/`
          <div>
            <ul>
              <li class="cell">${child($iconGameImage())}</li>
              <li class="arrow">${child(this._arrow(side))}</li>
            </ul>
          </div>
        `);
      case 'audio':
        return $templater(({ child }) =>/*html*/`
          <div>
            <ul>
              <li class="cell">${child($iconGamePronunciation())}</li>
              <li class="arrow">${child(this._arrow(side))}</li>
            </ul>
          </div>
        `);
    }
  }
}

class Word {
  constructor(crossword, { x, y, side, id, index }) {
    this.crossword = crossword;
    this._data = { x, y, side, id, letters: [], string: '', queuedLetters: [], cells: new Map() };
    this.index = index;
    this.state = {
      resolved: false,
      current: null,
      deleteInterval: null,
      clearInterval: null,
      active: false,
      pending: false,
      queuedFixed: [],
      fixedPending: null
    };
    this._createClueData();
    this._build(x, y, side);
  }

  get toString() {
    return this._data.string;
  }

  get current() {
    return this.state.current;
  }

  set current(next) {
    const prev = this.state.current;
    if (prev === next) return;
    this.state.current = next;
    if (prev !== null) this._letterDisactive(this.letters[prev]);
    if (next === null) return;
    if (this.active && !this.state.resolved) this.letters[next].classes.add('active');
    else this._letterDisactive(this.letters[next]);
  }

  get clue() {
    return this._data.clue;
  }

  get id() {
    return this._data.id;
  }

  get record() {
    return this.crossword.ref.words.records.get(this._data.id);
  }

  get side() {
    return this._data.side;
  }

  get size() {
    return this.toString.length;
  }

  get letters() {
    return this._data.letters;
  }

  get letter() {
    return this.letters[this.current];
  }

  get active() {
    return this.state.active;
  }

  set active(val) {
    if (val === true) {
      this.state.active = true;
      this.clue.classes.wait(250).add('active');
      if (this.state.pending || this.state.resolved) return;
      this.current = this.next();
    };
    if (val === false) {
      this.state.active = false;
      this.clue.classes.clear('active').wait(10).remove('active');
      if (this.state.pending || this.state.resolved) return;
      this._clear();
    };
  }

  get first() {
    for (let { fixed, index } of this.letters) {
      if (fixed === false) return index;
    }
    return null;
  }

  get last() {
    for (let i = this.letters.length - 1; i >= 0; i--) {
      let letter = this.letters[i];
      if (letter.fixed === false) return letter.index;
    }
    return null;
  }

  type(event, allowHint) {
    const { key: letter, keyCode: code } = event;
    const typedLetter = code >= 65 && code <= 90;
    const typedSpace = code === 32;
    if (!typedLetter && !typedSpace) return;
    else if (event.preventDefault) event.preventDefault();
    if (this.state.pending || this.state.resolved) return typedSpace ? allowHint() : null;
    const { usedFromQueue, usedSpace } = this._hasQueuedLetter(letter, code);
    if (!usedSpace && typedSpace) allowHint();
    if (!usedFromQueue && typedLetter) {
      this.letter.filled = letter;
      this.current = this.next();
    }

    if (this.current === this.last && this.letter.filled) this.validate();
  }

  getLetterData(cell) {
    return this._data.cells.get(cell) || null;
  }

  _letterDisactive(letter) {
    const words = this.crossword.ref.virtual.cell.get(letter.cell);
    const crossed = words.filter((word) => word !== this)[0];
    if (crossed && crossed.active && crossed.letter.cell === letter.cell) return;
    letter.classes.remove('active');
  }

  _hasQueuedLetter(letter, code) {
    const q = this._data.queuedLetters;
    if (!q.length) return { usedFromQueue: false, usedSpace: false };
    for (let x = 0; x < q.length; x++) {
      let qL = q[x];
      if (letter === qL) {
        q.splice(0, x + 1);
        let classes = this.letters[this.current - q.length - 1].classes;
        classes.clear().add('highlight').wait(400).remove('highlight');
        return { usedFromQueue: true, usedSpace: code === 32 || x > 0 || false };
      }
      if (qL === ' ' && x < q.length - 1) {
        continue;
      }
      this._data.queuedLetters = [];
      return { usedFromQueue: false, usedSpace: false };
    }
  }

  next() {
    for (let i = this.current === null ? 0 : this.current + 1; i <= this.last; i++) {
      let { fixed, letter } = this.letters[i];
      if (fixed === true) this._data.queuedLetters.push(letter);
      if (fixed === false) return i;
    }
    return this.current;
  }

  previous() {
    for (let i = this.current - 1; i >= this.first; i--) {
      let letter = this.letters[i];
      if (letter.fixed === false) return i;
    }
    return this.current;
  }

  delete() {
    if (this.state.pending || this.state.resolved) return;
    if (this.state.deleteInterval !== null) return;
    this.state.pending = true;
    const first = this.first;
    this.state.deleteInterval = setInterval(() => {
      this._backspace();
      if (this.current === first) {
        clearInterval(this.state.deleteInterval);
        this.state.deleteInterval = null;
        this.state.pending = false;
        this._clear();
      }
    }, 36);
  }

  backspace() {
    if (this.state.pending || this.state.resolved) return;
    this._backspace();
  }

  _backspace() {
    const letter = this.letter;
    const last = this.last;
    const filled = letter.filled;
    letter.filled = null;
    if (this.current < last || (this.current === last && !filled)) this.current = this.previous();
    this.letter.filled = null;
  }

  _clear() {
    const first = this.first;
    this.state.pending = true;
    this.state.clearInterval = setInterval(() => {
      let letter = this.letter;
      letter.filled = null;
      if (this.current > first) this.current = this.previous();
      else {
        clearInterval(this.state.clearInterval);
        this.state.clearInterval = null;
        this.state.pending = false;
        this.current = this.active ? this.first : null;
      }
    }, 36);
  }

  fix() {
    const last = this.last;
    this.state.resolved = true;
    this.state.pending = true;
    this.current = this.first;
    this.crossword.ref.game.updateResolved();

    while (true) {
      if (this.letter) this.letter.fixed = true;
      if (this.current < last) this.current = this.next();
      else {
        this.state.pending = false;
        this.current = null;
        break;
      }
    }
  }

  validate() {
    const valid = this.letters.every(({ typed, letter, fixed }) => fixed ? true : typed.toLowerCase() === letter.toLowerCase());
    if (!valid) return;
    this.fix();
    this.crossword.ref.words.solve(this._data.id, 'crossword');
    if (this.crossword.ref.games.presentation) this.crossword.ref.games.presentation.update(this._data.id);
    this.crossword.ref.hint.switchOccurrence(true);
  }

  _createClueData() {
    const data = this._data;
    data.clue = {
      x: data.side === 'horizontal' ? data.x - 1 : data.x,
      y: data.side === 'vertical' ? data.y - 1 : data.y,
      type: null,
      cell: null,
      classes: null
    };
  }

  _queueFixed(letterData) {
    this.state.queuedFixed.push(() => {
      letterData.classes.add('fixed');
      letterData.filled = letterData.letter;
    });
    if (this.state.fixedPending !== null) return;
    this.state.fixedPending = setInterval(() => {
      let queued = this.state.queuedFixed.shift();
      queued();
      if (!this.state.queuedFixed.length) {
        clearInterval(this.state.fixedPending);
        this.state.fixedPending = null;
      }
    }, 48)
  }

  _build(_x, _y, side) {
    const data = this._data;
    const words = this.crossword.ref.words.fixed.get(data.id);
    const letterData = (x, y, fixed, letter, index) => {
      const _private = { word: this, cell: null, fixed, filled: false };
      return {
        x, y, letter, index,
        input: null,
        classes: null,
        get cell() {
          return _private.cell;
        },
        set cell(element) {
          _private.cell = element;
          _private.word._data.cells.set(element, this);
          if (_private.fixed === true) this.fixed = true;
        },
        get fixed() {
          return this.cell && _private.word.crossword.ref.virtual.fixed.has(this.cell) ? true : _private.fixed;
        },
        set fixed(v) {
          if (this.cell && v) {
            _private.word.crossword.ref.virtual.fixed.add(this.cell);
            _private.word._queueFixed(this);
          } else {
            _private.fixed = v;
          }
        },
        set filled(letter) {
          if (!letter) {
            const words = _private.word.crossword.ref.virtual.cell.get(this.cell);
            const crossed = words.filter((word) => word !== _private.word)[0];
            _private.filled = false;
            if (crossed && crossed._data.cells.get(this.cell).filled) return;
            this.input.innerHTML = '';
          } else {
            _private.filled = true;
            this.input.innerHTML = letter;
          }

        },
        get filled() {
          return _private.filled;
        },
        get typed() {
          return this.input ? this.input.innerHTML : '';
        }
      }
    };

    const h = side === 'horizontal';
    let index = 0;

    words.forEach(({ fixed, letters }) => {
      const isFixed = typeof fixed === 'string';
      for (let letter of isFixed ? fixed : letters) next(letter, isFixed);
    });

    function next(letter, fixed) {
      let x = h ? _x + index : _x;
      let y = h ? _y : _y + index;
      data.letters.push(letterData(x, y, fixed, letter, index));
      data.string += letter;
      index++;
    }
  }
}

class VirtualGrid {
  constructor(crossword, { number, clues, words, min, totalAttempts }) {
    this.crossword = crossword;
    this.data = { number, clues, words, attempt: 0, min, totalAttempts };
    this.on = {
      _warning: null,
      _fail: null,
      _success: null,
      get warning() {
        return this._warning;
      },
      set warning(fn) {
        this._warning = fn;
      },
      get fail() {
        return this._fail;
      },
      set fail(fn) {
        this._fail = fn;
      },
      get success() {
        return this._success;
      },
      set success(fn) {
        this._success = fn;
      }
    };
  }

  get _edges() {
    return {
      left: Infinity,
      right: -Infinity,
      top: Infinity,
      bottom: -Infinity
    };
  }

  create() {
    this._resetCrossword();
    this._buildVirtualCrossword();
  }

  addCell(cell, word) {
    if (!this.cell.has(cell)) this.cell.set(cell, []);
    this.cell.get(cell).push(word);
  }

  _resetCrossword() {
    this.columns = new Map();
    this.rows = new Map();
    this.edges = this._edges;
    this.word = new Map();
    this.cell = new Map();
    this.fixed = new Set();
    this.used = new Set();
  }

  _buildVirtualCrossword() {
    const id = this.crossword.ref.words.random(this.data.words, 'crossword');
    const side = $randomItem(['vertical', 'horizontal']);
    this.data.attempt++;
    this._addWord(0, 0, side, id);
    let previous = this.used.size;
    while (this.used.size < this.data.number) {
      this._nextWord();
      if (this.used.size === previous) {
        if (this.data.attempt === this.data.totalAttempts) {
          if (this.used.size < this.data.min) {
            if (this.on.fail) this.on.fail(this.used);
          } else {
            this._buildCluesMap();
            if (this.on.warning) this.on.warning(this.used);
          }
          this.data.attempt = 0;
          return;
        } else {
          this.create();
          return;
        }
      } else previous = this.used.size;
    }
    this._buildCluesMap();
    if (this.on.success) this.on.success(this.used);
  }

  _buildCluesMap() {
    const words = this.crossword.ref.words;
    const permittedClues = this.data.clues;
    const wordInstances = sortByCluesNumber(this.word);
    const clueMap = createClueMap();
    for (let word of wordInstances) {
      let chosenClueName = nextClue(word.id);
      word.clue.type = chosenClueName;
      clueMap.get(chosenClueName).records++;
    }

    function sortByCluesNumber(collection) {
      const words = [...collection.values()];
      words.sort((a, b) => countClues(a.id) - countClues(b.id));
      return words;
    }

    function countClues(id) {
      let iter = 0;
      words.clues.forEach((set, key) => {
        if (permittedClues.has(key) && set.has(id)) iter++;
      });
      return iter;
    }

    function nextClue(id) {
      let chosen = null, lowest = Infinity;
      clueMap.forEach(({ size, records }, name) => {
        if (!words.clues.get(name).has(id)) return;
        if (records < lowest) {
          chosen = name;
          lowest = records;
        }
        if (records === lowest && size < clueMap.get(chosen).size) chosen = name;
      });
      return chosen;
    }

    function createClueMap() {
      const map = new Map();
      for (let word of wordInstances) {
        permittedClues.forEach((name) => {
          if (!words.clues.get(name).has(word.id)) return;
          if (!map.has(name)) map.set(name, { size: 0, records: 0 });
          map.get(name).size++;
        });
      }
      return map;
    }
  }

  _addWord(x, y, side, id) {
    const word = this._createWord(x, y, side, id);
    const horizontal = side === 'horizontal';
    const dynamicLines = horizontal ? this.columns : this.rows;
    const dynamicCoord = horizontal ? x : y;
    const staticLines = horizontal ? this.rows : this.columns;
    const staticCoord = horizontal ? y : x;
    if (!staticLines.has(staticCoord)) staticLines.set(staticCoord, lineData(side, staticCoord));
    if (!staticLines.has(staticCoord - 1)) staticLines.set(staticCoord - 1, lineData(side, staticCoord - 1));
    if (!staticLines.has(staticCoord + 1)) staticLines.set(staticCoord + 1, lineData(side, staticCoord + 1));
    const staticLine = staticLines.get(staticCoord);
    const neighbourLineA = staticLines.get(staticCoord - 1);
    const neighbourLineB = staticLines.get(staticCoord + 1);
    staticLine.keyword.set(dynamicCoord - 1, word);
    this._updateEdges(x, y, side, word.size);

    this.used.add(id);

    function opposite(side) {
      let sides = ['horizontal', 'vertical'];
      return side === sides[0] ? sides[1] : sides[0];
    }

    function lineData(side, index) {
      return { index, keyword: new Map(), letters: new Map(), busy: new Map(), side };
    }

    for (let i = -1; i <= word.size; i++) {
      let nextCoord = i + dynamicCoord;
      if (!dynamicLines.has(nextCoord)) dynamicLines.set(nextCoord, lineData(opposite(side), nextCoord));
      let dynamicLine = dynamicLines.get(nextCoord);

      if (i === -1 || i === word.size) {
        staticLine.busy.set(nextCoord, false);
        dynamicLine.busy.set(staticCoord, false);
        this._updateExpression(dynamicLine);
      }

      if (i === 0 || i === word.size - 1) {
        if (!neighbourLineA.busy.has(nextCoord)) neighbourLineA.busy.set(nextCoord, true);
        if (!neighbourLineB.busy.has(nextCoord)) neighbourLineB.busy.set(nextCoord, true);
      }

      if (i > 0 && i < word.size - 1) {
        neighbourLineA.busy.set(nextCoord, false);
        neighbourLineB.busy.set(nextCoord, false);
      }

      if (i >= 0 && i < word.size) {
        staticLine.busy.set(nextCoord, false);
        dynamicLine.letters.set(staticCoord, word.letters[i].letter);
        this._updateExpression(dynamicLine);
      }
    }
    this._updateExpression(staticLine);
    this._updateExpression(neighbourLineA);
    this._updateExpression(neighbourLineB);
  }

  _updateEdges(x, y, side, size) {
    const edges = this.edges;
    if (side === 'horizontal') {
      if (x - 1 < edges.left) edges.left = x - 1;
      if (x + size > edges.right) edges.right = x + size;
      if (y - 1 < edges.top) edges.top = y - 1;
      if (y + 1 > edges.bottom) edges.bottom = y + 1;
    } else {
      if (y - 1 < edges.top) edges.top = y - 1;
      if (y + size > edges.bottom) edges.bottom = y + size;
      if (x - 1 < edges.left) edges.left = x - 1;
      if (x + 1 > edges.right) edges.right = x + 1;
    }
  }

  _updateExpression(line) {
    const edges = line.side === 'horizontal' ? [this.edges.left, this.edges.right] : [this.edges.top, this.edges.bottom];
    const expressions = [];
    let currentExpression = null;
    let spacesIterator = 0;
    let limitedSpace = false;

    for (let coord = edges[0]; coord <= edges[1]; coord++) {
      if (line.busy.has(coord)) {
        if (line.busy.get(coord) && line.letters.has(coord)) addLetter(coord);
        else if (!line.busy.get(coord) && line.letters.has(coord)) addBreak(true);
        else addBreak(false);
      }
      else if (line.letters.has(coord)) addLetter(coord);
      else addSpace();
    }

    if (currentExpression) {
      currentExpression.after = Infinity;
      expressions.push(currentExpression);
      currentExpression = null;
      spacesIterator = 0;
    }
    line.expressions = expressions;
    this._seekMatches(line);

    function addBreak(limitSpaces) {
      if (currentExpression) {
        const spaces = limitSpaces ? spacesIterator - 1 : spacesIterator;
        currentExpression.after = spaces;
        expressions.push(currentExpression);
        currentExpression = null;
      }
      limitedSpace = true;
      spacesIterator = limitSpaces ? -1 : 0;
    };

    function addLetter(coord) {
      let space = limitedSpace ? spacesIterator : Infinity;
      let letter = line.letters.get(coord);
      spacesIterator = 0;
      limitedSpace = true;
      if (currentExpression) currentExpression.characters.push(space, letter);
      else currentExpression = { index: coord, before: space, characters: [letter] };
    };

    function addSpace() {
      if (limitedSpace) spacesIterator++;
    };
  }

  hasKeyword(x, y) {
    let column = this.columns.get(x) ? this.columns.get(x).keyword.get(y) : undefined;
    let row = this.rows.get(y) ? this.rows.get(y).keyword.get(x) : undefined;
    return column || row || null;
  }

  hasLetter(x, y) {
    let column = this.columns.get(x) ? this.columns.get(x).letters.get(y) : undefined;
    let row = this.rows.get(y) ? this.rows.get(y).letters.get(x) : undefined;
    return column || row || null;
  }

  _createWord(x, y, side, id) {
    const instance = new Word(this.crossword, { x, y, side, id, index: this.word.size });
    this.word.set(this.word.size, instance);
    return instance;
  }

  _nextWord() {
    let bestLine = null;
    this._loopLines((line) => {
      if (this.used.has(line.match.id)) this._seekMatches(line);
      if (line.match.id !== null && (bestLine === null || line.match.crosses > bestLine.match.crosses)) bestLine = line;
    });
    if (bestLine === null) return;
    const x = bestLine.side === 'horizontal' ? bestLine.match.index : bestLine.index;
    const y = bestLine.side === 'vertical' ? bestLine.match.index : bestLine.index;
    const side = bestLine.side;
    const id = bestLine.match.id;
    this._addWord(x, y, side, id);
  }

  _seekMatches(line) {
    const words = this.crossword.ref.words;
    let _chosen = null;
    let _index = null;
    let _crosses = 0;
    for (let { before, after, index, characters } of line.expressions) {
      let foundMatch = false;
      for (let x = characters.length; x >= 1; x -= 2) {
        let shift = 0;
        for (let y = 0; y + x <= characters.length; y += 2) {
          shift += y === 0 ? 0 : characters[y - 1] + 1;
          let match = words.match({
            collection: this.data.words,
            excludes: this.used,
            before: y === 0 ? before : characters[y - 1] - 1,
            after: y + x === characters.length ? after : characters[y + x] - 1,
            characters: characters.slice(y, y + x)
          });
          if (match && (_chosen === null || match.size > _chosen.size)) {
            _index = index + shift - match.before;
            _chosen = match;
            _crosses = characters.length - (characters.length - 1) / 2;
            foundMatch = true;
          }
        }
        if (_chosen !== null) break;
      }
      if (!foundMatch) {
        let size = 1;
        for (let i = 1; i < characters.length; i += 2) size += characters[i] + 1;
        for (let i = 0; i < size; i++) line.busy.set(index + i, false);
      }
    }
    line.match = {
      id: _chosen ? _chosen.id : null,
      index: _index,
      crosses: _crosses
    };
  }

  _loopLines(callback) {
    this.rows.forEach(callback);
    this.columns.forEach(callback);
  }

}

class StarHint {
  constructor(crossword, { dom, classes, totalNumber }) {
    this.crossword = crossword;
    this.dom = dom;
    this.classes = classes;
    this.data = {
      wordsNumber: totalNumber,
      allowedNumber: { number: 1, per: 5 },
      total: null,
      left: null
    };
    this.state = {
      delayMove: null,
      allowedCell: null
    };
    this.event = {
      mouseDown: (event) => this._onMouseDown(event),
      mouseUp: (event) => this._onMouseUp(event),
      mouseMove: (event) => this._onMouseMove(event)
    };
    this._resetHintsNumber();
  }

  update() {
    this.data.left--;
    this.dom.get('hints-output').innerHTML = this.data.left;
  }

  _resetHintsNumber() {
    const { number, per } = this.data.allowedNumber;
    this.data.total = Math.round(this.data.wordsNumber / per) * number;
    this.data.left = this.data.total;
    this.dom.get('hints-output').innerHTML = this.data.left;
  }

  _onMouseDown(event) {
    if (this.data.left === 0) return;
    this.event.mouseMove(event);
    window.addEventListener('mousemove', this.event.mouseMove);
    window.addEventListener('mouseup', this.event.mouseUp);
    this.classes.get('cursor-star').add('displayed').wait(10).add('visible');
  };

  _onMouseUp() {
    window.removeEventListener('mousemove', this.event.mouseMove);
    this.classes.get('cursor-star').remove('visible').wait(250).remove('displayed').remove('allowed');
    const cell = this.state.allowedCell;
    if (cell !== null) {
      const words = this.crossword.ref.virtual.cell.get(cell);
      for (let x = 0; x < words.length; x++) {
        let word = words[x];
        let letterData = word.getLetterData(cell);
        if (x === 0) letterData.fixed = true;
        if (word.active && word.current === letterData.index) {
          if (word.current < word.last) word.current = word.next();
          else if (word.current > word.first) word.current = word.previous();
        }
        word.validate();
      }
      this.update();
      this.state.allowedCell = null;
    }
  };

  _onMouseMove(event) {
    const element = this.dom.get('cursor-star');
    if (this.state.delayMove === null) this.state.delayMove = setTimeout(() => {
      element.style.left = `${event.clientX + 5}px`;
      element.style.top = `${event.clientY + 5}px`;
      this.state.delayMove = null;
      this._seekCell(event.target, (words, cell) => this._allowStarInput(words, cell));
    }, 28);
  };

  _allowStarInput(words, cell) {
    let letterData = words ? words[0].getLetterData(cell) : null;
    let empty = letterData ? letterData.fixed === false : false;
    this.classes.get('cursor-star')[empty ? 'add' : 'remove']('allowed');
    this.state.allowedCell = empty ? cell : null;
  }

  _seekCell(target, callback) {
    $loopParents(target, (parent, stop) => {
      if (parent.tagName === 'TD') {
        callback(this.crossword.ref.virtual.cell.get(parent) || null, parent);
        stop();
      }
    });
  }
}

class Crossword {
  constructor(dialog, words, games) {
    this.ref = { dialog, words, games };
    this.data = {
      permitedClueTypes: new Set(),
      attempts: 10,
      wordsMinNumber: 5,
      wordsMaxNumber: 50,
      wordsNumber: 10
    };
    this.state = {
      generated: false,
      finished: false,
      navigationOpened: false,
      activePage: null,
      opened: false
    };

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

    this._buildView();
    this._addListeners();
    this._addKeywordListeners();
    this._permitClue('meaning');
  }

  get view() {
    return this.dom.get('container');
  }

  get on() {
    return this._on;
  }

  open() {
    this.state.opened = true;
    if (this.on.open) this.on.open();
    if (this.state.activePage === null) this._switchCrosswordPage('config');
  }

  close() {
    this._toggleNavigation('close');
    this.state.opened = false;
    if (this.on.close) this.on.close();
  }

  _switchButtonView(name) {
    return $templater(({ classes, on }) =>/*html*/`
    <button ${on(`config.switch.${name}`, 'click')} ${classes(`button.switch.${name}`)} class="switch-button">
      <span></span>
    </button>`);
  }

  _buildView() {
    const template = $templater(({ ref, child, classes, on }) =>/*html*/`
      <div ${ref('container')} ${classes('container')} class="crossword">
        <nav ${ref('panel')} ${classes('panel')} class="navigation-panel">
          <div class="controls game">
            <ul class="buttons pages">
              <li ${on('nav.config', 'click')} ${classes('button.config')} >${child($iconConfig())}</li>
              <li ${on('nav.crossword', 'click')} ${classes('button.crossword')} class="disabled">${child($iconGameCrossword())}</li>
            </ul>
            <ul class="buttons game">
              <li ${on('nav.previous', 'click', { data: -1 })}>${child($iconPrevious())}</li>            
              <li ${on('nav.next', 'click', { data: 1 })}>${child($iconNext())}</li>            
              <li ${on('nav.star', 'mousedown')} class="button-star">${child($iconStar())}</li>
              <li ${ref('hints-output')} class="count-container"></li>
              <li ${ref('cursor-star')} ${classes('cursor-star')} class="cursor-star">${child($iconStar())}</li>
            </ul>
            <ul class="buttons info">
              <li>Words:</li>
              <li ${ref('score')} ${classes('score')} class="output score"></li>
              <li>/</li>
              <li ${ref('total')} ${classes('total')} class="output total"></li>
            </ul>
            <ul class="buttons control">
              <li>
                <span ${on('nav.game-over', 'click')}>${child($iconGameFinish())}</span>
              </li>
            </ul>
          </div>
          <div class="controls navigation">
            <ul>
              <li class="toggle-menu" ${on('nav.toggle', 'click')}>
                <div><i></i></div>
                <div><i></i></div>
                <div><i></i></div>
              </li>
              <li ${on('nav.close', 'click')} class="close">${child($iconMinimize())}</li>
            </ul>
          </div>
        </nav>
        <ul ${ref('pages')} class="game-pages">
          <li ${ref('page.config')} ${classes('page.config')} class="config-page hidden">
            <section class="settings">
              <div>
                <p>
                  <span>All words to use: </span>
                  <span ${ref('output-total-words')} class="output"></span>
                </p>
                <p>
                  <span>Words in crossword: </span>
                  <span ${ref('output-used-words')} class="output">${this.data.wordsNumber}</span>
                  <span class="setting-buttons">
                    <button ${on('config.words-number.min', 'click', { data: -Infinity })} ${classes('button.min')} class="setting-button"><span>min</span></button>
                    <button ${on('config.words-number.decrease', 'click', { data: -1 })} ${classes('button.decrease')} class="setting-button"><span>-</span></button>
                    <button ${on('config.words-number.increase', 'click', { data: 1 })} ${classes('button.increase')} class="setting-button"><span>+</span></button>
                    <button ${on('config.words-number.max', 'click', { data: Infinity })} ${classes('button.max')} class="setting-button"><span>max</span></button>
                  </span>
                </p>
                <div>
                  <p>Use as the crossword clue:</p>
                  <ul ${ref('switch-list')} class="selection-list">
                    <li><span>Translation</span> ${child(this._switchButtonView('meaning'))}</li>
                    <li><span>Definition</span> ${child(this._switchButtonView('definition'))}</li>
                    <li><span>Image</span> ${child(this._switchButtonView('img'))}</li>
                    <li><span>Pronunciation</span> ${child(this._switchButtonView('audio'))}</li>
                  </ul>
                </div>
              </div>
            </section>
            <section class="controls">
              <div>
                <button ${on('config.generate', 'click')} ${classes('button.generate')} class="setting-button">
                  <span>Generate Crossword</span>
                </button>
              </div>
            </section>
            <section class="warnings">
              <ul>
                <li ${ref('warning.remove-crossword')} ${classes('warning.remove-crossword')} class="warning">
                  <p class="prompt">
                    ${child($iconWarning())}
                    The already generated crossword will be deleted, are you sure?
                  </p>
                  <div class="controls">
                    <button ${on('config.confirm.remove-crossword', 'click')} class="setting-button"><span>Yes, give me new crossword!</span></button>
                    <button ${on('config.reject.remove-crossword', 'click')} class="setting-button"><span>No, let me finish it up!</span></button>
                  </div>
                </li>
                <li ${ref('warning.insufficient-words')} ${classes('warning.insufficient-words')} class="warning">
                  <p class="prompt">
                    ${child($iconWarning())}
                    At least ${this.data.wordsMinNumber} words are needed to build the crossword.
                  </p>
                </li>
                <li ${ref('warning.generate-fail')} ${classes('warning.generate-fail')} class="warning">
                  <p class="prompt">
                    ${child($iconWarning())}
                    After ${this.data.attempts} attemps, the crossword could not be generated.
                    Too many words do not match and could not be crossed in any way.
                  </p>
                  <div class="controls">
                    <button ${on('config.confirm.generate-fail', 'click')} class="setting-button"><span>Ok!</span></button>
                    <button ${on('config.reject.generate-fail', 'click')} class="setting-button"><span>Try again!</span></button>
                  </div>
                </li>
                <li ${ref('warning.less-words')} ${classes('warning.less-words')} class="warning">
                  <p class="prompt">
                    ${child($iconWarning())}
                    After ${this.data.attempts} attemps, the crossword could not be generated 
                    with the chosen number of words. Some of the words do not match and could not be crossed in any way. 
                    In the end the crossword has been generated with <span ${ref('crossing-words-output')}></span> words.
                  </p>
                  <div class="controls">
                    <button ${on('config.confirm.less-words', 'click')} class="setting-button"><span>Ok!</span></button>
                    <button ${on('config.reject.less-words', 'click')} class="setting-button"><span>Try again!</span></button>
                  </div>
                </li>
              </ul>
            </section>
            <section class="shortcuts">
              <ul>
                <li>
                  <span class="key">Enter</span>
                  <span class="action">Switch to the next clue</span>
                </li>
                <li>
                  <span class="key">Space</span>
                  <span class="action">Toggle hint box</span>
                </li>
                <li>
                  <span class="key">Esc</span>
                  <span class="action">Close hint box</span>
                </li>
                <li>
                  <span class="key">Ctrl</span> + 
                  <span class="key">Enter</span>
                  <span class="action">Play pronunciation | Switch image</span>
                </li>
                <li>
                  <span class="key">Ctrl</span> + 
                  <span class="key">F</span>
                  <span class="action">Find word in text</span>
                </li>
                <li>
                  <span class="key">↑</span>, 
                  <span class="key">↓</span>, 
                  <span class="key">←</span>, 
                  <span class="key">→</span>
                  <span class="action">Scroll crossword</span>
                </li>
              </ul>
            </section>
          </li>
          <li ${ref('page.crossword')} ${classes('page.crossword')} class="crossword-page hidden"></li>
        </ul>
      </div>
    `);
    this.dom = template.references;
    this.classes = template.classes;
    this.html = template;
  }

  generateCrossword() {
    if (this.state.disabled) return;
    const warning = this.classes.get('warning').get('remove-crossword');
    const alreadyExisting = this.state.generated && !this.state.finished;
    warning[alreadyExisting ? 'add' : 'remove']('visible');

    if (alreadyExisting) {
      this._disableButtons('generate');
      this.state.disabled = true;
      return;
    }

    this._createVirtualGrid();
  }

  _createVirtualGrid() {
    this.ref.virtual = new VirtualGrid(this, {
      number: this.data.wordsNumber,
      min: this.data.wordsMinNumber,
      clues: this.data.permitedClueTypes,
      words: this.data.filtered,
      totalAttempts: this.data.attempts,
    });

    this.ref.virtual.on.warning = (used) => {
      this.dom.get('crossing-words-output').innerHTML = used.size;
      this.classes.get('warning').get('less-words').add('visible');
      this.classes.get('button').get('crossword').remove('disabled');
      this._disableButtons('generate');
      this._createNewInstances(used.size);
      this._appendCrossword();
      this.state.disabled = true;
      this.state.generated = true;
      this.state.finished = false;
    };

    this.ref.virtual.on.fail = () => {
      this.classes.get('warning').get('generate-fail').add('visible');
      this.classes.get('button').get('crossword').add('disabled');
      this._disableButtons('generate');
      this.state.disabled = true;
      this.state.generated = false;
      this.state.finished = true;
    };

    this.ref.virtual.on.success = (used) => {
      this.classes.get('button').get('crossword').remove('disabled');
      this._createNewInstances(used.size);
      this._appendCrossword();
      this._switchCrosswordPage('crossword');
      this.state.generated = true;
      this.state.finished = false;
    };

    this.ref.virtual.create();
  }

  _createNewInstances(totalNumber) {
    this.ref.hint = new Hint(this);
    this.ref.keyboard = new VirtualKeyboard();
    this.ref.grid = new Grid(this);
    this.ref.game = new Game(this, { totalNumber });
    this.ref.star = new StarHint(this, { dom: this.dom, classes: this.classes, totalNumber });
  }

  _appendCrossword() {
    const crosswordPage = this.dom.get('page').get('crossword');
    const content = this.ref.grid.dom.get('content');
    crosswordPage.innerHTML = '';
    crosswordPage.appendChild(content);
  }

  _addListeners() {
    const { $on } = this.html;
    window.addEventListener('resize', () => this._toggleNavigation('close'));
    $on('nav', ({ last, data, event }) => {
      if (last === 'config' || last === 'crossword') this._switchCrosswordPage(last);
      if (last === 'previous' || last === 'next') this.ref.game.switchWord(data);
      if (last === 'game-over') this.ref.game.gameOver();
      if (last === 'star') this.ref.star.event.mouseDown(event);
      if (last === 'toggle') this._toggleNavigation(last);
      if (last === 'close') this.close();
    });

    $on('config', ({ id, last, data }) => {
      if (id.startsWith('config.words-number')) this._updateCrosswordWordsNumber(data);
      if (id.startsWith('config.switch')) this._permitClue(last);
      if (last === 'generate') this.generateCrossword();
    });

    $on('config.confirm', ({ last }) => {
      warningAction.call(this, last);
      if (last === 'less-words') this._switchCrosswordPage('crossword');
      if (last === 'remove-crossword') {
        this.state.finished = true;
        this.generateCrossword();
      }
    });

    $on('config.reject', ({ last }) => {
      warningAction.call(this, last);
      if (last === 'remove-crossword') this._switchCrosswordPage('crossword');
      if (last === 'generate-fail' || last === 'less-words') this.generateCrossword();
    });

    function warningAction(name) {
      this.classes.get('warning').get(name).remove('visible');
      this._enableButtons('generate');
      this.state.disabled = false;
    }
  }

  _toggleNavigation(action) {
    const navigation = this.classes.get('panel');
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

  _addKeywordListeners() {
    window.addEventListener('keydown', (event) => {
      if (this.state.activePage !== 'crossword' || !this.state.opened) return;
      this.ref.grid.dom.get('container').focus();
      if (event.keyCode === 13 && event.ctrlKey) this.ref.hint.perform();
      if (event.keyCode === 70 && event.ctrlKey) this.ref.hint.seekOccurrence(event);
      if (event.ctrlKey === true) return;
      if (event.keyCode === 13) this.ref.game.switchWord(1);
      if (event.keyCode === 8) this.ref.game.word.backspace();
      if (event.keyCode === 46) this.ref.game.word.delete();
      if (event.keyCode === 27) this.ref.hint.switch('close');
      this.ref.game.word.type(event, () => this.ref.hint.switch('toggle'));
    });
  }

  _switchCrosswordPage(name) {
    const previous = this.state.activePage;

    if (this.classes.get('button').get(name).has('disabled')) return;
    if (previous === name) return;
    this.state.activePage = name;

    if (name === 'config') this._toggleNavigation('close');

    this.dom.get('panel').setAttribute('data-page', name);
    this.classes.get('button').get(name).add('active');
    this.classes.get('page').get(name).remove('hidden');

    if (previous) {
      this.classes.get('button').get(previous).remove('active');
      this.classes.get('page').get(previous).add('hidden');
    }
  }

  _permitClue(name) {
    const classes = this.classes.get('button').get('switch').get(name);
    let has = classes.has('on');
    if (has && this.data.permitedClueTypes.size === 1) return;
    classes[has ? 'remove' : 'add']('on');
    this.data.permitedClueTypes[has ? 'delete' : 'add'](name);
    this.data.filtered = this.ref.words.filterClues(this.data.permitedClueTypes);
    this.data.totalWordsNumber = this.data.filtered.size;
    this.dom.get('output-total-words').innerHTML = this.data.totalWordsNumber;
    this._updateCrosswordWordsNumber();
  }

  _updateCrosswordWordsNumber(value = 0) {
    const newValue = this.data.wordsNumber + value;
    const output = this.dom.get('output-used-words');
    const all = this.ref.words.size;
    const lowest = Math.min(all, this.data.wordsMaxNumber);
    const warning = this.classes.get('warning').get('insufficient-words');
    warning.remove('visible');
    this._enableButtons('min', 'max', 'increase', 'decrease', 'generate');
    this.classes.get('warning').get('remove-crossword').remove('visible');
    this.state.disabled = false;

    switch (true) {
      case all < this.data.wordsMinNumber:
        output.innerHTML = this.data.wordsMinNumber;
        this.data.wordsNumber = this.data.wordsMinNumber;
        warning.add('visible');
        this._disableButtons('min', 'max', 'increase', 'decrease', 'generate');
        this.state.disabled = true;
        return;
      case newValue >= lowest:
        output.innerHTML = lowest;
        this.data.wordsNumber = lowest;
        this._disableButtons('max', 'increase');
        return;
      case newValue <= this.data.wordsMinNumber:
        output.innerHTML = this.data.wordsMinNumber;
        this.data.wordsNumber = this.data.wordsMinNumber;
        this._disableButtons('min', 'decrease');
        return;
    }
    output.innerHTML = newValue;
    this.data.wordsNumber = newValue;
  }

  _disableButtons() {
    for (let name of arguments) {
      this.classes.get('button').get(name).add('disabled');
    }
  }

  _enableButtons() {
    for (let name of arguments) {
      this.classes.get('button').get(name).remove('disabled');
    }
  }

}

export default Crossword;
