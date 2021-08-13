
(win => {

let
	scope = {},
	_scope = 'all';

const
	doc = document,
	// On Mac we use ⌘ else the Ctrl key
	meta = /Mac OS X/.test(navigator.userAgent) ? 'meta' : 'ctrl',
	_scopes = {
		all: {}
	},
	toArray = v => Array.isArray(v) ? v : v.split(/\s*,\s*/),

	// ignore keydown in any element that supports keyboard input
	filter = node => !(!node.closest || node.closest('input,select,textarea,[contenteditable]')),

	shortcuts = {
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
		getMetaKey: () => 'meta' === meta ? '⌘' : 'Ctrl'
	},

	keydown = event => {
		let key = (event.key || '').toLowerCase().replace(' ','space'),
			scopes = [];
		scope[key] && scopes.push(scope[key]);
		_scope !== 'all' && _scopes.all[key] && scopes.push(_scopes.all[key]);
		if (scopes.length && filter(event.target)) {
			let modifiers = ['alt','ctrl','meta','shift'].filter(v => event[v+'Key']).join('+');
			scopes.forEach(actions => {
				// for each potential shortcut
				actions[modifiers] && actions[modifiers].forEach(cmd => {
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
			});
		}
	};

win.shortcuts = shortcuts;

shortcuts.on();

})(this);
