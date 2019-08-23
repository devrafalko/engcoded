const { $templater, $casteljau } = $utils;
const { $iconPictureLabel } = $icons;

class Viewer {
  constructor({ dialog, words }) {
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
      pendingDimensions: {}
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
      dims.left = this.left.next;
      dims.top = this.top.next;
      render.call(this);
    } else {
      this._mountAnimation(time, (volume) => {
        dims.zoom = this.zoom.prev + this.zoom.diff * volume;
        dims.width = this.width.prev + this.width.diff * volume;
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
    else this.resize();
  }

  next() {
    this.currentWord = this.currentWord === null || this.currentWord + 1 === this.data.words.size ? 0 : this.currentWord + 1;
    const id = this.data.words.iterators.get(this.currentWord);
    const labelIndex = this.data.words.identifiers.get(id)[0];
    this.currentLabel = labelIndex;
    if (this.state.spy) this._adjust(labelIndex);
    else this.resize();
  }

  seek(id) {
    const labelIndex = this.data.words.identifiers.get(id)[0];
    this.currentWord = this.data.words.iterators.get(id);
    this.currentLabel = labelIndex;
    if (this.state.spy) this._adjust(labelIndex);
    else this.resize();
  }

  goTo(labelIndex, id) {
    const nextWord = this.data.words.iterators.get(id);
    if (nextWord === this.currentWord) return;
    else this.currentWord = nextWord;
    this.currentLabel = labelIndex;
    if (this.state.spy) this._adjust(labelIndex);
    else this.resize();
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
      <div ${ref('container')} ${on('container', ['mousedown', 'mouseup', 'wheel', 'mousemove', 'mouseout'])} class="viewer container">
        <div ${ref('content')} class="viewer content" ${classes('content', ['visible'])}>
          <img ${ref('image')} ${on('image', ['dragstart'])} class="viewer image"/>
          ${list(this.data.words.indeces, ({ id, index, x, y }) =>/*html*/`
            <div ${on(`label.${index}`, ['mouseenter', 'mouseleave', 'click'], { capture: true, data: { index, id } })} ${classes(`label.${index}`)} class="viewer label" style="top:${y * 100}%; left:${x * 100}%">
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
    const { $on, classes } = this.html;

    $on('label', ({ type, target, last, data }) => {
      if (type === 'click') return this.goTo(data.index, data.id);
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
      if (type === 'wheel') return this._zoom(event);
      if (type === 'mousedown') return this._moveStart(event);
      if (type === 'mouseup') return this._moveStop();
      if (type === 'mouseleave') return this._moveStop();
      if (type === 'mousemove' && this.state.move) this._move(event);
    });
  }

  _zoom(event) {
    const initialZoom = this.initialZoom;
    const width = this.width.next;
    const height = this.height.next;
    const top = this.top.next;
    const left = this.left.next;
    const prevZoom = this.zoom.next;
    let nextZoom;

    if (event.deltaY < 0) {
      if (prevZoom === 1) return;
      nextZoom = prevZoom + this.config.zoom;
    } else if (event.deltaY > 0) {
      if (prevZoom === initialZoom) return;
      nextZoom = prevZoom - this.config.zoom;
    }

    const limitZoom = nextZoom > 1 ? 1 : nextZoom < initialZoom ? initialZoom : nextZoom;
    const zoomShiftX = this.image.naturalWidth * (limitZoom - prevZoom);
    const zoomShiftY = this.image.naturalHeight * (limitZoom - prevZoom);
    const { x, y } = this._coords(event);
    const imageX = x - left;
    const imageY = y - top;
    const _imagePercX = imageX / width;
    const _imagePercY = imageY / height;
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
    const { x, y } = this._coords(event);
    this.state.moveX = x - this.state.pendingDimensions.left;
    this.state.moveY = y - this.state.pendingDimensions.top;
    this.state.move = true;
  }

  _moveStop() {
    this.state.move = false;
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
    const { clientX, clientY } = event;
    return {
      x: clientX - left,
      y: clientY - top
    };
  }

}

export default Viewer;