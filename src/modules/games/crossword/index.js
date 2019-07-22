import type from 'of-type';
import './../buttons.scss';
import './../game.scss';
import './navigation.scss';
import './config.scss';
import './crossword.scss';
import './hint.scss';

const { Slider, Scroller } = $commons;
const { $randomItem, $templater, $loopParents, $loopBetween } = $utils;
const { $words } = $data;
const { $iconCheckIn, $iconCheckOut, $iconConfig, $iconGameCrossword, $iconPrevious, $iconNext, $iconStar,
  $iconMinimize, $iconWarning, $iconGameFinish, $iconQuestionMark, $iconGameTranslate, $iconOccurrence,
  $iconGameDefinition, $iconGamePronunciation, $iconGameImage, $iconClose, $iconVolume } = $icons;

class Words {
  constructor({ words }) {
    this.words = words;
    this.map = {
      all: new Map(),
      strings: new Map(),
      globalUsed: new Set()
    };
    this._buildAllWordsMap(words);
    this._buildStringsMap();
  }

  get size() {
    return this.map.filtered.size;
  }

  get _alphabet() {
    return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ' '];
  }

  get _random() {
    const map = this.map.filteredUnused.size > 0 ? this.map.filteredUnused : this.map.filtered;
    return $randomItem([...map.keys()]);
  }

  _buildAlphabetMap() {
    this.map.alphabet = new Map();
    for (let x of this._alphabet) {
      this.map.alphabet.set(x, { expression: new RegExp(x), data: [] });
      for (let y of this._alphabet) this.map.alphabet.set(x + y, { expression: new RegExp(`${x}.*${y}`), data: [] });
    }
  }

  _buildAllWordsMap(wordsList) {
    wordsList.forEach(({ id }) => {
      if (!$words.has(id) || this.map.all.has(id)) return;
      let record = $words.get(id);
      record.id = id;
      this.map.all.set(id, record);
    });
  }

  _buildStringsMap() {
    this.map.all.forEach((record) => {
      let { crossword } = record;
      this.map.strings.set(record, reduce(crossword));
    });
    function reduce(arr) {
      let total = '';
      for (let i = 0; i < arr.length; i++) {
        let string = typeof arr[i] === 'string';
        let word = string ? arr[i] : arr[i][0];
        let last = i === arr.length - 1;
        total += word;
        total += last ? '' : ' ';
      }
      return total;
    }
  }

  filter(clues) {
    this.map.alphabet = null;
    this.map.filtered = new Set();
    this.map.filteredUnused = new Set();
    this.map.all.forEach((record) => {
      if (clues.has('meaning') || clues.has('definition') && record.definition || clues.has('img') && record.img || clues.has('audio') && record.audio) {
        this.map.filtered.add(record);
        if (!this.map.globalUsed.has(record)) this.map.filteredUnused.add(record);
      }
    });
  }

  build() {
    if (type(this.map.alphabet, Map)) return;
    this._buildAlphabetMap();
    for (let record of this.map.filtered) {
      let word = this.map.strings.get(record);
      this.map.alphabet.forEach(({ expression, data }) => {
        if (word.match(expression)) data.push(record);
      });
    }
  }

  has({ before = Infinity, after = Infinity, characters, localUsed }) {
    before = before < 0 ? 0 : before;
    after = after < 0 ? 0 : after;
    const start = before === 0 ? '^(.{0})' : before === Infinity ? '^(.*)' : `^(.{0,${before}})`;
    const end = after === 0 ? '(.{0})$' : after === Infinity ? '(.*)$' : `(.{0,${after}})$`;
    let middle = '';
    let firstLetters = '';

    for (let item of characters) {
      if (typeof item === 'number') middle += `.{${item}}`
      if (typeof item === 'string') {
        let isLetter = /[a-z ]/.test(item);
        middle += isLetter ? item : '\\' + item;
        firstLetters += item;
      }
    }

    const expression = new RegExp(start + `(${middle})` + end);
    const seekLetters = firstLetters.slice(0, 2).toLowerCase();
    const words = { free: null, used: null };

    if (!this.map.alphabet.has(seekLetters)) return words;
    const { data } = this.map.alphabet.get(seekLetters);

    data.forEach((record) => {
      let word = this.map.strings.get(record);
      let match = word.match(expression);
      if (match === null) return;
      if (localUsed.has(record)) return;
      let matchData = {
        record,
        size: match[0].length,
        before: match[1].length,
        middle: match[2].length,
        after: match[3].length
      };
      if (this.map.globalUsed.has(record)) {
        if ((!words.used || matchData.size > words.used.size)) words.used = matchData;
      } else {
        if (!words.free || matchData.size > words.free.size) words.free = matchData;
      }
    })

    return words;
  }

  useWord(record) {
    this.map.filteredUnused.delete(record);
  }

  guessWord(record) {
    this.map.globalUsed.add(record);
  }

}

class Game {
  constructor(virtual, grid, hint, crossword) {
    this.virtual = virtual;
    this.grid = grid;
    this.hint = hint;
    this.crossword = crossword;
    this.scroller = new Scroller({
      container: this.grid.dom.get('container'),
      scrollTime: 800,
      fps: 32,
      offset: .1,
      horizontally: true,
      vertically: true
    });
    this.data = {};
    this.state = {
      currentIndex: null,
      resolvedNumber: 0
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
    return this.virtual.word.get(this.index || 0);
  }

  _addListeners() {
    const table = this.grid.dom.get('table');

    table.addEventListener('click', (event) => {
      $loopParents(event.target, (parent, stop) => {
        if (parent === table) return stop();
        if (parent.tagName === 'TD') {
          if (this.virtual.cell.has(parent)) this.chooseWord(this.virtual.cell.get(parent));
          return stop();
        }
      });
    });
  }

  restart() {
    this.word.active = true;
    setTimeout(() => this.scrollView(), 100);
    this.hint.update(this.word);
    this.hint.switch('open');
  }

  switchWord(shift) {
    const size = this.virtual.word.size - 1;
    const loopSide = shift > 0 ? [0, size] : [size, 0];
    $loopBetween(...loopSide, this.index, (next, stop) => {
      let word = this.virtual.word.get(next);
      if (!word.state.resolved || this.crossword.state.finished) {
        if (this.index === next) return;
        this.word.active = false;
        this.index = next;
        this.word.active = true;
        this.scrollView();
        this.hint.update(this.word);
        this.hint.switch('open');
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
      this.hint.update(this.word);
      break;
    }

    if (thesame && words.length === 1) this.hint.switch('toggle');
    else this.hint.switch('open');
  }

  gameOver() {
    if (this.crossword.state.finished) return;
    this.virtual.word.forEach((word) => {
      if (!word.state.resolved) word.fix();
    });
    this.crossword.hint.switchOccurrence(true);
  }

  scrollView() {
    this.scroller.scroll(this.word.clue.cell);
  }

  _resetResolved() {
    const score = this.crossword.dom.get('score');
    const total = this.crossword.dom.get('total');
    this.state.resolvedNumber = 0;
    score.innerHTML = this.state.resolvedNumber;
    this.state.totalNumber = this.crossword.data.wordsNumber;
    total.innerHTML = this.state.totalNumber;
  }

  updateResolved() {
    const scoreElement = this.crossword.dom.get('score');
    const scoreClasses = this.crossword.classes.get('score');
    const totalClasses = this.crossword.classes.get('total');
    this.state.resolvedNumber++;
    scoreElement.innerHTML = this.state.resolvedNumber;
    scoreClasses.add('resolved').wait(1200).remove('resolved');
    if (this.state.resolvedNumber === this.state.totalNumber) {
      totalClasses.add('resolved').wait(2200).remove('resolved');
      this.crossword.state.finished = true;
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
    this._buildView();
    this._buildMedia();
    this._addListeners();
    this._addPlayerListeners();
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
        this.state.opened = true;
        return classes.add('displayed').wait(10).add('visible');
      case 'close':
        this.state.opened = false;
        return classes.remove('visible').wait(480).remove('displayed');
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
    this.dom.get('button').addEventListener('click', () => this.switch('toggle'));
    this.dom.get('autoplay').addEventListener('click', () => this._toggleAutoplay());
    this.dom.get('occurrence').addEventListener('click', (event) => this.seekOccurrence(event));
  }

  seekOccurrence(event) {
    if (!this.state.currentWord.state.resolved) return;
    event.preventDefault();
    this.crossword.close();
    this.crossword.dialog.seekOccurrence(this.state.currentWord.record.id);
  }

  _toggleAutoplay() {
    this.state.autoplay = !this.state.autoplay;
    this.classes.get('autoplay')[this.state.autoplay ? 'add' : 'remove']('on');
  }

  _addPlayerListeners() {
    const player = this.dom.get('player');
    const classes = this.classes.get('player');
    const audio = this.data.player;

    player.addEventListener('click', () => this._playAudio());
    audio.addEventListener('play', () => classes.add('playing'));
    audio.addEventListener('ended', () => {
      if (this.state.currentAudioIndex < this.data.audioSources.length - 1) {
        this.state.currentAudioIndex++;
        audio.src = this.data.audioSources[this.state.currentAudioIndex];
        audio.play();
      } else {
        classes.remove('playing');
        this.state.currentAudioIndex = Infinity;
      }
    });
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
    const { references, classes } = $templater(({ ref, child, classes }) =>/*html*/`
      <ul ${ref('container')} ${classes('container')} class="hint-box">
        <li ${ref('button')} class="hint-button">
          <div>
            <ul class="sprite">
              <li class="open">${child($iconQuestionMark())}</li>
              <li class="close">${child($iconClose())}</li>
            </ul>
          </div>
        </li>
        <li ${ref('dialog')} class="hint-dialog">
          <ul class="list">
            <li ${ref('meaning')} ${classes('meaning')} class="card meaning">a</li>
            <li ${ref('definition')} ${classes('definition')} class="card definition">b</li>
            <li ${ref('img')} ${classes('img')} class="card image">
              ${child(this.slider.view)}
            </li>
            <li ${ref('audio')} ${classes('audio')} class="card audio">
              <div class="section button">
                <span ${ref('player')} ${classes('player')} class="button player">
                  ${child($iconVolume())}
                </span>
              </div>
              <div ${ref('autoplay')} ${classes('autoplay')} class="section autoplay">
                <span class="check on">${child($iconCheckIn())}</span>
                <span class="check off">${child($iconCheckOut())}</span>
                <span class="label">autoplay</span>
              </div>
            </li>
          </ul>
          <p ${ref('word-type')} class="word-type"></p>
          <div ${ref('occurrence')} ${classes('occurrence')} class="find-occurrence">
            <div>
              ${child($iconOccurrence())}
            </div>
          </div>
        </li>
      </ul>
    `);
    this.dom = references;
    this.classes = classes;
  }

  _buildMedia() {
    this.data.player = document.createElement('AUDIO');
  }
}





class Grid {
  constructor(virtual, hint) {
    this.virtual = virtual;
    this.hint = hint;
    this._buildCrosswordView();
    this._addElementsReferences();
  }

  _addElementsReferences() {
    this.virtual.word.forEach((word) => {
      let clueCell = this.getCellByCoords(word.clue.x, word.clue.y, 'clue');
      let clueClasses = this.getClassesByCoords(word.clue.x, word.clue.y, 'clue');
      word.clue.cell = clueCell;
      word.clue.classes = clueClasses;
      this.virtual.addCell(clueCell, word);
      word.letters.forEach((letter) => {
        let letterCell = this.getCellByCoords(letter.x, letter.y, 'letter');
        let letterInput = this.getCellByCoords(letter.x, letter.y, 'input');
        let letterClasses = this.getClassesByCoords(letter.x, letter.y, 'letter');
        letter.classes = letterClasses;
        letter.input = letterInput;
        letter.cell = letterCell;
        this.virtual.addCell(letterCell, word);
      });
    });
  }

  meaning() {

  }

  _buildCrosswordView() {
    const container = $templater(({ ref, child, classes }) =>/*html*/`
      <div ${ref('content')}>
        <div ${ref('container')} tabindex="0">
          ${child(this._crossword())}
        </div>
        <div>
          ${child(this.hint.view)}
        </div>
      </div>
    `);
    this.dom = container.references;
    this.classes = container.classes;
  }

  getCellByCoords(x, y, name) {
    return this.dom.get(name).get(String(x)).get(String(y));
  }

  getClassesByCoords(x, y, name) {
    return this.classes.get(name).get(String(x)).get(String(y));
  }

  _crossword() {
    return $templater(({ loop, ref, child, classes }) =>/*html*/`
      <table ${ref('table')} id="crossword-table">
        <tbody>
          ${loop(this.virtual.rows.size, (y) =>/*html*/`
            ${child(this._row(y))}
          `)}
        </tbody>
      </table>
    `);
  }

  _row(y) {
    return $templater(({ child, loop }) =>/*html*/`
    <tr>
      ${loop(this.virtual.columns.size, (x) => /*html*/`
        ${child(this._cell(x, y))}
      `)}
    </tr>
    `);
  }

  _cell(x, y) {
    let column = this.virtual.edges.left + x;
    let row = this.virtual.edges.top + y;
    let letter = this.virtual.hasLetter(column, row);
    let keyword = this.virtual.hasKeyword(column, row);

    const cell = $templater(({ ref, when, child, classes }) =>/*html*/`
      ${when(keyword, () =>/*html*/`
        <td class="clue-cell ${keyword.side}" ${ref(`clue.${column}.${row}`)} ${classes(`clue.${column}.${row}`)}>
          ${child(this._clue(keyword.clue.type, keyword.side))}
        </td>
      `)}
      ${when(letter, () =>/*html*/`
        <td class="letter-cell" ${ref(`letter.${column}.${row}`)} ${classes(`letter.${column}.${row}`)}>
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
  constructor({ x, y, side, record, index, virtual, crossword, words }) {
    this._data = { x, y, side, record, letters: [], string: '', queuedLetters: [], cells: new Map() };
    this.index = index;
    this.virtual = virtual;
    this.words = words;
    this.crossword = crossword;
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
    this._build(x, y, side, this._data);
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

  get record() {
    return this._data.record;
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
    for (let { fixed, letter, index } of this.letters) {
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
    else event.preventDefault();
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
    const words = this.virtual.cell.get(letter.cell);
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
    this.crossword.game.updateResolved();

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
    this.words.guessWord(this.record);
    this.crossword.hint.switchOccurrence(true);
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

  _build(_x, _y, side, data) {
    const words = data.record.crossword;
    const virtual = this.virtual;
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
          return this.cell && virtual.fixed.has(this.cell) ? true : _private.fixed;
        },
        set fixed(v) {
          if (this.cell && v) {
            virtual.fixed.add(this.cell);
            _private.word._queueFixed(this);
          } else {
            _private.fixed = v;
          }
        },
        set filled(letter) {
          if (!letter) {
            const words = _private.word.virtual.cell.get(this.cell);
            const crossed = words.filter((word) => word !== _private.word)[0];
            _private.filled = false;
            /*
              !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
              REPLACE THE LOOP WITH THE this._data.cells.get(cell)
              !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            */
            if (crossed && crossed.active) {
              for (let { cell, filled } of crossed.letters) {
                if (cell === this.cell) {
                  if (filled) return;
                  else break;
                }
              }
            }
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
    for (let i = 0; i < words.length; i++) {
      let fixed = type(words[i], Array);
      let word = fixed ? words[i][0] : words[i];
      for (let letter of word) next(letter, fixed);
      if (i < words.length - 1) next(' ', true);
    }

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
  constructor({ crossword, words, number, clues }) {
    this.words = words;
    this.crossword = crossword;
    this.data = { number, clues };

    this.columns = new Map();
    this.rows = new Map();
    this.edges = this._edges;
    this.word = new Map();
    this.cell = new Map();
    this.fixed = new Set();
    this.used = new Set();
    this._buildVirtualCrossword();
    this._buildCluesMap();
  }

  get _edges() {
    return {
      left: Infinity,
      right: -Infinity,
      top: Infinity,
      bottom: -Infinity
    };
  }

  addCell(cell, word) {
    if (!this.cell.has(cell)) this.cell.set(cell, []);
    this.cell.get(cell).push(word);
  }

  _buildVirtualCrossword() {
    this.words.build();
    const record = this.words._random;
    const side = $randomItem(['vertical', 'horizontal']);
    this._addWord(0, 0, side, record);
    let previous = this.used.size;
    while (this.used.size < this.data.number) {
      this._nextWord();
      if (this.used.size === previous) {
        console.warn('COULD NOT CREATE A GRID');
        break;
        //it should take another attempt;
      } else {
        previous = this.used.size;
      }
    }
  }

  _buildCluesMap() {
    const permittedClues = this.data.clues;
    const wordInstances = createRecords(this.word);
    const clueMap = createClueMap();
    for (let word of wordInstances) {
      let chosenClueName = nextClue(word.record);
      word.clue.type = chosenClueName;
      clueMap.get(chosenClueName).records++;
    }

    function createRecords(map) {
      const records = [...map.values()];
      records.sort((a, b) => countClues(a.record) - countClues(b.record));
      return records;
    }

    function countClues(record) {
      let iter = 0;
      permittedClues.forEach((clueName) => iter = record[clueName] ? iter + 1 : iter);
      return iter;
    }

    function nextClue(record) {
      let chosen = null, lowest = Infinity;
      clueMap.forEach(({ size, records }, name) => {
        if (!record[name]) return;
        if (records < lowest) {
          chosen = name;
          lowest = records;
        }
        if (records === lowest && size < clueMap.get(chosen).size) chosen = name;
      });
      return chosen;
    };

    function createClueMap() {
      const map = new Map();
      for (let word of wordInstances) {
        permittedClues.forEach((clueName) => {
          if (!word.record[clueName]) return;
          if (!map.has(clueName)) map.set(clueName, { size: 0, records: 0 });
          map.get(clueName).size++;
        });
      }
      return map;
    }
  }

  _addWord(x, y, side, record) {
    const word = this._createWord(x, y, side, record);
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

    this.used.add(record);
    this.words.useWord(record);

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
        else addBreak();
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

    function addBreak() {
      if (currentExpression) {
        currentExpression.after = spacesIterator;
        expressions.push(currentExpression);
        currentExpression = null;
      }
      limitedSpace = true;
      spacesIterator = 0;
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

  _createWord(x, y, side, record) {
    const instance = new Word({ x, y, side, record, index: this.word.size, virtual: this, crossword: this.crossword, words: this.words });
    this.word.set(this.word.size, instance);
    return instance;
  }

  _nextWord() {
    let bestFree = null;
    let bestBusy = null;

    this._loopLines((line) => {
      if (this.used.has(line.match.record)) this._seekMatches(line);
      if (line.type === 'free') {
        if (!bestFree || line.match.crosses > bestFree.match.crosses) bestFree = line;
      } else if (line.type === 'used') {
        if (!bestBusy || line.match.crosses > bestBusy.match.crosses) bestBusy = line;
      }
    });

    const bestLine = bestFree || bestBusy;
    const x = bestLine.side === 'horizontal' ? bestLine.match.index : bestLine.index;
    const y = bestLine.side === 'vertical' ? bestLine.match.index : bestLine.index;
    const side = bestLine.side;
    const record = bestLine.match.record;
    this._addWord(x, y, side, record);
  }

  _seekMatches(line) {
    let _free = null;
    let _used = null;
    let _index = null;
    let _crosses = 0;

    for (let { before, after, index, characters } of line.expressions) {
      let usedLevel = false;
      let foundMatch = false;
      for (let x = characters.length; x >= 1; x -= 2) {
        let shift = 0;
        for (let y = 0; y + x <= characters.length; y += 2) {
          shift += y === 0 ? 0 : characters[y - 1] + 1;
          let matches = this.words.has({
            localUsed: this.used,
            before: y === 0 ? before : characters[y - 1] - 1,
            after: y + x === characters.length ? after : characters[y + x] - 1,
            characters: characters.slice(y, y + x)
          });
          if (matches.free && (_free === null || matches.free.size > _free.size)) {
            _index = index + shift - matches.free.before;
            _free = matches.free;
            _crosses = characters.length - (characters.length - 1) / 2;
            foundMatch = true;
          }
          if (_free !== null || usedLevel) continue;
          if (matches.used && (_used === null || matches.used.size > _used.size)) {
            _index = index + shift - matches.used.before;
            _used = matches.used;
            _crosses = characters.length - (characters.length - 1) / 2;
            foundMatch = true;
          }
        }
        if (_free !== null) break;
        if (_used !== null) usedLevel = true;
      }
      if (!foundMatch) {
        let size = 1;
        for (let i = 1; i < characters.length; i += 2) size += characters[i] + 1;
        for (let i = 0; i < size; i++) line.busy.set(index + i, false);
      }
    }
    const chosenRecord = _free ? _free.record : _used ? _used.record : null;
    line.match = { record: chosenRecord, index: _index, crosses: _crosses };
    line.type = _free ? 'free' : _used ? 'used' : null;
  }

  _loopLines(callback) {
    this.rows.forEach(callback);
    this.columns.forEach(callback);
  }

}


class StarHint {
  constructor(virtual, dom, classes, wordsNumber) {
    this.virtual = virtual;
    this.dom = dom;
    this.classes = classes;
    this.data = {
      wordsNumber,
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
    this._addListeners();
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

  _addListeners() {
    this.dom.get('button').get('star').addEventListener('mousedown', this.event.mouseDown);
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
      const words = this.virtual.cell.get(cell);
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
        callback(this.virtual.cell.get(parent) || null, parent);
        stop();
      }
    });
  }
}

class CrosswordView {
  constructor(dialog) {
    this.dialog = dialog;
    this.data = {
      wordMaps: new Map(),
      permitedClueTypes: new Set(),
      wordsMinNumber: 5,
      wordsMaxNumber: 50,
      wordsNumber: 10
    };
    this.dom = {};
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
    this._addGameListeners();
    this._addKeywordListeners();
  }

  get view() {
    return this.dom.get('container');
  }

  get on() {
    return this._on;
  }

  open(words) {
    this.state.opened = true;
    if (this.on.open) this.on.open();
    this.classes.get('container').remove('hidden');
    if (this.state.activePage === null) this._switchCrosswordPage('config');
    if (this.data.wordMaps.has(words)) return this.data.currentWordsMap = this.data.wordMaps.get(words);
    this.data.wordMaps.set(words, new Words({ words }));
    this.data.currentWordsMap = this.data.wordMaps.get(words);
    this._permitClue(this.classes.get('button').get('switch').get('meaning'), 'meaning');
  }

  close() {
    this._toggleNavigation('close');
    this.classes.get('container').add('hidden');
    this.data.currentWordsMap = null;
    this.state.opened = false;
    if (this.on.close) this.on.close();
  }

  _switchButtonView(name) {
    return $templater(({ ref, classes }) =>/*html*/`
    <button ${ref(`button.switch.${name}`)} ${classes(`button.switch.${name}`)} class="switch-button">
      <span></span>
    </button>`);
  }

  _buildView() {
    const { references, classes } = $templater(({ ref, child, classes }) =>/*html*/`
      <div ${ref('container')} ${classes('container')} class="game-container crossword hidden">
        <nav ${ref('panel')} ${classes('panel')} class="navigation-panel">
          <div class="controls game">
            <ul class="buttons pages">
              <li ${ref('button.config')} ${classes('button.config')} >${child($iconConfig())}</li>
              <li ${ref('button.crossword')} ${classes('button.crossword')} class="disabled">${child($iconGameCrossword())}</li>
            </ul>
            <ul class="buttons game">
              <li ${ref('button.previous')}>${child($iconPrevious())}</li>            
              <li ${ref('button.next')}>${child($iconNext())}</li>            
              <li ${ref('button.star')} class="button-star">${child($iconStar())}</li>
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
                <span ${ref('button.game-over')}>${child($iconGameFinish())}</span>
              </li>
            </ul>
          </div>
          <div class="controls navigation">
            <ul>
              <li class="toggle-menu" ${ref('button.toggle')}>
                <div><i></i></div>
                <div><i></i></div>
                <div><i></i></div>
              </li>
              <li ${ref('button.close')} class="close">${child($iconMinimize())}</li>
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
                    <button ${ref('button.min')} ${classes('button.min')} class="setting-button"><span>min</span></button>
                    <button ${ref('button.decrease')} ${classes('button.decrease')} class="setting-button"><span>-</span></button>
                    <button ${ref('button.increase')} ${classes('button.increase')} class="setting-button"><span>+</span></button>
                    <button ${ref('button.max')} ${classes('button.max')} class="setting-button"><span>max</span></button>
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
                <button ${ref('button.generate')} ${classes('button.generate')} class="setting-button">
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
                    <button ${ref('button.confirm')} class="setting-button"><span>Yes, give me new crossword!</span></button>
                    <button ${ref('button.reject')} class="setting-button"><span>No, let me finish it up!</span></button>
                  </div>
                </li>
                <li ${ref('warning.insufficient-words')} ${classes('warning.insufficient-words')} class="warning">
                  <p class="prompt">
                    ${child($iconWarning())}
                    At least ${this.data.wordsMinNumber} words are needed to build the crossword.
                  </p>
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
    this.dom = references;
    this.classes = classes;
  }

  generateCrossword() {
    const warning = this.classes.get('warning').get('remove-crossword');
    const alreadyExisting = this.state.generated && !this.state.finished;
    warning[alreadyExisting ? 'add' : 'remove']('visible');

    if (this.state.disabled) return;
    if (alreadyExisting) return this._disableButtons('generate');

    this.classes.get('button').get('crossword').remove('disabled');
    this._createNewInstances();
    this._appendCrossword();
    this._switchCrosswordPage('crossword');
    this.state.generated = true;
    this.state.finished = false;
  }

  _createNewInstances() {
    this.virtual = new VirtualGrid({ crossword: this, words: this.data.currentWordsMap, number: this.data.wordsNumber, clues: this.data.permitedClueTypes });
    this.hint = new Hint(this);
    this.grid = new Grid(this.virtual, this.hint);
    this.game = new Game(this.virtual, this.grid, this.hint, this);
    this.star = new StarHint(this.virtual, this.dom, this.classes, this.data.wordsNumber);
  }

  _appendCrossword() {
    const crosswordPage = this.dom.get('page').get('crossword');
    const content = this.grid.dom.get('content');
    crosswordPage.innerHTML = '';
    crosswordPage.appendChild(content);
  }

  _addListeners() {
    const button = this.dom.get('button');
    button.get('close').addEventListener('click', () => this.close());
    button.get('config').addEventListener('click', () => this._switchCrosswordPage('config'));
    button.get('crossword').addEventListener('click', () => this._switchCrosswordPage('crossword'));
    button.get('generate').addEventListener('click', () => this.generateCrossword());
    button.get('min').addEventListener('click', () => this._updateCrosswordWordsNumber(-Infinity));
    button.get('max').addEventListener('click', () => this._updateCrosswordWordsNumber(Infinity));
    button.get('increase').addEventListener('click', () => this._updateCrosswordWordsNumber(1));
    button.get('decrease').addEventListener('click', () => this._updateCrosswordWordsNumber(-1));
    button.get('switch').forEach((elem, name) => {
      elem.addEventListener('click', () => {
        this._permitClue(this.classes.get('button').get('switch').get(name), name);
      })
    });
    button.get('confirm').addEventListener('click', () => {
      this.state.finished = true;
      this._enableButtons('generate');
      this.generateCrossword();
    });
    button.get('reject').addEventListener('click', () => {
      this.classes.get('warning').get('remove-crossword').remove('visible');
      this._enableButtons('generate');
      this._switchCrosswordPage('crossword');
    });

    button.get('toggle').addEventListener('click', () => this._toggleNavigation('toggle'));
    window.addEventListener('resize', () => this._toggleNavigation('close'));
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
      this.grid.dom.get('container').focus();
      if (event.keyCode === 13 && event.ctrlKey) this.hint.perform();
      if (event.keyCode === 70 && event.ctrlKey) this.hint.seekOccurrence(event);
      if (event.ctrlKey === true) return;
      if (event.keyCode === 13) this.game.switchWord(1);
      if (event.keyCode === 8) this.game.word.backspace();
      if (event.keyCode === 46) this.game.word.delete();
      if (event.keyCode === 27) this.hint.switch('close');
      this.game.word.type(event, () => this.hint.switch('toggle'));
    });
  }

  _addGameListeners() {
    const button = this.dom.get('button');
    button.get('previous').addEventListener('click', () => this.game.switchWord(-1));
    button.get('next').addEventListener('click', () => this.game.switchWord(1));
    button.get('game-over').addEventListener('click', () => this.game.gameOver());
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

  _permitClue(classes, name) {
    let has = classes.has('on');
    if (has && this.data.permitedClueTypes.size === 1) return;
    classes[has ? 'remove' : 'add']('on');
    this.data.permitedClueTypes[has ? 'delete' : 'add'](name);
    this.data.currentWordsMap.filter(this.data.permitedClueTypes);
    this.data.totalWordsNumber = this.data.currentWordsMap.size;
    this.dom.get('output-total-words').innerHTML = this.data.totalWordsNumber;
    this._updateCrosswordWordsNumber();
  }

  _updateCrosswordWordsNumber(value = 0) {
    const newValue = this.data.wordsNumber + value;
    const output = this.dom.get('output-used-words');
    const all = this.data.currentWordsMap.size;
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

export default CrosswordView;
