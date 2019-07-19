import type from 'of-type';
import './card.scss';

const { Slider } = $commons;
const { $templater, $loopParents } = $utils;
const { $images, $words } = $data;
const { $iconCardDefinition, $iconCardImage, $iconCardWord, $iconClose, $iconVolume } = $icons;

class Card {
  constructor() {
    this.slider = new Slider();
    this.data = { words: $words, images: $images };
    this.state = { active: null, currentElement: null, currentContainer: null };
    this.events = {};
    this._renderView();
    this._addListeners();
    this._fitOnResize();
    this._supportAudio();
  }

  get onOpen() {
    return this.events.onOpen || null;
  }

  set onOpen(fn) {
    this.events.onOpen = fn;
  }

  get onClose() {
    return this.events.onClose || null;
  }

  set onClose(fn) {
    this.events.onClose = fn;
  }

  fit() {
    if (this.state.currentElement) {
      delayFit.call(this);

      function delayFit() {
        if (this.state.fitDelayPending === true) return;
        this.state.fitDelayPending = true;
        setTimeout(() => {
          this.show(this.state.currentElement, this.state.currentContainer);
          this.state.fitDelayPending = false;
        }, 50);
      }
    }
  }

  refresh({ element, id, meanings, container }) {
    if (this.state.currentElement === element) {
      this.hide(false);
      return;
    }
    this.hide(true);
    const { word, definition, meaning, audio, img } = this.data.words.get(id);
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
    this.show(element, container);
    this.state.currentElement = element;
    this.state.currentContainer = container;
  }

  _supportAudio(){
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

  show(word, container) {
    const view = this.dom.get('view');
    const classes = this.classes.get('view');
    if (!container.contains(view)) container.appendChild(view);
    this._resetCardPosition();
    const style = view.style;
    const parent = word.offsetParent;
    const wordTop = word.offsetTop;
    const wordLeft = word.getBoundingClientRect().left - parent.getBoundingClientRect().left;
    const wordWidth = word.offsetWidth;
    const wordHeight = word.offsetHeight;
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
    word.classList.add('active');
    if (this.state.currentElement === null && this.events.onOpen) this.events.onOpen();
  }

  hide($switch) {
    this.classes.get('view').clear().remove('visible').wait($switch === false ? 300 : null).remove('displayed');
    if (this.state.currentElement) {
      if ($switch === false && this.events.onClose) this.events.onClose();
      this.state.currentElement.classList.remove('active');
      if ($switch !== true) this.state.currentElement = null;
    }
  }

  _addListeners() {
    const button = this.dom.get('button');
    button.get('word').addEventListener('click', this._switchCard.bind(this, 'word', true));
    button.get('definition').addEventListener('click', this._switchCard.bind(this, 'definition', true));
    button.get('image').addEventListener('click', this._switchCard.bind(this, 'image', true));
    button.get('close').addEventListener('click', this.hide.bind(this, false));
    this._switchCard('word');
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
    if (fitPosition) this.show(this.state.currentElement, this.state.currentContainer);
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
          <ul>
            <li ${ref('button.word')} ${classes('button.word')} class="button">${child($iconCardWord())}</li>
            <li ${ref('button.definition')} ${classes('button.definition')} class="button">${child($iconCardDefinition())}</li>
            <li ${ref('button.image')} ${classes('button.image')} class="button">${child($iconCardImage())}</li>
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