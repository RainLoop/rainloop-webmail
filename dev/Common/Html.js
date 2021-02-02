import { createCKEditor } from 'External/CKEditor.js';

const
	htmlre = /[&<>"']/g,
	htmlmap = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#x27;'
	};

/**
 * @param {string} text
 * @returns {string}
 */
export function encodeHtml(text) {
	return (text && text.toString ? text.toString() : ''+text).replace(htmlre, m => htmlmap[m]);
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

		this.resize = (() => {
			try {
				this.editor && this.__resizable && this.editor.resize(element.clientWidth, element.clientHeight);
			} catch (e) {} // eslint-disable-line no-empty
		}).throttle(100);

		this.init();
	}

	blurTrigger() {
		if (this.onBlur) {
			clearTimeout(this.blurTimer);
			this.blurTimer = setTimeout(() => this.onBlur && this.onBlur(), 200);
		}
	}

	/**
	 * @returns {boolean}
	 */
	isHtml() {
		return this.editor ? !this.isPlain() : false;
	}

	/**
	 * @returns {boolean}
	 */
	isPlain() {
		return this.editor ? 'plain' === this.editor.mode : false;
	}

	/**
	 * @returns {void}
	 */
	clearCachedSignature() {
		this.editor && this.editor.execCommand('insertSignature', {
			clearCache: true
		});
	}

	/**
	 * @param {string} signature
	 * @param {bool} html
	 * @param {bool} insertBefore
	 * @returns {void}
	 */
	setSignature(signature, html, insertBefore = false) {
		this.editor && this.editor.execCommand('insertSignature', {
			isHtml: html,
			insertBefore: insertBefore,
			signature: signature
		});
	}

	/**
	 * @param {boolean=} wrapIsHtml = false
	 * @returns {string}
	 */
	getData(wrapIsHtml = false) {
		let result = '';
		if (this.editor) {
			try {
				if (this.isPlain() && this.editor.plugins.plain && this.editor.__plain) {
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

	modeWysiwyg() {
		try {
			this.editor && this.editor.setMode('wysiwyg');
		} catch (e) { console.error(e); }
	}
	modePlain() {
		try {
			this.editor && this.editor.setMode('plain');
		} catch (e) { console.error(e); }
	}

	setHtmlOrPlain(text) {
		if (':HTML:' === text.substr(0, 6)) {
			this.setHtml(text.substr(6));
		} else {
			this.setPlain(text);
		}
	}

	setData(mode, data) {
		if (this.editor && this.__inited) {
			this.clearCachedSignature();
			try {
				this.editor.setMode(mode);
				if (this.isPlain() && this.editor.plugins.plain && this.editor.__plain) {
					this.editor.__plain.setRawData(data);
				} else {
					this.editor.setData(data);
				}
			} catch (e) { console.error(e); }
		}
	}

	setHtml(html) {
		this.setData('wysiwyg', html/*.replace(/<p[^>]*><\/p>/gi, '')*/);
	}

	setPlain(txt) {
		this.setData('plain', txt);
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
			};

			if (window.CKEDITOR) {
				this.editor = createCKEditor(this.element);
				this.editor.on('instanceReady', onReady);
			} else {
				this.editor = new SquireUI(this.element, this.editor);
				setTimeout(onReady,1);
			}

			if (this.editor) {
				this.editor.on('blur', () => this.blurTrigger());
				this.editor.on('focus', () => this.blurTimer && clearTimeout(this.blurTimer));
				this.editor.on('mode', () => {
					this.blurTrigger();
					this.onModeChange && this.onModeChange(!this.isPlain());
				});
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

	clear() {
		this.setHtml('');
	}
}

export { HtmlEditor, HtmlEditor as default };
