const { $templater } = $utils;

class Viewer {
  constructor() {
    this._renderView();
  }

  get view() {
    return this.container;
  }

  render(src, callback) {
    this.image.src = src;
    const interval = setInterval(() => {
      if (this.image.naturalWidth > 0 && this.image.naturalHeight) {
        clearInterval(interval);
        if (callback) callback();
      }
    }, 20);
  }

  addLabel() {

  }

  focusLabel() {

  }

  _renderView() {
    const templater = $templater(({ ref }) =>/*html*/`
      <div ${ref('container')}>
        <img ${ref('image')}/>
      </div>
    `);
    this.html = templater;
    this.container = templater.references.get('container');
    this.image = templater.references.get('image');
  }

}

export default Viewer;