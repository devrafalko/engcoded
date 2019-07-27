import type from 'of-type';
import './card.scss';

const { Slider, Scroller } = $commons;
const { $templater, $loopParents } = $utils;
const { $images, $words } = $data;
const { $iconCardDefinition, $iconCardImage, $iconCardWord, $iconClose, $iconVolume, $iconNextWord, $iconPreviousWord } = $icons;

class Card {
  constructor() {
    this.slider = new Slider();
    this.data = { words: $words, images: $images };
    this.state = { opened: false, active: null, currentContainer: null, currentIndex: null, currentWords: null };
    this.events = {};
    this._renderView();
    this._addListeners();
    this._fitOnResize();
    this._supportAudio();
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

    if (!this.data.words.has(id)) return;
    const { word, definition, meaning, audio, img } = this.data.words.get(id);

    this.hide(true);
    this._renderWordPage(word, meaning, audio, meanings, (wordPage) => {
      this.dom.get('card').get('word').innerHTML = '';
      this.dom.get('card').get('word').appendChild(wordPage);
    });

    this._renderDefinitionPage(definition, (empty, rendered) => {
      this.classes.get('button').get('definition')[empty ? 'add' : 'remove']('disabled');
      if (empty && this.state.active === 'definition') this._switchCard('word');
      if (empty) return;
      this.dom.get('card').get('definition').innerHTML = '';
      this.dom.get('card').get('definition').appendChild(rendered);
    });

    this._renderImagePage(img, (empty) => {
      this.classes.get('button').get('image')[empty ? 'add' : 'remove']('disabled');
      if (empty && this.state.active === 'image') this._switchCard('word');
    });

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

  _supportAudio() {
    const audio = document.createElement('AUDIO');
    const card = this.dom.get('card').get('word');

    card.addEventListener('click', (event) => {
      $loopParents(event.target, (element, stop) => {
        if (element === card) return stop();
        if (element.hasAttribute('data-mp3')) {
          const src = element.getAttribute('data-mp3');
          audio.src = src;
          audio.play();
          return stop();
        }
      });
    });

    audio.addEventListener('play', () => {
      this.state.currentPlayerClasses.add('sound-on');
    });

    audio.addEventListener('pause', () => {
      this.state.currentPlayerClasses.remove('sound-on');
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
    const element = elements[0];
    const view = this.dom.get('view');
    const classes = this.classes.get('view');
    if (!container.contains(view)) container.appendChild(view);
    this._resetCardPosition();
    const style = view.style;
    const parent = element.offsetParent;
    const wordTop = element.offsetTop;
    const wordLeft = element.getBoundingClientRect().left - parent.getBoundingClientRect().left;
    const wordWidth = element.offsetWidth;
    const wordHeight = element.offsetHeight;
    const containerWidth = parent.clientWidth;
    const containerHeight = parent.clientHeight;
    const containerScrollY = parent.scrollTop;
    const containerScrollHeight = parent.scrollHeight;
    const containerScrollX = parent.scrollLeft;
    const cardWidth = view.offsetWidth;
    const cardHeight = view.offsetHeight;

    switch (true) {
      case containerWidth - (wordLeft) >= cardWidth: /* fitRight */
        style.left = (wordLeft + containerScrollX) + 'px';
        style.right = null;
        break;
      case (wordLeft) + wordWidth >= cardWidth: /* fitLeft */
        style.right = (containerWidth - wordLeft - wordWidth - containerScrollX) + 'px';
        style.left = null;
        break;
      case containerWidth > cardWidth: /* fitCenterX */
        style.margin = 'auto';
        style.left = `calc(-100% + ${containerScrollX}px)`;
        style.right = `calc(-100% - ${containerScrollX}px)`;
        break;
      default:
        style.margin = 'auto';
        style.left = `calc(0% + ${containerScrollX}px)`;
        style.right = `calc(0% - ${containerScrollX}px)`;
    }
    switch (true) {
      case containerHeight - wordTop - wordHeight + containerScrollY >= cardHeight: /* fitBottom */
        style.top = (wordTop + wordHeight) + 'px';
        break;
      case wordTop - containerScrollY >= cardHeight: /* fitTop */
        style.top = (wordTop - cardHeight) + 'px';
        break;
      case containerScrollHeight - wordTop - wordHeight >= cardHeight: /* fitBottomOutline */
        style.top = (wordTop + wordHeight) + 'px';
        break;
      case wordTop >= cardHeight: /* fitTopOutline */
        style.top = (wordTop - cardHeight) + 'px';
        break;
      default:
        style.top = containerScrollY + 'px';
    }
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
    const button = this.dom.get('button');
    button.get('word').addEventListener('click', this._switchCard.bind(this, 'word', true));
    button.get('definition').addEventListener('click', this._switchCard.bind(this, 'definition', true));
    button.get('image').addEventListener('click', this._switchCard.bind(this, 'image', true));
    button.get('close').addEventListener('click', this.hide.bind(this, false));
    button.get('next').addEventListener('click', this._switchOccurrence.bind(this, 'next'));
    button.get('previous').addEventListener('click', this._switchOccurrence.bind(this, 'previous'));
    this._switchCard('word');
    window.addEventListener('keydown', (event) => {
      if (!this.state.opened) return;
      if (event.ctrlKey === true) return;
      if (event.keyCode === 39) this._switchOccurrence('next');
      if (event.keyCode === 37) this._switchOccurrence('previous');
      if (event.keyCode === 27) this.hide(false);
    });
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

  _fitOnResize() {
    window.addEventListener('resize', (event) => this.fit());
  }

  _switchCard(id, fitPosition) {
    if (id === this.state.active) return;
    const button = this.classes.get('button').get(id);
    const card = this.classes.get('card').get(id);

    if (button.has('disabled')) return;

    if (this.state.active) {
      let _button = this.classes.get('button').get(this.state.active);
      let _card = this.classes.get('card').get(this.state.active);
      _button.remove('active');
      _card.remove('active');
    }

    button.add('active');
    card.add('active');
    this.state.active = id;
    if (fitPosition) this.show(this.state.currentIndex, this.state.currentContainer);
  }

  _renderWordPage(words, meanings, audioSource, meaningOrder, callback) {
    const singular = type(audioSource, String);
    const definitions = prepareDefinitions(meanings, meaningOrder);
    const { template, classes } = $templater(({ when, classes, list, child, ref }) => /*html*/`
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
          ${list(definitions, (key, word) =>/*html*/`
            <span ${when(key, () => `data-keyword="true"`)} class="translation-tab">${word}</span>
          `)}
        </ul>
      </div>`
    );

    this.state.currentPlayerClasses = classes.get('player');
    callback(template);

    function prepareDefinitions(meanings, meaningOrder) {
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

  _renderView() {
    const { references, classes } = $templater(({ child, ref, classes }) => /*html*/`
      <div class="card container" ${ref('view')} ${classes('view')}>
        <div class="card relative-box">
        <nav class="card navigation">
          <ul class="section pages">
            <li ${ref('button.word')} ${classes('button.word')} class="button">${child($iconCardWord())}</li>
            <li ${ref('button.definition')} ${classes('button.definition')} class="button">${child($iconCardDefinition())}</li>
            <li ${ref('button.image')} ${classes('button.image')} class="button">${child($iconCardImage())}</li>
          </ul>
          <ul class="section control" ${classes('section.control')}>
            <li ${ref('button.previous')} ${classes('button.previous')} class="button nav previous">${child($iconPreviousWord())}</li>
            <li ${ref('button.next')} ${classes('button.next')} class="button nav next">${child($iconNextWord())}</li>
            <li ${ref('button.close')} ${classes('button.close')} class="button close">${child($iconClose())}</li>
          </ul>
        </nav>
        <main class="card content">
          <ul>
            <li ${ref('card.word')} ${classes('card.word')} class="page word"></li>
            <li ${ref('card.definition')} ${classes('card.definition')} class="page definition"></li>
            <li ${ref('card.image')} ${classes('card.image')} class="page image">
              ${child(this.slider.view)}
            </li>
          </ul>
        </main>
        </div>
      </div>`
    );
    this.dom = references;
    this.classes = classes;
  }

}

export default new Card();