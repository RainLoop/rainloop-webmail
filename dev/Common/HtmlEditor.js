import { EventKeyCode } from 'Common/Enums';
import { SquireUI } from 'External/SquireUI';

/**
 * @type {Object}
 */
const CKEditorDefaultConfig = {
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
			const onReady = () => {
				if (this.editor.removeMenuItem) {
					this.editor.removeMenuItem('cut');
					this.editor.removeMenuItem('copy');
					this.editor.removeMenuItem('paste');
				}

				this.__resizable = true;
				this.__inited = true;

				this.resize();

				this.onReady && this.onReady();
			},
			initFunc = () => {
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

					this.editor.on('instanceReady', onReady);
				}
				else if (window.Squire) {
					this.editor = new SquireUI(this.element, this.editor);
/*
					// TODO
					this.editor.on('key', event => !(event && event.data && EventKeyCode.Tab === event.data.keyCode));
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
					setTimeout(onReady,1);
				}

				if (this.editor) {
					this.editor.on('blur', () => this.blurTrigger());
					this.editor.on('focus', () => this.focusTrigger());
					this.editor.on('mode', () => {
						this.blurTrigger();
						this.onModeChange && this.onModeChange('plain' !== this.editor.mode);
					});
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
