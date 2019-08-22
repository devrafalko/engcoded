import Loader from './loader';
import Viewer from './viewer';
import './picture.scss';

const { Items, Dialog, Words } = $commons;
const { $templater } = $utils;
const { $pictures } = $data;

class Pictures {
  constructor({ pictures, page, navigation }) {
    this.dom = { page, container: navigation.pages };
    this.navigation = navigation;
    this.data = {};
    this.instances = {};
    this.views = {};

    this._importPictures(pictures);
    this._renderItems();
  }

  _importPictures(pictures) {
    this.data.pictures = {};
    pictures.keys().forEach((_path) => {
      let module = pictures(_path).default;
      this.data.pictures[module.id] = module;
    });
  }

  _renderItems() {
    const items = new Items({
      id: 'pictures-table',
      items: this.data.pictures,
      open: (pictureId) => {
        this.navigation.toggle('close');
        this._openPicture(pictureId);
      }
    });
    this.dom.page.appendChild(items.view);
  }

  _openPicture(pictureId) {
    if (!this.instances[pictureId]) this._renderContentData(pictureId);
    if (!this.views[pictureId]) this._renderView(pictureId);
    const instance = this.instances[pictureId];
    Dialog.load({
      name: 'pictures',
      mode: 'pictures',
      container: this.dom.container,
      content: this.views[pictureId].template,
      cardArea: this.views[pictureId].references.get('picture-area'),
      contentData: instance
    });
    if (instance.loaded === false && instance.pending === false) this._loadPicture(pictureId);
  }

  _renderContentData(pictureId) {
    const picture = this.data.pictures[pictureId];
    const words = new Words(picture.words);
    this.instances[pictureId] = {
      words,
      viewer: new Viewer({ words, output: Dialog.dom.get('viewer').get('output') }),
      games: {},
      loaded: false,
      pending: false
    };
  }

  _renderView(pictureId) {
    const viewer = this.instances[pictureId].viewer;
    const data = $templater(({ child, ref, classes }) =>/*html*/`
      <div ${ref('picture-area')} class="picture area">
        <section ${classes('page.loading')} class="picture loading displayed visible">
          <p ${classes('progress-label')}>
            <span ${ref('progress-value')} class="progress">0%</span>
            <span class="label">loading picture</span>
          </p>
        </section>
        <section ${classes('page.picture')} class="picture content">
          ${child(viewer.view)}
        </section>
      </div>
    `);
    this.views[pictureId] = data;
  }

  _loadPicture(pictureId) {
    const instance = this.instances[pictureId];
    const { source } = this.data.pictures[pictureId];
    const { references: dom, classes } = this.views[pictureId];
    const pictureUrl = $pictures.get(source);
    const loader = new Loader();

    loader.on.start = () => {
      classes.get('progress-label').wait(10).add('visible');
      instance.pending = true;
    }

    loader.on.progress = (value) => {
      dom.get('progress-value').innerHTML = `${Math.round(value * 100)}%`;
    }

    loader.on.finish = (src) => {
      instance.viewer.render(src, () => {
        classes.get('progress-label').remove('visible');
        classes.get('page').get('loading').wait(350).remove('visible').wait(1000).remove('displayed');
        classes.get('page').get('picture').add('displayed');
        instance.loaded = true;
        instance.pending = false;
      });
    }

    loader.load(pictureUrl);
  }

}

export default Pictures;