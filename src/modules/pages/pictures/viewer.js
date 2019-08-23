const { $templater, $casteljau } = $utils;
const { $iconPictureLabel } = $icons;

class Viewer {
  constructor({ dialog, words }) {
    this.data = {
      navLabel: dialog.classes.get('button').get('viewer').get('labels'),
      navOutput: dialog.dom.get('viewer').get('output'),
      words,
      zoom: 0.02,
      shiftLimit: .33,
      spyMargin: .1
    };
    this.state = {
      currentLabelIndex: null,
      move: false,
      spy: true,
      current: null
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
    return this.state.zoom || this.initialZoom;
  }

  set zoom(val) {
    const initialZoom = this.initialZoom;
    const ratio = val > 1 ? 1 : val < initialZoom ? initialZoom : val;
    this.state.zoom = ratio;
    this.width = this.image.naturalWidth * ratio;
  }

  get width() {
    return this.state.width || this.image.naturalWidth * this.initialZoom;
  }

  set width(v) {
    this.state.width = v;
    this.content.style.width = `${v}px`;
  }

  get height() {
    const ratio = this.image.naturalHeight / this.image.naturalWidth;
    return this.width * ratio;
  }

  set height(v) {
    this.state.height = v;
  }

  get top() {
    return this.state.top || this.content.offsetTop;
  }

  set top(v) {
    const topLimit = this.container.clientHeight - this.container.clientHeight * this.data.shiftLimit;
    const bottomLimit = this.container.clientHeight * this.data.shiftLimit - this.height;
    const limited = v > topLimit ? topLimit : v < bottomLimit ? bottomLimit : v;
    this.state.top = limited;
    this.content.style.top = `${limited}px`;
  }

  get left() {
    return this.state.left || this.content.offsetLeft;
  }

  set left(v) {
    const leftLimit = this.container.clientWidth - this.container.clientWidth * this.data.shiftLimit;
    const rightLimit = this.container.clientWidth * this.data.shiftLimit - this.width;
    const limited = v > leftLimit ? leftLimit : v < rightLimit ? rightLimit : v;
    this.state.left = limited;
    this.content.style.left = `${limited}px`;
  }

  get current() {
    return this.state.current;
  }

  set current(next) {
    const labels = this.html.classes.get('label');
    const prev = this.state.current;
    if (prev !== null) labels.get(String(prev)).remove('active');
    if (next !== null) labels.get(String(next)).add('active');
    this.data.navOutput.get('current').innerHTML = next === null ? '-' : next + 1;
    this.data.navOutput.get('total').innerHTML = this.data.words.size;
    this.state.current = next;
  }

  render(src, callback) {
    this.image.src = src;
    const interval = setInterval(() => {
      if (this.image.naturalWidth > 0 && this.image.naturalHeight) {
        clearInterval(interval);
        if (callback) callback();
        this.reset();
      }
    }, 20);
  }

  reset() {
    this.resize();
    this.current = null;
    this.state.currentLabelIndex = null;
    this.labels(true);
  }

  resize() {
    this.zoom = this.initialZoom;
    this.left = this.initialX;
    this.top = this.initialY;
  }

  previous() {
    this.current = this.current === null || this.current - 1 < 0 ? this.data.words.size - 1 : this.current - 1;
    const id = this.data.words.iterators.get(this.current);
    const labelIndex = this.data.words.identifiers.get(id)[0];
    this.state.currentLabelIndex = labelIndex;
    if (this.state.spy) this._adjust(labelIndex);
    else this.resize();
    this.labels(false);
  }

  next() {
    this.current = this.current === null || this.current + 1 === this.data.words.size ? 0 : this.current + 1;
    const id = this.data.words.iterators.get(this.current);
    const labelIndex = this.data.words.identifiers.get(id)[0];
    this.state.currentLabelIndex = labelIndex;
    if (this.state.spy) this._adjust(labelIndex);
    else this.resize();
    this.labels(false);
  }

  goTo(labelIndex, id) {
    this.current = this.data.words.iterators.get(id);
    this.state.currentLabelIndex = labelIndex;
    if (this.state.spy) this._adjust(labelIndex);
    else this.resize();
    this.labels(false);
  }

  spy(action) {
    this.state.spy = action;
    if (action === false) return this.resize();
    if (this.state.currentLabelIndex !== null) this._adjust(this.state.currentLabelIndex);
  }

  labels(action) {
    this.html.classes.get('content')[action ? 'add' : 'remove']('visible');
    this.data.navLabel[action ? 'add' : 'remove']('active');
  }

  _adjust(index) {
    const { t, l, b, r } = this.data.words.indeces.get(index);
    const margin = this.data.spyMargin;
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    const boxWidth = this.image.naturalWidth * (r - l + margin * 2);
    const boxHeight = this.image.naturalHeight * (b - t + margin * 2);
    const boxLeft = this.image.naturalWidth * (l - margin);
    const boxTop = this.image.naturalHeight * (t - margin);
    const zoomX = containerWidth / boxWidth;
    const zoomY = containerHeight / boxHeight;
    this.zoom = Math.min(zoomX, zoomY);

    const boxCenterX = (boxLeft + boxWidth / 2) * this.zoom;
    const boxCenterY = (boxTop + boxHeight / 2) * this.zoom;
    this.left = containerWidth / 2 - boxCenterX;
    this.top = containerHeight / 2 - boxCenterY;
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
    let width = this.width;
    let height = this.height;
    let top = this.top;
    let left = this.left;
    let zoom = this.zoom;

    if (event.deltaY < 0) {
      if (this.zoom === 1) return;
      this.zoom += this.data.zoom;
    } else if (event.deltaY > 0) {
      if (this.zoom === this.initialZoom) return;
      this.zoom -= this.data.zoom;
    }

    const zoomShiftX = this.image.naturalWidth * (this.zoom - zoom);
    const zoomShiftY = this.image.naturalHeight * (this.zoom - zoom);
    const { x, y } = this._coords(event);
    const imageX = x - left;
    const imageY = y - top;
    const _imagePercX = imageX / width;
    const _imagePercY = imageY / height;
    const outside = _imagePercX < 0 || _imagePercX > 1 || _imagePercY < 0 || _imagePercY > 1;
    const imagePercX = outside ? .5 : _imagePercX;
    const imagePercY = outside ? .5 : _imagePercY;

    this.left = left - zoomShiftX * imagePercX;
    this.top = top - zoomShiftY * imagePercY;
  }

  _moveStart(event) {
    const { x, y } = this._coords(event);
    this.state.moveX = x - this.left;
    this.state.moveY = y - this.top;
    this.state.move = true;
  }

  _moveStop() {
    this.state.move = false;
  }

  _move(event) {
    const { x, y } = this._coords(event);
    this.left = x - this.state.moveX;
    this.top = y - this.state.moveY;
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