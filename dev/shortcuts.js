"use strict";

(win => {

const
	doc = document,
	meta = /Mac OS X/.test(navigator.userAgent) ? 'meta' : 'ctrl',
	_scopes = {},
	toArray = v => Array.isArray(v) ? v : v.split(/\s*,\s*/),

	fire = (actions, event) => {
		let modifiers = [];
		event.altKey && modifiers.push('alt');
		event.ctrlKey && modifiers.push('ctrl');
		event.metaKey && modifiers.push('meta');
		event.shiftKey && modifiers.push('shift');
		modifiers = modifiers.join('+');
		if (actions[modifiers]) {
			// for each potential shortcut
			actions[modifiers].forEach(cmd => {
				try {
					// call the handler and stop the event if neccessary
					if (!event.defaultPrevented && cmd(event) === false) {
						event.preventDefault();
						event.stopPropagation();
					}
				} catch (e) {
					console.error(e);
				}
			});
		}
	},

	keydown = event => {
		const key = (event.key||event.code||'').toLowerCase();
		if (scope[key] && win.shortcuts.filter(event)) {
			fire(scope[key], event);
		}
		if (!event.defaultPrevented && _scope !== 'all' && _scopes.all[key] && win.shortcuts.filter(event)) {
			fire(_scopes.all[key], event);
		}
	};

let
	scope = {},
	_scope = 'all';

doc.addEventListener('keydown', keydown);

win.shortcuts = {
	on: () => doc.addEventListener('keydown', keydown),
	off: () => doc.removeEventListener('keydown', keydown),
	add: (keys, modifiers, scopes, method) => {
		if (method === undefined) {
			method = scopes;
			scopes = 'all';
		}
		toArray(scopes).forEach(scope => {
			if (!_scopes[scope]) {
				_scopes[scope] = {};
			}
			toArray(keys).forEach(key => {
				key = key.toLowerCase();
				if (!_scopes[scope][key]) {
					_scopes[scope][key] = {};
				}
				modifiers = toArray(modifiers)
					.map(key => 'meta' == key ? meta : key)
					.unique().sort().join('+');
				if (!_scopes[scope][key][modifiers]) {
					_scopes[scope][key][modifiers] = [];
				}
				_scopes[scope][key][modifiers].push(method);
			});
		});
	},
	setScope: value => {
		_scope = value || 'all';
		scope = _scopes[_scope] || {};
	},
	getScope: () => _scope,
	getMetaKey: () => meta,
	// ignore keydown in any element that supports keyboard input
	filter: event => !(event.target.matches
		&& (event.target.matches('input,select,textarea') || event.target.closest('[contenteditable]')))
};

win.shortcuts.on();

})(this);
