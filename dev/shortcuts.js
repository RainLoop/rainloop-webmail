"use strict";

(win => {

const
	doc = document,
	meta = /Mac OS X/.test(navigator.userAgent) ? 'meta' : 'ctrl',
	actions = {},
	toArray = v => Array.isArray(v) ? v : [v];
let
	_scope = 'all';

doc.addEventListener('keydown', event => {
	const key = (event.key||event.code||'').toLowerCase();
	if (actions[key] && win.shortcuts.filter(event)) {
		let modifiers = [];
		event.altKey && modifiers.push('alt');
		event.ctrlKey && modifiers.push('ctrl');
		event.metaKey && modifiers.push('meta');
		event.shiftKey && modifiers.push('shift');
		modifiers = modifiers.join('+');
		if (actions[key][modifiers]) {
			// for each potential shortcut
			actions[key][modifiers].forEach(cmd => {
				// see if it's in the current scope
				if (cmd.scope.includes(_scope) || cmd.scope == 'all') {
					try {
						// call the handler and stop the event if neccessary
						if (cmd.method(event) === false) {
							event.preventDefault();
							event.stopPropagation();
						}
					} catch (e) {
						console.error(e);
					}
				}
			});
		}
	}
});

win.shortcuts = {
	add: (keys, modifiers, scope, method) => {
		if (method === undefined) {
			method = scope;
			scope = 'all';
		}
		toArray(keys).forEach(key => {
			key = key.toLowerCase();
			if (!actions[key]) {
				actions[key] = {};
			}
			modifiers = toArray(modifiers)
				.map(key => 'meta' == key ? meta : key)
				.unique().sort().join('+');
			if (!actions[key][modifiers]) {
				actions[key][modifiers] = [];
			}
			actions[key][modifiers].push({scope:toArray(scope), method:method});
		});
	},
	setScope: scope => _scope = scope || 'all',
	getScope: () => _scope,
	getMetaKey: () => meta,
	// ignore keydown in any element that supports keyboard input
	filter: event => !(event.target.matches
		&& (event.target.matches('input,select,textarea') || event.target.closest('[contenteditable]')))
};

})(this);
