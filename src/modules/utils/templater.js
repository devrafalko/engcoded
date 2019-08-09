import type from 'of-type';
const { $loopParents } = $utils;

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

class Events {
  constructor() {
    this._references = new Map();
    this._elements = new Map();
    this._instances = new Map();
    this._identifiers = new Map();
    this._paths = new Map();
    this._handlers = new Map();
    this.mount = this._mount.bind(this);
  }

  reference(name, data) {
    this._references.set(name, data);
  }

  add({ element, attribute }) {
    const name = element.getAttribute(attribute);
    const data = this._references.get(name);
    const paths = this._parseId(element.getAttribute(attribute));

    let currentScope = this._instances;
    for (let i = 0; i < paths.length; i++) {
      let path = paths[i];
      let isLast = i + 1 === paths.length;
      if (!currentScope.has(path)) currentScope.set(path, { data: null, scope: new Map() });
      if (isLast) {
        data.paths = paths;
        data.element = element;
        this._identifiers.set(data.name, data);
        this._elements.set(data.element, data);
        this._paths.set(paths, data);
        currentScope.get(path).data = data;
      } else {
        currentScope = currentScope.get(path).scope;
      }
    }
  }

  _parseId(id) {
    return id.split('.');
  }

  _prepareCallback(event, currentTarget, action, { data, name, paths, element }, callback) {
    callback({
      event,
      data,
      type: action,
      id: name,
      path: paths,
      last: paths[paths.length - 1],
      current: currentTarget,
      target: element
    });
  }

  _mount(id, callback) {
    if (!arguments.length) return this;
    const data = this._identifiers.get(id);
    const paths = data ? data.paths : this._parseId(id);

    this._traverse(paths, ({ element, action }) => {
      let actions = type(action,Array) ? action:[action];
      for(let _action of actions){
        if (!this._handlers.has(_action)) this._handlers.set(_action, new Map());
        const handler = this._handlers.get(_action);
        if (!handler.has(element)) handler.set(element, paths);
        else if (paths.length > handler.get(element).length) handler.set(element, paths);
      }
    });

    const commons = this._findCommonParents(paths);
    commons.forEach((element, action) => {
      element.addEventListener(action, (event) => {
        const handlers = this._handlers.get(action);
        const collection = [];
        $loopParents(event.target, (node, stop) => {
          if (handlers.has(node) && handlers.get(node) === paths) {
            collection.unshift(this._elements.get(node));
          }
          if (event.target === element) stop();
        });

        if (!collection.length) return;
        for (let i = 0; i < collection.length; i++) {
          let data = collection[i];
          if (data.bubble) {
            this._prepareCallback(event, element, action, data, callback);
            collection.splice(i, 1);
            i--;
          }
        }

        for (let i = collection.length - 1; i >= 0; i--) {
          let data = collection[i];
          this._prepareCallback(event, element, action, data, callback);
        }
      });
    });
  }

  join(added, main) {
    added._elements.forEach((value, key) => main._elements.set(key, value))
    added._identifiers.forEach((value, key) => main._identifiers.set(key, value));
    added._paths.forEach((value, key) => main._paths.set(key, value));
    added._references.forEach((value, key) => main._references.set(key, value));
    added._handlers.forEach((map, action) => {
      if (!main._handlers.has(action)) main._handlers.set(action, new Map());
      let actionHandler = main._handlers.get(action);
      map.forEach((value, key) => actionHandler.set(key, value));
    });

    joinInstances(added._instances, main._instances);

    function joinInstances(added, main) {
      added.forEach((value, key) => {
        const { data, scope } = value;
        if (!main.has(key)) main.set(key, { data: null, scope: new Map() });
        main.get(key).data = data;
        if (scope.size) joinInstances(scope, main.get(key).scope);
      });
    }
  }

  _traverse(paths, callback) {
    let currentScope = this._instances;
    for (let path of paths) {
      let scope = type(currentScope, Map) ? currentScope : currentScope.scope;
      currentScope = scope.get(path);
    }

    loop(currentScope);

    function loop(current) {
      let { data, scope } = current;
      if (data !== null) callback(data);
      scope.forEach((item) => loop(item));
    }
  }

  _findCommonParents(pathsA) {
    const commons = new Map();
    let range = document.createRange();
    this._handlers.forEach((map, _action) => {
      map.forEach((pathsB, node) => {
        if (pathsA === pathsB) {
          range.setStart(commons.get(_action) || node, 0);
          range.setEnd(node, 0);
          commons.set(_action, range.commonAncestorContainer);
        }
      });
    });
    return commons;
  }
}

export default function (callback) {
  const childCollection = [];
  const nodeReferences = new Map();
  const classReferences = new Map();
  const events = new Events();
  const classInstanceReferences = new Map();
  const stringContent = callback({
    ref: (name) => `data-reference="${name}"`,
    on: (name, action, _data = {}) => {
      const { bubble = false, data } = _data;
      const dataDefined = _data.hasOwnProperty('data');
      events.reference(name, { name, action, dataDefined, data, bubble });
      return `data-action="${name}"`;
    },
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
        events.join(nodes.$on(), events.mount());
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

  const _eventTargets = wrapper.content.querySelectorAll('[data-action]');
  for (let element of _eventTargets) {
    events.add({ element, attribute: 'data-action' });
    element.removeAttribute('data-action');
  }

  const _children = wrapper.content.querySelectorAll('[data-child]');
  for (let i = 0; i < _children.length; i++) {
    let node = _children[i];
    let parent = node.parentElement === null ? wrapper.content : node.parentElement;
    parent.replaceChild(childCollection[i], node);
  }

  const child = wrapper.content.children.length === 1 ? wrapper.content.children[0] : wrapper.content;
  return {
    template: child,
    references: nodeReferences,
    classes: classInstanceReferences,
    $on: events.mount
  };

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