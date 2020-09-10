/* eslint max-len: 0 */

const doc = document,

allowedElements = 'A,B,BLOCKQUOTE,BR,DIV,FONT,H1,H2,H3,H4,H5,H6,HR,IMG,LABEL,LI,OL,P,SPAN,STRONG,TABLE,TD,TH,TR,U,UL',
allowedAttributes = 'abbr,align,background,bgcolor,border,cellpadding,cellspacing,class,color,colspan,dir,face,frame,height,href,hspace,id,lang,rowspan,rules,scope,size,src,style,target,type,usemap,valign,vspace,width'.split(','),

SquireDefaultConfig = {
/*
	blockTag: 'P',
	blockAttributes: null,
	tagAttributes: {
		blockquote: null,
		ul: null,
		ol: null,
		li: null,
		a: null
	},
	classNames: {
		colour: 'colour',
		fontFamily: 'font',
		fontSize: 'size',
		highlight: 'highlight'
	},
	leafNodeNames: leafNodeNames,
	undo: {
		documentSizeThreshold: -1, // -1 means no threshold
		undoLimit: -1 // -1 means no limit
	},
	isInsertedHTMLSanitized: true,
	isSetHTMLSanitized: true,
	willCutCopy: null,
	addLinks: true // allow_smart_html_links
*/
	sanitizeToDOMFragment: (html, isPaste/*, squire*/) => {
		const frag = doc.createDocumentFragment();
		frag.innerHTML = html;
		if (isPaste) {
			frag.querySelectorAll(':not('+allowedElements+')').forEach(el => el.remove());
			frag.querySelectorAll(allowedElements).forEach(el => {
				if (el.hasAttributes()) {
					Array.from(el.attributes).forEach(attr => {
						let name = attr.name.toLowerCase();
						if (!allowedAttributes.includes(name)) {
							el.removeAttribute(name);
						}
					});
				}
			});
		}
		return frag;
	}
};

class SquireUI
{
	constructor(container) {
		const
		ctrlKey = /Mac OS X/.test( navigator.userAgent ) ? 'meta + ' : 'Ctrl + ',
		actions = {
			group1: {
				source: {
					html: '〈〉',
					cmd: () => console.log('TODO: toggle HTML <> Text')
				}
			},
			font: {
				fontFamily: {
					select: {
						'sans-serif': {
							Arial: "'Nimbus Sans L', 'Liberation sans', 'Arial Unicode MS', Arial, Helvetica, Garuda, Utkal, FreeSans, sans-serif",
							Tahoma: "'Luxi Sans', Tahoma, Loma, Geneva, Meera, sans-serif",
							Trebuchet: "'DejaVu Sans Condensed', Trebuchet, 'Trebuchet MS', sans-serif",
							Lucida: "'Lucida Sans Unicode', 'Lucida Sans', 'DejaVu Sans', 'Bitstream Vera Sans', 'DejaVu LGC Sans', sans-serif",
							Verdana: "'DejaVu Sans', Verdana, Geneva, 'Bitstream Vera Sans', 'DejaVu LGC Sans', sans-serif"
						},
						monospace: {
							Courier: "'Liberation Mono', 'Courier New', FreeMono, Courier, monospace",
							Lucida: "'DejaVu Sans Mono', 'DejaVu LGC Sans Mono', 'Bitstream Vera Sans Mono', 'Lucida Console', Monaco, monospace"
						},
						sans: {
							Times: "'Nimbus Roman No9 L', 'Times New Roman', Times, FreeSerif, serif",
							Palatino: "'Bitstream Charter', 'Palatino Linotype', Palatino, Palladio, 'URW Palladio L', 'Book Antiqua', Times, serif",
							Georgia: "'URW Palladio L', Georgia, Times, serif"
						}
					},
					cmd: s => squire.setFontFace(s.value)
				},
				fontSize: {
					select: ['11px','13px','16px','20px','24px','30px'],
					cmd: s => squire.setFontSize(s.value)
				}
			},
			colors: {
				textColor: {
					input: 'color',
					cmd: s => squire.setTextColour(s.value),
					hint: 'text'
				},
				backgroundColor: {
					input: 'color',
					cmd: s => squire.setHighlightColour(s.value),
					hint: 'background'
				},
			},
/*
			bidi: {
				allowHtmlEditorBitiButtons
			},
*/
			inline: {
				bold: {
					html: '𝐁',
					cmd: () => this.doAction('bold','B'),
					key: 'B'
				},
				italic: {
					html: '𝐼',
					cmd: () => this.doAction('italic','I'),
					key: 'I'
				},
				underline: {
					html: '<u>U</u>',
					cmd: () => this.doAction('underline','U'),
					key: 'U'
				},
				strike: {
					html: '<s>S</s>',
					cmd: () => this.doAction('strikethrough','S'),
					key: 'Shift + 7'
				},
				sub: {
					html: 'S<sub>x</sub>',
					cmd: () => this.doAction('subscript','SUB'),
					key: 'Shift + 5'
				},
				sup: {
					html: 'S<sup>x</sup>',
					cmd: () => this.doAction('superscript','SUP'),
					key: 'Shift + 6'
				}
			},
			block: {
				ol: {
					html: '#',
					cmd: () => this.doList('OL'),
					key: 'Shift + 8'
				},
				ul: {
					html: '⋮',
					cmd: () => this.doList('UL'),
					key: 'Shift + 9'
				},
				quote: {
					html: '"',
					cmd: () => {
						let parent = this.getParentNodeName('UL,OL');
						(parent && 'BLOCKQUOTE' == parent) ? squire.decreaseQuoteLevel() : squire.increaseQuoteLevel();
					}
				},
				indentDecrease: {
					html: '⇤',
					cmd: () => squire.changeIndentationLevel('decrease'),
					key: ']'
				},
				indentIncrease: {
					html: '⇥',
					cmd: () => squire.changeIndentationLevel('increase'),
					key: '['
				}
			},
			targets: {
				link: {
					html: '🔗',
					cmd: () => {
						if ('A' === this.getParentNodeName()) {
							squire.removeLink();
						} else {
							let url = prompt("Link","https://");
							url != null && url.length && squire.makeLink(url);
						}
					}
				},
				image: {
					html: '🖼️',
					cmd: () => {
						if ('IMG' === this.getParentNodeName()) {
//							wysiwyg.removeLink();
						} else {
							let src = prompt("Image","https://");
							src != null && src.length && squire.insertImage(src);
						}
					}
				},
/*
				imageUpload: {
					// TODO
				}
*/
			},
/*
			table: {
				// TODO
			},
*/
			changes: {
				undo: {
					html: '↶',
					cmd: () => squire.undo(),
					key: 'Z'
				},
				redo: {
					html: '↷',
					cmd: () => squire.redo(),
					key: 'Y'
				}
			}
		},

		content = doc.createElement('div'),
		toolbar = doc.createElement('div'),
		squire = new Squire(content, SquireDefaultConfig);

		content.className = 'squire-content cke_wysiwyg_div cke_editable';

		this.squire = squire;
		this.content = content;

		toolbar.className = 'squire-toolbar cke_top';
		for (let group in actions) {
			let toolgroup = doc.createElement('div');
			toolgroup.className = 'squire-toolgroup cke_toolgroup';
			for (let action in actions[group]) {
				if ('source' == action && !rl.settings.app('allowHtmlEditorSourceButton')) {
					continue;
				}
				let cfg = actions[group][action], input;
				if (cfg.input) {
					input = doc.createElement('input');
					input.type = cfg.input;
					input.addEventListener('input', () => cfg.cmd(input));
				} else if (cfg.select) {
					input = doc.createElement('select');
					if (Array.isArray(cfg.select)) {
						cfg.select.forEach(value => {
							var option = new Option(value, value);
							option.style[action] = value;
							input.append(option);
						});
					} else {
						Object.entries(cfg.select).forEach(([label, options]) => {
							let group = doc.createElement('optgroup');
							group.label = label;
							Object.entries(options).forEach(([text, value]) => {
								var option = new Option(text, value);
								option.style[action] = value;
								group.append(option);
							});
							input.append(group);
						});
					}
					input.addEventListener('input', () => cfg.cmd(input));
				} else {
					input = doc.createElement('button');
					input.type = 'button';
					input.innerHTML = cfg.html;
					input.action_cmd = cfg.cmd;
				}
				if (cfg.hint) {
					input.title = cfg.key ? cfg.hint + ' (' + ctrlKey + cfg.key + ')' : cfg.hint;
				} else if (cfg.key) {
					input.title = ctrlKey + cfg.key;
				}
				input.dataset.action = action;
				cfg.input = input;
				toolgroup.append(input);
			}
			toolgroup.children.length && toolbar.append(toolgroup);
		}
		toolbar.addEventListener('click', e => {
			let t = e.target;
			t.action_cmd && t.action_cmd(t);
		});

		let changes = actions.changes
		changes.undo.input.disabled = changes.redo.input.disabled = true;
		squire.addEventListener('undoStateChange', state => {
			changes.undo.input.disabled = !state.canUndo;
			changes.redo.input.disabled = !state.canRedo;
		});

		container.append(toolbar, content);

/*
squire-raw.js:2161: this.fireEvent( 'dragover', {
squire-raw.js:2168: this.fireEvent( 'drop', {
squire-raw.js:2583: this.fireEvent( event.type, event );
squire-raw.js:2864: this.fireEvent( 'pathChange', { path: newPath } );
squire-raw.js:2867: this.fireEvent( range.collapsed ? 'cursor' : 'select', {
squire-raw.js:3004: this.fireEvent( 'input' );
squire-raw.js:3080: this.fireEvent( 'input' );
squire-raw.js:3101: this.fireEvent( 'input' );
squire-raw.js:4036: this.fireEvent( 'willPaste', event );
squire-raw.js:4089: this.fireEvent( 'willPaste', event );
*/

		// CKEditor gimmicks used by HtmlEditor
		this.mode = 'wysiwyg'; // 'plain'
		this.plugins = {
			plain: false
		};
		// .plugins.plain && this.editor.__plain
		this.focusManager = {
			hasFocus: () => squire._isFocused,
			blur: () => squire.blur()
		};
	}

	doAction(name, tag) {
		if (this.testPresenceinSelection(tag, new RegExp('>'+tag+'\\b'))) {
			name = 'remove' + (name.toUpperCase()[0]) + name.substr(1);
		}
		this.squire[name]();
	}

	getParentNodeName(selector) {
		let parent = this.squire.getSelectionClosest(selector);
		return parent ? parent.nodeName : null;
	}

	doList(type) {
		let parent = this.getParentNodeName('UL,OL'),
			fn = {UL:'makeUnorderedList',OL:'makeOrderedList'};
		(parent && parent == type) ? this.squire.removeList() : this.squire[fn[type]]();
	}

	testPresenceinSelection(format, validation) {
		return validation.test(this.squire.getPath()) | this.squire.hasFormat(format);
	}

	// CKeditor gimmicks used by HtmlEditor
	setMode(mode) {
		this.mode = mode; // 'wysiwyg' or 'plain'
	}

	on(type, fn) {
		this.squire.addEventListener(type, fn);
	}

	execCommand(cmd, cfg) {
		if ('insertSignature' == cmd) {
			if (cfg.clearCache) {
				// remove it;
			} else {
				cfg.isHtml; // bool
				cfg.insertBefore; // bool
				cfg.signature; // string
			}
		}
	}

	checkDirty() {
		return false;
	}

	resetDirty() {}

	getData() {
		return this.squire.getHTML();
	}

	setData(html) {
		this.squire.setHTML(html);
	}

	focus() {
		this.squire.focus();
	}

	resize(width, height) {
		this.content.style.height = Math.max(200, (height - this.content.offsetTop)) + 'px';
	}

	setReadOnly(bool) {
		this.content.contentEditable = !!bool;
	}
}

export { SquireUI, SquireUI as default };
