import './../commons.scss';
import './articles.scss';

const { Items, Dialog, Words } = $commons;
const { $templater } = $utils;

class Articles {
  constructor({ articles, page, navigation }) {
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
      this.data.articles[module.id] = module;
    });
  }

  renderItems() {
    const items = new Items({
      id: 'articles-table',
      items: this.data.articles,
      open: (articleId) => {
        this.navigation.toggle('close');
        this.openArticle(articleId);
      }
    });
    this.dom.page.appendChild(items.view);
  }

  openArticle(articleId) {
    if (!this.instances[articleId]) this.renderContentData(articleId);
    if (!this.views[articleId]) this.renderArticle(articleId);
    Dialog.load({
      name: 'articles',
      container: this.dom.container,
      content: this.views[articleId].template,
      cardArea: this.views[articleId].references.get('scrollable'),
      contentData: this.instances[articleId],
      showSubtitles: false
    });
  }

  renderContentData(articleId) {
    this.instances[articleId] = { 
      games: {},
      words: new Words(this.data.articles[articleId].words)
    };
  }

  renderArticle(articleId) {
    const article = this.data.articles[articleId];
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
    this.views[articleId] = data;
  }
}

export default Articles;