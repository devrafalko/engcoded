import './spinner.scss';
import './player.scss';

const { Timer } = $commons;
const { $templater } = $utils;
const { $iconPlayBuffer, $iconPause, $iconPlay, $iconRewind, $iconFastForward, $iconMute, $iconVolume, $iconSpeed } = $icons;

class Events {
  constructor(scope) {
    this._scope = scope;
  }
  get play() {
    return this._play;
  }

  set play(fn) {
    this._play = fn.bind(this._scope);
  }

  get pause() {
    return this._pause;
  }

  set pause(fn) {
    this._pause = fn.bind(this._scope);
  }

  get next() {
    return this._next;
  }

  set next(fn) {
    this._next = fn.bind(this._scope);
  }

  get previous() {
    return this._previous;
  }

  set previous(fn) {
    this._previous = fn.bind(this._scope);
  }

  get playing() {
    return this._playing;
  }

  set playing(fn) {
    this._playing = fn.bind(this._scope);
  }

}

class Player {
  constructor() {
    this.on = new Events(this);
    this.dom = {
      buffered: [],
      played: [],
      icon: {
        mute: $iconMute(),
        volume: $iconVolume()
      }
    };
    this.data = {
      volume: 75,
      previousVolume: 75,
      speed: 1,
      bufferTimeout: null
    };
    this.state = {
      play: 'pause',
      currentTime: 0,
      muted: false
    };
    this._renderView();
    this._initAudio();
    this._initListeners();
    this._setDefaults();
  }

  load(src) {
    this.audio.src = src;
  }

  play() {
    this.state.play = 'play';
    this._updatePlayState();
    this.audio.play();
    if (this.on.play) this.on.play();
  }

  pause() {
    this.state.play = 'pause';
    this._updatePlayState();
    this.audio.pause();
    if (this.on.pause) this.on.pause();
  }

  reset() {
    this.seekTo(0);
    this.pause();
  }

  seekTo(_sec) {
    this.audio.currentTime = _sec;
    this._updateCurrentTime();
    this._bufferTimeout(1000);
  }

  get volume() {
    return this.data.volume;
  }

  set volume(value) {
    this.data.volume = this._scroll({
      range: this.dom.controls.get('volume-span'),
      display: this.dom.controls.get('volume-value'),
      min: 0,
      max: 100,
      step: 1,
      value: value
    })
    this.state.muted = this.data.volume === 0;
    this._updateVolumeIcon(this.data.volume === 0);
    this.audio.volume = this.data.volume / 100;
  }

  get speed() {
    return this.data.speed;
  }

  set speed(value) {
    this.data.speed = this._scroll({
      range: this.dom.controls.get('speed-span'),
      display: this.dom.controls.get('speed-value'),
      min: .25,
      max: 1.5,
      step: .25,
      value: value
    })
    this.audio.playbackRate = this.data.speed;
  }

  get muted() {
    return this.state.muted;
  }

  set muted(value) {
    if (this.state.muted === value) return;
    if (value) {
      let previous = this.volume;
      this.volume = 0;
      this.data.previousVolume = previous;
    } else {
      this.volume = this.data.previousVolume;
    }
    this.state.muted = value;
  }

  get playing() {
    return !this.audio.paused;
  }

  get time() {
    return this.audio.currentTime;
  }

  _initAudio() {
    this.audio = this.dom.controls.get('audio-player');
    this.audio.controls = false;
    this.audio.preload = 'metadata';
    this.audio.autoplay = false;
  }

  _renderView() {
    const playState = $templater(({ ref, child }) =>/*html*/`
      <span ${ref('play')}>${child($iconPlay())}</span>
      <span ${ref('pause')}>${child($iconPause())}</span>
      <span ${ref('buffer')}>${child($iconPlayBuffer())}</span>
    `);
    const player = $templater(({ ref, child, on }) =>/*html*/`
      <ul class="podcast-player">
        <li ${on('button.play', 'click')} ${ref('play-button')} class="button play">
          ${child(playState.references.get('buffer'))}
          <audio ${ref('audio-player')} ${on('audio-player', ['loadedmetadata', 'ended', 'loadstart', 'canplay', 'timeupdate'])}></audio>
        </li>
        <li ${on('button.rewind', 'click')} class="button rewind">${child($iconRewind())}</li> 
        <li ${on('button.forward', 'click')} class="button forward">${child($iconFastForward())}</li>
        <li ${on('button.muted', 'click')} ${ref('muted-button')} class="button muted">${child(this.dom.icon.mute)}</li>
        <li ${ref('volume-container')} class="range volume">
          <div>
            <span ${ref('volume-value')} class="output">60</span>
            <span ${ref('volume-span')} class="span"></span>
          </div>
        </li>
        <li ${ref('time-span')} class="range time">
          <div>
            <span ${ref('current-span')} class="span current"></span>
            <span ${ref('current-time')} class="output current">00:00</span>
            <span ${ref('duration-time')} class="output duration"></span>
            <span ${ref('buffer-span')} class="span buffer"></span>
            <span ${ref('played-span')} class="span played"></span>
          </div>
        </li>
        <li ${on('button.speed', 'click')} class="button speed">${child($iconSpeed())}</li>
        <li ${ref('speed-container')} class="range speed">
          <div>
            <span ${ref('speed-value')} class="output speed">0.75</span>
            <span ${ref('speed-span')} class="span speed"></span>
          </div>
        </li>
      </ul>
    `);

    this.dom.player = player.template;
    this.dom.controls = player.references;
    this.dom.playState = playState.references;
    this.html = player;
  }

  _initListeners() {
    const { $on } = this.html;
    $on('audio-player', ({ type }) => {
      switch (type) {
        case 'loadedmetadata': return this._updateDuration();
        case 'ended': return this.reset();
        case 'loadstart':
          this.state.play = 'buffer';
          this._updatePlayState();
          this._updateDuration();
          return;
        case 'canplay':
          this.state.play = ['play', 'pause'][+this.audio.paused];
          this._bufferTimeout(null);
          this._updatePlayState();
          return;
        case 'timeupdate':
          this._updateCurrentTime();
          this._updateRange({
            range: this.audio.buffered,
            container: this.dom.controls.get('buffer-span'),
            elements: this.dom.buffered
          });
          this._updateRange({
            range: this.audio.played,
            container: this.dom.controls.get('played-span'),
            elements: this.dom.played
          });
          if (this.on.playing && this.playing) this.on.playing();
      }
    });

    $on('button', ({ last }) => {
      if (last === 'play' && this.state.play !== 'buffer') {
        if (this.state.play === 'play') this.pause();
        else this.play();
      }
      if (last === 'rewind' && this.on.previous) this.on.previous();
      if (last === 'forward' && this.on.next) this.on.next();
      if (last === 'muted') this.muted = !this.muted;
      if (last === 'speed') this.speed = 1;
    });

    this._onSlide({
      element: this.dom.controls.get('time-span'),
      range: this.dom.controls.get('current-span'),
      min: 0,
      max: 1,
      step: .0001,
      callback: (value) => {
        const duration = this.audio.duration;
        if (!duration) return;
        this.seekTo(value * duration);
      }
    });

    this._onSlide({
      element: this.dom.controls.get('volume-container'),
      range: this.dom.controls.get('volume-span'),
      min: 0,
      max: 100,
      step: 1,
      callback: (value) => this.volume = value
    });

    this._onSlide({
      element: this.dom.controls.get('speed-container'),
      min: .25,
      max: 1.5,
      step: .25,
      callback: (value) => this.speed = value
    });
  }

  _setDefaults() {
    this.volume = this.data.volume;
    this.speed = this.data.speed;
  }

  _onSlide({ element, min, max, step, callback }) {
    let moveState = false;
    const fn = (event) => {
      const { left, width } = element.getBoundingClientRect();
      const x = event.touches ? event.touches[0].screenX : event.screenX;
      const position = ((x - left) / width);
      const limited = position < 0 ? 0 : position > 1 ? 1 : position;
      const stepped = step * Math.round((min + ((max - min) * limited)) / step);
      callback(stepped);
    };

    const onMouseDown = (event) => {
      moveState = true;
      fn(event);
      window.addEventListener('mousemove', fn);
      window.addEventListener('touchmove', fn);
    }
    const onMouseUp = () => {
      if (!moveState) return;
      window.removeEventListener('mousemove', fn);
      window.removeEventListener('touchmove', fn);
      moveState = false;
    };

    element.addEventListener('mousedown', onMouseDown);
    element.addEventListener('touchstart', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onMouseUp);
  }

  _scroll({ range, display, min, max, step, value }) {
    const limited = value > max ? max : value < min ? min : value;
    const stepped = Math.round(limited / step) * step;
    const percent = ((stepped - min) / (max - min)) * 100;
    range.style.width = `${percent}%`;
    if (display) display.innerHTML = stepped;
    return stepped;
  }

  _updatePlayState() {
    const state = this.state.play === 'play' ? 'pause' : this.state.play === 'pause' ? 'play' : this.state.play;
    const container = this.dom.controls.get('play-button');
    const button = this.dom.playState.get(state);
    container.innerHTML = '';
    container.appendChild(button);
  }

  _updateVolumeIcon(isMuted) {
    const icon = this.dom.controls.get('muted-button');
    icon.innerHTML = '';
    icon.appendChild(isMuted ? this.dom.icon.mute : this.dom.icon.volume);
  }

  _updateDuration() {
    const duration = this.audio.duration || 0;
    const { hours, minutes, seconds } = Timer.secondsToString(duration);
    const h = Number(hours) === 0 ? '' : `${hours}:`;
    this.dom.controls.get('duration-time').innerHTML = `${h}${minutes}:${seconds}`;
  }

  _updateCurrentTime() {
    const current = this.audio.currentTime || 0;
    const { hours, minutes, seconds } = Timer.secondsToString(current);
    const h = Number(hours) === 0 ? '' : `${hours}:`;
    this.dom.controls.get('current-time').innerHTML = `${h}${minutes}:${seconds}`;
    this._scroll({
      range: this.dom.controls.get('current-span'),
      min: 0,
      max: this.audio.duration,
      step: 1,
      value: current
    })
  }

  _updateRange({ range, container, elements }) {
    const duration = this.audio.duration;
    fitSpans.call(this, range.length - elements.length);
    for (let i = 0; i < elements.length; i++) {
      let span = elements[i];
      let start = (range.start(i) / duration) * 100;
      let end = (range.end(i) / duration) * 100;
      span.style.left = `${start}%`;
      span.style.width = `${end - start}%`;
    }

    function fitSpans(value) {
      if (value === 0) return;
      else if (value > 0) {
        for (let i = 0; i < value; i++) {
          let span = document.createElement('SPAN');
          elements.push(span);
          container.appendChild(span);
        }
      } else if (value < 0) {
        const abs = Math.abs(value);
        const removed = elements.splice(elements.length - abs, abs);
        removed.forEach((span) => container.removeChild(span));
      }
    }
  }

  _bufferTimeout(time) {
    if (time === null) return clearTimeout(this.data.bufferTimeout);
    clearTimeout(this.data.bufferTimeout);
    this.data.bufferTimeout = setTimeout(() => {
      if (this.state.play === 'buffer') return;
      this.state.play = 'buffer';
      this._updatePlayState();
    }, time);
  }

}

export default new Player();