import type from 'of-type';
import './card.scss';

const { Slider, Scroller } = $commons;
const { $audio } = $data;
const { $loopParents, $templater } = $utils;
const { $iconCardDefinition, $iconCardImage, $iconCardWord, $iconClose, $iconVolume, $iconNextWord, $iconPreviousWord, $iconCollocation } = $icons;

class Card {
  constructor() {
    this.slider = new Slider();
    this.state = { opened: false, active: null, currentContainer: null, currentIndex: null, currentWords: null };
    this.events = {};
    this._renderView();
    this._addListeners();
    this._addScroller();
  }

  get onOpen() {
    return this.events.onOpen || null;
  }

  set onOpen(fn) {
    this.events.onOpen = fn;
  }

  get onSwitch() {
    return this.events.onSwitch || null;
  }

  set onSwitch(fn) {
    this.events.onSwitch = fn;
  }

  get onClose() {
    return this.events.onClose || null;
  }

  set onClose(fn) {
    this.events.onClose = fn;
  }

  fit() {
    if (this.state.currentIndex !== null) {
      delayFit.call(this);

      function delayFit() {
        if (this.state.fitDelayPending === true) return;
        this.state.fitDelayPending = true;
        setTimeout(() => {
          this.show(this.state.currentIndex, this.state.currentContainer);
          this.state.fitDelayPending = false;
        }, 50);
      }
    }
  }

  refresh({ container, scroll, index, contentData }) {
    if (this.state.currentIndex === index) {
      this.hide(false);
      return;
    }

    if (!contentData.words.indeces.has(index)) return;
    const { id, meaning: meanings } = contentData.words.indeces.get(index);
    if (!contentData.words.records.has(id)) return;
    const { word, definition, meaning, audio, img, collocations } = contentData.words.records.get(id);
    this.hide(true);
    this._renderWordPage(word, meaning, audio, meanings, (wordPage) => {
      this.dom.get('page').get('word').innerHTML = '';
      this.dom.get('page').get('word').appendChild(wordPage);
    });

    this._renderDefinitionPage(definition, (empty, rendered) => {
      this.classes.get('button').get('definition')[empty ? 'add' : 'remove']('disabled');
      if (empty && this.state.active === 'definition') this._switchCard('word');
      if (empty) return;
      this.dom.get('page').get('definition').innerHTML = '';
      this.dom.get('page').get('definition').appendChild(rendered);
    });

    this._renderImagePage(img, (empty) => {
      this.classes.get('button').get('image')[empty ? 'add' : 'remove']('disabled');
      if (empty && this.state.active === 'image') this._switchCard('word');
    });

    this._renderCollocationPage(collocations, (empty, rendered) => {
      this.classes.get('button').get('collocation')[empty ? 'add' : 'remove']('disabled');
      if (empty && this.state.active === 'collocation') this._switchCard('word');
      if (empty) return;
      this.dom.get('page').get('collocation').innerHTML = '';
      this.dom.get('page').get('collocation').appendChild(rendered);
    })

    const occurrences = contentData.words.identifiers.get(id);
    this.classes.get('section').get('control')[occurrences.length > 1 ? 'add' : 'remove']('multiple');

    this.state.currentIndex = index;
    this.state.currentContainer = container;
    this.state.currentContentData = contentData;
    const element = this.state.currentContentData.occurrenceMap.get(index)[0];
    if (scroll === false) return this.show(index, container);
    this.scroller.container = this.state.currentContainer;
    if (this.events.onSwitch) this.events.onSwitch();
    this.scroller.scroll(element, () => this.show(index, container));
  }

  _addScroller() {
    this.scroller = new Scroller({
      container: null,
      scrollTime: 600,
      fps: 32,
      offset: .1,
      horizontally: true,
      vertically: true
    });
  }

  _resetCardPosition() {
    const styles = this.dom.get('view').style;
    const classes = this.classes.get('view');
    classes.add('displayed');
    classes.remove('visible');
    styles.top = '0px';
    styles.bottom = null;
    styles.left = '0px';
    styles.right = null;
  }

  show(index, container) {
    const elements = this.state.currentContentData.occurrenceMap.get(index);
    const relative = elements[0];
    const parent = this.state.currentContainer;
    const card = this.dom.get('view');
    const classes = this.classes.get('view');
    if (!container.contains(card)) container.appendChild(card);
    this._resetCardPosition();
    this._adjuster(parent, relative, card);
    classes.add('visible');
    elements.forEach(element => element.classList.add('active'));
    this.state.opened = true;
    if (this.state.currentIndex !== null && this.events.onOpen) this.events.onOpen();
  }

  hide($switch) {
    if (this.state.opened === false) return;
    this.classes.get('view').clear().remove('visible').wait($switch === false ? 300 : null).remove('displayed');
    this.state.opened = false;
    if (this.state.currentIndex !== null) {
      if ($switch === false && this.events.onClose) this.events.onClose();
      const elements = this.state.currentContentData.occurrenceMap.get(this.state.currentIndex);
      elements.forEach(element => element.classList.remove('active'));
      if ($switch !== true) this.state.currentIndex = null;
    }
  }

  _addListeners() {
    const { $on } = this.html;
    this._switchCard('word');

    window.addEventListener('resize', () => this.fit());
    window.addEventListener('keydown', (event) => {
      if (!this.state.opened) return;
      if (event.ctrlKey === true) return;
      if (event.keyCode === 39) this._switchOccurrence('next');
      if (event.keyCode === 37) this._switchOccurrence('previous');
      if (event.keyCode === 27) this.hide(false);
    });

    $on('card', ({ id, last, type }) => {
      if (id.startsWith('card.tab')) this._switchCard(last, true);
      if (id.startsWith('card.turn')) this._switchOccurrence(last);
      if (last === 'close') this.hide(false);
      if (last === 'player' && type === 'play') this.state.currentPlayerClasses.add('sound-on');
      if (last === 'player' && type === 'pause') this.state.currentPlayerClasses.remove('sound-on');
    });

    $on('page.word', ({ current, event }) => {
      $loopParents(event.target, (element, stop) => {
        if (element === current) return stop();
        if (element.hasAttribute('data-mp3')) {
          const audio = this.dom.get('player');
          const src = element.getAttribute('data-mp3');
          const audioPath = $audio.get(src);
          audio.src = audioPath;
          audio.play();
          return stop();
        }
      });
    });
  }

  _adjuster(container, word, card) {
    const style = card.style;
    const { left: _wordLeft, top: _wordTop } = word.getBoundingClientRect();
    const { left: _containerLeft, top: _containerTop } = container.getBoundingClientRect();
    const containerScrollY = container.scrollTop;
    const containerScrollX = container.scrollLeft;
    const wordTop = _wordTop - _containerTop + containerScrollY;
    const wordLeft = _wordLeft - _containerLeft + containerScrollX;
    const wordWidth = word.offsetWidth;
    const wordHeight = word.offsetHeight;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const containerScrollHeight = container.scrollHeight;
    const cardWidth = card.offsetWidth;
    const cardHeight = card.offsetHeight;
    switch (true) {
      case containerWidth - (wordLeft) >= cardWidth: /* fitRight */
        style.left = (wordLeft + containerScrollX) + 'px';
        style.right = null;
        style.padding = null;
        style.maxWidth = '360px';
        break;
      case (wordLeft) + wordWidth >= cardWidth: /* fitLeft */
        style.right = (containerWidth - wordLeft - wordWidth - containerScrollX) + 'px';
        style.left = null;
        style.padding = null;
        style.maxWidth = '360px';
        break;
      case containerWidth > cardWidth: /* fitCenterX */
        style.margin = 'auto';
        style.padding = '0px 6px';
        style.left = `calc(-100% + ${containerScrollX}px)`;
        style.right = `calc(-100% - ${containerScrollX}px)`;
        style.maxWidth = '100%';
        break;
      default:
        style.margin = 'auto';
        style.padding = '0px 6px';
        style.left = `calc(0% + ${containerScrollX}px)`;
        style.right = `calc(0% - ${containerScrollX}px)`;
        style.maxWidth = '100%';
    }

    switch (true) {
      case containerHeight - wordTop - wordHeight + containerScrollY >= cardHeight: // fitBottom
        style.top = (wordTop + wordHeight) + 'px';
        break;
      case wordTop - containerScrollY >= cardHeight: // fitTop
        style.top = (wordTop - cardHeight) + 'px';
        break;
      case containerScrollHeight - wordTop - wordHeight >= cardHeight: // fitBottomOutline
        style.top = (wordTop + wordHeight) + 'px';
        break;
      case wordTop >= cardHeight: // fitTopOutline
        style.top = (wordTop - cardHeight) + 'px';
        break;
      default:
        style.top = containerScrollY + 'px';
    }
  }

  _switchOccurrence(side) {
    const { id } = this.state.currentContentData.words.indeces.get(this.state.currentIndex);
    const ocurrances = this.state.currentContentData.words.identifiers.get(id);
    if (ocurrances.length === 1) return;
    const current = ocurrances.findIndex((index) => index === this.state.currentIndex);
    let next = side === 'next' ? current + 1 : current - 1;
    if (next < 0) next = ocurrances.length - 1;
    if (next === ocurrances.length) next = 0;

    this.refresh({
      container: this.state.currentContainer,
      scroll: true,
      index: ocurrances[next],
      contentData: this.state.currentContentData
    })

  }

  _switchCard(id, fitPosition) {
    if (id === this.state.active) return;
    const button = this.classes.get('button').get(id);
    const card = this.classes.get('page').get(id);

    if (button.has('disabled')) return;

    if (this.state.active) {
      this.classes.get('button').get(this.state.active).remove('active');
      this.classes.get('page').get(this.state.active).remove('active');
    }

    button.add('active');
    card.add('active');
    this.state.active = id;
    if (fitPosition) this.show(this.state.currentIndex, this.state.currentContainer);
  }

  _renderWordPage(words, meanings, audioSource, meaningOrder, callback) {
    const singular = type(audioSource, String);
    const translations = orderTranslations(meanings, meaningOrder);
    const { template, classes } = $templater(({ when, classes, list, child }) => /*html*/`
      <div>
        <ul class="section word">
          <li class="button sound" ${when(singular, () => `data-mp3="${audioSource}"`)} ${classes('player')}>
            ${child($iconVolume())}
          </li>
          ${when(singular, () =>/*html*/`
            <li class="word-tab">${words}</li>
          `)}
          ${when(!singular, () =>/*html*/`
            ${list(audioSource, (item) =>/*html*/`
              <li class="word-tab" ${when(type(item, Array), () => `data-mp3="${item[1]}"`)}>
                ${type(item, String) ? item : item[0]}
              </li>
            `)}
          `)}
        </ul>
        <ul class="section translation">
          ${list(translations, (key, word) =>/*html*/`
            <li ${when(key, () => `data-keyword="true"`)} class="translation-tab">${word}</li>
          `)}
        </ul>
      </div>`
    );

    this.state.currentPlayerClasses = classes.get('player');
    callback(template);

    function orderTranslations(meanings, meaningOrder) {
      const collection = new Map();
      for (let index of meaningOrder) collection.set(meanings[index], true);
      for (let x = 0; x < meanings.length; x++) {
        if (meaningOrder.some((item) => item === x)) continue;
        collection.set(meanings[x], false);
      }
      return collection;
    }

  }

  _renderDefinitionPage($definition, callback) {
    if (!$definition) return callback(true, null);
    const definitions = type($definition, Array) ? $definition : [$definition];
    const { template } = $templater(({ list }) => /*html*/`
      <ul>${list(definitions, (definition) =>/*html*/`
        <li class="sentence">
          <p>${definition}</p>
        </li>`)}
      </ul>
    `);
    callback(false, template);
  }

  _renderImagePage(images, callback) {
    const list = type(images, Array) && images.length ? images : type(images, String) && images.length ? [images] : null;
    if (!list) return callback(true);
    this.slider.update(list);
    callback(false);
  }

  _renderCollocationPage(collocations, callback) {
    if (!collocations) return callback(true);
    let index = 0;
    const { template, $on, references, classes } = $templater(({ ref, list, when, on, classes }) => /*html*/`
      <ul>${list(collocations, (row) =>/*html*/`
        <li>
          <dl>${list(row, (word) =>/*html*/`
            ${when(type(word, String), () =>/*html*/`
              <dt data-keyword>${word}</dt>
            `)}
            ${when(type(word, Array), () =>/*html*/`
              <dt ${ref(`term.${index}`)} ${on(`collocation.${index}`, ['mouseenter', 'mouseleave'], { capture: true })}>${word[0]}</dt>
              <dd ${ref(`translation.${index}`)} ${classes(`translation.${index++}`)}>${word[1]}</dd>
            `)}
          `)}        
          </dl>
        </li>`)}
      </ul>
    `);

    $on('collocation', ({ last, type, target, event }) => {
      if (target !== event.target) return;
      const translation = references.get('translation').get(last);
      const translationClasses = classes.get('translation').get(last);
      translationClasses[type === 'mouseenter' ? 'add' : 'remove']('visible');
      const { top, height, left } = target.getBoundingClientRect();
      translation.style.top = `${top + height + 4}px`;
      translation.style.left = `${left}px`;
    })

    callback(false, template);
  }

  _renderView() {
    const template = $templater(({ child, ref, classes, on }) => /*html*/`
      <div class="card container" ${ref('view')} ${classes('view')}>
        <div class="card relative-box">
        <nav class="card navigation">
          <ul class="section pages">
            <li ${on('card.tab.word', 'click')} ${classes('button.word')} class="button">${child($iconCardWord())}</li>
            <li ${on('card.tab.definition', 'click')} ${classes('button.definition')} class="button">${child($iconCardDefinition())}</li>
            <li ${on('card.tab.collocation', 'click')} ${classes('button.collocation')} class="button">${child($iconCollocation())}</li>
            <li ${on('card.tab.image', 'click')} ${classes('button.image')} class="button">${child($iconCardImage())}</li>
          </ul>
          <ul class="section control" ${classes('section.control')}>
            <li ${on('card.turn.previous', 'click')} ${classes('button.previous')} class="button nav previous">${child($iconPreviousWord())}</li>
            <li ${on('card.turn.next', 'click')} ${classes('button.next')} class="button nav next">${child($iconNextWord())}</li>
            <li ${on('card.close', 'click')} ${classes('button.close')} class="button close">${child($iconClose())}</li>
          </ul>
        </nav>
        <main class="card content">
          <ul>
            <li ${ref('page.word')} ${on('page.word', 'click')} ${classes('page.word')} class="page word"></li>
            <li ${ref('page.definition')} ${classes('page.definition')} class="page definition"></li>
            <li ${ref('page.collocation')} ${classes('page.collocation')} class="page collocation"></li>
            <li ${ref('page.image')} ${classes('page.image')} class="page image">
              ${child(this.slider.view)}
            </li>
          </ul>
        </main>
        <audio ${ref('player')} ${on('card.player', ['play', 'pause'])}></audio>
        </div>
      </div>`
    );
    this.dom = template.references;
    this.classes = template.classes;
    this.html = template;
  }

}

export default new Card();