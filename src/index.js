import './index.scss';
import './styles/responsive.scss';

import Navigation from './modules/navigation/index';
import ArticleController from './modules/pages/articles/index';
import YouTubeController from './modules/pages/youtube/index';
import PodcastsController from './modules/pages/podcasts/index';
import PicturesController from './modules/pages/pictures/index';

const articles = require.context('./../db/articles', false, /\.js$/);
const podcasts = require.context('./../db/podcasts', false, /\.js$/);
const movies = require.context('./../db/movies', false, /\.js$/);
const pictures = require.context('./../db/pictures', false, /\.js$/);
const { Dialog } = $commons;
const { $id } = $utils;

class View {
  constructor() {
    this._dom = {
      navigationContainer: $id('navigation-container'),
      pagesContainer: $id('pages-container')
    };
    this._data = {
      openedArticle: null
    };
    this._pages = {};
    this.instances = {};
    this.createNavigationPanel();
  }

  createNavigationPanel() {
    this.navigation = new Navigation([
      { name: 'articles', content: '<span>Articles</span>', active: true },
      { name: 'youtube', content: '<span>YouTube</span>' },
      { name: 'podcasts', content: '<span>Podcasts</span>' },
      { name: 'pictures', content: '<span>Pictures</span>' },
    ]);
    document.body.appendChild(this.navigation.buttons);
    document.body.appendChild(this.navigation.pages);

    this.navigation.open = (name, elements, classes) => {
      const page = elements.get('page').get(name);
      if (name === 'articles') this._runArticles(name, page);
      if (name === 'youtube') this._runYouTube(name, page);
      if (name === 'podcasts') this._runPodcasts(name, page);
      if (name === 'pictures') this._runPictures(name, page);
      Dialog.close();
      classes.get('button').get(name).add('active');
      classes.get('page').get(name).clear().remove('none', 'hidden').wait(400).add('visible');
    };

    this.navigation.close = (name, elements, classes) => {
      classes.get('button').get(name).remove('active');
      classes.get('page').get(name).clear().remove('visible').add('hidden').wait(400).add('none');
    };

    this.navigation.init();
  }

  _runArticles(name, element) {
    if (this.instances[name]) return;
    this.instances[name] = new ArticleController({
      articles,
      page: element,
      navigation: this.navigation
    });
  }

  _runYouTube(name, element) {
    if (this.instances[name]) return;
    this.instances[name] = new YouTubeController({
      movies,
      page: element,
      navigation: this.navigation
    });
  }

  _runPodcasts(name, element) {
    if (this.instances[name]) return;
    this.instances[name] = new PodcastsController({
      podcasts,
      page: element,
      navigation: this.navigation
    });
  }

  _runPictures(name, element) {
    if (this.instances[name]) return;
    this.instances[name] = new PicturesController({
      pictures,
      page: element,
      navigation: this.navigation
    });
  }


}

new View();


