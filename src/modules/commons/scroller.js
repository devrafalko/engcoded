import type from 'of-type';
const { $casteljau } = $utils;

export default class Scroller {
  constructor({ container, scrollTime, fps, offset, vertically = true, horizontally = false }) {
    this.dom = { container };
    this.sides = { vertically, horizontally };
    this.config = { scrollTime, fps, offset };
    this.state = { interval: null, isScrolling: false, currentTime: 0, breakTime: 0 };
    this.params = { currentElement: null };
  }

  set container(element) {
    this.dom.container = element;
  }

  get scrolling() {
    return this.state.isScrolling;
  }

  get offsetY() {
    return this.dom.container.clientHeight * this.config.offset;
  }

  get offsetX() {
    return this.dom.container.clientWidth * this.config.offset;

  }

  set element(element) {
    this.params.currentElement = element;
  }

  get element() {
    return this.params.currentElement;
  }

  get expectedScrollY() {
    const position = this.element.offsetTop - this.offsetY;
    return position < 0 ? 0 : position;
  }

  get expectedScrollX() {
    const position = this.element.offsetLeft - this.offsetX;
    return position < 0 ? 0 : position;
  }

  get paramsY() {
    if (this.sides.vertically === false) return {};
    const start = this.dom.container.scrollTop;
    const stop = this.expectedScrollY;
    const max = this.dom.container.scrollHeight - this.dom.container.offsetHeight;
    const limitedStop = stop < 0 ? 0 : stop > max ? max : stop;
    const range = limitedStop - start;
    return { start, range };
  }
  get paramsX() {
    if (this.sides.horizontally === false) return {};
    const start = this.dom.container.scrollLeft;
    const stop = this.expectedScrollX;
    const max = this.dom.container.scrollWidth - this.dom.container.offsetWidth;
    const limitedStop = stop < 0 ? 0 : stop > max ? max : stop;
    const range = limitedStop - start;
    return { start, range };
  }

  break() {
    if (this.state.interval) {
      clearInterval(this.state.interval);
      this.state.interval = null;
      this.state.currentTime = 0;
      this.state.breakTime = 0;
    }
  }

  scroll(element, callback) {
    this.element = element;

    const { start: startY, range: rangeY } = this.paramsY;
    const { start: startX, range: rangeX } = this.paramsX;

    const totalTime = this.config.scrollTime;
    const intervalTime = Math.round(1000 / this.config.fps);
    const intervalsNumber = Math.ceil(totalTime / intervalTime);
    let intervalCount = 0;
    if (this.state.interval) {
      clearInterval(this.state.interval);
      this.state.breakTime = this.state.currentTime > .5 ? 1 - this.state.currentTime : this.state.currentTime;
    }
    this.state.isScrolling = true;
    this.state.interval = setInterval(() => {
      intervalCount++;
      let intervalValue = step.call(this, intervalCount);
      if (this.sides.vertically) this.dom.container.scrollTop = startY + (rangeY * intervalValue);
      if (this.sides.horizontally) this.dom.container.scrollLeft = startX + (rangeX * intervalValue);
      if (intervalCount >= intervalsNumber) {
        this.state.isScrolling = false;
        clearInterval(this.state.interval);
        this.state.currentTime = 0;
        this.state.breakTime = 0;
        this.state.interval = null;
        if (type(callback, Function)) callback();
      }
    }, intervalTime);

    function step(current) {
      const time = (1 / intervalsNumber) * current;
      const coords = [0, 0, 0, this.state.breakTime, 1, 1, 1, 1];
      this.state.currentTime = time;
      return $casteljau(coords, time);
    }
  }

}