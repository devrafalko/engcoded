import './../commons.scss';
import './sentences.scss';

const { Items, Dialog, Words } = $commons;
const { $templater, $randomBetween } = $utils;
const { $iconArrow } = $icons;

class Sentences {
  constructor({ sentences, page, navigation }) {
    this.dom = { page, container: navigation.pages };
    this.navigation = navigation;
    this.data = {};
    this.instances = {};
    this.views = {};
    this.maps = {};

    this.importSentences(sentences);
    this.renderItems();
  }

  get colors() {
    return [
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
      [6, 5, 1, 3, 4, 7, 2, 8, 0],
      [5, 2, 1, 6, 0, 3, 4, 8, 7],
      [0, 1, 6, 3, 5, 8, 2, 4, 7],
      [2, 1, 3, 8, 0, 6, 5, 7, 4],
      [2, 7, 1, 3, 6, 4, 8, 5, 0]
    ]
  }

  importSentences(sentences) {
    this.data.sentences = {};
    sentences.keys().forEach((_path) => {
      let module = sentences(_path).default;
      this.data.sentences[module.id] = module;
    });
  }

  renderItems() {
    this.items = new Items({
      id: 'sentences-table',
      items: this.data.sentences,
      open: (sentencesId) => {
        this.navigation.toggle('close');
        this.openSentences(sentencesId);
      }
    });
    this.dom.page.appendChild(this.items.view);
  }

  openSentences(sentencesId) {
    if (!this.instances[sentencesId]) this.renderContentData(sentencesId);
    if (!this.views[sentencesId]) {
      this.renderSentences(sentencesId);
      this.addListeners(sentencesId);
      this.buildMaps(sentencesId);
      this.colorElements(sentencesId);
    }
    Dialog.load({
      name: 'sentences',
      mode: 'sentences',
      container: this.dom.container,
      content: this.views[sentencesId].template,
      cardArea: this.views[sentencesId].references.get('scrollable'),
      contentData: this.instances[sentencesId]
    });
  }

  renderContentData(sentencesId) {
    this.instances[sentencesId] = {
      games: {},
      words: new Words(this.data.sentences[sentencesId].words)
    };
  }

  renderSentences(sentencesId) {
    const { header, sentences } = this.data.sentences[sentencesId];
    const data = $templater(({ ref, list, when, child, on, classes }) =>/*html*/`
      <div ${ref('scrollable')} class="sentences-scroll">
        <section class="sentences-content text-content">
          <h1>${header}</h1>
          <article>
            <table>
              <tbody>
              ${list(sentences, ({ id, sentence, translations }) =>/*html*/`
                <tr>
                  <td>
                  ${when(translations.length, () =>/*html*/`
                    <span ${on(`toggle.${id}`, 'click', { data: { open: false, pending: false } })} ${classes(`toggle.${id}`)}>${child($iconArrow())}</span>
                  `)}
                  </td>
                  <td>
                    <dl ${ref(`sentence.${id}`)} ${on(`sentence.${id}`, ['mouseover', 'mouseout'])}>
                      <dt>${sentence}</dt>
                      ${when(translations.length, () =>/*html*/`
                        <div ${ref(`accordion.container.${id}`)} class="translations-box toggle" ${classes(`accordion.container.${id}`)}>
                          <div ${ref(`accordion.relative.${id}`)}>
                          ${list(translations, (translation) =>/*html*/`
                            <dd>${translation}</dd>
                          `)}
                          </div>
                        </div>
                      `)}
                    </dl>
                  </td>
                </tr>
              `)}
              </tbody>
            </table>
          </article>
        </section>
      </div>
    `);
    this.views[sentencesId] = data;
  }

  addListeners(sentencesId) {
    const { $on, references, classes } = this.views[sentencesId];
    $on('toggle', ({ id, last, data }) => {
      if (id.startsWith('toggle')) {
        if (data.pending) return;
        data.pending = true;
        const maps = this.maps[sentencesId].get(last);
        const container = references.get('accordion').get('container').get(last);
        const relative = references.get('accordion').get('relative').get(last);
        const accordionClasses = classes.get('accordion').get('container').get(last);
        const buttonClasses = classes.get('toggle').get(last);
        const { height: contentHeight } = relative.getBoundingClientRect();
        if (data.open) {
          container.style.height = `${contentHeight}px`;
          accordionClasses.remove('open');
          buttonClasses.remove('open');
          maps.opened = false;
          setTimeout(() => container.style.height = `0px`, 10)
          setTimeout(() => {
            container.style.height = null;
            data.open = !data.open;
            data.pending = false;
          }, 210);
        } else {
          container.style.height = `${contentHeight}px`;
          accordionClasses.add('open');
          buttonClasses.add('open');
          maps.opened = true;
          setTimeout(() => {
            container.style.height = 'auto';
            data.open = !data.open;
            data.pending = false;
          }, 200);
        }
      }
    });
    $on('sentence', ({ event, last, type }) => {
      if (!event.target.hasAttribute('data-color')) return;
      const { identifiers, references } = this.maps[sentencesId].get(last);
      const localIndex = references.get(event.target);
      const elements = identifiers.get(localIndex);
      switch (type) {
        case 'mouseover':
          elements.forEach((element) => element.classList.add('hover'));
          break;
        case 'mouseout':
          elements.forEach((element) => element.classList.remove('hover'));
          break;
      }
    })
  }

  buildMaps(sentencesId) {
    const { references } = this.views[sentencesId];
    const elements = references.get('sentence');
    this.maps[sentencesId] = new Map();
    elements.forEach((el, id) => {
      let identifiers = new Map();
      let references = new Map();
      let locals = el.querySelectorAll('[data-local]');
      locals.forEach((el) => {
        let attrValue = el.getAttribute('data-local');
        references.set(el, attrValue);
        if (!identifiers.has(attrValue)) identifiers.set(attrValue, []);
        identifiers.get(attrValue).push(el);
        el.removeAttribute('data-local');
      });
      this.maps[sentencesId].set(id, { identifiers, references, opened: false })
    });
  }

  colorElements(sentencesId) {
    const maps = this.maps[sentencesId];
    const colorsCollection = this.colors;
    let listIndex = $randomBetween(0, colorsCollection.length - 1);
    maps.forEach(({ identifiers }) => {
      if (identifiers.size === 0) return;
      const colorList = colorsCollection[listIndex];
      let colorIndex = $randomBetween(0, colorList.length - 1);
      identifiers.forEach((elements) => {
        elements.forEach((element) => element.setAttribute('data-color', colorList[colorIndex]));
        if (++colorIndex === colorList.length) colorIndex = 0;
      })
      if (++listIndex === colorsCollection.length) listIndex = 0;
    })
  }

}

export default Sentences;