import $type from 'of-type';
import './navigation.scss';
import './config.scss';
import './test.scss';

const { Slider } = $commons;
const { $templater } = $utils;
const { $iconMinimize, $iconConfig, $iconGameTest, $iconWarning, $iconChevronDoubleRight,
  $iconOccurrence, $iconQuestionMark, $iconPuzzle, $iconVolume } = $icons;

class Task {
  constructor(wordTest, { id, clue, answers }) {
    this.wordTest = wordTest;
    this.data = { id, clue, answers };
    this.state = { solved: false };
    this._on = {
      _success: null,
      _fail: null,
      get success() {
        return this._success;
      },
      set success(fn) {
        this._success = fn;
      },
      get fail() {
        return this._fail;
      },
      set fail(fn) {
        this._fail = fn;
      },
    };

    this._sortWords();
    this._buildView();
    this._addListeners();
  }

  get on() {
    return this._on;
  }

  get view() {
    return this.dom.get('container');
  }

  _header(index) {
    return ['a', 'b', 'c', 'd'][index];
  }

  _sortWords() {
    const copy = [this.data.id, ...this.data.answers];
    const sorted = [];
    while (copy.length) {
      let random = Math.floor(Math.random() * (copy.length));
      sorted.push(copy.splice(random, 1)[0]);
    }
    this.data.correctIndex = sorted.indexOf(this.data.id);
    this.data.sorted = sorted;
  }

  _wordView() {
    const { word, type } = this.wordTest.ref.words.records.get(this.data.id);
    return $templater(() =>/*html*/`
      <p class="word">${word}</p>
      <p class="type"><span>${type}</span></p>
    `);
  }

  _meaningView() {
    const { meaning, type } = this.wordTest.ref.words.records.get(this.data.id);
    return $templater(({ list }) =>/*html*/`
      <ul class="meanings">
        ${list(meaning, (text) =>/*html*/`
          <li>${text}</li>
        `)}
      </ul>
      <p class="type"><span>${type}</span></p>
    `);
  }

  _definitionView() {
    const { definition, type } = this.wordTest.ref.words.records.get(this.data.id);
    const view = $templater(({ list, when }) =>/*html*/`
      ${when($type(definition, Array), () =>/*html*/`
        <ul class="definition-list">
          ${list(definition, (item) =>/*html*/`
            <li><p class="definition">${item}</p></li>
          `)}
        </ul>
      `)}
      ${when($type(definition, String), () =>/*html*/`
        <p class="definition">${definition}</p>
      `)}
      <p class="type"><span>${type}</span></p>
    `);
    view.template.querySelectorAll('[data-keyword]').forEach((element) => {
      element.innerHTML = '';
      element.appendChild($iconPuzzle());
    });
    return view;
  }

  _audioView() {
    const { audio, type } = this.wordTest.ref.words.records.get(this.data.id);
    this._loadAudio(audio);
    return $templater(({ on, classes, ref, child }) =>/*html*/`
      <div>
        <div class="audio">
          <p ${on('audio-button', 'click')} ${classes('audio-button')} class="audio-button">
            ${child($iconVolume())}
          </p>
          <audio ${ref('player')} ${on('player', ['play', 'ended'])}></audio>
        </div>
        <p class="type"><span>${type}</span></p>
      <div>
    `);
  }

  _imgView() {
    const { img, type } = this.wordTest.ref.words.records.get(this.data.id);
    this.slider = new Slider();
    this.slider.update(img);
    return $templater(({ child }) =>/*html*/`
      <div class="image">
        ${child(this.slider.view)}
        <p class="type"><span>${type}</span></p>
      </div>
    `);
  }

  _buildView() {
    const template = $templater(({ ref, when, list, on, classes, child }) =>/*html*/`
      <div ${ref('container')} ${classes('container')} class="container">
        <section class="section clue">
          <div>
            <div class="index">${child($iconQuestionMark())}</div>
            <div class="content">
              ${when(this.data.clue === 'word', () => child(this._wordView()))}
              ${when(this.data.clue === 'meaning', () => child(this._meaningView()))}
              ${when(this.data.clue === 'audio', () => child(this._audioView()))}
              ${when(this.data.clue === 'definition', () => child(this._definitionView()))}
              ${when(this.data.clue === 'img', () => child(this._imgView()))}
            </div>
          </div>
        </section>
        <section class="section answers">
          <ul>
            ${list(this.data.sorted, (id, index) =>/*html*/`
              <li ${on(`answers.${index}`, 'click', { data: index })} ${classes(`answers.${index}`)} class="answer">
                <h1 class="index">${this._header(index)}</h1>
                <div class="content">
                  ${when(this.data.clue !== 'word', () =>/*html*/`
                    <p class="word">${this.wordTest.ref.words.records.get(id).word}</p>`)}
                  ${when(this.data.clue === 'word', () =>/*html*/`
                    <ul class="meanings">
                      ${list(this.wordTest.ref.words.records.get(id).meaning, (text) =>/*html*/`
                        <li>${text}</li>
                      `)}
                    </ul>
                  `)}
                </div>
                <button ${on(`occurrence.${index}`, 'click', { data: index })} ${classes(`occurrence.${index}`)} class="find">${child($iconOccurrence())}</button>
              </li>
            `)}
          </ul>
        </section>
      </div>
    `);

    this.dom = template.references;
    this.classes = template.classes;
    this.html = template;
  }

  _addListeners() {
    const { $on } = this.html;

    $on('occurrence', ({ data }) => {
      if (!this.state.solved) return;
      const id = this.data.sorted[data];
      this.wordTest.close();
      this.wordTest.ref.dialog.seekOccurrence(id);
    });

    $on('answers', ({ data }) => {
      if (this.state.solved) return;
      this.state.solved = true;
      if (data === this.data.correctIndex) this._correct(data);
      else this._incorrect(data);
    });

    if (this.data.clue === 'audio') {
      $on('audio-button', () => this._playAudio());
      $on('player', ({ type }) => {
        if (type === 'play') {
          this.classes.get('audio-button').add('playing');
        }
        if (type === 'ended') {
          if (this.state.currentAudioIndex < this.data.audioSources.length - 1) {
            this.state.currentAudioIndex++;
            this.dom.get('player').src = this.data.audioSources[this.state.currentAudioIndex];
            this.dom.get('player').play();
          } else {
            this.classes.get('audio-button').remove('playing');
            this.state.currentAudioIndex = Infinity;
          }
        }
      })
    }
  }

  _loadAudio(audio) {
    const sources = $type(audio, String) ? [audio] : audio.filter((item) => $type(item, Array)).map(([word, source]) => source);
    this.data.audioSources = sources;
  }

  _playAudio() {
    this.state.currentAudioIndex = 0;
    this.dom.get('player').src = this.data.audioSources[0];
    this.dom.get('player').play();
  }

  _correct(data) {
    this.classes.get('answers').get(String(data)).add('correct');
    this.classes.get('container').add('solved');
    this.wordTest.ref.words.solve(this.data.id);
    if (this.wordTest.ref.games.presentation) this.wordTest.ref.games.presentation.update(this.data.id);
    this._showOccurrences();
    if (this.on.success) this.on.success();
  }

  _incorrect(data) {
    this.classes.get('answers').get(String(this.data.correctIndex)).add('correct');
    this.classes.get('answers').get(String(data)).add('incorrect');
    this.classes.get('container').add('solved');
    this._showOccurrences();
    if (this.on.fail) this.on.fail();
  }

  _showOccurrences() {
    this.classes.get('occurrence').forEach((classes, index) => {
      classes.wait(Number(index) * 100 + 250).add('visible');
    });
  }

}


class Test {
  constructor(wordTest, { filtered, clues, number }) {
    this.wordTest = wordTest;
    this.data = { filtered, clues, number, answersNumber: 4, index: new Map() };
    this.state = { current: 0, success: 0, failed: 0 }
    this._selectWords();
  }

  get solved() {
    return this.state.success;
  }

  get total() {
    return this.data.number;
  }

  next() {
    if (this.solved === this.total) return;
    const id = this.data.index.get(this.state.current);
    const clue = this.data.collection.get(id);
    const answers = this._selectAnswers(id);
    return new Task(this.wordTest, { id, clue, answers });
  }

  success() {
    this.state.success++;
    this.state.current++;
  }

  fail() {
    const id = this.data.index.get(this.state.current);
    this.data.index.set(this.data.index.size, id);
    this.state.current++;
  }

  _selectWords() {
    const collection = [];
    for (let [index, set] of this.wordTest.ref.words.repetitions.global) {
      for (let id of set) {
        if (this.data.filtered.has(id)) {
          this.data.index.set(collection.length, id);
          collection.push(id);
        }
        if (collection.length === this.data.number) {
          this.data.collection = this.wordTest.ref.words.sortByClueType(collection, this.data.clues);
          return;
        }
      }
    }
  }

  _selectAnswers(questionId) {
    const records = this.wordTest.ref.words.records;
    const answersSet = new Map();
    let iterator = 0;
    records.forEach((data, id) => {
      if (questionId === id) return;
      answersSet.set(iterator, id);
      iterator++;
    });
    const randoms = this._randoms(0, answersSet.size - 1, 3);
    const answers = [];
    randoms.forEach((index) => answers.push(answersSet.get(index)));
    return answers;
  }

  _randoms(min, max, count) {
    let collection = new Set();
    while (collection.size < count) {
      let random = Math.floor(Math.random() * (max - min + 1)) + min;
      if (collection.has(random)) continue;
      else collection.add(random);
    }
    return collection;
  }
}

class WordTest {
  constructor(dialog, words, games) {
    this.ref = { dialog, words, games };
    this.data = {
      permitedClueTypes: new Set(),
      wordsMinNumber: 5,
      wordsMaxNumber: 50,
      wordsNumber: 10
    };
    this.state = {
      created: false,
      finished: false,
      activePage: null,
      taskFinished: false,
      pageNextButtonVisible: false
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

    this.buildView();
    this.addListeners();
    this._permitTestType('word');
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
          <div class="controls game">
            <ul class="buttons pages">
              <li ${on('nav.config', 'click')} ${classes('button.config')} >${child($iconConfig())}</li>
              <li ${on('nav.learn', 'click')} ${classes('button.learn')} class="disabled">${child($iconGameTest())}</li>
            </ul>
            <ul class="buttons info">
              <li>Words:</li>
              <li ${ref('score')} ${classes('score')} class="output score"></li>
              <li>/</li>
              <li ${ref('total')} ${classes('total')} class="output total"></li>
            </ul>
          </div>
          <div class="controls navigation">
            <ul>
              <li ${on('nav.close', 'click')} class="close">${child($iconMinimize())}</li>
            </ul>
          </div>
        </nav>
        <ul class="game-pages">
          <li ${ref('page.config')} ${classes('page.config')} class="config-page hidden">
          
            <section class="settings">
              <div>
                <p>
                  <span>All words to use: </span>
                  <span ${ref('output-total-words')} class="output"></span>
                </p>
                <p>
                  <span>Words to learn: </span>
                  <span ${ref('output-used-words')} class="output">${this.data.wordsNumber}</span>
                  <span class="setting-buttons">
                    <button ${on('config.words-number.min', 'click', { data: -Infinity })} ${classes('button.min')} class="setting-button"><span>min</span></button>
                    <button ${on('config.words-number.decrease', 'click', { data: -1 })} ${classes('button.decrease')} class="setting-button"><span>-</span></button>
                    <button ${on('config.words-number.increase', 'click', { data: 1 })} ${classes('button.increase')} class="setting-button"><span>+</span></button>
                    <button ${on('config.words-number.max', 'click', { data: Infinity })} ${classes('button.max')} class="setting-button"><span>max</span></button>
                  </span>
                </p>
                <div>
                  <p>Test types:</p>
                  <ul class="selection-list">
                    <li>${child(this._switchButtonView('word'))} <span>Translate from English into Polish</span></li>
                    <li>${child(this._switchButtonView('meaning'))} <span>Translate from Polish into English</span></li>
                    <li>${child(this._switchButtonView('audio'))} <span>Guess the word by the sound</span></li>
                    <li>${child(this._switchButtonView('definition'))} <span>Guess the word by the definition</span></li>
                    <li>${child(this._switchButtonView('img'))} <span>Guess the word by the picture</span></li>
                  </ul>
                </div>
              </div>
            </section>
            <section class="controls">
              <div>
                <button ${on('config.create', 'click')} ${classes('button.create')} class="setting-button">
                  <span>Learn</span>
                </button>
              </div>
            </section>
            <section class="warnings">
              <ul>
                <li ${ref('warning.remove-test')} ${classes('warning.remove-test')} class="warning">
                  <p class="prompt">
                    ${child($iconWarning())}
                    Do you want to give up the current test?
                  </p>
                  <div class="controls">
                    <button ${on('warning.confirm.remove-test', 'click')} class="setting-button"><span>Yes, give me new test!</span></button>
                    <button ${on('warning.reject.remove-test', 'click')} class="setting-button"><span>No, let me finish it up!</span></button>
                  </div>
                </li>
                <li ${ref('warning.insufficient-words')} ${classes('warning.insufficient-words')} class="warning">
                  <p class="prompt">
                    ${child($iconWarning())}
                    At least ${this.data.wordsMinNumber} words are needed to run the test.
                  </p>
                </li>
              </ul>
            </section>
          </li>
          <li ${ref('page.learn')} ${classes('page.learn')} class="learn-page hidden">
            <section ${ref('learn-container')}></section>
            <div ${on('page-next', 'click')} ${classes('page-next')} class="page-next">
              <div>${child($iconChevronDoubleRight())}</div>
            </div>
          </li>
        </ul>

      </div>
    `);
    this.dom = template.references;
    this.classes = template.classes;
    this.html = template;
  }

  createTest() {
    if (this.state.disabled) return;
    const warning = this.classes.get('warning').get('remove-test');
    const alreadyExisting = this.state.created && !this.state.finished;
    warning[alreadyExisting ? 'add' : 'remove']('visible');

    if (alreadyExisting) {
      this._disableButtons('create');
      this.state.disabled = true;
      return;
    }

    this.classes.get('button').get('learn').remove('disabled');
    this.ref.virtual = new Test(this, {
      filtered: this.data.filtered,
      clues: this.data.permitedClueTypes,
      number: this.data.wordsNumber
    });
    this.state.created = true;
    this.state.finished = false;
    this._resetResolved();
    this._runGame();
    this._switchPage('learn');
  }

  _runGame() {
    const task = this.ref.virtual.next();
    const container = this.dom.get('learn-container');
    container.innerHTML = '';
    container.appendChild(task.view);

    task.on.success = () => {
      this.state.taskFinished = true;
      this.ref.virtual.success();
      this._updateResolved();
      if (this.ref.virtual.solved === this.ref.virtual.total) {
        this.state.finished = true;
        return;
      }
      this._switchPageNextButton(true);
    }

    task.on.fail = () => {
      this.state.taskFinished = true;
      this.ref.virtual.fail();
      this._switchPageNextButton(true);
    }

  }

  addListeners() {
    const { $on } = this.html;
    $on('nav', ({ last }) => {
      if (last === 'config' || last === 'learn') this._switchPage(last);
      if (last === 'close') this.close();
    });

    $on('config', ({ id, data, last }) => {
      if (id.startsWith('config.words-number')) this._updateWordsNumber(data);
      if (id.startsWith('config.switch')) this._permitTestType(last);
      if (last === 'create') this.createTest();
    });

    $on('warning', ({ id, last }) => {
      this.classes.get('warning').get(last).remove('visible');
      this._enableButtons('create');
      this.state.disabled = false;

      if (id.startsWith('warning.reject')) this._switchPage('learn');
      if (id.startsWith('warning.confirm')) {
        this.state.finished = true;
        this.createTest();
      };
    });

    $on('page-next', () => {
      if (!this.state.taskFinished) return;
      this._switchPageNextButton(false);
      this._runGame();
      this.state.taskFinished = false;
    });

  }

  open() {
    if (this.on.open) this.on.open();
    if (this.state.activePage === null) this._switchPage('config');
  }

  close() {
    if (this.on.close) this.on.close();
  }

  _switchPage(name) {
    const previous = this.state.activePage;

    if (name === 'learn' && this.state.created === false) return;
    if (previous === name) return;

    this.state.activePage = name;
    this.dom.get('panel').setAttribute('data-page', name);
    this.classes.get('button').get(name).add('active');
    this.classes.get('page').get(name).remove('hidden');

    if (previous) {
      this.classes.get('button').get(previous).remove('active');
      this.classes.get('page').get(previous).add('hidden');
    }
  }

  _updateWordsNumber(value = 0) {
    const newValue = this.data.wordsNumber + value;
    const output = this.dom.get('output-used-words');
    const all = this.data.totalWordsNumber;
    const lowest = Math.min(all, this.data.wordsMaxNumber);
    const warning = this.classes.get('warning').get('insufficient-words');
    warning.remove('visible');
    this._enableButtons('min', 'max', 'increase', 'decrease', 'create');
    this.classes.get('warning').get('remove-test').remove('visible');
    this.state.disabled = false;

    switch (true) {
      case all < this.data.wordsMinNumber:
        output.innerHTML = this.data.wordsMinNumber;
        this.data.wordsNumber = this.data.wordsMinNumber;
        warning.add('visible');
        this._disableButtons('min', 'max', 'increase', 'decrease', 'create');
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

  _switchButtonView(clueType) {
    return $templater(({ classes, on }) =>/*html*/`
    <button ${on(`config.switch.${clueType}`, 'click')} ${classes(`button.switch.${clueType}`)} class="switch-button">
      <span></span>
    </button>`);
  }

  _permitTestType(clueType) {
    const classes = this.classes.get('button').get('switch').get(clueType);
    let has = classes.has('on');
    if (has && this.data.permitedClueTypes.size === 1) return;
    classes[has ? 'remove' : 'add']('on');
    this.data.permitedClueTypes[has ? 'delete' : 'add'](clueType);
    this.data.filtered = this.ref.words.filterClues(this.data.permitedClueTypes);
    this.data.totalWordsNumber = this.data.filtered.size;
    this.dom.get('output-total-words').innerHTML = this.data.totalWordsNumber;
    this._updateWordsNumber();
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

  _switchPageNextButton(action) {
    const classes = this.classes.get('page-next');
    if (action === true) {
      classes.clear().add('displayed').wait(10).add('visible');
      this.state.pageNextButtonVisible = true;
    }
    if (action === false) {
      classes.clear().remove('visible').wait(250).remove('displayed');
      this.state.pageNextButtonVisible = false;
    }
  }

  _updateResolved() {
    const solved = this.ref.virtual.solved;
    const total = this.ref.virtual.total;
    const scoreElement = this.dom.get('score');
    const scoreClasses = this.classes.get('score');
    const totalClasses = this.classes.get('total');
    scoreElement.innerHTML = solved;
    scoreClasses.add('resolved').wait(1200).remove('resolved');
    if (solved === total) {
      totalClasses.add('resolved').wait(2200).remove('resolved');
    }
  }

  _resetResolved() {
    this.dom.get('score').innerHTML = this.ref.virtual.solved;
    this.dom.get('total').innerHTML = this.ref.virtual.total;
  }
}

export default WordTest;