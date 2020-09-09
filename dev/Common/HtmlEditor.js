import { EventKeyCode } from 'Common/Enums';

/**
 * @type {Object}
 */
const doc = document,

CKEditorDefaultConfig = {
	'title': false,
	'stylesSet': false,
	'customConfig': '',
	'contentsCss': '',
	'toolbarGroups': [
		{ name: 'spec' },
		{ name: 'styles' },
		{ name: 'basicstyles', groups: ['basicstyles', 'cleanup', 'bidi'] },
		{ name: 'colors' },
		{ name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align'] },
		{ name: 'links' },
		{ name: 'insert' },
		{ name: 'document', groups: ['mode', 'document', 'doctools'] },
		{ name: 'others' }
	],

	'removePlugins': 'liststyle',
	'removeButtons': 'Format,Undo,Redo,Cut,Copy,Paste,Anchor,Strike,Subscript,Superscript,Image,SelectAll,Source',
	'removeDialogTabs': 'link:advanced;link:target;image:advanced;images:advanced',

	'extraPlugins': 'plain,signature',

	'allowedContent': true,
	'extraAllowedContent': true,

	'fillEmptyBlocks': false,
	'ignoreEmptyParagraph': true,
	'disableNativeSpellChecker': false,

	'colorButton_enableAutomatic': false,
	'colorButton_enableMore': true,

	'font_defaultLabel': 'Arial',
	'fontSize_defaultLabel': '13',
	'fontSize_sizes': '10/10px;12/12px;13/13px;14/14px;16/16px;18/18px;20/20px;24/24px;28/28px;36/36px;48/48px'
},

SquireDefaultConfig = {
/*
	blockTag: 'DIV',
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
},

/**
 * @type {Object}
 */
htmlEditorLangsMap = {
	'ar_sa': 'ar-sa',
	'bg_bg': 'bg',
	'cs_CZ': 'cs',
	'de_de': 'de',
	'el_gr': 'el',
	'es_es': 'es',
	'et_ee': 'et',
	'fr_fr': 'fr',
	'hu_hu': 'hu',
	'is_is': 'is',
	'it_it': 'it',
	'ja_jp': 'ja',
	'ko_kr': 'ko',
	'lt_lt': 'lt',
	'lv_lv': 'lv',
	'fa_ir': 'fa',
	'nb_no': 'nb',
	'nl_nl': 'nl',
	'pl_pl': 'pl',
	'pt_br': 'pt-br',
	'pt_pt': 'pt',
	'ro_ro': 'ro',
	'ru_ru': 'ru',
	'sk_sk': 'sk',
	'sl_si': 'sl',
	'sv_se': 'sv',
	'tr_tr': 'tr',
	'uk_ua': 'uk',
	'zh_cn': 'zh-cn',
	'zh_tw': 'zh'
};

class SquireUI
{
	constructor(container) {
		const actions = {
			source: {
				html: '〈〉',
				cmd: () => this.doAction('bold','B')
			},
/*
			bidi: {
				allowHtmlEditorBitiButtons
			},
*/
			bold: {
				html: '𝐁',
				cmd: () => this.doAction('bold','B')
			},
			italic: {
				html: '𝐼',
				cmd: () => this.doAction('italic','I')
			},
			underline: {
				html: 'U',
				cmd: () => this.doAction('underline','U'),
				style: 'text-decoration:underline;'
			},
			strike: {
				html: 'S',
				cmd: () => this.doAction('strikethrough','S'),
				style: 'text-decoration:line-through;'
			},
			sub: {
				html: 'S<sub>x</sub>',
				cmd: () => this.doAction('subscript','SUB')
			},
			sup: {
				html: 'S<sup>x</sup>',
				cmd: () => this.doAction('superscript','SUP')
			},
			ol: {
				html: '#',
				cmd: () => this.doList('OL')
			},
			ul: {
				html: '⋮',
				cmd: () => this.doList('UL')
			},
			quote: {
				html: '"',
				cmd: () => {
					let parent = this.getParentNodeName('UL,OL');
					(parent && 'BLOCKQUOTE' == parent) ? this.squire.decreaseQuoteLevel() : this.squire.increaseQuoteLevel();
				}
			},
			indentDecrease: {
				html: '⇤',
				cmd: () => this.squire.changeIndentationLevel('decrease')
			},
			indentIncrease: {
				html: '⇥',
				cmd: () => this.squire.changeIndentationLevel('increase')
			},
			link: {
				html: '🔗',
				cmd: () => {
					if ('A' === this.getParentNodeName()) {
						this.squire.removeLink();
					} else {
						let url = prompt("Link","https://");
						url != null && url.length && this.squire.makeLink(url);
					}
				}
			},
			image: {
				html: '📷🖼️',
				cmd: () => {
					if ('IMG' === this.getParentNodeName()) {
//						wysiwyg.removeLink();
					} else {
						let src = prompt("Image","https://");
						src != null && src.length && this.squire.insertImage(src);
					}
				}
			},
			undo: {
				html: '↶',
				cmd: () => this.squire.undo()
			},
			redo: {
				html: '↷',
				cmd: () => this.squire.redo()
			},
		},

		content = doc.createElement('div'),
		toolbar = doc.createElement('div'),
		squire = new Squire(content, SquireDefaultConfig);

		content.id = 'squire-content';
		content.style.minHeight = '200px';

		this.squire = squire;
		this.content = content;

		toolbar.id = 'squire-toolbar';
		for (let action in actions) {
			if ('source' == action && !rl.settings.app('allowHtmlEditorSourceButton')) {
				continue;
			}
			let cfg = actions[action],
				btn = cfg.btn = doc.createElement('button');
			btn.type = 'button';
			btn.dataset.action = action;
			btn.action_cmd = cfg.cmd;
			btn.innerHTML = cfg.html;
			btn.style.padding = 0;
			cfg.style && btn.setAttribute('style', cfg.style);
			toolbar.append(btn);
		}
		toolbar.addEventListener('click', e => {
			e.target.action_cmd && e.target.action_cmd();
		});

		actions.undo.btn.disabled = actions.redo.btn.disabled = true;
		squire.addEventListener('undoStateChange', state => {
			actions.undo.btn.disabled = !state.canUndo;
			actions.redo.btn.disabled = !state.canRedo;
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

		// CKEditor gimmicks
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

	// CKeditor gimmicks
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

class HtmlEditor {
	editor;
	blurTimer = 0;

	__resizable = false;
	__inited = false;

	onBlur = null;
	onReady = null;
	onModeChange = null;

	element;

	resize;

	/**
	 * @param {Object} element
	 * @param {Function=} onBlur
	 * @param {Function=} onReady
	 * @param {Function=} onModeChange
	 */
	constructor(element, onBlur = null, onReady = null, onModeChange = null) {
		this.onBlur = onBlur;
		this.onReady = onReady;
		this.onModeChange = onModeChange;

		this.element = element;

		this.resize = this.resizeEditor.throttle(100);

		this.init();
	}

	runOnBlur() {
		this.onBlur && this.onBlur();
	}

	blurTrigger() {
		if (this.onBlur) {
			clearTimeout(this.blurTimer);
			this.blurTimer = setTimeout(() => this.runOnBlur(), 200);
		}
	}

	focusTrigger() {
		this.onBlur && clearTimeout(this.blurTimer);
	}

	/**
	 * @returns {boolean}
	 */
	isHtml() {
		return this.editor ? 'wysiwyg' === this.editor.mode : false;
	}

	/**
	 * @returns {void}
	 */
	clearCachedSignature() {
		if (this.editor) {
			this.editor.execCommand('insertSignature', {
				clearCache: true
			});
		}
	}

	/**
	 * @param {string} signature
	 * @param {bool} html
	 * @param {bool} insertBefore
	 * @returns {void}
	 */
	setSignature(signature, html, insertBefore = false) {
		if (this.editor) {
			this.editor.execCommand('insertSignature', {
				isHtml: html,
				insertBefore: insertBefore,
				signature: signature
			});
		}
	}

	/**
	 * @returns {boolean}
	 */
	checkDirty() {
		return this.editor ? this.editor.checkDirty() : false;
	}

	resetDirty() {
		this.editor && this.editor.resetDirty();
	}

	/**
	 * @param {boolean=} wrapIsHtml = false
	 * @returns {string}
	 */
	getData(wrapIsHtml = false) {
		let result = '';
		if (this.editor) {
			try {
				if ('plain' === this.editor.mode && this.editor.plugins.plain && this.editor.__plain) {
					result = this.editor.__plain.getRawData();
				} else {
					result = wrapIsHtml
						? '<div data-html-editor-font-wrapper="true" style="font-family: arial, sans-serif; font-size: 13px;">' +
						  this.editor.getData() +
						  '</div>'
						: this.editor.getData();
				}
			} catch (e) {} // eslint-disable-line no-empty
		}

		return result;
	}

	/**
	 * @param {boolean=} wrapIsHtml = false
	 * @returns {string}
	 */
	getDataWithHtmlMark(wrapIsHtml = false) {
		return (this.isHtml() ? ':HTML:' : '') + this.getData(wrapIsHtml);
	}

	modeToggle(plain) {
		if (this.editor) {
			try {
				if (plain) {
					if ('plain' === this.editor.mode) {
						this.editor.setMode('wysiwyg');
					}
				} else if ('wysiwyg' === this.editor.mode) {
					this.editor.setMode('plain');
				}
			} catch (e) {} // eslint-disable-line no-empty
		}
	}

	setHtmlOrPlain(text, focus) {
		if (':HTML:' === text.substr(0, 6)) {
			this.setHtml(text.substr(6), focus);
		} else {
			this.setPlain(text, focus);
		}
	}

	setHtml(html, focus) {
		if (this.editor && this.__inited) {
			this.clearCachedSignature();

			this.modeToggle(true);

			html = html.replace(/<p[^>]*><\/p>/gi, '');

			try {
				this.editor.setData(html);
			} catch (e) {} // eslint-disable-line no-empty

			focus && this.focus();
		}
	}

	replaceHtml(find, replaceHtml) {
		if (this.editor && this.__inited && 'wysiwyg' === this.editor.mode) {
			try {
				this.editor.setData(this.editor.getData().replace(find, replaceHtml));
			} catch (e) {} // eslint-disable-line no-empty
		}
	}

	setPlain(plain, focus) {
		if (this.editor && this.__inited) {
			this.clearCachedSignature();

			this.modeToggle(false);
			if ('plain' === this.editor.mode && this.editor.plugins.plain && this.editor.__plain) {
				this.editor.__plain.setRawData(plain);
			} else {
				try {
					this.editor.setData(plain);
				} catch (e) {} // eslint-disable-line no-empty
			}

			focus && this.focus();
		}
	}

	init() {
		if (this.element && !this.editor) {
			const initFunc = () => {
				if (window.CKEDITOR) {
					const config = CKEditorDefaultConfig,
						language = rl.settings.get('Language'),
						allowSource = !!rl.settings.app('allowHtmlEditorSourceButton'),
						biti = !!rl.settings.app('allowHtmlEditorBitiButtons');

					if ((allowSource || !biti) && !config.toolbarGroups.__cfgInited) {
						config.toolbarGroups.__cfgInited = true;

						if (allowSource) {
							config.removeButtons = config.removeButtons.replace(',Source', '');
						}

						if (!biti) {
							config.removePlugins += (config.removePlugins ? ',' : '') + 'bidi';
						}
					}

					config.enterMode = CKEDITOR.ENTER_BR;
					config.shiftEnterMode = CKEDITOR.ENTER_P;

					config.language = htmlEditorLangsMap[(language || 'en').toLowerCase()] || 'en';
					if (CKEDITOR.env) {
						CKEDITOR.env.isCompatible = true;
					}

					this.editor = CKEDITOR.appendTo(this.element, config);

					this.editor.on('key', event => !(event && event.data && EventKeyCode.Tab === event.data.keyCode));

					this.editor.on('blur', () => this.blurTrigger());

					this.editor.on('mode', () => {
						this.blurTrigger();
						this.onModeChange && this.onModeChange('plain' !== this.editor.mode);
					});

					this.editor.on('focus', () => this.focusTrigger());

					if (window.FileReader) {
						this.editor.on('drop', (event) => {
							if (0 < event.data.dataTransfer.getFilesCount()) {
								const file = event.data.dataTransfer.getFile(0);
								if (file && event.data.dataTransfer.id && file.type && file.type.match(/^image/i)) {
									const id = event.data.dataTransfer.id,
										imageId = `[img=${id}]`,
										reader = new FileReader();

									reader.onloadend = () => {
										if (reader.result) {
											this.replaceHtml(imageId, `<img src="${reader.result}" />`);
										}
									};

									reader.readAsDataURL(file);

									event.data.dataTransfer.setData('text/html', imageId);
								}
							}
						});
					}

					this.editor.on('instanceReady', () => {
						if (this.editor.removeMenuItem) {
							this.editor.removeMenuItem('cut');
							this.editor.removeMenuItem('copy');
							this.editor.removeMenuItem('paste');
						}

						this.__resizable = true;
						this.__inited = true;

						this.resize();

						this.onReady && this.onReady();
					});
				}
				else if (window.Squire) {
					this.editor = new SquireUI(this.element, this.editor);
					this.editor.on('blur', () => this.blurTrigger());
					this.editor.on('focus', () => this.focusTrigger());
/*
					// TODO
					this.editor.on('key', event => !(event && event.data && EventKeyCode.Tab === event.data.keyCode));
					this.editor.on('mode', () => {
						this.blurTrigger();
						this.onModeChange && this.onModeChange('plain' !== this.editor.mode);
					});
					if (window.FileReader) {
						this.editor.on('dragover', (event) => {
							event.dataTransfer = clipboardData
						});
						this.editor.on('drop', (event) => {
							event.dataTransfer = clipboardData
							if (0 < event.data.dataTransfer.getFilesCount()) {
								const file = event.data.dataTransfer.getFile(0);
								if (file && event.data.dataTransfer.id && file.type && file.type.match(/^image/i)) {
									const id = event.data.dataTransfer.id,
										imageId = `[img=${id}]`,
										reader = new FileReader();

									reader.onloadend = () => {
										if (reader.result) {
											this.replaceHtml(imageId, `<img src="${reader.result}" />`);
										}
									};

									reader.readAsDataURL(file);

									event.data.dataTransfer.setData('text/html', imageId);
								}
							}
						});
					}
*/
					this.__resizable = true;
					this.__inited = true;

					this.resize();

					this.onReady && setTimeout(() => this.onReady(), 1);
				}
			};

			if (window.CKEDITOR || window.Squire) {
				initFunc();
			} else {
				window.__initEditor = initFunc;
			}
		}
	}

	focus() {
		try {
			this.editor && this.editor.focus();
		} catch (e) {} // eslint-disable-line no-empty
	}

	hasFocus() {
		try {
			return this.editor && !!this.editor.focusManager.hasFocus;
		} catch (e) {
			return false;
		}
	}

	blur() {
		try {
			this.editor && this.editor.focusManager.blur(true);
		} catch (e) {} // eslint-disable-line no-empty
	}

	resizeEditor() {
		try {
			this.editor && this.__resizable && this.editor.resize(this.element.clientWidth, this.element.clientHeight);
		} catch (e) {} // eslint-disable-line no-empty
	}

	setReadOnly(value) {
		try {
			this.editor && this.editor.setReadOnly(!!value);
		} catch (e) {} // eslint-disable-line no-empty
	}

	clear(focus) {
		this.setHtml('', focus);
	}
}

export { HtmlEditor, HtmlEditor as default };
