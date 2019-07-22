import path from 'path';
import type from 'of-type';
import typeProperties from 'typeof-properties';
import './../commons.scss';
import './articles.scss';

const { Items, Dialog } = $commons;
const { $templater } = $utils;

class Articles {
  constructor(data) {
    const { articles, page, navigation } = data;
    this.dom = { page, container: navigation.pages };
    this.navigation = navigation;
    this.data = {};
    this.instances = {};
    this.views = {};

    this.importArticles(articles);
    this.renderItems();
  }

  importArticles(articles) {
    this.data.articles = {};
    articles.keys().forEach((_path) => {
      let module = articles(_path).default;
      let name = path.basename(_path, '.js');
      if (!type(module, Object)) {
        throw new TypeError(`Invalid '${name}' module: The module should export the default [Object] object.`);
      }
      const types = {
        header: String,
        url: String,
        text: [String, Array],
        words: Array
      };
      typeProperties(module, types, ({ message }) => {
        throw new TypeError(`Invalid '${name}' article: ${message}`);
      });
      this.data.articles[name] = module;
    });
  }

  renderItems() {
    const items = new Items({
      id: 'articles-table',
      items: this.data.articles,
      open: (articleName) => {
        this.navigation.toggle('close');
        this.openArticle(articleName);
      }
    });
    this.dom.page.appendChild(items.view);
  }

  openArticle(articleName) {
    if (!this.instances[articleName]) this.renderWordsMap(articleName);
    if (!this.views[articleName]) this.renderArticle(articleName);
    Dialog.load({
      name: 'articles',
      container: this.dom.container,
      content: this.views[articleName].template,
      cardArea: this.views[articleName].references.get('scrollable'),
      words: this.instances[articleName],
      viewSubtitles: false
    });
  }

  renderWordsMap(articleName) {
    this.instances[articleName] = {};
    const instance = this.instances[articleName];
    const article = this.data.articles[articleName];
    instance.wordsMap = new Map();
    instance.idMap = new Map();
    article.words.forEach((item) => {
      if (!instance.idMap.has(item.id)) instance.idMap.set(item.id, []);
      instance.idMap.get(item.id).push(item);
      instance.wordsMap.set(item.index, item);
    });
  }

  renderArticle(articleName) {
    const article = this.data.articles[articleName];
    const data = $templater(({ ref, list }) =>/*html*/`
      <div ${ref('scrollable')} class="article-scroll">
        <section ${ref('article')} class="article-content text-content">
          <h1>${article.header}</h1>
          <article class="md-medium">
            ${list(article.text, (item) =>/*html*/`${item}`)}
          </article>
        </section>
      </div>
    `);
    this.views[articleName] = data;
  }
}

export default Articles;