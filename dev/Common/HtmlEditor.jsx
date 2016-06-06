
import {window, _, $} from 'common';
import {oHtmlEditorDefaultConfig, oHtmlEditorLangsMap} from 'Common/Globals';
import Settings from 'Storage/Settings';

class HtmlEditor
{
	editor = null;
	$element = null;

	blurTimer = 0;

	onBlur = null;
	onReady = null;
	onModeChange = null;

	__inited = null;

	/**
	 * @param {Object} element
	 * @param {Function=} onBlur
	 * @param {Function=} onReady
	 * @param {Function=} onModeChange
	 */
	constructor(element, onBlur = null, onReady = null, onModeChange = null)
	{
		this.onBlur = onBlur;
		this.onReady = onReady;
		this.onModeChange = onModeChange;

		this.$element = $(element);

		this.resize = _.throttle(_.bind(this.resize, this), 100);

		this.__inited = false;

		this.init();
	}

	blurTrigger() {
		if (this.onBlur)
		{
			window.clearTimeout(this.blurTimer);
			this.blurTimer = window.setTimeout(() => {
				this.onBlur();
			}, 200);
		}
	}

	focusTrigger() {
		if (this.onBlur)
		{
			window.clearTimeout(this.blurTimer);
		}
	}

	/**
	 * @return {boolean}
	 */
	isHtml() {
		return this.editor ? 'wysiwyg' === this.editor.mode : false;
	}

	/**
	 * @param {string} signature
	 * @param {bool} html
	 * @param {bool} insertBefore
	 */
	setSignature(signature, html, insertBefore) {
		if (this.editor)
		{
			this.editor.execCommand('insertSignature', {
				isHtml: html,
				insertBefore: insertBefore,
				signature: signature
			});
		}
	}

	/**
	 * @return {boolean}
	 */
	checkDirty() {
		return this.editor ? this.editor.checkDirty() : false;
	}

	resetDirty() {
		if (this.editor)
		{
			this.editor.resetDirty();
		}
	}

	/**
	 * @param {string} text
	 * @return {string}
	 */
	clearSignatureSigns(text) {
		return text.replace(/(\u200C|\u0002)/g, '');
	}

	/**
	 * @param {boolean=} wrapIsHtml = false
	 * @param {boolean=} clearSignatureSigns = false
	 * @return {string}
	 */
	getData(wrapIsHtml = false, clearSignatureSigns = false) {

		let result = '';
		if (this.editor)
		{
			try
			{
				if ('plain' === this.editor.mode && this.editor.plugins.plain && this.editor.__plain)
				{
					result = this.editor.__plain.getRawData();
				}
				else
				{
					result = wrapIsHtml ?
						'<div data-html-editor-font-wrapper="true" style="font-family: arial, sans-serif; font-size: 13px;">' +
							this.editor.getData() + '</div>' : this.editor.getData();
				}
			} catch (e) {/* eslint-disable-line no-empty */}

			if (clearSignatureSigns)
			{
				result = this.clearSignatureSigns(result);
			}
		}

		return result;
	}

	/**
	 * @param {boolean=} wrapIsHtml = false
	 * @param {boolean=} clearSignatureSigns = false
	 * @return {string}
	 */
	getDataWithHtmlMark(wrapIsHtml = false, clearSignatureSigns = false) {
		return (this.isHtml() ? ':HTML:' : '') + this.getData(wrapIsHtml, clearSignatureSigns);
	}

	modeToggle(plain, resize) {
		if (this.editor)
		{
			try {
				if (plain)
				{
					if ('plain' === this.editor.mode)
					{
						this.editor.setMode('wysiwyg');
					}
				}
				else
				{
					if ('wysiwyg' === this.editor.mode)
					{
						this.editor.setMode('plain');
					}
				}
			} catch (e) {/* eslint-disable-line no-empty */}

			if (resize)
			{
				this.resize();
			}
		}
	}

	setHtmlOrPlain(text, focus) {
		if (':HTML:' === text.substr(0, 6))
		{
			this.setHtml(text.substr(6), focus);
		}
		else
		{
			this.setPlain(text, focus);
		}
	}

	setHtml(html, focus) {
		if (this.editor && this.__inited)
		{
			this.modeToggle(true);

			html = html.replace(/<p[^>]*><\/p>/ig, '');

			try {
				this.editor.setData(html);
			} catch (e) {/* eslint-disable-line no-empty */}

			if (focus)
			{
				this.focus();
			}
		}
	}

	replaceHtml(find, replaceHtml) {
		if (this.editor && this.__inited && 'wysiwyg' === this.editor.mode)
		{
			try {
				this.editor.setData(
					this.editor.getData().replace(find, replaceHtml));
			} catch (e) {/* eslint-disable-line no-empty */}
		}
	}

	setPlain(plain, focus) {
		if (this.editor && this.__inited)
		{
			this.modeToggle(false);
			if ('plain' === this.editor.mode && this.editor.plugins.plain && this.editor.__plain)
			{
				this.editor.__plain.setRawData(plain);
			}
			else
			{
				try {
					this.editor.setData(plain);
				} catch (e) {/* eslint-disable-line no-empty */}
			}

			if (focus)
			{
				this.focus();
			}
		}
	}

	init() {
		if (this.$element && this.$element[0] && !this.editor)
		{
			const
				initFunc = () => {

					const
						config = oHtmlEditorDefaultConfig,
						language = Settings.settingsGet('Language'),
						allowSource = !!Settings.appSettingsGet('allowHtmlEditorSourceButton'),
						biti = !!Settings.appSettingsGet('allowHtmlEditorBitiButtons')
					;

					if ((allowSource || !biti) && !config.toolbarGroups.__cfgInited)
					{
						config.toolbarGroups.__cfgInited = true;

						if (allowSource)
						{
							config.removeButtons = config.removeButtons.replace(',Source', '');
						}

						if (!biti)
						{
							config.removePlugins += (config.removePlugins ? ',' : '') + 'bidi';
						}
					}

					config.enterMode = window.CKEDITOR.ENTER_BR;
					config.shiftEnterMode = window.CKEDITOR.ENTER_P;

					config.language = oHtmlEditorLangsMap[language] || 'en';
					if (window.CKEDITOR.env)
					{
						window.CKEDITOR.env.isCompatible = true;
					}

					this.editor = window.CKEDITOR.appendTo(this.$element[0], config);

					this.editor.on('key', (event) => {
						if (event && event.data && 9 /* Tab */ === event.data.keyCode)
						{
							return false;
						}
					});

					this.editor.on('blur', () => {
						this.blurTrigger();
					});

					this.editor.on('mode', () => {
						this.blurTrigger();
						if (this.onModeChange)
						{
							this.onModeChange('plain' !== this.editor.mode);
						}
					});

					this.editor.on('focus', () => {
						this.focusTrigger();
					});

					if (window.FileReader)
					{
						this.editor.on('drop', (event) => {
							if (0 < event.data.dataTransfer.getFilesCount())
							{
								const file = event.data.dataTransfer.getFile(0);
								if (file && window.FileReader && event.data.dataTransfer.id &&
									file.type && file.type.match(/^image/i))
								{
									var
										id = event.data.dataTransfer.id,
										imageId = `[img=${id}]`,
										reader = new window.FileReader()
									;

									reader.onloadend = () => {
										if (reader.result)
										{
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

						if (this.editor.removeMenuItem)
						{
							this.editor.removeMenuItem('cut');
							this.editor.removeMenuItem('copy');
							this.editor.removeMenuItem('paste');
						}

						this.__resizable = true;
						this.__inited = true;

						this.resize();

						if (this.onReady)
						{
							this.onReady();
						}

					});
				}
			;

			if (window.CKEDITOR)
			{
				initFunc();
			}
			else
			{
				window.__initEditor = initFunc;
			}
		}
	}

	focus() {
		if (this.editor)
		{
			try {
				this.editor.focus();
			} catch (e) {/* eslint-disable-line no-empty */}
		}
	}

	hasFocus() {
		if (this.editor)
		{
			try {
				return !!this.editor.focusManager.hasFocus;
			} catch (e) {/* eslint-disable-line no-empty */}
		}

		return false;
	}

	blur() {
		if (this.editor)
		{
			try {
				this.editor.focusManager.blur(true);
			} catch (e) {/* eslint-disable-line no-empty */}
		}
	}

	resize() {
		if (this.editor && this.__resizable)
		{
			try {
				this.editor.resize(this.$element.width(), this.$element.innerHeight());
			} catch (e) {/* eslint-disable-line no-empty */}
		}
	}

	setReadOnly(value) {
		if (this.editor)
		{
			try {
				this.editor.setReadOnly(!!value);
			} catch (e) {/* eslint-disable-line no-empty */}
		}
	}

	clear(focus) {
		this.setHtml('', focus);
	}
}

export {HtmlEditor, HtmlEditor as default};
module.exports = HtmlEditor;
