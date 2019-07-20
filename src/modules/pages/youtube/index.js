import path from 'path';
import type from 'of-type';
import typeProperties from 'typeof-properties';
import './../commons.scss';
import './youtube.scss';

const { Items, Dialog, Card, Timer, Scroller } = $commons;
const { $templater, $loopParents } = $utils;
const { $iconTextPlay } = $icons;

class YouTube {
  constructor(data) {
    const { movies, page, navigation } = data;
    this.dom = { page, container: navigation.pages };
    this.navigation = navigation;
    this.data = {};
    this.instances = {};
    this.views = {};
    this.events = {
      ready: null,
      state: null
    };
    this.state = {};
    this.importMovies(movies);
    this.loadYouTubeScripts(() => {
      this.renderItems();
      this.addListeners();
    });

  }

  importMovies(movies) {
    this.data.movies = {};
    movies.keys().forEach((_path) => {
      let module = movies(_path).default;
      let name = path.basename(_path, '.js');
      if (!type(module, Object)) {
        throw new TypeError(`Invalid '${name}' module: The module should export the default [Object] object.`);
      }
      const types = {
        header: String,
        url: String,
        id: String,
        subtitles: Map,
        words: Array
      };

      typeProperties(module, types, ({ message }) => {
        throw new TypeError(`Invalid '${name}' youtube movie: ${message}`);
      });
      this.data.movies[name] = module;
    });
    for (let name in this.data.movies) this.countWordsNumber(this.data.movies[name]);
  }

  countWordsNumber(movie) {
    const identifiers = new Map();
    for (let { id } of movie.words) {
      if (type(id, String) && id.length) identifiers.set(id, null);
    }
    movie.size = identifiers.size;
  }

  loadYouTubeScripts(ready) {
    const tag = document.createElement('script');
    const firstScript = document.getElementsByTagName('script')[0];
    tag.src = "https://www.youtube.com/iframe_api";
    firstScript.parentNode.insertBefore(tag, firstScript);
    window.onYouTubeIframeAPIReady = ready;
  }

  renderItems() {
    const items = new Items({
      id: 'movies-table',
      items: this.data.movies,
      open: (movieName) => {
        this.navigation.toggle('close');
        this.state.currentMovieName = movieName;
        this.openMovie(movieName);
      }
    });

    this.dom.page.appendChild(items.view);
  }

  addListeners() {
    window.addEventListener('resize', () => this.resizeIframe());
    window.addEventListener('keydown', (event) => {
      if (Dialog.name !== 'youtube') return;
      if ([37, 38, 39, 40, 32].some((v) => v === event.keyCode)) event.preventDefault();

      switch (event.keyCode) {
        case 38: //up
          this.volumeUp();
          break;
        case 40: //down
          this.volumeDown();
          break;
        case 37: //left
          this.moveLine('previous');
          break;
        case 39: //right
          this.moveLine('next');
          break;
        case 32: //space
          this.togglePlay();
          break;
      }
    });
  }

  moveLine(direction) {
    const movieName = this.state.currentMovieName;
    const currentLine = this.state.activeSubtitlesElement;
    if (!currentLine) return;
    let index = this.instances[movieName].linesMap.get(currentLine);
    direction === 'next' ? index++ : index--;
    if (typeof index !== 'number') return;
    const lineData = this.instances[movieName].subtitlesMap.get(index);
    if (typeof lineData !== 'object') return;
    const time = lineData.time.totalFloatSeconds;
    this.seekTo(time);
  }

  togglePlay() {
    const state = this.data.player.getPlayerState();
    switch (state) {
      case 1:
        this.data.player.pauseVideo();
        break;
      case 2:
      case 5:
        this.data.player.playVideo();
        break;
    }
  }

  volumeUp() {
    const newVolume = this.data.player.getVolume() + 10;
    const limitedVolume = newVolume > 100 ? 100 : newVolume;
    this.data.player.setVolume(limitedVolume);
  }

  volumeDown() {
    const newVolume = this.data.player.getVolume() - 10;
    const limitedVolume = newVolume < 0 ? 0 : newVolume;
    this.data.player.setVolume(limitedVolume);
  }

  resizeIframe() {
    if (Dialog.name === 'youtube') {
      const dialog = Dialog.contentContainer;
      const zip = this.views[this.state.currentMovieName].references.get('zip');
      const movieHeight = (zip.getBoundingClientRect().y - 0) - dialog.getBoundingClientRect().y;
      this.data.player.setSize('100%', movieHeight);
    }
  }

  openMovie(movieName) {
    if (!this.instances[movieName]) {
      this.instances[movieName] = {};
      this.renderMaps(movieName);
    }
    if (!this.views[movieName]) {
      this.renderMovie(movieName);
      this.initScroller(movieName);
      this.renderLinesMap(movieName);
      this.addSubtitlesListeners(movieName);
    }

    Dialog.load({
      name: 'youtube',
      container: this.dom.container,
      content: this.views[movieName].template,
      cardArea: this.views[movieName].references.get('subtitles'),
      words: this.instances[movieName],
      viewSubtitles: true,
      onStopSpy: () => this.instances[movieName].scroller.break(),
      onClose: () => {
        Timer.stop();
        this.state.currentMovieName = null;
        Card.onOpen = null;
        Card.onClose = null;
      },
    });
    this.initYoutubeApi();
    this.loadYoutube(movieName);
  }

  initYoutubeApi() {
    if (this.data.player) this.data.player.destroy();
    this.data.player = new YT.Player(document.createElement('DIV'), {
      playerVars: {
        disablekb: 1,
        rel: 0,
        iv_load_policy: 3,
        cc_load_policy: 3,
        origin: window.location.href
      }
    });

    this.dom.youtube = this.data.player.getIframe();
    this.data.player.addEventListener('onReady', (event) => {
      if (this.events.ready) this.events.ready(event);
    });
    this.data.player.addEventListener('onStateChange', (event) => {
      if (this.events.state) this.events.state(event);
    });
  }

  loadYoutube(movieName) {
    const refs = this.views[movieName].references;
    const classes = this.views[movieName].classes;
    const container = refs.get('youtube');
    const zip = classes.get('zip');
    zip.add('hidden');

    this.events.ready = () => {
      this.data.player.cueVideoById(this.data.movies[movieName].id);
      zip.remove('hidden');
      if (!this.instances[movieName].zipHandler) this.addZipHandler(movieName);
      else this.resizeIframe();
    }

    this.events.state = (event) => {
      if (event.data === 1) this.onMoviePlay();
      else this.onMoviePause();
    }

    Card.onOpen = () => {
      if (this.data.player.getPlayerState() === 1) this.state.playAfterClose = true;
      this.data.player.pauseVideo();
    };

    Card.onClose = () => {
      if (this.state.playAfterClose) {
        this.data.player.playVideo();
        this.state.playAfterClose = false;
      }
    };

    container.innerHTML = '';
    container.appendChild(this.dom.youtube);
  }

  renderMaps(movieName) {
    const instance = this.instances[movieName];
    const movie = this.data.movies[movieName];
    instance.idMap = new Map();
    instance.wordsMap = new Map();
    instance.subtitlesMap = new Map();
    instance.secondsMap = new Map();
    movie.words.forEach((item) => {
      if (!instance.idMap.has(item.id)) instance.idMap.set(item.id, []);
      instance.idMap.get(item.id).push(item);
      instance.wordsMap.set(item.index, item);
    });

    let index = 0;
    let totalDuration;

    for (let [time, text] of movie.subtitles) {
      let timeData = Timer.stringToTime(time);
      instance.subtitlesMap.set(index, { index, text, time: timeData });
      index++;
      if (index === movie.subtitles.size) totalDuration = timeData.totalSeconds;
    }

    for (let i = 0; i <= totalDuration; i++) instance.secondsMap.set(i, null);
    instance.subtitlesMap.forEach(({ index, text, time }, key) => {
      const { totalSeconds } = time;
      const item = instance.secondsMap.get(totalSeconds);
      if (item === null) instance.secondsMap.set(totalSeconds, index);
      else if (typeof item === 'number') instance.secondsMap.set(totalSeconds, [item, index]);
      else item.push(index);
    });

    let previous = null;
    instance.secondsMap.forEach((value, key, map) => {
      if (value === null) map.set(key, previous);
      else previous = value;
    });
  }

  addZipHandler(movieName) {
    const refs = this.views[movieName].references;
    const classes = this.views[movieName].classes;
    const zip = refs.get('zip');
    const movie = refs.get('movie');
    const mask = classes.get('mask');
    const subtitles = refs.get('subtitles');
    let zipDimensions = zip.getBoundingClientRect();
    let dialog = Dialog.contentContainer.getBoundingClientRect();
    let shift;

    const moveZip = (event) => {
      this.moveZip(event.clientY, shift, dialog, zipDimensions, movie, subtitles);
    };

    const mouseDown = (event) => {
      zipDimensions = zip.getBoundingClientRect();
      dialog = Dialog.contentContainer.getBoundingClientRect();
      shift = event.clientY - zipDimensions.top; //CHROME: zipDimensions.x
      mask.add('block');
      window.addEventListener('mousemove', moveZip);
      window.addEventListener('mouseup', mouseUp);
    };
    const mouseUp = () => {
      mask.remove('block');
      window.removeEventListener('mousemove', moveZip);
      window.removeEventListener('mouseup', mouseUp);
    }

    zip.addEventListener('mousedown', mouseDown);
    this.moveZip(zipDimensions.y, 0, dialog, zipDimensions, movie, subtitles);
    this.instances[movieName].zipHandler = true;
  }

  moveZip(position, shift, dialog, zip, movie, subtitles) {
    const topEdge = dialog.top; //CHROME: dialog.y
    const maxTop = topEdge + 200;
    const bottomEdge = topEdge + dialog.height;
    const maxBottom = bottomEdge - 200;
    if (position < maxTop || position > maxBottom) return;
    const movieHeight = (position - shift) - topEdge;
    const subtitlesHeight = bottomEdge - (position - shift);
    subtitles.style.height = `calc(${(subtitlesHeight / dialog.height) * 100}% - ${zip.height}px)`;
    this.data.player.setSize('100%', movieHeight);
  }

  renderMovie(movieName) {
    const movie = this.data.movies[movieName];
    const instance = this.instances[movieName];
    const data = $templater(({ ref, list, child, classes }) =>/*html*/`
      <div class="youtube-container">
        <section ${ref('movie')} class="movie-box">
          <div ${ref('mask')} ${classes('mask')} class="mask"></div>
          <div ${ref('youtube')}></div>
        </section>
        <section ${ref('zip')} ${classes('zip')} class="movie-zip"></section>
        <section ${ref('subtitles')} class="subtitles-container" data-family="0">
          <ul ${ref('list')} class="subtitles-content text-content">
            <li data-header><h1>${movie.header}</h1></li>
            ${list(instance.subtitlesMap, ({ text }, index) => /*html*/`
            <li ${ref(`line.${index}`)}>
              <div ${ref(`jump.${index}`)} class="jump-to-button">${child($iconTextPlay())}</div>
              <p>${text}</p>
            </li>`)}
          </ul>
        </section>
      </div>
    `);
    this.views[movieName] = data;
  }

  initScroller(movieName) {
    this.instances[movieName].scroller = new Scroller({
      container: this.views[movieName].references.get('subtitles'),
      scrollTime: 3000,
      offset: 0.1,
      fps: 60
    });
  }

  renderLinesMap(movieName) {
    const elements = new Map();
    const lines = new Map();
    const refs = this.views[movieName].references;
    refs.get('jump').forEach((node, index) => elements.set(node, Number(index)));
    refs.get('line').forEach((node, index) => lines.set(node, Number(index)));
    this.instances[movieName].elementsMap = elements;
    this.instances[movieName].linesMap = lines;
  }

  addSubtitlesListeners(movieName) {
    const { references } = this.views[movieName];
    const list = references.get('list');
    const jumps = this.instances[movieName].elementsMap;
    const subtitles = this.instances[movieName].subtitlesMap;
    list.addEventListener('click', (event) => {
      let index = null;
      $loopParents(event.target, (descendant, stop) => {
        if (event.currentTarget === descendant) return stop();
        if (jumps.has(descendant)) {
          index = jumps.get(descendant);
          return stop();
        }
      });
      if (typeof index !== 'number') return;
      const time = subtitles.get(index).time.totalFloatSeconds;
      this.seekTo(time);
    }, false);


  }

  seekTo(time = this.state.seekQueue) {
    if (typeof time === 'number') {
      const current = this.data.player.getCurrentTime();
      if (Math.floor(current) === time) {
        this.state.seekQueue = null;
        return;
      }
      this.data.player.seekTo(time);
      this.data.player.playVideo();
      this.state.seekQueue = time;
    }
  }


  onMoviePause() {
    Timer.stop();
    this.highlightSubtitlesLine(null);
  }

  onMoviePlay() {
    this.seekTo();
    const name = this.state.currentMovieName;
    const { secondsMap, subtitlesMap } = this.instances[name];
    const nodesMap = this.views[name].references.get('line');
    const currentTime = this.data.player.getCurrentTime();
    Timer.start(currentTime, ({ seconds, exact }) => {
      const index = secondsMap.get(seconds);
      if (index === null || index === undefined) return;
      if (typeof index === 'number') {
        let lineElement = nodesMap.get(String(index));
        if (this.state.activeSubtitlesElement === lineElement) return;
        this.highlightSubtitlesLine(lineElement);
        this.scrollScubtitles(lineElement, name);
      } else {
        for (let msLineIndex = 0; msLineIndex < index.length; msLineIndex++) {
          const msLine = subtitlesMap.get(index[msLineIndex]).time.totalFloatSeconds;
          if (exact >= msLine) {
            const lineElement = nodesMap.get(String(msLineIndex));
            if (this.state.activeSubtitlesElement === lineElement) return;
            this.highlightSubtitlesLine(lineElement);
            this.scrollScubtitles(lineElement, name);
          }
        }
      }
    });
  }

  highlightSubtitlesLine(element) {
    if (this.state.activeSubtitlesElement) this.state.activeSubtitlesElement.removeAttribute('data-current');
    this.state.activeSubtitlesElement = element;
    if (element) this.state.activeSubtitlesElement.setAttribute('data-current', 'true');
  }

  scrollScubtitles(element, movieName) {
    if (!Dialog.state.spySubtitles) return;
    this.instances[movieName].scroller.scroll(element);
  }

}

export default YouTube;


