const { $words } = $data;
const { $randomItem } = $utils;

class Words {
  constructor(words) {
    this._data = { words };
    this._map = {
      alphabet: new Map(),
      records: new Map(),
      identifiers: null,
      indeces: null,
      types: null,
      fixed: null,
      strings: null
    };

    this._buildAllMap(words);
    this._buildAlphabetMap();
    this._buildRepetitionMaps();
  }

  get records() {
    return this._map.records;
  }

  get fixed() {
    if (this._map.fixed === null) this._buildCrosswordLettersMap();
    return this._map.fixed;
  }

  get strings() {
    if (this._map.strings === null) this._buildCrosswordLettersMap();
    return this._map.strings;
  }

  get identifiers() {
    if (this._map.identifiers === null) this._buildIdentifiersMap();
    return this._map.identifiers;
  }

  get indeces() {
    if (this._map.indeces === null) this._buildIndecesMap();
    return this._map.indeces;
  }

  get size() {
    return this._map.records.size;
  }

  get typeNames() {
    return [...this.types.keys()].sort();
  }

  get types() {
    if (!this._map.types) this._buildTypesMap();
    return this._map.types;
  }

  get clues() {
    if (!this._map.clues) this._buildCluesMap();
    return this._map.clues;
  }

  random(collection, game = null) {
    const reps = game === null ? this._repetition.global : this._repetition[game];
    for (let [key, ids] of reps) {
      if (!ids.size) continue;
      let filtered = new Set();
      ids.forEach((id) => {
        if (collection.has(id)) filtered.add(id);
      });
      if (!filtered.size) continue;
      return $randomItem([...filtered.values()]);
    }
    return null;
  }

  match({ before = Infinity, after = Infinity, characters, collection, excludes, game = null }) {
    before = before < 0 ? 0 : before;
    after = after < 0 ? 0 : after;
    const start = before === 0 ? '^(.{0})' : before === Infinity ? '^(.*)' : `^(.{0,${before}})`;
    const end = after === 0 ? '(.{0})$' : after === Infinity ? '(.*)$' : `(.{0,${after}})$`;
    let middle = '';
    let firstLetters = '';

    for (let item of characters) {
      if (typeof item === 'number') middle += `.{${item}}`
      if (typeof item === 'string') {
        let isLetter = /[a-z ]/.test(item);
        middle += isLetter ? item : '\\' + item;
        firstLetters += item;
      }
    }

    const expression = new RegExp(start + `(${middle})` + end);
    const seekLetters = firstLetters.slice(0, 2).toLowerCase();
    const iterator = this._repetition.iterator;

    let finalMatch = null;
    if (!this._map.alphabet.has(seekLetters)) return finalMatch;
    const matches = this._map.alphabet.get(seekLetters).contain;

    matches.forEach((id) => {
      if (!collection.has(id)) return;
      if (excludes.has(id)) return;
      let reps = iterator.get(id);
      if (finalMatch && finalMatch.reps < reps) return;
      let word = this.strings.get(id);
      let match = word.match(expression);
      if (match === null) return;
      let size = match[0].length;
      if (finalMatch && finalMatch.size > size) return;
      finalMatch = {
        id, reps, size,
        before: match[1].length,
        middle: match[2].length,
        after: match[3].length
      };
    })

    return finalMatch;
  }

  solve(id, gameName) {
    const game = this._repetition[gameName];
    const glob = this._repetition.global;
    const iter = this._repetition.iterator;
    const current = iter.get(id);
    const next = current + 1;
    if (!game.has(next)) game.set(next, new Set());
    if (!glob.has(next)) glob.set(next, new Set());

    glob.get(current).delete(id);
    glob.get(next).add(id);
    game.get(current).delete(id);
    game.get(next).add(id);
    iter.set(id, next);
  }

  filterClues(set) {
    const map = new Set();
    const clues = [...set];
    this._map.records.forEach((record, id) => {
      if (clues.some((name) => this.clues.get(name).has(id))) map.add(id);
    });
    return map;
  }

  filter({ clue = null, type = null } = {}) {
    /*  const clueFilter = clue === null ? () => true : (props) => every(props, clue);
        const typeFilter = type === null ? () => true : () => true;
        this._map.records.forEach((record) => {
          let recordProperties = Object.getOwnPropertyNames(record);
        });
    
        function every(a, b) {
          return b.every((x) => a.some((y) => x === y));
        } */

  }

  _buildAlphabetMap() {
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ' '];
    for (let letterX of letters) {
      let data = matches({
        words: this.strings,
        beginRegExp: new RegExp(`^${letterX}`, 'i'),
        containRegExp: new RegExp(letterX, 'i')
      })
      this._map.alphabet.set(letterX, data);

      for (let letterY of letters) {
        let data = matches({
          words: this.strings,
          beginRegExp: new RegExp(`^${letterX}${letterY}`, 'i'),
          containRegExp: new RegExp(`${letterX}.*${letterY}`, 'i')
        })
        this._map.alphabet.set(letterX + letterY, data);
      }
    }

    function matches({ words, beginRegExp, containRegExp }) {
      let data = { begin: new Set(), contain: new Set() };
      words.forEach((word, id) => {
        if (word.match(beginRegExp)) data.begin.add(id);
        if (word.match(containRegExp)) data.contain.add(id);
      });
      return data;
    }
  }

  _buildAllMap(words) {
    words.forEach((reference) => {
      let id = reference.id;
      if (!$words.has(id) || this._map.records.has(id)) return;
      let record = $words.get(id);
      this._map.records.set(id, { ...record, id: id });
    });
  }

  _buildRepetitionMaps() {
    const names = ['global', 'crossword', 'presentation', 'test', 'pronunciation'];
    this._repetition = {
      iterator: new Map()
    };

    this._map.records.forEach((record, id) => {
      this._repetition.iterator.set(id, 0);
    });

    names.forEach((name) => {
      const map = new Map();
      map.set(0, new Set());
      const set = map.get(0);
      this._map.records.forEach((record, id) => set.add(id));
      this._repetition[name] = map;
    });
  }

  _buildCrosswordLettersMap() {
    this._map.strings = new Map();
    this._map.fixed = new Map();
    this._map.records.forEach((record, id) => {
      let parsed = parse(record.crossword);
      this._map.strings.set(id, parsed.string);
      this._map.fixed.set(id, parsed.total);
    });

    function parse(word, total = [], string = '') {
      if (!word.length) return { total, string };

      const letters = /^[A-Za-z]+/.exec(word);
      if (letters && letters.length) {
        total.push({ letters: letters[0] });
        string += letters[0];
        return parse(word.slice(letters[0].length), total, string);
      }

      const escape = /^\{(.+)\}/.exec(word);
      if (escape && escape.length) {
        total.push({ fixed: escape[1] });
        string += escape[1];
        return parse(word.slice(escape[0].length), total, string);
      }

      const characters = /^[^A-Za-z{}]+/.exec(word);
      if (characters && characters.length) {
        total.push({ fixed: characters[0] });
        string += characters[0];
        return parse(word.slice(characters[0].length), total, string);
      }
    }
  }

  _buildIdentifiersMap() {
    const map = new Map();
    this._data.words.forEach((item) => {
      if (!item.id) return;
      if (!map.has(item.id)) map.set(item.id, []);
      map.get(item.id).push(item.index);
    });
    this._map.identifiers = map;
  }

  _buildIndecesMap() {
    const map = new Map();
    this._data.words.forEach((item) => map.set(item.index, item));
    this._map.indeces = map;
  }

  _buildTypesMap() {
    const map = new Map();
    this._map.records.forEach((record, id) => {
      if (!map.has(record.type)) map.set(record.type, new Set());
      map.get(record.type).add(id);
    });
    this._map.types = map;
  }

  _buildCluesMap() {
    const map = new Map([
      ['meaning', new Set()],
      ['definition', new Set()],
      ['img', new Set()],
      ['audio', new Set()],
    ]);
    this._map.records.forEach((record, id) => {
      if (record.hasOwnProperty('meaning')) map.get('meaning').add(id);
      if (record.hasOwnProperty('definition')) map.get('definition').add(id);
      if (record.hasOwnProperty('img')) map.get('img').add(id);
      if (record.hasOwnProperty('audio')) map.get('audio').add(id);
    });
    this._map.clues = map;
  }

}

export default Words;