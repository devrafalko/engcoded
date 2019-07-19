class Timer {
  constructor() {
    this.state = {
      timer: null
    };
  }

  start(current, callback) {
    let increased = current;
    callback({ seconds: Math.floor(increased), exact: increased });
    this.state.timer = setInterval(() => {
      increased += .1;
      callback({ seconds: Math.floor(increased), exact: increased });
    }, 100);
  }

  stop() {
    clearInterval(this.state.timer);
  }

  stringToTime(value) {
    const err = new Error(`Invalid time syntax: "${value}"`);
    const [time, milliseconds = '0'] = value.split(/\./g);
    const [seconds = '0', minutes = '0', hours = '0'] = time.split(/\:/g).reverse();
    if (!/^\d{1,4}$/.test(milliseconds)) throw err;
    for (let t of [seconds, minutes, hours]) if (!/^\d{1,2}$/.test(t)) throw err;
    for (let t of [seconds, minutes]) if (Number(t) > 59) throw err;
    const totalSeconds = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
    const totalFloatSeconds = Number(`${String(totalSeconds)}.${milliseconds}`);
    return {
      seconds: Number(seconds),
      minutes: Number(minutes),
      hours: Number(hours),
      milliseconds: Number(milliseconds),
      totalSeconds,
      totalFloatSeconds,
      value
    };
  }

  secondsToString(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds - (h * 3600)) / 60);
    const s = Math.floor((seconds - (h * 3600) - (m * 60)));

    return {
      hours: fill(h, 0),
      minutes: fill(m, 2),
      seconds: fill(s, 2),
      ms: String(Math.round((seconds - Math.floor(seconds)) * 10000))
    };

    function fill(value, length) {
      const collection = String(value).split('');
      for (let i = 0; i < length - collection.length; i++) collection.unshift('0');
      return collection.join('');
    }
  }


}

export default new Timer();