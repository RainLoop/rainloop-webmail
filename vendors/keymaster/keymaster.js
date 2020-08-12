//     keymaster.js
//     (c) 2011-2013 Thomas Fuchs
//     keymaster.js may be freely distributed under the MIT license.

(global=>{
  var k,
    _handlers = {},
    _mods = { 16: false, 18: false, 17: false, 91: false },
    _scope = 'all',
    // modifier keys
    _MODIFIERS = {
      '⇧': 16, shift: 16,
      '⌥': 18, alt: 18, option: 18,
      '⌃': 17, ctrl: 17, control: 17,
      '⌘': 91, command: 91
    },
    // special keys
    _MAP = {
      backspace: 8, tab: 9, clear: 12,
      enter: 13, 'return': 13,
      esc: 27, escape: 27, space: 32,
      left: 37, up: 38,
      right: 39, down: 40,
      insert: 45,
      del: 46, 'delete': 46,
      home: 36, end: 35,
      pageup: 33, pagedown: 34,
      ',': 188, '.': 190, '/': 191,
      '`': 192, '-': 189, '=': 187,
      ';': 186, '\'': 222,
      '[': 219, ']': 221, '\\': 220
    },
    code = x => _MAP[x] || x.toUpperCase().charCodeAt(0),
    _downKeys = [];

  for(k=1;k<20;k++) _MAP['f'+k] = 111+k;

  var modifierMap = {
      16:'shiftKey',
      18:'altKey',
      17:'ctrlKey',
      91:'metaKey'
  };

  // parse and assign shortcut
  function assignKey(key, scope, method){
    key = key.replace(/\s/g, '');
    var keys = key.split(','), mods;
    if ((keys[keys.length - 1]) == '') {
      keys[keys.length - 2] += ',';
    }
    if (method === undefined) {
      method = scope;
      scope = 'all';
    }

    // for each shortcut
    for (var i = 0; i < keys.length; i++) {
      // set modifier keys if any
      mods = [];
      key = keys[i].split('+');
      if (key.length > 1){
        mods = key.slice(0, key.length - 1);
        mods.forEach((mod, mi) => mods[mi] = _MODIFIERS[mod]);
        key = [key[key.length-1]];
      }
      // convert to keycode and...
      key = code(key[0]);
      // ...store handler
      if (!(key in _handlers)) _handlers[key] = [];

      if (typeof scope !== 'string' && scope.length && typeof scope[0] === 'string') {
         scope.forEach(item => {
            _handlers[key].push({ shortcut: keys[i], scope: item, method: method, key: keys[i], mods: mods });
         });
      } else {
        _handlers[key].push({ shortcut: keys[i], scope: scope, method: method, key: keys[i], mods: mods });
      }
    }
  }

  // initialize key.<modifier> to false
  for(k in _MODIFIERS) assignKey[k] = false;

  const getScope = () => _scope || 'all';

  // set the handlers globally on document
  document.addEventListener('keydown', event => {
    var key = event.keyCode, k, modifiersMatch, scope;

    if (!_downKeys.includes(key)) {
        _downKeys.push(key);
    }

    // if a modifier key, set the key.<modifierkeyname> property to true and return
    if(key == 93 || key == 224) key = 91; // right command on webkit, command on Gecko
    if(key in _mods) {
      _mods[key] = true;
      // 'assignKey' from inside this closure is exported to window.key
      for(k in _MODIFIERS) if(_MODIFIERS[k] == key) assignKey[k] = true;
      return;
    }
    for(k in _mods) _mods[k] = event[modifierMap[k]];

    // see if we need to ignore the keypress (filter() can can be overridden)
    // by default ignore key presses if a select, textarea, or input is focused
    if(!assignKey.filter.call(this, event)) return;

    // abort if no potentially matching shortcuts found
    if (!(key in _handlers)) return;

    scope = getScope();

    // for each potential shortcut
    _handlers[key].forEach(handler => {
      // see if it's in the current scope
      if(handler.scope == scope || handler.scope == 'all'){
        // check if modifiers match if any
        modifiersMatch = handler.mods.length > 0;
        for(k in _mods)
          if((!_mods[k] && handler.mods.includes(+k)) ||
            (_mods[k] && !handler.mods.includes(+k))) modifiersMatch = false;
        // call the handler and stop the event if neccessary
        if((handler.mods.length == 0 && !_mods[16] && !_mods[18] && !_mods[17] && !_mods[91]) || modifiersMatch){
          if(handler.method(event, handler)===false){
            event.preventDefault();
            event.stopPropagation();
          }
        }
      }
    });
  });

  // unset modifier keys on keyup
  document.addEventListener('keyup', event => {
    var key = event.keyCode, k,
        i = _downKeys.indexOf(key);

    // remove key from _downKeys
    if (i >= 0) {
        _downKeys.splice(i, 1);
    }

    if(key == 93 || key == 224) key = 91;
    if(key in _mods) {
      _mods[key] = false;
      for(k in _MODIFIERS) if(_MODIFIERS[k] == key) assignKey[k] = false;
    }
  });

  // reset modifiers to false whenever the window is (re)focused.
  window.addEventListener('focus', () => {
    for(let k in _mods) _mods[k] = false;
    for(let k in _MODIFIERS) assignKey[k] = false;
  });

  // set window.key and window.key.set/get, and the default filter
  global.key = assignKey;
  global.key.setScope = scope => { _scope = scope || 'all' };
  global.key.getScope = getScope;
  global.key.filter = event => {
    var tagName = event.target.tagName;
    // ignore keypressed in any elements that support keyboard data input
    return !(tagName == 'INPUT' || tagName == 'SELECT' || tagName == 'TEXTAREA');
  };

})(this);
