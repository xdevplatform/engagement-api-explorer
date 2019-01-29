class Emitter {
  setState(value) {
    const newstate = JSON.stringify(value);
    if (newstate === null) {
      return true;
    }

    const oldstate = JSON.stringify(this.state);
    if (oldstate !== newstate) {
      this.state = Object.assign(this.state, JSON.parse(newstate));
      typeof this.stateDidChange === 'function' ? this.stateDidChange() : null;
      typeof this.render === 'function' ? this.render() : null;
    }
  }

  childNodes() {
    return this.component.querySelectorAll('[data-emitter-class]');
  }

  constructor(element) {
    this.component = element;
    this.component.instance = this;
    this.state = typeof this.getInitialState === 'function' ? this.getInitialState() : {};
    this.props = {};
    this.children = {};

    [this.component, ...this.component.querySelectorAll(':not([data-emitter-class])')].forEach(el => {
      el.getAttributeNames().forEach(key => {
        this.props[key] = el.getAttribute(key);
        if (key === 'data-emitter-class') {
          return false;
        }
        
        if (key.indexOf('data-emitter-') !== 0) {
          return false;
        }

        const event = key.replace('data-emitter-', '');
        const functionName = el.getAttribute(key);

        if (typeof this[functionName] !== 'function') {
          throw new TypeError(`${this.constructor.name}.${functionName} is undefined`);
        }

        el.addEventListener(event, this[functionName].bind(this));
      });
    });
  }

  static init(path = '') {
    document.querySelectorAll('[data-emitter-class]').forEach(element => {
      const className = element.getAttribute('data-emitter-class');
      if (!document.querySelector(`script[for='${className}']`)) {
        const script = document.createElement('script');
        script.setAttribute('src', `${path}${className}.js`);
        script.setAttribute('async', '');
        script.setAttribute('for', className);
        script.onload = () => {
          const fn = new Function('element', `new ${className}(element)`);
          document.querySelectorAll(`[data-emitter-class=${className}]`).forEach(element => fn(element));
        };
        document.head.appendChild(script);
      }
    });   
  }
}