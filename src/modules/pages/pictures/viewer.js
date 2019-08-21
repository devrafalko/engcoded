const { $templater, $casteljau } = $utils;
const { $iconPictureLabel } = $icons;

class Viewer {
  constructor({ output }) {
    this.data = {
      output,
      zoom: 0.02,
      shiftLimit: .33
    };
    this.state = {
      move: false
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
    this.content.style.width = `${this.state.width}px`;
  }

  get width() {
    return this.state.width || this.image.naturalWidth * this.initialZoom;
  }

  set width(v) {
    this.state.width = v;
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

  render(src, callback) {
    this.image.src = src;
    const interval = setInterval(() => {
      if (this.image.naturalWidth > 0 && this.image.naturalHeight) {
        clearInterval(interval);
        if (callback) callback();
        this.adjust();
      }
    }, 20);
  }

  adjust() {
    this.content.style.width = `${this.image.naturalWidth * this.initialZoom}px`;
    this.content.style.left = `${this.initialX}px`;
    this.content.style.top = `${this.initialY}px`;
  }

  previous() {

  }

  next() {

  }

  spy(action) {

  }

  labels(action) {

  }

  _renderView() {
    const templater = $templater(({ ref, on, child, classes }) =>/*html*/`
      <div ${ref('container')} ${on('container', ['mousedown', 'mouseup', 'wheel', 'mousemove', 'mouseout'])} class="viewer container">
        <div ${ref('content')} class="viewer content">
          <img ${ref('image')} ${on('image', ['dragstart'])} class="viewer image"/>
          <span ${on('label', ['mouseenter', 'mouseleave'])} ${classes('label')} class="viewer label" style="top:20%; left:20%">${child($iconPictureLabel())}</span>
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

    $on('label', ({ type, target, event }) => {
      if (type === 'mouseenter') {
        classes.get('label').swing('left', 'right', 300);
      }
      if (type === 'mouseleave') {
        classes.get('label').clear();
        classes.get('label').wait(200).remove('left', 'right');
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