import type from 'of-type';

class Queue {
  constructor(instance) {
    this._data = {
      instance,
      element: instance._data.element,
      collection: instance._data.collection,
      identifier: instance._data.identifier,
      classNames: instance._data.classNames,
      timers: new Map()
    };
  }

  _queue(classes, fun) {
    if (this._data.timers.size) {
      const timers = [...this._data.timers.keys()];
      const collection = this._data.timers.get(timers[timers.length - 1]);
      collection.push(fun);

      classes.forEach((name) => {
        if (!this._data.classNames.has(name)) this._data.classNames.set(name, []);
        let collection = this._data.classNames.get(name);
        if (collection.indexOf(classes) === -1) collection.push(classes);
      });

    } else fun();
    return this;
  }

  _collection(args) {
    const map = new Map();
    const classes = Array.prototype.slice.call(args);
    classes.forEach(name => map.set(name, true));
    return [...map.keys()];
  }

  add() {
    const classes = this._collection(arguments);

    return this._queue(classes, () => {
      if (!classes.length) return;
      this._data.element.classList.add(...classes);
      for (let name of classes) this._data.collection.set(name, true);
    });
  }

  remove() {
    const classes = this._collection(arguments);

    return this._queue(classes, () => {
      if (!classes.length) return;
      this._data.element.classList.remove(...classes);
      for (let name of classes) this._data.collection.delete(name);
    });
  }

  toggle() {
    const classes = this._collection(arguments);

    return this._queue(classes, () => {
      if (!classes.length) return;
      const classList = this._data.element.classList;
      for (let name of classes) {
        if (classList.contains(name)) {
          classList.remove(name);
          this._data.collection.delete(name);
        } else {
          classList.add(name);
          this._data.collection.set(name, true);
        }
      }
    });
  }

  wait(value) {
    const time = value <= 0 || value === null ? null : Math.round(value);
    if (time === null) return this;

    const timer = () => {
      setTimeout(() => {
        this._data.timers.get(timer).forEach((sync) => sync());
        this._data.timers.delete(timer);
        if (this._data.timers.size) [...this._data.timers.keys()][0]();
      }, time);
    };

    this._data.timers.set(timer, []);
    if (this._data.timers.size === 1) timer();

    return this;
  }
}

class Classes {
  constructor({ element, classes, identifier }) {
    this._data = {
      element,
      identifier,
      collection: new Map(),
      classNames: new Map()
    };
    for (let name of classes) this._data.collection.set(name, true);
    this._data.element.classList.add(...this._data.collection.keys());
  }

  get collection() {
    const collection = [...this._data.collection.keys()];
    return collection.filter((item) => this._data.element.classList.contains(item));
  }

  get all() {
    return [...this._data.element.classList];
  }

  add() {
    return new Queue(this).add(...arguments);
  }
  remove() {
    return new Queue(this).remove(...arguments);
  }
  wait() {
    return new Queue(this).wait(...arguments);
  }
  toggle() {
    return new Queue(this).toggle(...arguments);
  }

  has() {
    const classes = [...arguments];
    return classes.every((name) => this.all.some((_name) => _name === name));
  }

  clear() {
    const classes = [...arguments];
    if (!classes.length) classes.push(...this._data.classNames.keys());
    classes.forEach((name) => {
      const collection = this._data.classNames.get(name);
      if (collection) collection.forEach((arr, index) => {
        arr.splice(arr.indexOf(name), 1);
      });
    });
    return this;
  }
}

export default function (callback) {
  const childCollection = [];
  const nodeReferences = new Map();
  const classReferences = new Map();
  const classInstanceReferences = new Map();
  const stringContent = callback({
    ref: (name) => `data-reference="${name}"`,
    child: (nodes) => {
      if (type(nodes, Array)) {
        let content = '';
        for (let node of nodes) {
          if (!(node instanceof Element)) continue;
          content += `<template data-child="${childCollection.push(node) - 1}"></template>`;
        }
        return content;
      } else if (type(nodes, Object)) {
        joinDescendantReferences(nodes.references, nodeReferences);
        joinDescendantReferences(nodes.classes, classInstanceReferences);
        return `<template data-child="${childCollection.push(nodes.template) - 1}"></template>`;
      } else if (nodes instanceof Element) {
        return `<template data-child="${childCollection.push(nodes) - 1}"></template>`;
      } else return '';
    },
    classes: (name, list = []) => {
      classReferences.set(name, list);
      return `data-classes="${name}"`;
    },
    loop: (num, callback) => {
      let total = '';
      for (let i = 0; i < num; i++) total += callback(i);
      return total;
    },
    list: (list, template) => {
      let total = '';
      let iterator = 0;
      if (type(list, Map)) {
        for (let [key, value] of list) {
          total += template(value, key, iterator);
          iterator++;
        }
      } else if (type(list, Array)) {
        for (let item of list) {
          total += template(item, iterator);
          iterator++;
        }
      }
      else if (type(list, Object)) {
        for (let name in list) {
          total += template(list[name], name, iterator);
          iterator++;
        }
      }
      return total;
    },
    when: (condition, template) => {
      return condition ? template() : '';
    }
  });
  const wrapper = document.createElement('TEMPLATE');
  wrapper.innerHTML = stringContent;
  const _refs = wrapper.content.querySelectorAll('[data-reference]');
  for (let element of _refs) createReferencesMap(element, 'data-reference', nodeReferences, element);

  const _elements = wrapper.content.querySelectorAll('[data-classes]');
  for (let element of _elements) {
    let identifier = element.getAttribute('data-classes');
    let classes = classReferences.get(identifier);
    let instance = new Classes({ element, classes, identifier });
    createReferencesMap(element, 'data-classes', classInstanceReferences, instance);
  }

  const _children = wrapper.content.querySelectorAll('[data-child]');
  for (let i = 0; i < _children.length; i++) {
    let node = _children[i];
    let parent = node.parentElement === null ? wrapper.content : node.parentElement;
    parent.replaceChild(childCollection[i], node);
  }

  const child = wrapper.content.children.length === 1 ? wrapper.content.children[0] : wrapper.content;
  return { template: child, references: nodeReferences, classes: classInstanceReferences };

  function createReferencesMap(element, attribute, map, property) {
    const paths = element.getAttribute(attribute).split('.');
    element.removeAttribute(attribute);
    let currentScope = map;
    for (let i = 0; i < paths.length; i++) {
      let name = paths[i];
      let isLast = i + 1 === paths.length;
      if (isLast) currentScope.set(name, property);
      else {
        let existing = currentScope.get(name);
        let nextScope = type(existing, Map) ? existing : new Map();
        currentScope.set(name, nextScope);
        currentScope = nextScope;
      }
    }
  }

  function joinDescendantReferences(added, main) {
    added.forEach((value, key) => {
      let isMap = type(value, Map);
      if (!main.has(key)) main.set(key, isMap ? new Map() : value);
      if (isMap) joinDescendantReferences(value, main.get(key));
    });
  }
}