import type from 'of-type';

import './hint.scss';

const { Slider } = $commons;
const { $templater, $casteljau, $loopParents } = $utils;
const { $iconPictureLabel, $iconQuestionMark, $iconClose, $iconCardWord, $iconCardDefinition,
  $iconCardImage, $iconPreviousWord, $iconNextWord, $iconVolume } = $icons;

class Hint {
  constructor(viewer, words) {
    this.viewer = viewer;
    this.words = words;
    this.slider = new Slider();
    this.state = {
      opened: false,
      currentIndex: null,
      activePage: null,
      definitionDisabled: false,
      imageDisabled: false,
    };
    this._renderView();
    this._addListeners();
  }

  get view() {
    return this.html.template;
  }

  switch(action) {
    const classes = this.html.classes.get('container');
    switch (action) {
      case 'open':
        if (this.state.opened === true) return;
        if (this.state.currentIndex === null) return;
        this.state.opened = true;
        return classes.clear().add('displayed').wait(10).add('visible');
      case 'close':
        if (this.state.opened === false) return;
        this.state.opened = false;
        return classes.clear().remove('visible').wait(480).remove('displayed');
      case 'toggle':
        return this.switch(classes.has('displayed') ? 'close' : 'open');
    }
  }

  refresh(index) {
    if (this.state.currentIndex === index) return this.switch('toggle');
    if (index === null) {
      this.state.currentIndex = null;
      this.switch('close');
      return;
    }
    if (!this.words.indeces.has(index)) return;
    const { id, meaning: meanings } = this.words.indeces.get(index);
    if (!this.words.records.has(id)) return;
    const { word, definition, meaning, audio, img } = this.words.records.get(id);

    this._renderWordPage(word, meaning, audio, meanings, (view) => {
      this.dom.get('page').get('word').innerHTML = '';
      this.dom.get('page').get('word').appendChild(view);
    });

    this._renderDefinitionPage(definition, (empty, view) => {
      this.state.definitionDisabled = empty;
      this.classes.get('button').get('definition')[empty ? 'add' : 'remove']('disabled');
      if (empty && this.state.active === 'definition') this._switchPage('word');
      if (empty) return;
      this.dom.get('page').get('definition').innerHTML = '';
      this.dom.get('page').get('definition').appendChild(view);
    });

    this._renderImagePage(img, (empty) => {
      this.classes.get('button').get('image')[empty ? 'add' : 'remove']('disabled');
      if (empty && this.state.active === 'image') this._switchPage('word');
    });

    this.classes.get('section').get('control')[this.words.identifiers.get(id).length > 1 ? 'add' : 'remove']('multiple');
    this.state.currentIndex = index;
    this.switch('open');
  }

  _switchPage(page) {
    if (page === this.state.activePage) return;
    if (page === 'definition' && this.state.definitionDisabled) return;
    if (page === 'image' && this.state.imageDisabled) return;

    if (this.state.activePage !== null) {
      this.classes.get('button').get(this.state.activePage).remove('active');
      this.classes.get('page').get(this.state.activePage).remove('active');
    }

    this.classes.get('button').get(page).add('active');
    this.classes.get('page').get(page).add('active');
    this.state.activePage = page;
  }

  _renderView() {
    const templater = $templater(({ ref, on, classes, child }) =>/*html*/`
    <ul ${ref('container')} ${classes('container')} class="hint container">
      <li ${on('button.open', 'click')} class="button open">
        <div>
          <ul class="sprite">
            <li class="open">${child($iconQuestionMark())}</li>
            <li class="close">${child($iconClose())}</li>
          </ul>
        </div>
      </li>
      <li class="dialog">
        <ul>
          <li ${ref('page.word')} ${on('page.word', 'click')} ${classes('page.word')} class="page word"></li>
          <li ${ref('page.definition')} ${classes('page.definition')} class="page definition"></li>
          <li ${ref('page.image')} ${classes('page.image')} class="page image">${child(this.slider.view)}</li>
        </ul>
        <nav class="navigation">
          <ul class="section pages">
            <li ${on('button.switch.word', 'click')} ${classes('button.word')} class="button">${child($iconCardWord())}</li>
            <li ${on('button.switch.definition', 'click')} ${classes('button.definition')} class="button">${child($iconCardDefinition())}</li>
            <li ${on('button.switch.image', 'click')} ${classes('button.image')} class="button">${child($iconCardImage())}</li>
          </ul>
          <ul class="section control" ${classes('section.control')}>
            <li ${on('button.nav.previous', 'click')} class="button nav previous">${child($iconPreviousWord())}</li>
            <li ${on('button.nav.next', 'click')} class="button nav next">${child($iconNextWord())}</li>
          </ul>
        </nav>
        <audio ${ref('audio')} ${on('audio', ['play', 'pause'])}></audio>
      </li>
    </ul>
    `);
    this.html = templater;
    this.dom = templater.references;
    this.classes = templater.classes;
  }

  _renderWordPage(words, meanings, audioSource, meaningOrder, callback) {
    const isAudioSingle = type(audioSource, String);
    const translations = orderTranslations(meanings, meaningOrder);
    const { template, classes } = $templater(({ when, classes, list, child }) => /*html*/`
      <div>
        <ul class="section word">
          <li class="player" ${when(isAudioSingle, () => `data-mp3="${audioSource}"`)} ${classes('player')}>
            ${child($iconVolume())}
          </li>
          ${when(isAudioSingle, () =>/*html*/`
            <li class="tab word">${words}</li>
          `)}
          ${when(!isAudioSingle, () =>/*html*/`
            ${list(audioSource, (item, index) =>/*html*/`
              <li class="tab word" ${when(type(item, Array), () => `data-mp3="${item[1]}"`)}>
                ${type(item, String) ? item : item[0]}
              </li>
            `)}
          `)}
        </ul>
        <ul class="section translation">
          ${list(translations, (key, word) =>/*html*/`
            <li ${when(key, () => `data-keyword="true"`)} class="tab translation">${word}</li>
          `)}
        </ul>
      </div>
    `);

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
      <ul>
        ${list(definitions, (definition) =>/*html*/`
          <li class="sentence"><p>${definition}</p></li>
        `)}
      </ul>
    `);
    callback(false, template);
  }

  _renderImagePage($images, callback) {
    const images = type($images, Array) && $images.length ? $images : type($images, String) && $images.length ? [$images] : null;
    if (images === null) return callback(true);
    this.slider.update(images);
    callback(false);
  }

  _switchOccurrence(side) {
    const { id } = this.words.indeces.get(this.state.currentIndex);
    const ocurrances = this.words.identifiers.get(id);
    if (ocurrances.length === 1) return;
    const current = ocurrances.findIndex((index) => index === this.state.currentIndex);
    let next = side === 'next' ? current + 1 : current - 1;
    if (next < 0) next = ocurrances.length - 1;
    if (next === ocurrances.length) next = 0;

    this.viewer.goTo(ocurrances[next], id);
    this.state.currentIndex = ocurrances[next];
  }

  _addListeners() {
    const { $on } = this.html;
    this._switchPage('word');

    $on('button', ({ last, id }) => {
      if (last === 'open') this.switch('toggle');
      if (id.startsWith('button.switch')) this._switchPage(last);
      if (id.startsWith('button.nav')) this._switchOccurrence(last);
    });

    $on('page.word', ({ current, event }) => {
      $loopParents(event.target, (element, stop) => {
        if (element === current) return stop();
        if (element.hasAttribute('data-mp3')) {
          const audio = this.dom.get('audio');
          audio.src = element.getAttribute('data-mp3');
          audio.play();
          return stop();
        }
      });
    });

    $on('audio', ({ type }) => {
      if (type === 'play') this.state.currentPlayerClasses.add('on');
      if (type === 'pause') this.state.currentPlayerClasses.remove('on');
    });
  }
}

class Viewer {
  constructor({ dialog, words }) {
    this.hint = new Hint(this, words);
    this.config = {
      zoom: 0.02,
      shiftLimit: .33,
      spyMargin: .1,
      moveFrameTime: 28,
      moveCoords: [0, 0, 0.8, 0.8, 0.9, 0.9, 1, 1]
    };
    this.data = {
      navLabel: dialog.classes.get('button').get('viewer').get('labels'),
      navOutput: dialog.dom.get('viewer').get('output'),
      words
    };
    this.state = {
      move: false,
      spy: true,
      currentWord: null,
      currentLabel: null,
      currentMove: null,
      pendingDimensions: {},
      lastTapTime: null,
      distance: null
    };
    this._renderView();
    this._addListeners();
  }

  get view() {
    return this.container;
  }

  get initialX() {
    return (this.container.clientWidth - (this.image.naturalWidth * this.initialZoom)) / 2;
  }

  get initialY() {
    return (this.container.clientHeight - (this.image.naturalHeight * this.initialZoom)) / 2;
  }

  get initialZoom() {
    const scaleY = this.container.clientHeight / this.image.naturalHeight;
    const scaleX = this.container.clientWidth / this.image.naturalWidth;
    return Math.min(scaleY, scaleX);
  }

  get zoom() {
    return this.state.zoom || { next: this.initialZoom, prev: this.initialZoom, diff: 0 };
  }

  set zoom(val) {
    const initialZoom = this.initialZoom;
    const ratio = val > 1 ? 1 : val < initialZoom ? initialZoom : val;
    this.state.zoom = { next: ratio, prev: this.zoom.next, diff: ratio - this.zoom.next };
  }

  get width() {
    const initial = this.image.naturalWidth * this.initialZoom;
    return this.state.width || { next: initial, prev: initial, diff: 0 };
  }

  set width(v) {
    this.state.width = { next: v, prev: this.width.next, diff: v - this.width.next };
  }

  get height() {
    const ratio = this.image.naturalHeight / this.image.naturalWidth;
    const next = this.width.next * ratio
    const prev = this.width.prev * ratio
    return { next, prev, diff: next - prev };
  }

  set height(v) {
    this.state.height = v;
  }

  get top() {
    return this.state.top || { next: this.content.offsetTop, prev: this.content.offsetTop, diff: 0 };
  }

  set top(v) {
    const topLimit = this.container.clientHeight - this.container.clientHeight * this.config.shiftLimit;
    const bottomLimit = this.container.clientHeight * this.config.shiftLimit - this.height.next;
    const limited = v > topLimit ? topLimit : v < bottomLimit ? bottomLimit : v;
    this.state.top = { next: limited, prev: this.top.next, diff: limited - this.top.next };
  }

  get left() {
    return this.state.left || { next: this.content.offsetLeft, prev: this.content.offsetLeft, diff: 0 };
  }

  set left(v) {
    const leftLimit = this.container.clientWidth - this.container.clientWidth * this.config.shiftLimit;
    const rightLimit = this.container.clientWidth * this.config.shiftLimit - this.width.next;
    const limited = v > leftLimit ? leftLimit : v < rightLimit ? rightLimit : v;
    this.state.left = { next: limited, prev: this.left.next, diff: limited - this.left.next };
  }

  get currentWord() {
    return this.state.currentWord;
  }

  set currentWord(next) {
    this.data.navOutput.get('current').innerHTML = next === null ? '-' : next + 1;
    this.data.navOutput.get('total').innerHTML = this.data.words.size;
    this.state.currentWord = next;
  }

  get currentLabel() {
    return this.state.currentLabel;
  }

  set currentLabel(next) {
    const labels = this.html.classes.get('label');
    const prev = this.state.currentLabel;
    if (prev !== null) labels.get(String(prev)).remove('active');
    if (next !== null) labels.get(String(next)).add('active');
    this.state.currentLabel = next;
  }

  render(src, callback) {
    this.image.src = src;
    const interval = setInterval(() => {
      if (this.image.naturalWidth > 0 && this.image.naturalHeight) {
        clearInterval(interval);
        if (callback) callback();
        this.reset(false);
      }
    }, 20);
  }

  reset(smooth = true) {
    this.resize(smooth);
    this.currentWord = null;
    this.currentLabel = null;
    this.hint.refresh(this.currentWord);
  }

  resize(smooth = true) {
    this._unmountAnimation();
    this.zoom = this.initialZoom;
    this.width = this.image.naturalWidth * this.zoom.next;
    this.left = this.initialX;
    this.top = this.initialY;
    this._update({ smooth, time: 400 });
  }

  _update({ zoom = true, top = true, left = true, smooth = true, time } = {}) {
    const dims = this.state.pendingDimensions;
    if (smooth === false) {
      dims.zoom = this.zoom.next;
      dims.width = this.width.next;
      dims.height = this.height.next;
      dims.left = this.left.next;
      dims.top = this.top.next;
      render.call(this);
    } else {
      this._mountAnimation(time, (volume) => {
        dims.zoom = this.zoom.prev + this.zoom.diff * volume;
        dims.width = this.width.prev + this.width.diff * volume;
        dims.height = this.height.prev + this.height.diff * volume;
        dims.left = this.left.prev + this.left.diff * volume;
        dims.top = this.top.prev + this.top.diff * volume;
        render.call(this);
      });
    }

    function render() {
      const styles = this.content.style;
      if (zoom) styles.width = `${dims.width}px`;
      if (left) styles.left = `${dims.left}px`;
      if (top) styles.top = `${dims.top}px`;
    }

  }

  _mountAnimation(time, callback) {
    const frame = this.config.moveFrameTime;
    const coords = this.config.moveCoords;
    let totalTime = 0;

    this.state.currentMove = setInterval(() => {
      callback($casteljau(coords, totalTime / time));
      if (totalTime >= time) return this._unmountAnimation();
      totalTime += frame;
    }, frame);
  }

  _unmountAnimation() {
    if (this.state.currentMove !== null) {
      clearInterval(this.state.currentMove);
      this.state.currentMove = null;
      this.zoom = this.state.pendingDimensions.zoom;
      this.width = this.state.pendingDimensions.width;
      this.left = this.state.pendingDimensions.left;
      this.top = this.state.pendingDimensions.top;
    }
  }

  previous() {
    this.currentWord = this.currentWord === null || this.currentWord - 1 < 0 ? this.data.words.size - 1 : this.currentWord - 1;
    const id = this.data.words.iterators.get(this.currentWord);
    const labelIndex = this.data.words.identifiers.get(id)[0];
    this.currentLabel = labelIndex;
    if (this.state.spy) this._adjust(labelIndex);
    this.hint.refresh(this.currentWord);
  }

  next() {
    this.currentWord = this.currentWord === null || this.currentWord + 1 === this.data.words.size ? 0 : this.currentWord + 1;
    const id = this.data.words.iterators.get(this.currentWord);
    const labelIndex = this.data.words.identifiers.get(id)[0];
    this.currentLabel = labelIndex;
    if (this.state.spy) this._adjust(labelIndex);
    this.hint.refresh(this.currentWord);
  }

  seek(id) {
    const labelIndex = this.data.words.identifiers.get(id)[0];
    this.currentWord = this.data.words.iterators.get(id);
    this.currentLabel = labelIndex;
    if (this.state.spy) this._adjust(labelIndex);
    this.hint.refresh(this.currentWord);
  }

  goTo(nextLabel, id) {
    if (nextLabel === this.currentLabel) return;
    this.currentWord = this.data.words.iterators.get(id);
    this.currentLabel = nextLabel;
    if (this.state.spy) this._adjust(nextLabel);
  }

  spy(action) {
    this.state.spy = action;
    if (action === false) return this.resize();
    if (this.currentLabel !== null) this._adjust(this.currentLabel);
  }

  labels(action) {
    this.html.classes.get('content')[action ? 'add' : 'remove']('visible');
    this.data.navLabel[action ? 'add' : 'remove']('active');
  }

  _adjust(index) {
    const { t, l, b, r } = this.data.words.indeces.get(index);
    const margin = this.config.spyMargin;
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    const boxWidth = this.image.naturalWidth * (r - l + margin * 2);
    const boxHeight = this.image.naturalHeight * (b - t + margin * 2);
    const boxLeft = this.image.naturalWidth * (l - margin);
    const boxTop = this.image.naturalHeight * (t - margin);
    const zoomX = containerWidth / boxWidth;
    const zoomY = containerHeight / boxHeight;
    this._unmountAnimation();
    this.zoom = Math.min(zoomX, zoomY);
    this.width = this.image.naturalWidth * this.zoom.next;
    this.left = containerWidth / 2 - ((boxLeft + boxWidth / 2) * this.zoom.next);
    this.top = containerHeight / 2 - ((boxTop + boxHeight / 2) * this.zoom.next);
    this._update({ time: 400 });
  }

  _renderView() {
    const templater = $templater(({ ref, on, child, classes, list }) =>/*html*/`
      <div ${ref('container')} ${on('container', ['dblclick', 'mousedown', 'touchstart', 'mouseup', 'touchend', 'wheel', 'mousemove', 'touchmove', 'mouseout'])} class="viewer container">
        ${child(this.hint.view)}
        <div ${ref('content')} class="viewer content" ${classes('content', ['visible'])}>
          <img ${ref('image')} ${on('image', ['dragstart'])} class="viewer image"/>
          ${list(this.data.words.indeces, ({ id, index, x, y }) =>/*html*/`
            <div ${on(`label.${index}`, ['mouseenter', 'mouseleave', 'click', 'touchstart'], { capture: true, data: { index, id } })} ${classes(`label.${index}`)} class="viewer label" style="top:${y * 100}%; left:${x * 100}%">
              ${child($iconPictureLabel(index))}
            </div>
          `)}
        </div>
      </div>
    `);
    this.html = templater;
    this.container = templater.references.get('container');
    this.content = templater.references.get('content');
    this.image = templater.references.get('image');
  }

  _addListeners() {
    const { $on, classes, references } = this.html;
    const image = references.get('image');
    const container = references.get('container');

    $on('label', ({ type, target, last, data, event }) => {
      if (type === 'click' || type === 'touchstart') {
        event.preventDefault();
        this.hint.refresh(data.index);
        this.goTo(data.index, data.id);
        return
      }

      if (event.target !== target) return;
      if (type === 'mouseenter') {
        classes.get('label').get(last).clear();
        classes.get('label').get(last).swing('left', 'right', 300);
      }
      if (type === 'mouseleave') {
        classes.get('label').get(last).clear();
        classes.get('label').get(last).wait(200).remove('left', 'right');
      }
    });

    $on('image', ({ type, event }) => {
      if (type === 'dragstart') return event.preventDefault();
    });

    $on('container', ({ type, event }) => {
      switch (true) {
        case this._dblTap(event):
          event.preventDefault();
          return this._zoom(event);
        case type === 'mousedown' && (event.target === image || event.target === container):
        case type === 'touchstart' && (event.target === image || event.target === container):
          return this._moveStart(event);
        case type === 'mouseup':
        case type === 'touchend':
        case type === 'mouseleave':
          return this._moveStop(event);
        case type === 'wheel':
        case type === 'dblclick':
          return this._zoom(event);
        case type === 'mousemove' && this.state.move:
        case type === 'touchmove' && event.touches.length === 1 && this.state.move:
          return this._move(event);
        case type === 'touchmove' && event.touches.length === 2 && this.state.move:
          return this._touchZoom(event);
      }
    });
  }

  _dblTap(event) {
    if (event.type !== 'touchstart' || event.touches.length > 1) return false;
    const current = Date.now();
    const diff = current - this.state.lastTapTime;
    this.state.lastTapTime = current;
    return diff <= 200;
  }

  _touchZoom(event) {
    const { clientX: x1, clientY: y1 } = event.touches[0];
    const { clientX: x2, clientY: y2 } = event.touches[1];
    const { x, y } = this._coords(event);

    const initialZoom = this.initialZoom;
    const prevZoom = this.zoom.next;
    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const prevDistance = this.state.distance === null ? distance : this.state.distance;
    const zoomAlteration = (distance - prevDistance) / this.image.naturalWidth;
    this.state.distance = distance;

    if (zoomAlteration > 0 && prevZoom === 1) return;
    if (zoomAlteration < 0 && prevZoom === initialZoom) return;

    const nextZoom = prevZoom + zoomAlteration;
    const limitZoom = nextZoom > 1 ? 1 : nextZoom < initialZoom ? initialZoom : nextZoom;
    const imagePercX = (x - this.left.next) / this.width.next;
    const imagePercY = (y - this.top.next) / this.height.next;
    const widthDiff = this.width.next - this.state.moveWidth;
    const heightDiff = this.height.next - this.state.moveHeight;

    this.zoom = limitZoom;
    this.width = this.image.naturalWidth * prevZoom;
    this.left = x - this.state.moveX - widthDiff * imagePercX;
    this.top = y - this.state.moveY - heightDiff * imagePercY;

    this._update({ smooth: false });
  }

  _zoom(event) {
    const initialZoom = this.initialZoom;
    const width = this.width.next;
    const height = this.height.next;
    const top = this.top.next;
    const left = this.left.next;
    const prevZoom = this.zoom.next;
    let nextZoom;

    switch (event.type) {
      case 'dblclick':
      case 'touchstart':
        if (prevZoom === 1) return;
        nextZoom = prevZoom + this.config.zoom * 3;
        break;
      case 'wheel':
        if (event.deltaY < 0) {
          if (prevZoom === 1) return;
          nextZoom = prevZoom + this.config.zoom;
        }
        if (event.deltaY > 0) {
          if (prevZoom === initialZoom) return;
          nextZoom = prevZoom - this.config.zoom;
        }
    }

    const { x, y } = this._coords(event);
    const limitZoom = nextZoom > 1 ? 1 : nextZoom < initialZoom ? initialZoom : nextZoom;
    const zoomShiftX = this.image.naturalWidth * (limitZoom - prevZoom);
    const zoomShiftY = this.image.naturalHeight * (limitZoom - prevZoom);
    const _imagePercX = (x - left) / width;
    const _imagePercY = (y - top) / height;
    const outside = _imagePercX < 0 || _imagePercX > 1 || _imagePercY < 0 || _imagePercY > 1;
    const imagePercX = outside ? .5 : _imagePercX;
    const imagePercY = outside ? .5 : _imagePercY;

    this._unmountAnimation();
    this.zoom = limitZoom;
    this.width = this.image.naturalWidth * this.zoom.next;
    this.left = left - zoomShiftX * imagePercX;
    this.top = top - zoomShiftY * imagePercY;
    this._update({ time: 150 });
  }

  _moveStart(event) {
    event.preventDefault();
    const { x, y } = this._coords(event);
    this.state.moveX = x - this.state.pendingDimensions.left;
    this.state.moveY = y - this.state.pendingDimensions.top;
    this.state.moveWidth = this.state.pendingDimensions.width;
    this.state.moveHeight = this.state.pendingDimensions.height;
    this.state.move = true;
  }

  _moveStop(event) {
    this.state.distance = null;
    this.state.move = false;
    if (event.touches && event.touches.length) this._moveStart(event);
  }

  _move(event) {
    const { x, y } = this._coords(event);
    this._unmountAnimation();
    this.left = x - this.state.moveX;
    this.top = y - this.state.moveY;
    this._update({ smooth: false });
  }

  _coords(event) {
    const { top, left } = this.container.getBoundingClientRect();
    let x, y;
    switch (true) {
      case !event.touches:
        x = event.clientX;
        y = event.clientY;
        break;
      case event.touches.length === 1:
        x = event.touches[0].clientX;
        y = event.touches[0].clientY;
        break;
      case event.touches.length === 2:
        const { clientX: x1, clientY: y1 } = event.touches[0];
        const { clientX: x2, clientY: y2 } = event.touches[1];
        x = Math.min(x1, x2) + (Math.max(x1, x2) - Math.min(x1, x2)) / 2;
        y = Math.min(y1, y2) + (Math.max(y1, y2) - Math.min(y1, y2)) / 2;
        break;
    }
    return {
      x: x - left,
      y: y - top
    };
  }

}

export default Viewer;