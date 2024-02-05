import { SettingsUserStore } from 'Stores/User/Settings';

export const
	WYSIWYGS = ko.observableArray();

WYSIWYGS.push({
	name: 'Squire',
	construct: (owner, container, onReady) => onReady(new SquireUI(container))
});

rl.registerWYSIWYG = (name, construct) => WYSIWYGS.push({name, construct});

export class HtmlEditor {
	/**
	 * @param {Object} element
	 * @param {Function=} onBlur
	 * @param {Function=} onReady
	 * @param {Function=} onModeChange
	 */
	constructor(element, onReady = null, onModeChange = null, onBlur = null) {
		this.blurTimer = 0;

		this.onBlur = onBlur;
		this.onModeChange = onModeChange;

		if (element) {
			onReady = onReady ? [onReady] : [];
			this.onReady = fn => onReady.push(fn);
			// TODO: make 'which' user configurable
			const which = SettingsUserStore.editorWysiwyg(),
				wysiwyg = WYSIWYGS.find(item => which == item.name) || WYSIWYGS.find(item => 'Squire' == item.name);
//			const wysiwyg = WYSIWYGS.find(item => 'Squire' == item.name);
			wysiwyg.construct(this, element, editor => setTimeout(()=>{
				this.editor = editor;
				editor.on('blur', () => this.blurTrigger());
				editor.on('focus', () => clearTimeout(this.blurTimer));
				editor.on('mode', () => {
					this.blurTrigger();
					this.onModeChange?.(!this.isPlain());
				});
				this.onReady = fn => fn();
				onReady.forEach(fn => fn());
			},1));
		}
	}

	blurTrigger() {
		if (this.onBlur) {
			clearTimeout(this.blurTimer);
			this.blurTimer = setTimeout(() => this.onBlur?.(), 200);
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
		this.onReady(() => this.editor.execCommand('insertSignature', {
			clearCache: true
		}));
	}

	/**
	 * @param {string} signature
	 * @param {bool} html
	 * @param {bool} insertBefore
	 * @returns {void}
	 */
	setSignature(signature, html, insertBefore = false) {
		this.onReady(() => this.editor.execCommand('insertSignature', {
			isHtml: html,
			insertBefore: insertBefore,
			signature: signature
		}));
	}

	/**
	 * @param {boolean=} wrapIsHtml = false
	 * @returns {string}
	 */
	getData() {
		let result = '';
		if (this.editor) {
			try {
				if (this.isPlain()) {
					result = this.editor.getPlainData();
				} else {
					result = this.editor.getData();
				}
			} catch (e) {} // eslint-disable-line no-empty
		}
		return result;
	}

	/**
	 * @returns {string}
	 */
	getDataWithHtmlMark() {
		return (this.isHtml() ? ':HTML:' : '') + this.getData();
	}

	modeWysiwyg() {
		this.onReady(() => this.editor.setMode('wysiwyg'));
	}
	modePlain() {
		this.onReady(() => this.editor.setMode('plain'));
	}

	setHtmlOrPlain(text) {
		text.startsWith(':HTML:')
			? this.setHtml(text.slice(6))
			: this.setPlain(text);
	}

	setData(mode, data) {
		this.onReady(() => {
			const editor = this.editor;
			this.clearCachedSignature();
			try {
				editor.setMode(mode);
				if (this.isPlain()) {
					editor.setPlainData(data);
				} else {
					editor.setData(data);
				}
			} catch (e) { console.error(e); }
		});
	}

	setHtml(html) {
		this.setData('wysiwyg', html/*.replace(/<p[^>]*><\/p>/gi, '')*/);
	}

	setPlain(txt) {
		this.setData('plain', txt);
	}

	focus() {
		this.onReady(() => this.editor.focus());
	}

	blur() {
		this.onReady(() => this.editor.blur());
	}

	clear() {
		this.onReady(() => this.isPlain() ? this.setPlain('') : this.setHtml(''));
	}
}
