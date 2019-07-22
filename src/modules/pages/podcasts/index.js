import path from 'path';
import type from 'of-type';
import typeProperties from 'typeof-properties';
import Player from './player';
import './../commons.scss';
import './podcasts.scss';

const { Items, Dialog, Card, Timer, Scroller } = $commons;
const { $templater, $loopParents } = $utils;
const { $iconTextPlay } = $icons;

class Podcasts {
  constructor(data) {
    const { podcasts, page, navigation } = data;
    this.dom = { page, container: navigation.pages };
    this.navigation = navigation;
    this.data = {};
    this.instances = {};
    this.views = {};
    this.state = {};
    this.importPodcasts(podcasts);
    this.renderItems();
    this.addGlobalListeners();
  }

  importPodcasts(podcasts) {
    this.data.podcasts = {};
    podcasts.keys().forEach((_path) => {
      let module = podcasts(_path).default;
      let name = path.basename(_path, '.js');
      if (!type(module, Object)) {
        throw new TypeError(`Invalid '${name}' module: The module should export the default [Object] object.`);
      }
      const types = {
        header: String,
        url: String,
        source: String,
        subtitles: Map,
        words: Array
      };

      typeProperties(module, types, ({ message }) => {
        throw new TypeError(`Invalid '${name}' podcast: ${message}`);
      });
      this.data.podcasts[name] = module;
    });
    for (let name in this.data.podcasts) this.countWordsNumber(this.data.podcasts[name]);
  }

  countWordsNumber(podcast) {
    const identifiers = new Map();
    for (let { id } of podcast.words) {
      if (type(id, String) && id.length) identifiers.set(id, null);
    }
    podcast.size = identifiers.size;
  }

  renderItems() {
    const items = new Items({
      id: 'podcasts-table',
      items: this.data.podcasts,
      open: (podcastName) => {
        this.navigation.toggle('close');
        this.state.currentName = podcastName;
        this.openPodcast(podcastName);
      }
    });

    this.dom.page.appendChild(items.view);
  }

  openPodcast(name) {
    if (!this.instances[name]) {
      this.instances[name] = {};
      this.renderMaps(name);
    }
    if (!this.views[name]) {
      this.renderView(name);
      this.initScroller(name);
      this.renderLinesMap(name);
      this.addSubtitlesListeners(name);
    }

    const container = this.views[name].references.get('player-container');
    const { source } = this.data.podcasts[name];
    container.innerHTML = '';
    container.appendChild(Player.dom.player);
    Player.load(source);

    Card.onSwitch = () => {
      this.instances[name].scroller.break();
      if (Player.playing) this.state.playAfterClose = true;
      Player.pause();
    };

    Card.onOpen = () => {
      this.instances[name].scroller.break();
      if (Player.playing) this.state.playAfterClose = true;
      Player.pause();
    };

    Card.onClose = () => {
      if (this.state.playAfterClose) {
        Player.play();
        this.state.playAfterClose = false;
      }
    };
    Dialog.load({
      name: 'podcasts',
      container: this.dom.container,
      content: this.views[name].template,
      cardArea: this.views[name].references.get('subtitles'),
      words: this.instances[name],
      viewSubtitles: true,
      onStopSpy: () => this.instances[name].scroller.break(),
      onClose: () => {
        Player.reset();
        this.state.currentName = null;
        Card.onSwitch = null;
        Card.onOpen = null;
        Card.onClose = null;
      },
    });
  }

  renderMaps(name) {
    const instance = this.instances[name];
    const podcast = this.data.podcasts[name];
    instance.wordsMap = new Map();
    instance.idMap = new Map();
    instance.subtitlesMap = new Map();
    instance.secondsMap = new Map();
    podcast.words.forEach((item) => {
      if (!instance.idMap.has(item.id)) instance.idMap.set(item.id, []);
      instance.idMap.get(item.id).push(item);
      instance.wordsMap.set(item.index, item);
    });

    let index = 0;
    let totalDuration;

    for (let [time, text] of podcast.subtitles) {
      let timeData = Timer.stringToTime(time);
      instance.subtitlesMap.set(index, { index, text, time: timeData });
      index++;
      if (index === podcast.subtitles.size) totalDuration = timeData.totalSeconds;
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

  renderView(name) {
    const podcast = this.data.podcasts[name];
    const instance = this.instances[name];
    const data = $templater(({ ref, list, child }) =>/*html*/`
      <div class="podcasts-container">
        <section ${ref('player-container')} class="player-container"></section>
        <section ${ref('subtitles')} class="subtitles-container" data-family="0">
          <ul ${ref('list')} class="subtitles-content text-content">
            <li data-header><h1>${podcast.header}</h1></li>
            ${list(instance.subtitlesMap, ({ text }, index) => /*html*/`
            <li ${ref(`line.${index}`)}>
              <div ${ref(`jump.${index}`)} class="jump-to-button">${child($iconTextPlay())}</div>
              <p>${text}</p>
            </li>`)}
          </ul>
        </section>
      </div>
    `);
    this.views[name] = data;
  }

  initScroller(name) {
    this.instances[name].scroller = new Scroller({
      container: this.views[name].references.get('subtitles'),
      scrollTime: 3000,
      offset: 0.1,
      fps: 60
    });
  }

  renderLinesMap(name) {
    const elements = new Map();
    const lines = new Map();
    const refs = this.views[name].references;
    refs.get('jump').forEach((node, index) => elements.set(node, Number(index)));
    refs.get('line').forEach((node, index) => lines.set(node, Number(index)));
    this.instances[name].elementsMap = elements;
    this.instances[name].linesMap = lines;
  }

  addSubtitlesListeners(name) {
    const { references } = this.views[name];
    const list = references.get('list');
    const jumps = this.instances[name].elementsMap;
    const subtitles = this.instances[name].subtitlesMap;
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
    });
  }

  addGlobalListeners() {

    window.addEventListener('keydown', (event) => {
      if (Dialog.name !== 'podcasts') return;
      if (Dialog.state.gameActive !== null) return;
      if ([37, 38, 39, 40, 32].some((v) => v === event.keyCode)) event.preventDefault();

      switch (event.keyCode) {
        case 38: //up
          Player.volume = Player.volume + 10;
          break;
        case 40: //down
          Player.volume = Player.volume - 10;
          break;
        case 37: //left
          this.moveLine('previous');
          break;
        case 39: //right
          this.moveLine('next');
          break;
        case 32: //space
          if (Player.playing) Player.pause();
          else Player.play();
          break;
      }
    });

    Player.on.next = () => this.moveLine('next');
    Player.on.previous = () => this.moveLine('previous');
    Player.on.play = () => Card.hide(false);
    Player.on.playing = () => {
      const name = this.state.currentName;
      const nodesMap = this.views[name].references.get('line');
      const { secondsMap, subtitlesMap } = this.instances[name];
      const seconds = Math.floor(Player.time);
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
    };

    Player.on.pause = () => {
      this.highlightSubtitlesLine(null);
    };
  }


  seekTo(time = this.state.seekQueue) {
    if (typeof time === 'number') {
      if (Math.floor(Player.time) === time) {
        this.state.seekQueue = null;
        return;
      }
      Player.seekTo(time);
      Player.play();
      this.state.seekQueue = time;
    }
  }

  moveLine(direction) {
    const name = this.state.currentName;
    const currentLine = this.state.activeSubtitlesElement;
    if (!currentLine) return;
    let index = this.instances[name].linesMap.get(currentLine);
    direction === 'next' ? index++ : index--;
    if (typeof index !== 'number') return;
    const lineData = this.instances[name].subtitlesMap.get(index);
    if (typeof lineData !== 'object') return;
    const time = lineData.time.totalFloatSeconds;
    this.seekTo(time);
  }

  highlightSubtitlesLine(element) {
    if (this.state.activeSubtitlesElement) this.state.activeSubtitlesElement.removeAttribute('data-current');
    this.state.activeSubtitlesElement = element;
    if (element) this.state.activeSubtitlesElement.setAttribute('data-current', 'true');
  }

  scrollScubtitles(element, name) {
    if (!Dialog.state.spySubtitles) return;
    this.instances[name].scroller.scroll(element);
  }
}

export default Podcasts;