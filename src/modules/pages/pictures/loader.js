class Loader {
  constructor() {
    this._on = {
      _start: null,
      _progress: null,
      _finish: null,
      get start() {
        return this._start;
      },
      set start(fn) {
        this._start = fn;
      },
      get progress() {
        return this._progress;
      },
      set progress(fn) {
        this._progress = fn;
      },
      get finish() {
        return this._finish;
      },
      set finish(fn) {
        this._finish = fn;
      }
    };
  }

  get on() {
    return this._on;
  }

  load(url) {
    const fetch = new XMLHttpRequest();
    fetch.responseType = 'arraybuffer';
    fetch.open('GET', url, true);
    fetch.onload = () => {
      const blob = new Blob([fetch.response]);
      const _url = URL.createObjectURL(blob);
      if (this.on.finish) this.on.finish(_url);
    };
    fetch.onprogress = (event) => {
      if (this.on.progress) this.on.progress(event.loaded / event.total);
    };
    fetch.onloadstart = () => {
      if (this.on.start) this.on.start();
    };
    fetch.send();
  }

}

export default Loader;