/* eslint max-len: 0 */

(() => {

'use strict';

const doc = document,

	removeElements = 'HEAD,LINK,META,NOSCRIPT,SCRIPT,TEMPLATE,TITLE',
	allowedElements = 'A,B,BLOCKQUOTE,BR,DIV,FONT,H1,H2,H3,H4,H5,H6,HR,IMG,LI,OL,P,SPAN,STRONG,TABLE,TD,TH,TR,U,UL',
	allowedAttributes = 'abbr,align,background,bgcolor,border,cellpadding,cellspacing,class,color,colspan,dir,face,frame,height,href,hspace,id,lang,rowspan,rules,scope,size,src,style,target,type,usemap,valign,vspace,width'.split(','),

	i18n = (str, def) => rl.i18n(str) || def,

	ctrlKey = /Mac OS X/.test( navigator.userAgent ) ? 'meta + ' : 'Ctrl + ',

	getFragmentOfChildren = parent => {
		let frag = doc.createDocumentFragment();
		frag.append(...parent.childNodes);
		return frag;
	},

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
			let tpl = doc.createElement('div');
			tpl.innerHTML = html
				.replace(/<\/?(BODY|HTML)[^>]*>/gi,'')
				.replace(/<!--[^>]+-->/g,'')
				.trim();
			if (isPaste) {
				tpl.querySelectorAll(removeElements).forEach(el => el.remove());
				tpl.querySelectorAll(':not('+allowedElements+',signature)').forEach(el => el.replaceWith(getFragmentOfChildren(el)));
				tpl.querySelectorAll('*').forEach(el => {
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
			return getFragmentOfChildren(tpl);
		}
	},

	rl_signature_replacer = (editor, text, signature, isHtml, insertBefore) => {
		let
			prevSignature = editor.__previous_signature,
			skipInsert = false,
			isEmptyText = false,
			newLine = (isHtml ? '<br />' : "\n"),
			clearHtmlLine = html => rl.Utils.htmlToPlain(html).trim();

		isEmptyText = !text.trim();
		if (!isEmptyText && isHtml) {
			isEmptyText = !clearHtmlLine(text);
		}

		if (prevSignature && !isEmptyText) {
			if (isHtml && !prevSignature.isHtml) {
				prevSignature = {
					body: rl.Utils.plainToHtml(prevSignature.body),
					isHtml: true
				};
			} else if (!isHtml && prevSignature.isHtml) {
				prevSignature = {
					body: rl.Utils.htmlToPlain(prevSignature.body),
					isHtml: true
				};
			}

			if (isHtml) {
				var clearSig = clearHtmlLine(prevSignature.body);
				text = text.replace(/<signature>([\s\S]*)<\/signature>/igm, all => {
					var c = clearSig === clearHtmlLine(all);
					if (!c) {
						skipInsert = true;
					}
					return c ? '' : all;
				});
			} else {
				var textLen = text.length;
				text = text
					.replace('' + prevSignature.body, '')
					.replace('' + prevSignature.body, '');
				skipInsert = textLen === text.length;
			}
		}

		if (!skipInsert) {
			signature = newLine + newLine + (isHtml ? '<signature>' : '') + signature + (isHtml ? '</signature>' : '');

			text = insertBefore ? signature + text : text + signature;

			if (10 < signature.length) {
				prevSignature = {
					body: signature,
					isHtml: isHtml
				};
			}
		}

		editor.__previous_signature = prevSignature;

		return text;
	};

class SquireUI
{
	constructor(container) {
		const
			actions = {
				mode: {
					plain: {
						html: '〈〉',
						cmd: () => this.setMode('plain' == this.mode ? 'wysiwyg' : 'plain'),
						hint: i18n('EDITOR/TEXT_SWITCHER_PLAINT_TEXT', 'Plain')
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
						hint: 'Text color'
					},
					backgroundColor: {
						input: 'color',
						cmd: s => squire.setHighlightColour(s.value),
						hint: 'Background color'
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
						key: 'B',
						hint: 'Bold'
					},
					italic: {
						html: '𝐼',
						cmd: () => this.doAction('italic','I'),
						key: 'I',
						hint: 'Italic'
					},
					underline: {
						html: '<u>U</u>',
						cmd: () => this.doAction('underline','U'),
						key: 'U',
						hint: 'Underline'
					},
					strike: {
						html: '<s>S</s>',
						cmd: () => this.doAction('strikethrough','S'),
						key: 'Shift + 7',
						hint: 'Strikethrough'
					},
					sub: {
						html: 'S<sub>x</sub>',
						cmd: () => this.doAction('subscript','SUB'),
						key: 'Shift + 5',
						hint: 'Subscript'
					},
					sup: {
						html: 'S<sup>x</sup>',
						cmd: () => this.doAction('superscript','SUP'),
						key: 'Shift + 6',
						hint: 'Superscript'
					}
				},
				block: {
					ol: {
						html: '#',
						cmd: () => this.doList('OL'),
						key: 'Shift + 8',
						hint: 'Ordered list'
					},
					ul: {
						html: '⋮',
						cmd: () => this.doList('UL'),
						key: 'Shift + 9',
						hint: 'Unordered list'
					},
					quote: {
						html: '"',
						cmd: () => {
							let parent = this.getParentNodeName('UL,OL');
							(parent && 'BLOCKQUOTE' == parent) ? squire.decreaseQuoteLevel() : squire.increaseQuoteLevel();
						},
						hint: 'Blockquote'
					},
					indentDecrease: {
						html: '⇤',
						cmd: () => squire.changeIndentationLevel('decrease'),
						key: ']',
						hint: 'Decrease indent'
					},
					indentIncrease: {
						html: '⇥',
						cmd: () => squire.changeIndentationLevel('increase'),
						key: '[',
						hint: 'Increase indent'
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
						},
						hint: 'Link'
					},
					image: {
						html: '🖼️',
						cmd: () => {
							if ('IMG' === this.getParentNodeName()) {
//								squire.removeLink();
							} else {
								let src = prompt("Image","https://");
								src != null && src.length && squire.insertImage(src);
							}
						},
						hint: 'Image'
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
						key: 'Z',
						hint: 'Undo'
					},
					redo: {
						html: '↷',
						cmd: () => squire.redo(),
						key: 'Y',
						hint: 'Redo'
					}
				}
			},

			plain = doc.createElement('textarea'),
			wysiwyg = doc.createElement('div'),
			toolbar = doc.createElement('div'),
			squire = new Squire(wysiwyg, SquireDefaultConfig);

		plain.className = 'squire-plain cke_plain cke_editable';
		wysiwyg.className = 'squire-wysiwyg cke_wysiwyg_div cke_editable';
		this.mode = ''; // 'plain' | 'wysiwyg'
		this.__plain = {
			getRawData: () => this.plain.value,
			setRawData: plain => this.plain.value = plain
		};

		this.container = container;
		this.squire = squire;
		this.plain = plain;
		this.wysiwyg = wysiwyg;

		toolbar.className = 'squire-toolbar cke_top';
		for (let group in actions) {
			let toolgroup = doc.createElement('div');
			toolgroup.className = 'squire-toolgroup cke_toolgroup';
			toolgroup.id = 'squire-toolgroup-'+group;
			for (let action in actions[group]) {
				if ('source' == action && !rl.settings.app('allowHtmlEditorSourceButton')) {
					continue;
				}
				let cfg = actions[group][action], input;
				if (cfg.input) {
					input = doc.createElement('input');
					input.type = cfg.input;
					input.addEventListener('change', () => cfg.cmd(input));
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

		let changes = actions.changes;
		changes.undo.input.disabled = changes.redo.input.disabled = true;
		squire.addEventListener('undoStateChange', state => {
			changes.undo.input.disabled = !state.canUndo;
			changes.redo.input.disabled = !state.canRedo;
		});

		container.append(toolbar, wysiwyg, plain);

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
		this.plugins = {
			plain: true
		};
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

	setMode(mode) {
		let cl = this.container.classList;
		cl.remove('squire-mode-'+this.mode);
		if ('plain' == mode) {
			let html = this.squire.getHTML();
			this.plain.value = rl.Utils.htmlToPlain(html, true).trim();
		} else {
			let plain = this.plain.value;
			this.squire.setHTML(rl.Utils.plainToHtml(plain, true));
			mode = 'wysiwyg';
		}
		this.mode = mode; // 'wysiwyg' or 'plain'
		cl.add('squire-mode-'+mode);
		this.onModeChange && this.onModeChange();
		setTimeout(()=>this.focus(),1);
	}

	// CKeditor gimmicks used by HtmlEditor
	on(type, fn) {
		if ('mode' == type) {
			this.onModeChange = fn;
		} else {
			this.squire.addEventListener(type, fn);
			this.plain.addEventListener(type, fn);
		}
	}

	execCommand(cmd, cfg) {
		if ('insertSignature' == cmd) {
			cfg = Object.assign({
				clearCache: false,
				isHtml: false,
				insertBefore: false,
				signature: ''
			}, cfg);

			if (cfg.clearCache) {
				this.__previous_signature = null;
			} else try {
				if ('plain' === this.mode) {
					if (cfg.isHtml) {
						cfg.signature = rl.Utils.htmlToPlain(cfg.signature);
					}
					this.plain.value = rl_signature_replacer(this, this.plain.value, cfg.signature, false, cfg.insertBefore);
				} else {
					if (!cfg.isHtml) {
						cfg.signature = rl.Utils.plainToHtml(cfg.signature);
					}
					this.squire.setHTML(rl_signature_replacer(this, this.squire.getHTML(), cfg.signature, true, cfg.insertBefore));
				}
			} catch (e) {
				console.error(e);
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
		('plain' == this.mode ? this.plain : this.squire).focus();
	}

	resize(width, height) {
		height = Math.max(200, (height - this.wysiwyg.offsetTop)) + 'px';
		this.wysiwyg.style.height = height;
		this.plain.style.height = height;
	}

	setReadOnly(bool) {
		this.plain.readOnly = !!bool;
		this.wysiwyg.contentEditable = !!bool;
	}
}

window.SquireUI = SquireUI;

})();
