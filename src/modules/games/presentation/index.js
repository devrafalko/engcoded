import './navigation.scss';

const { Scroller } = $commons;
const { $templater } = $utils;
const { $iconMinimize, $iconOccurrence, $iconShuffle, $iconSelect, $iconChevronRight,
  $iconChevronDoubleRight, $iconChevronLeft, $iconChevronDoubleLeft, $iconSpy, $iconSortAZ,
  $iconSortZA, $iconSort19, $iconSort91, $iconSortRandom, $iconChevronUp, $iconAlignLeft,
  $iconAlignRight, $iconAlignCenter } = $icons;

class Presentation {
  constructor(dialog, words) {
    this.ref = { dialog, words };
    this.data = {};
    this.state = {
      currentScroll: { x: 0, y: 0 },
      currentCollection: null,
      currentSortMode: 'word-asc',
      currentNavigButton: null,
      filterLetters: '',
      pageIndex: null,
      pageTopButtonVisible: false,
      pageWords: null,
      selectOpened: false,
      validGoInput: false,
      buttonIndex: new Map([
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5]
      ]),
      switches: {
        align: {
          options: ['right', 'left', 'center'],
          current: 0,
        },
        sort: {
          random: {
            options: ['random', 'random'],
            current: 0
          },
          word: {
            options: ['random', 'asc', 'desc', 'az', 'za'],
            current: 1,
          },
          type: {
            options: ['random', 'az', 'za'],
            current: 0,
          },
          repetition: {
            options: ['random', 'asc', 'desc'],
            current: 0,
          },
        }
      }
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

    this._initialSortWords();
    this._setSelectedTypes();
    this._buildView();
    this._buildRowReferences();
    this._addListeners();
    this._addScroller();
    this._filter();
    this._initialTableConfig();
  }

  get view() {
    return this.dom.get('container');
  }

  get on() {
    return this._on;
  }

  get pageWords() {
    return Number(this.state.pageWords);
  }

  set pageWords(next) {
    if (Number(next) === Number(this.state.pageWords)) return;
    const button = this.classes.get('rows');
    const previous = this.state.pageWords;
    this.state.pageWords = next;
    if (previous !== null) button.get(String(previous)).remove('on');
    button.get(String(next)).add('on');
    this.page = 1;
  }

  get page() {
    return this.state.pageIndex;
  }

  set page(next) {
    const limited = next < 1 ? 1 : next > this.totalPages ? this.totalPages : next;
    this.state.pageIndex = limited;
    this._updatePagesNavigationBar();
    this._updateGoPagesBar();
    this._render();
  }

  get totalPages() {
    if (this.pageWords === Infinity) return 1;
    const total = this.state.currentCollection.get('word-asc').length / this.pageWords;
    const integer = total === 0 ? 1 : Math.ceil(total);
    return integer;
  }

  get sorted() {
    switch (this.state.currentSortMode) {
      case 'best-match':
        const first = this.state.currentCollection.get('best-match-first');
        const next = this.state.currentCollection.get('best-match-next');
        return [...first, ...next];
      case 'random-random':
        const copy = this.state.currentCollection.get('word-asc').slice();
        const sorted = [];
        while (copy.length) {
          let random = Math.floor(Math.random() * (copy.length));
          sorted.push(copy.splice(random, 1)[0]);
        }
        return sorted;
      case 'repetition-asc':
      case 'repetition-desc':
        if (!this.state.currentCollection.has(this.state.currentSortMode)) {
          const set = new Set(this.state.currentCollection.get('word-asc'));
          const reps = this.ref.words.repetitions.global;
          const filtered = [];
          for (let i = reps.size - 1; i >= 0; i--) {
            for (let id of reps.get(i)) if (set.has(id)) filtered.push(id);
          }
          this.state.currentCollection.set('repetition-desc', filtered);
          this.state.currentCollection.set('repetition-asc', filtered.slice().reverse());
        }
        return this.state.currentCollection.get(this.state.currentSortMode);
      default:
        return this.state.currentCollection.get(this.state.currentSortMode);
    }
  }

  get rows() {
    return $templater(({ ref, child, list, on }) =>/*html*/`
      ${list(this.ref.words.records, ({ word, type, meaning }, id) =>/*html*/`
        <tr ${ref(`row.${id}`)}>
          <td class="word">
            <p>${word}</p>
          </td>
          <td class="translation">
            <ul class="meaning-list">
              ${list(meaning, (item, iter) =>/*html*/`
                <li>${item}</li>
              `)}
            </ul>
          </td>
          <td class="type">
            <p>${type}</p>
          </td>
          <td class="repetition">
            <p ${ref(`repetition.${id}`)}>0</p>
          </td>
          <td data-find class="find">
            <span ${on(`find.${id}`, 'click')}>${child($iconOccurrence())}</span>
          </td>
        </tr>
      `)}
    `);
  }

  update(id) {
    const reps = this.ref.words.repetitions.iterator.get(id);
    this.dom.get('repetition').get(id).innerHTML = reps;
    if (this.state.currentSortMode === 'repetition-asc' || this.state.currentSortMode === 'repetition-desc') {
      this.state.currentCollection.delete('repetition-asc');
      this.state.currentCollection.delete('repetition-desc');
    }
    this._render();
  }

  open() {
    if (this.on.open) this.on.open();
    this._updateTableScroll();
  }

  close() {
    if (this.on.close) this.on.close();
  }

  _initialSortWords() {
    this.ref.words.sort();
  }

  _setSelectedTypes() {
    const sortedTypes = [...this.ref.words.typeNames.keys()].sort();
    this.state.selectedTypes = new Map();
    this.state.selectedTypesNumber = 0;
    sortedTypes.forEach((name) => {
      this.state.selectedTypes.set(name, true);
      this.state.selectedTypesNumber++;
    });
  }

  _buildView() {
    const templater = $templater(({ ref, child, classes, list, on }) =>/*html*/`
      <div ${ref('container')} ${classes('container')} class="presentation">
        <nav class="navigation-panel">
          <div class="controls game">
            <ul>
              <li class="search">
                <div>
                  <input ${on('search-box', 'input')} class="search-box"/>
                  <span class="icon-box">${child($iconOccurrence())}</span>
                </div>
              </li>
              <li ${ref('button.select')} class="select">
                <div>
                  <div ${ref('select.header')} class="select-box">
                    <div class="header">
                      <span class="text-box">Word type</span>
                      <span class="icon-box">${child($iconSelect())}</span>
                    </div>
                  </div>
                  <div ${ref('select.list')} ${classes('select.list')} class="list-box">
                    <ul class="list">
                      ${list(this.state.selectedTypes, (selected, name) =>/*html*/`
                        <li data-type="${name}" ${on(`select.item.${name}`, 'click')}>
                          <span class="text-box">${name}</span>
                          <button class="switch-button" ${classes(`word-type.${name}`, selected ? ['on'] : [])}><span></span></button>
                        </li>
                      `)}
                    </ul>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          <div class="controls navigation">
            <ul>
              <li ${on('close', 'click')} class="close">${child($iconMinimize())}</li>
            </ul>
          </div>
        </nav>
        <div ${ref('scroll-box')} ${on('scroll-box', 'scroll')} class="scrollable">
          <nav class="navigation-table">
            <ul class="controls pages">
              <li>
                <ul class="page-buttons">
                  <li>
                    <button ${on('page-navig.arrow.a', 'click', { data: -10 })} ${classes('page-navig.-10')} class="setting-button navig">
                      <span>${child($iconChevronDoubleLeft())}</span>
                    </button>
                  </li>
                  <li>
                    <button ${on('page-navig.arrow.b', 'click', { data: -1 })} ${classes('page-navig.-1')} class="setting-button navig">
                      <span>${child($iconChevronLeft())}</span>
                    </button>
                  </li>
                  <li>
                    <button ${on('page-navig.index.a', 'click', { data: 0 })} ${classes('page-navig.index.0')} class="setting-button value">
                      <span ${ref('page-tab-value.0')}>1</span>
                    </button>
                  </li>
                  <li>
                    <button ${on('page-navig.index.b', 'click', { data: 1 })} ${classes('page-navig.index.1')} class="setting-button value">
                      <span ${ref('page-tab-value.1')}>2</span>
                    </button>
                  </li>
                  <li>
                    <button ${on('page-navig.index.c', 'click', { data: 2 })} ${classes('page-navig.index.2')} class="setting-button value">
                      <span ${ref('page-tab-value.2')}>3</span>
                    </button>
                  </li>
                  <li>
                    <button ${on('page-navig.index.d', 'click', { data: 3 })} ${classes('page-navig.index.3')} class="setting-button value">
                      <span ${ref('page-tab-value.3')}>4</span>
                    </button>
                  </li>
                  <li>
                    <button ${on('page-navig.index.e', 'click', { data: 4 })} ${classes('page-navig.index.4')} class="setting-button value">
                      <span ${ref('page-tab-value.4')}>5</span>
                    </button>
                  </li>
                  <li>
                    <button ${on('page-navig.arrow.c', 'click', { data: 1 })} ${classes('page-navig.1')} class="setting-button navig">
                      <span>${child($iconChevronRight())}</span>
                    </button>
                  </li>
                  <li>
                    <button ${on('page-navig.arrow.d', 'click', { data: 10 })} ${classes('page-navig.10')} class="setting-button navig">
                      <span>${child($iconChevronDoubleRight())}</span>
                    </button>
                  </li>
                </ul>
              </li>
              <li class="go-page">
                <div class="go-page-box">
                  <input ${on('go-pages.input', ['input', 'keydown'])} ${ref('go-pages.input')} ${classes('go-pages.input')} type="text" placeholder="1 - 55"/>
                  <button ${on('go-pages.submit', 'click')} ${classes('go-pages.submit')} class="setting-button value"><span>Go</span></button>
                </div>
              </li>
            </ul>
            <ul class="controls rows">
              <li>
                <button ${on('rows.a', 'click', { data: 10 })} ${classes('rows.10')} class="setting-button value">
                  <span>10</span>
                </button>
              </li>
              <li>
                <button ${on('rows.b', 'click', { data: 25 })} ${classes('rows.25')} class="setting-button value">
                  <span>25</span>
                </button>
              </li>
              <li>
                <button ${on('rows.c', 'click', { data: 50 })} ${classes('rows.50')} class="setting-button value">
                  <span>50</span>
                </button>
              </li>
              <li>
                <button ${on('rows.d', 'click', { data: 100 })} ${classes('rows.100')} class="setting-button value">
                  <span>100</span>
                </button>
              </li>
              <li>
                <button ${on('rows.e', 'click', { data: Infinity })} ${classes('rows.Infinity')} class="setting-button value">
                  <span>All</span>
                </button>
              </li>
            </ul>
          </nav>
          <div class="table-box">
            <table ${classes('table')}>
              <thead>
                <tr>
                  <th class="head word">
                    <h1 class="header">Word</h1>
                    <div class="button-set">
                      <button ${on('table-button.word-align', 'click')} ${classes('word-align', [this.state.switches.align.options[this.state.switches.align.current]])} class="setting-button navig">
                        <ul>
                          <li data-side="left">${child($iconAlignLeft())}</li>
                          <li data-side="center">${child($iconAlignCenter())}</li>
                          <li data-side="right">${child($iconAlignRight())}</li>
                        </ul>
                      </button>
                      <button ${on('table-button.hide-word', 'click')} class="setting-button navig">
                        <span>${child($iconSpy())}</span>
                      </button>
                      <button ${on('table-button.sort.random', 'click')} ${classes('sort.random')} class="setting-button navig">
                        <span>${child($iconShuffle())}</span>
                      </button>
                      <button ${on('table-button.sort.word', 'click')} ${classes('sort.word', [this.state.switches.sort.word.options[this.state.switches.sort.word.current]])} class="setting-button navig">
                        <ul>
                          <li data-sort="az">${child($iconSortAZ())}</li>
                          <li data-sort="za">${child($iconSortZA())}</li>
                          <li data-sort="asc">${child($iconSort19())}</li>
                          <li data-sort="desc">${child($iconSort91())}</li>
                          <li data-sort="random">${child($iconSortRandom())}</li>
                        </ul>
                      </button>
                    </div>
                  </th>
                  <th class="head translation">
                    <h1 class="header">Translation</h1>
                    <div class="button-set">
                      <button ${on('table-button.hide-translation', 'click')} class="setting-button navig">
                        <span>${child($iconSpy())}</span>
                      </button>
                    </div>
                  </th>
                  <th class="head word-type">
                    <h1 class="header">Type</h1>
                    <div class="button-set">
                      <button ${on('table-button.sort.type', 'click')} ${classes('sort.type', [this.state.switches.sort.type.options[this.state.switches.sort.type.current]])} class="setting-button navig random">
                        <ul>
                          <li data-sort="az">${child($iconSortAZ())}</li>
                          <li data-sort="za">${child($iconSortZA())}</li>
                          <li data-sort="random">${child($iconSortRandom())}</li>
                        </ul>
                      </button>
                    </div>
                  </th>
                  <th class="head repetitions">
                    <h1 class="header">Rep.</h1>
                    <div class="button-set">
                      <button ${on('table-button.sort.repetition', 'click')} ${classes('sort.repetition', [this.state.switches.sort.repetition.options[this.state.switches.sort.repetition.current]])} class="setting-button navig random">
                        <ul>
                          <li data-sort="asc">${child($iconSort19())}</li>
                          <li data-sort="desc">${child($iconSort91())}</li>
                          <li data-sort="random">${child($iconSortRandom())}</li>
                        </ul>
                      </button>
                    </div>
                  </th>
                  <th class="head find">
                    <h1 class="header">Find</h1>
                  </th>
                </tr>
              </thead>
              <tbody ${ref('table-body')}>
                ${child(this.rows)}
              </tbody>
            </table>
          </div>
        </div>
        <div ${on('page-top', 'click')} ${classes('page-top')} class="page-top">
          <div>${child($iconChevronUp())}</div>
        </div>
      </div>
    `);
    this.dom = templater.references;
    this.classes = templater.classes;
    this.html = templater;
  }

  _buildRowReferences() {
    this.data.rows = new Map();
    this.dom.get('row').forEach((tr, id) => this.data.rows.set(tr, id));
  }

  _addListeners() {
    const { $on } = this.html;

    window.addEventListener('resize', () => this._fitSelectList());
    document.body.addEventListener('click', (event) => {
      const select = this.dom.get('button').get('select');
      const list = this.dom.get('select').get('list');
      if ((!select.contains(event.target) && !this.state.selectOpened) || list.contains(event.target)) return;
      this._toggleSelect(!select.contains(event.target) || this.state.selectOpened ? 'close' : 'open');
    });

    $on('rows', ({ data }) => this.pageWords = data);
    $on('find', ({ event, last }) => this._seekOccurrence(event, last));
    $on('select.item', ({ last }) => this._switchWordType(last));
    $on('search-box', ({ event }) => this._filterLetters(event));
    $on('close', () => this.close());
    $on('page-top', () => this._pageTop());

    $on('table-button', ({ id, last }) => {
      if (id.startsWith('table-button.sort')) this._switchSort(last);
      if (last === 'hide-word') this.classes.get('table').toggle(last);
      if (last === 'hide-translation') this.classes.get('table').toggle(last);
      if (last === 'word-align') this._switchWordAlign();
    })

    $on('go-pages', ({ event, last, type }) => {
      if (last === 'submit') this._goPage();
      if (last === 'input' && type === 'input') this._validateGoPageInput(event);
      if (last === 'input' && type === 'keydown' && event.keyCode === 13) this._goPage();
    });

    $on('page-navig', ({ id, data }) => {
      if (id.startsWith('page-navig.arrow')) this._switchPageValue(data);
      if (id.startsWith('page-navig.index')) this._switchPageButton(data, true);
    });

    $on('scroll-box', ({ event }) => {
      this.state.currentScroll.x = event.target.scrollLeft;
      this.state.currentScroll.y = event.target.scrollTop;
      this._togglePageTopButton();
    });
  }

  _switchWordType(name) {
    const classes = this.classes.get('word-type').get(name);
    const on = classes.has('on');
    if (this.state.selectedTypesNumber === 1 && on) return;
    classes.toggle('on');
    this.state.selectedTypes.set(name, !on);
    if (!on) this.state.selectedTypesNumber++;
    else this.state.selectedTypesNumber--;
    this._filter();
    this.page = 1;
  }

  _addScroller() {
    this.scroller = new Scroller({
      container: this.dom.get('scroll-box'),
      scrollTime: 800,
      fps: 32,
      offset: 1,
      horizontally: true,
      vertically: true
    });
  }

  _initialTableConfig() {
    this.pageWords = 25;
    this._switchPageButton(0);
  }

  _switchWordAlign() {
    const options = this.state.switches.align.options;
    const current = this.state.switches.align.current;
    const table = this.classes.get('table');
    const classes = this.classes.get('word-align');
    const next = current + 1 === options.length ? 0 : current + 1;

    classes.remove(options[current]);
    table.remove(options[current]);
    this.state.switches.align.current = next;
    classes.add(options[next]);
    table.add(options[next]);
  }

  _switchSort(current) {
    const classes = this.classes.get('sort');
    const data = this.state.switches.sort;

    for (let name of Object.getOwnPropertyNames(data)) {
      let btn = data[name];
      if (current !== name) {
        classes.get(name).remove(btn.options[btn.current]).add(btn.options[0]);
        btn.current = 0;
      } else {
        classes.get(name).remove(btn.options[btn.current]);
        btn.current = btn.current + 1 === btn.options.length ? 1 : btn.current + 1;
        classes.get(name).add(btn.options[btn.current]);
        this.state.currentSortMode = `${name}-${btn.options[btn.current]}`;
        this.page = 1;
      }
    }
  }

  _switchPageValue(value) {
    if (this.page === 1 && value < 0 || this.page === this.totalPages && value > 0) return;
    this.page += value;
  }

  _togglePageTopButton() {
    const classes = this.classes.get('page-top');
    const { x, y } = this.state.currentScroll;
    if ((x > 0 || y > 0) && this.state.pageTopButtonVisible === false) {
      classes.clear().add('displayed').wait(10).add('visible');
      this.state.pageTopButtonVisible = true;
    }
    if ((x === 0 && y === 0) && this.state.pageTopButtonVisible === true) {
      classes.clear().remove('visible').wait(250).remove('displayed');
      this.state.pageTopButtonVisible = false;
    }
  }

  _pageTop() {
    if (this.state.scrollingTable) return;
    const top = this.dom.get('scroll-box');
    this.state.scrollingTable = true;
    this.scroller.scroll(top, () => this.state.scrollingTable = false);
  }

  _seekOccurrence(event, id) {
    event.preventDefault();
    this.close();
    this.ref.dialog.seekOccurrence(id);
  }

  _toggleSelect(action) {
    const header = this.dom.get('select').get('header');
    const list = this.dom.get('select').get('list');
    const classes = this.classes.get('select').get('list');

    switch (action) {
      case 'open':
        this._resetSelectListPosition();
        this._adjuster(document.body, header, list, 6);
        classes.wait(10).add("visible");
        this.state.selectOpened = true;
        break;
      case 'close':
        classes.clear().remove('visible').wait(150).remove('displayed');
        this.state.selectOpened = false;
        break;
    }
  }

  _fitSelectList() {
    if (this.state.selectOpened === false) return;
    if (this.state.fitDelayPending === true) return;
    const header = this.dom.get('select').get('header');
    const list = this.dom.get('select').get('list');

    this.state.fitDelayPending = true;
    setTimeout(() => {
      this._adjuster(document.body, header, list, 6);
      this.state.fitDelayPending = false;
    }, 50);
  }

  _resetSelectListPosition() {
    const styles = this.dom.get('select').get('list');
    const classes = this.classes.get('select').get('list');
    classes.clear().add('displayed').remove('visible');
    styles.top = '0px';
    styles.bottom = null;
    styles.left = '0px';
    styles.right = null;
  }

  _adjuster(container, header, list, topOffset = 0) {
    const style = list.style;
    const { left: headerLeft, top: headerTop, width: headerWidth, height: headerHeight } = header.getBoundingClientRect();
    const { left: containerLeft, top: containerTop, width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    const { width: listWidth, height: listHeight } = list.getBoundingClientRect();

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

  _updateTableScroll() {
    this.dom.get('scroll-box').scrollLeft = this.state.currentScroll.x;
    this.dom.get('scroll-box').scrollTop = this.state.currentScroll.y;
  }

  _updatePagesNavigationBar() {
    const buttonIndex = this.state.buttonIndex;
    const activeButtonIndex = this.state.currentNavigButton;
    if (activeButtonIndex !== null && this.page !== buttonIndex.get(activeButtonIndex)) {
      const buttons = this.dom.get('page-tab-value');
      const activeButtonValue = buttonIndex.get(activeButtonIndex);
      const pagesStep = this.page - activeButtonValue;
      const buttonsSize = this.totalPages < buttonIndex.size ? this.totalPages : buttonIndex.size;
      const middleButtonIndex = Math.ceil((buttonsSize - 1) / 2);
      const activeButtonSide = activeButtonIndex - middleButtonIndex;
      const lastButtonValue = buttonIndex.get(buttonsSize - 1);
      const firstButtonValue = buttonIndex.get(0);
      let totalShift = pagesStep;
      let activeButtonShift;
      if (pagesStep > 0) activeButtonShift = activeButtonSide < 0 ? activeButtonIndex + totalShift > middleButtonIndex ? middleButtonIndex - activeButtonIndex : totalShift : 0;
      if (pagesStep < 0) activeButtonShift = activeButtonSide > 0 ? activeButtonIndex + totalShift < middleButtonIndex ? middleButtonIndex - activeButtonIndex : totalShift : 0;
      totalShift -= activeButtonShift;
      let buttonValueShift;
      if (pagesStep > 0) buttonValueShift = lastButtonValue + totalShift > this.totalPages ? this.totalPages - lastButtonValue : totalShift;
      if (pagesStep < 0) buttonValueShift = firstButtonValue + totalShift < 1 ? -firstButtonValue + 1 : totalShift;
      totalShift -= buttonValueShift;
      activeButtonShift += totalShift;
      this._switchPageButton(activeButtonIndex + activeButtonShift);
      for (let i = 0; i < buttonIndex.size; i++) {
        let previousButtonValue = buttonIndex.get(i);
        buttonIndex.set(i, previousButtonValue + buttonValueShift);
        buttons.get(String(i)).innerHTML = previousButtonValue + buttonValueShift;
      }
    }

    const classes = this.classes.get('page-navig');
    const prevAction = this.page === 1 ? 'add' : 'remove';
    const nextAction = this.page === this.totalPages ? 'add' : 'remove';

    classes.get('-10')[prevAction]('disabled');
    classes.get('-1')[prevAction]('disabled');
    classes.get('1')[nextAction]('disabled');
    classes.get('10')[nextAction]('disabled');
    classes.get('index').forEach((instance, index) => {
      let disabled = buttonIndex.get(Number(index)) > this.totalPages;
      let action = disabled ? 'add' : 'remove';
      instance[action]('disabled');
    });
  }

  _updateGoPagesBar() {
    const placeholder = this.totalPages === 1 ? `${this.totalPages}` : `1 - ${this.totalPages}`;
    this.dom.get('go-pages').get('input').placeholder = placeholder;
    this._resetGoPage();
  }

  _validateGoPageInput(event) {
    const value = event.target.value;
    const input = this.classes.get('go-pages').get('input');
    const submit = this.classes.get('go-pages').get('submit');
    const isEmpty = !value.length;
    const isNumber = /^[0-9]+$/.test(value);
    const isInRange = !isNumber ? false : Number(value) >= 1 && Number(value) <= this.totalPages;

    if (!isEmpty && (!isNumber || !isInRange)) {
      this.state.validGoInput = false;
      input.add('invalid');
      submit.add('disabled');
    } else if (isEmpty) {
      this.state.validGoInput = false;
      input.remove('invalid');
      submit.remove('disabled');
    } else {
      this.state.validGoInput = true;
      input.remove('invalid');
      submit.remove('disabled');
    }
  }

  _goPage() {
    if (!this.state.validGoInput) return;
    const input = this.dom.get('go-pages').get('input');
    const value = Number(input.value);
    if (this.page === value) return this._resetGoPage();
    this.page = Number(input.value);
  }

  _resetGoPage() {
    this.classes.get('go-pages').get('input').remove('invalid');
    this.classes.get('go-pages').get('submit').remove('disabled');
    this.dom.get('go-pages').get('input').value = null;
    this.state.validGoInput = false;
  }

  _switchPageButton(next, switchPage = false) {
    const previous = this.state.currentNavigButton;
    if (next === previous) return;
    const classes = this.classes.get('page-navig').get('index');
    if (previous !== null) classes.get(String(previous)).remove('on');
    classes.get(String(next)).add('on');
    this.state.currentNavigButton = next;
    if (switchPage) this.page = this.state.buttonIndex.get(next);
  }

  _filterLetters(event) {
    this.state.filterLetters = event.target.value;
    this._switchSort('best-match');
    this.state.currentSortMode = 'best-match';
    this._filter();
    this.page = 1;
  }

  _filter() {
    this.state.currentCollection = this.ref.words.filter({
      types: this.state.selectedTypes,
      letters: this.state.filterLetters
    });
  }

  _render() {
    const table = this.dom.get('table-body');
    const rowsCollection = [];
    const total = this.pageWords === Infinity ? this.sorted.length : this.pageWords;
    for (let i = (this.page - 1) * total; i < this.page * total || i === this.sorted.length; i++) {
      let id = this.sorted[i];
      rowsCollection.push(this.dom.get('row').get(id));
    }

    table.innerHTML = '';
    table.appendChild($templater(({ child, list }) => `
      ${list(rowsCollection, (item) => `${child(item)}`)}
    `).template);
  }

}

export default Presentation;