import type from 'of-type';
import './../commons.scss';
import './youtube.scss';

const { Items, Dialog, Card, Timer, Scroller, Words } = $commons;
const { $templater } = $utils;
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
      this.data.movies[module.id] = module;
    });
    for (let id in this.data.movies) this.countWordsNumber(this.data.movies[id]);
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
    this.items = new Items({
      id: 'movies-table',
      items: this.data.movies,
      open: (movieId) => {
        this.navigation.toggle('close');
        this.state.currentMovieId = movieId;
        this.openMovie(movieId);
      }
    });

    this.dom.page.appendChild(this.items.view);
  }

  addListeners() {
    window.addEventListener('blur', () => setTimeout(() => window.focus(), 20));
    window.addEventListener('resize', () => this._resetZip());
    window.addEventListener('keydown', (event) => {
      if (Dialog.name !== 'youtube') return;
      if (Dialog.state.gameActive !== null) return;
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
    const movieId = this.state.currentMovieId;
    const currentLine = this.state.activeSubtitlesElement;
    if (!currentLine) return;
    let index = this.instances[movieId].linesMap.get(currentLine);
    direction === 'next' ? index++ : index--;
    if (typeof index !== 'number') return;
    const lineData = this.instances[movieId].subtitlesMap.get(index);
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

  openMovie(movieId) {
    if (!this.instances[movieId]) {
      this.instances[movieId] = { games: {} };
      this.renderMaps(movieId);
    }
    if (!this.views[movieId]) {
      this.renderMovie(movieId);
      this.initScroller(movieId);
      this.renderLinesMap(movieId);
      this.addSubtitlesListeners(movieId);
    }

    Dialog.load({
      name: 'youtube',
      mode: 'youtube',
      container: this.dom.container,
      content: this.views[movieId].template,
      cardArea: this.views[movieId].references.get('subtitles'),
      contentData: this.instances[movieId],
      onGame: () => this.data.player.pauseVideo(),
      onClose: () => {
        Timer.stop();
        this.state.currentMovieId = null;
        Card.onSwitch = null;
        Card.onOpen = null;
        Card.onClose = null;
      },
    });
    this.initYoutubeApi();
    this.loadYoutube(movieId);
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
      const state = this.data.player.getPlayerState();
      if (state === 1) Card.hide(false);
    });
  }

  loadYoutube(movieId) {
    const refs = this.views[movieId].references;
    const classes = this.views[movieId].classes;
    const container = refs.get('youtube');
    const zip = classes.get('zip');
    zip.add('hidden');

    this.events.ready = () => {
      this.data.player.cueVideoById(this.data.movies[movieId].id);
      zip.remove('hidden');
      if (!this.instances[movieId].zipHandler) this.addZipHandler(movieId);
      else this._resetZip();
    }

    this.events.state = (event) => {
      if (event.data === 1) this.onMoviePlay();
      else this.onMoviePause();
    }

    Card.onSwitch = () => {
      this.instances[movieId].scroller.break();
      if (this.data.player.getPlayerState() === 1) this.state.playAfterClose = true;
      this.data.player.pauseVideo();
    };

    Card.onOpen = () => {
      this.instances[movieId].scroller.break();
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

  renderMaps(movieId) {
    const instance = this.instances[movieId];
    const movie = this.data.movies[movieId];
    instance.subtitlesMap = new Map();
    instance.secondsMap = new Map();
    instance.words = new Words(movie.words);

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

  addZipHandler(movieId) {
    const refs = this.views[movieId].references;
    const classes = this.views[movieId].classes;
    const zip = refs.get('zip');
    const mask = classes.get('mask');
    const subtitles = refs.get('subtitles');
    let zipDimensions = zip.getBoundingClientRect();
    let dialog = Dialog.contentContainer.getBoundingClientRect();
    let shift;

    const moveZip = (event) => {
      let y = event.clientY ? event.clientY : event.touches[0].clientY;
      this.moveZip(y, shift, dialog, zipDimensions, subtitles);
    };

    const mouseDown = (event) => {
      zipDimensions = zip.getBoundingClientRect();
      dialog = Dialog.contentContainer.getBoundingClientRect();
      let y = event.clientY ? event.clientY : event.touches[0].clientY;
      shift = y - zipDimensions.top;
      mask.add('block');
      window.addEventListener('mousemove', moveZip);
      window.addEventListener('touchmove', moveZip);
      window.addEventListener('mouseup', mouseUp);
      window.addEventListener('touchend', mouseUp);
    };

    const mouseUp = () => {
      mask.remove('block');
      window.removeEventListener('mousemove', moveZip);
      window.removeEventListener('touchmove', moveZip);
      window.removeEventListener('mouseup', mouseUp);
      window.removeEventListener('touchend', mouseUp);
    }

    zip.addEventListener('mousedown', mouseDown);
    zip.addEventListener('touchstart', mouseDown);

    this.moveZip(zipDimensions.top, 0, dialog, zipDimensions, subtitles);
    this.instances[movieId].zipHandler = true;

    Dialog.events.onStopSpy = () => {
      zipDimensions = zip.getBoundingClientRect();
      dialog = Dialog.contentContainer.getBoundingClientRect();
      this.instances[movieId].scroller.break();
      this.moveZip(zipDimensions.top, 0, dialog, zipDimensions, subtitles);
    }

  }

  moveZip(position, shift, dialog, zip, subtitles) {
    const topEdge = dialog.top;
    const maxTop = topEdge + 200;
    const bottomEdge = topEdge + dialog.height;
    const maxBottom = bottomEdge - 50;
    if (position < maxTop || position > maxBottom) return;
    const movieHeight = (position - shift) - topEdge;
    const subtitlesHeight = bottomEdge - (position - shift);
    subtitles.style.height = `calc(${(subtitlesHeight / dialog.height) * 100}% - ${zip.height}px)`;
    this.data.player.setSize('100%', movieHeight);
  }

  _resetZip() {
    if (Dialog.name !== 'youtube') return;
    const refs = this.views[this.state.currentMovieId].references;
    const subtitles = refs.get('subtitles');
    const zip = refs.get('zip');
    const zipDimensions = zip.getBoundingClientRect();
    const dialog = Dialog.contentContainer.getBoundingClientRect();
    this.moveZip(zipDimensions.top, 0, dialog, zipDimensions, subtitles);
  }

  renderMovie(movieId) {
    const movie = this.data.movies[movieId];
    const instance = this.instances[movieId];
    const data = $templater(({ ref, list, child, classes, on }) =>/*html*/`
      <div class="youtube-container">
        <section ${ref('movie')} class="movie-box">
          <div ${ref('mask')} ${classes('mask')} class="mask"></div>
          <div ${ref('youtube')}></div>
        </section>
        <section ${ref('zip')} ${classes('zip')} class="movie-zip"></section>
        <section ${ref('subtitles')} class="subtitles-container" data-family="0">
          <ul class="subtitles-content text-content">
            <li data-header><h1>${movie.header}</h1></li>
            ${list(instance.subtitlesMap, ({ text }, index) => /*html*/`
            <li ${ref(`line.${index}`)}>
              <div ${on(`jump.${index}`, 'click')} class="jump-to-button">${child($iconTextPlay())}</div>
              <p>${text}</p>
            </li>`)}
          </ul>
        </section>
      </div>
    `);
    this.views[movieId] = data;
  }

  initScroller(movieId) {
    this.instances[movieId].scroller = new Scroller({
      container: this.views[movieId].references.get('subtitles'),
      scrollTime: 3000,
      offset: 0.1,
      fps: 60
    });
  }

  renderLinesMap(movieId) {
    const lines = new Map();
    const refs = this.views[movieId].references;
    refs.get('line').forEach((node, index) => lines.set(node, Number(index)));
    this.instances[movieId].linesMap = lines;
  }

  addSubtitlesListeners(movieId) {
    const { $on } = this.views[movieId];
    const subtitles = this.instances[movieId].subtitlesMap;
    $on('jump', ({ last }) => {
      const time = subtitles.get(Number(last)).time.totalFloatSeconds;
      this.seekTo(time);
    });
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
    const id = this.state.currentMovieId;
    const { secondsMap, subtitlesMap } = this.instances[id];
    const nodesMap = this.views[id].references.get('line');
    const currentTime = this.data.player.getCurrentTime();
    Timer.start(currentTime, ({ seconds, exact }) => {
      const index = secondsMap.get(seconds);
      if (index === null || index === undefined) return;
      if (typeof index === 'number') {
        let lineElement = nodesMap.get(String(index));
        if (this.state.activeSubtitlesElement === lineElement) return;
        this.highlightSubtitlesLine(lineElement);
        this.scrollScubtitles(lineElement, id);
      } else {
        for (let msLineIndex = 0; msLineIndex < index.length; msLineIndex++) {
          const msLine = subtitlesMap.get(index[msLineIndex]).time.totalFloatSeconds;
          if (exact >= msLine) {
            const lineElement = nodesMap.get(String(msLineIndex));
            if (this.state.activeSubtitlesElement === lineElement) return;
            this.highlightSubtitlesLine(lineElement);
            this.scrollScubtitles(lineElement, id);
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

  scrollScubtitles(element, movieId) {
    if (!Dialog.state.spySubtitles) return;
    this.instances[movieId].scroller.scroll(element);
  }
}

export default YouTube;