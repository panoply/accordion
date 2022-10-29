import { Scope, Fold, Options, EventNames } from 'types';

declare global {
  export interface Window { relapse: Map<string, Scope> }
}

/**
 * Event Emitter
 *
 * The emitted events for the accordion.
 */
function $events (events: Scope['events']) {

  const emit = (name: EventNames, scope: Scope, fold?: Fold): boolean => {

    const event = events[name] || [];
    const length = event.length;

    let prevent: boolean = null;

    for (let i = 0; i < length; i++) {
      const returns = event[i].apply(scope, [ fold ]);
      if (prevent === null && returns === false) prevent = true;
    }

    return prevent;

  };

  const on = (name: EventNames, callback: (this: Scope, folds?: Fold) => void) => {

    if (!events[name]) events[name] = [];
    events[name].push(callback as any);

  };

  const off = (name: EventNames, callback: () => void) => {

    const live = [];
    const event = events[name];

    if (event && callback) {
      let i = 0;
      const len = event.length;
      for (; i < len; i++) if (event[i] !== callback) live.push(event[i]);
    }

    if (live.length) {
      event[name] = live;
    } else {
      delete event[name];
    }

  };

  return { on, off, emit };

};

/**
 * Folds instance - Creates an object literal for each content fold.
 */
function $folds (scope: Scope, event: ReturnType<typeof $events>) {

  const { config } = scope;
  const { classes } = config;

  return (fold: Fold) => {

    /**
     * Expanding Element - Opens a closed fold
     */
    const $active = (index: number) => {

      if (typeof index !== 'number') {
        if (scope.active !== fold.index) scope.active = fold.index;
        return fold;
      }

      if (scope.folds[index]) {
        scope.active = fold.index;
        return scope.folds[index];
      } else {
        throw new TypeError(`No fold exists at index: ${index}`);
      }
    };

    /**
     * Collapsing Element - Closes an open fold
     */
    const $collapse = (focus: Fold) => {

      focus.button.ariaDisabled = 'false';
      focus.button.ariaExpanded = 'false';
      focus.button.classList.remove(classes.opened);
      focus.content.classList.remove(classes.expanded);
      focus.expanded = false;

      // if we want to transition when closing we
      // have to set the current height and replace auto
      focus.content.style.maxHeight = '0';

    };

    fold.open = (index?: number) => {

      const focus = $active(index);

      if (focus.expanded) return;

      focus.close();

      focus.button.ariaDisabled = 'true';
      focus.button.ariaExpanded = 'true';
      focus.button.classList.add(classes.opened);
      focus.content.classList.add(classes.expanded);
      focus.content.style.maxHeight = `${focus.content.scrollHeight}px`;
      focus.expanded = true;

      focus.disable();
      scope.count = scope.folds.filter(({ expanded }) => expanded).length;
      event.emit('expand', scope, focus);

    };

    fold.close = (index?: number) => {

      let focus = $active(index);

      if (config.multiple) {
        if (!config.persist || (config.persist && scope.count > 1)) $collapse(focus);
      } else {
        for (const node of scope.folds) {
          if (node.expanded) {
            if (config.persist && node.index === focus.index) break;
            $collapse(node);
            focus = node;
            break;
          }
        }
      }

      focus.enable();
      scope.count = scope.folds.filter(({ expanded }) => expanded).length;
      event.emit('collapse', scope, focus);

    };

    /**
   * Focus Button - Applies focus to the button
   */
    fold.focus = () => {
      scope.active = fold.index; // focused Scope
      fold.button.classList.add(classes.focused);
      event.emit('focus', scope, fold);
    };

    /**
   * Blur Button - Applies blur to the button
   */
    fold.blur = () => fold.button.classList.remove(classes.focused);

    /**
   * Button Enable - Writes
   */
    fold.enable = (index?: number) => {

      const focus = $active(index);

      if (focus.disabled) {
        focus.disabled = false;
        focus.button.ariaDisabled = 'false';
        focus.button.classList.remove(classes.disabled);
      }
    };

    /**
     * Button Disable - Enables
     */
    fold.disable = (index?: number) => {

      const focus = $active(index);

      if (!focus.disabled) {
        if (focus.expanded) {
          if (config.persist) {
            focus.disabled = true;
            focus.button.ariaDisabled = 'true';
          }
        } else {
          focus.close();
          focus.disabled = true;
          focus.button.ariaDisabled = 'true';
          focus.button.classList.add(classes.disabled);
        }
      }
    };

    fold.toggle = () => {

      if (event.emit('toggle', scope, fold)) return;

      return fold.expanded ? fold.close() : fold.open();

    };

    fold.destroy = (remove = false) => {

      fold.close();

      fold.button.removeEventListener('click', fold.toggle);
      fold.button.removeEventListener('focus', fold.focus);
      fold.button.removeEventListener('blur', fold.blur);

      if (remove) {
        scope.element.removeChild(fold.content);
        scope.element.removeChild(fold.button);
      }
    };

    fold.button.addEventListener('click', fold.toggle);
    fold.button.addEventListener('focus', fold.focus);
    fold.button.addEventListener('blur', fold.blur);

    scope.folds.push(fold);

  };

}

const $boolean = (nodeValue: string) => {

  const value = nodeValue.trim();

  if (!/true|false/.test(value)) throw new TypeError(`Invalid value. Boolean expected, received: ${value}`);

  return value === 'true';

};

/**
 * Default Options - Merges the default options with user options.
 */
const $defaults = (options: Options, attrs: NamedNodeMap): Options => {

  const config: Options = Object.create(null);
  config.classes = Object.create(null);
  config.persist = true;
  config.multiple = false;
  config.schema = 'data-relapse';
  config.classes.initial = 'initial';
  config.classes.opened = 'opened';
  config.classes.disabled = 'disabled';
  config.classes.expanded = 'expanded';
  config.classes.focused = 'focused';

  if (typeof options === 'object') {
    for (const o in options) {
      if (o === 'classes') for (const c in options[o]) config.classes[c] = options[o][c];
      else config[o] = options[o];
    }
  }

  // Available attribute properties
  const name = /^(?:persist|multiple)$/;
  const slice = config.schema === null ? 5 : config.schema.length + 1;

  // Lets loop over all the attributes contained on the element
  // and apply configuration to ones using valid annotations.
  for (const { nodeName, nodeValue } of attrs) {
    const prop = nodeName.slice(slice);
    if (name.test(prop)) config[prop] = $boolean(nodeValue);
  }

  return config;

};

const relapse = function relapse (selector: string | HTMLElement | NodeListOf<HTMLElement>, options?: Options) {

  let el: HTMLElement;

  if (typeof selector === 'string') {
    if (selector.charCodeAt(0) === 35) { // #
      el = document.body.querySelector(selector);
    } else {
      for (const e of document.body.querySelectorAll(selector)) relapse(e as HTMLElement, options);
    }
  } else if (selector instanceof NodeList) {
    for (const e of selector) relapse(e as HTMLElement, options);
  } else if (selector instanceof Element) {
    el = selector as HTMLElement;
  }

  if (!el) return;

  if (!(window.relapse instanceof Map)) window.relapse = new Map();

  const scope: Scope = Object.create(null);
  scope.events = {};
  scope.folds = [];
  scope.element = el;
  scope.id = `A${window.relapse.size}`;
  scope.count = 0;

  scope.config = $defaults(options, scope.element.attributes);

  let key: string;
  if (scope.element.hasAttribute('data-relapse')) {
    key = scope.element.getAttribute('data-relapse');
  } else {
    key = Math.random().toString(36).slice(2);
    scope.element.setAttribute('data-relapse', key);
  }

  const id: string = scope.element.getAttribute('id');

  if (key === null && id === null) {
    key = scope.id;
  } else if (key !== null && id !== null) {
    if (window.relapse.has(id) || window.relapse.has(key)) {
      throw new TypeError(`An existing instance is using id "${key}"`);
    }
  } else if (key === null && id !== null) key = id;

  if (window.relapse.has(key)) {
    throw new TypeError(`An existing instance is using id "${key}"`);
  }

  scope.element.ariaMultiSelectable = `${scope.config.multiple}`;

  const children = scope.element.children;
  const length = children.length;
  const event = $events(scope.events);
  const folds = $folds(scope, event);

  const { classes } = scope.config;

  for (let i = 0; i < length; i = i + 2) {

    const btn = children[i] as HTMLElement;
    const el = children[i + 1] as HTMLElement;
    const fold: Fold = Object.create(null);

    fold.index = scope.folds.length;

    const isInitial = btn.classList.contains(classes.initial);
    const isOpened = btn.classList.contains(classes.opened);
    const isDisabled = btn.classList.contains(classes.disabled);
    const isExpanded = el.classList.contains(classes.expanded);

    if (btn.ariaExpanded === 'true' || isOpened || isExpanded || isInitial) {

      // class name and attribute align
      if (!isOpened) btn.classList.add(classes.opened); else btn.ariaExpanded = 'true';
      if (!isExpanded) el.classList.add(classes.expanded);
      if (!isDisabled) btn.classList.add(classes.disabled);
      if (!isInitial) btn.classList.remove(classes.initial);

      // remove disabled if applied
      btn.ariaDisabled = 'true';

      fold.expanded = true;
      fold.disabled = true;

    } else if (btn.ariaDisabled === 'true' || isDisabled) {

      // class name and attribute align
      if (!isDisabled) btn.classList.add(classes.disabled); else btn.ariaDisabled = 'false';

      el.classList.remove(classes.expanded);
      btn.classList.remove(classes.opened);

      btn.ariaExpanded = 'false';

      fold.expanded = false;
      fold.disabled = true;

    } else {

      fold.expanded = false;
      fold.disabled = false;

      btn.ariaExpanded = 'false';
      btn.ariaDisabled = 'false';

    }

    if (btn.id) fold.id = btn.id;
    if (el.id) fold.id = el.id;

    if (!('id' in fold)) {
      // @ts-ignore-next-line
      fold.id = `${scope.id}F${fold.index}`;
      // @ts-ignore-next-line
      btn.id = `B${fold.id}`;
      // @ts-ignore-next-line
      el.id = `C${fold.id}`;
    }

    btn.setAttribute('aria-controls', fold.id);
    el.setAttribute('aria-labelledby', btn.id);
    el.setAttribute('role', 'region');

    fold.button = btn as any;
    fold.content = el as any;

    if (fold.expanded) {
      scope.count = scope.count + 1;
      fold.content.style.maxHeight = `${fold.content.scrollHeight}px`;
    }

    folds(fold);
  }

  const $find = (method: 'open' | 'close' | 'destroy', fold: string | number, remove = false) => {

    if (typeof fold === 'number') {
      return method.charCodeAt(0) === 100 ? scope.folds[fold][method](remove as never) : scope.folds[fold][method]();
    } else if (typeof fold === 'string') {
      for (const f of scope.folds) {
        if (f.button.dataset[`${scope.config.schema}-fold`] === fold) {
          return method.charCodeAt(0) === 100 ? f[method](remove as never) : f[method]();
        }
      }
    }

    throw new TypeError(`Fold does not exist: "${fold}"`);

  };

  /* -------------------------------------------- */
  /* METHODS                                      */
  /* -------------------------------------------- */

  scope.on = event.on;

  scope.off = event.off;

  scope.collapse = (fold: string | number) => $find('close', fold);

  scope.expand = (fold: string | number) => $find('open', fold);

  scope.destroy = (fold?: string | number, remove = false) => {

    if (typeof fold === 'undefined') {
      for (const fold of scope.folds) fold.destroy();
    } else {
      $find('destroy', fold, remove);
    }

    scope.element.removeAttribute('aria-multiselectable');
    event.emit('destroy', scope);
    window.relapse.delete(key);

  };

  window.relapse.set(key, scope);

  return scope;

};

relapse.get = (id?: string) => id ? window.relapse.get(id) : window.relapse;

export default relapse;
