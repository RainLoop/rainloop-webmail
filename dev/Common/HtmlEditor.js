
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),

		Globals = require('Common/Globals'),

		Settings = require('Storage/Settings')
	;

	/**
	 * @constructor
	 * @param {Object} oElement
	 * @param {Function=} fOnBlur
	 * @param {Function=} fOnReady
	 * @param {Function=} fOnModeChange
	 */
	function HtmlEditor(oElement, fOnBlur, fOnReady, fOnModeChange)
	{
		this.editor = null;
		this.iBlurTimer = 0;
		this.fOnBlur = fOnBlur || null;
		this.fOnReady = fOnReady || null;
		this.fOnModeChange = fOnModeChange || null;

		this.$element = $(oElement);

		this.resize = _.throttle(_.bind(this.resize, this), 100);

		this.__inited = false;

		this.init();
	}

	HtmlEditor.prototype.blurTrigger = function ()
	{
		if (this.fOnBlur)
		{
			var self = this;
			window.clearTimeout(this.iBlurTimer);
			this.iBlurTimer = window.setTimeout(function () {
				self.fOnBlur();
			}, 200);
		}
	};

	HtmlEditor.prototype.focusTrigger = function ()
	{
		if (this.fOnBlur)
		{
			window.clearTimeout(this.iBlurTimer);
		}
	};

	/**
	 * @return {boolean}
	 */
	HtmlEditor.prototype.isHtml = function ()
	{
		return this.editor ? 'wysiwyg' === this.editor.mode : false;
	};

	/**
	 * @param {string} sSignature
	 * @param {bool} bHtml
	 * @param {bool} bInsertBefore
	 */
	HtmlEditor.prototype.setSignature = function (sSignature, bHtml, bInsertBefore)
	{
		if (this.editor)
		{
			this.editor.execCommand('insertSignature', {
				'isHtml': bHtml,
				'insertBefore': bInsertBefore,
				'signature': sSignature
			});
		}
	};

	/**
	 * @return {boolean}
	 */
	HtmlEditor.prototype.checkDirty = function ()
	{
		return this.editor ? this.editor.checkDirty() : false;
	};

	HtmlEditor.prototype.resetDirty = function ()
	{
		if (this.editor)
		{
			this.editor.resetDirty();
		}
	};

	/**
	 * @param {string} sText
	 * @return {string}
	 */
	HtmlEditor.prototype.clearSignatureSigns = function (sText)
	{
		return sText.replace(/(\u200C|\u0002)/g, '');
	};

	/**
	 * @param {boolean=} bWrapIsHtml = false
	 * @param {boolean=} bClearSignatureSigns = false
	 * @return {string}
	 */
	HtmlEditor.prototype.getData = function (bWrapIsHtml, bClearSignatureSigns)
	{
		var sResult = '';
		if (this.editor)
		{
			try
			{
				if ('plain' === this.editor.mode && this.editor.plugins.plain && this.editor.__plain)
				{
					sResult = this.editor.__plain.getRawData();
				}
				else
				{
					sResult =  bWrapIsHtml ?
						'<div data-html-editor-font-wrapper="true" style="font-family: arial, sans-serif; font-size: 13px;">' +
							this.editor.getData() + '</div>' : this.editor.getData();
				}
			}
			catch (e) {}

			if (bClearSignatureSigns)
			{
				sResult = this.clearSignatureSigns(sResult);
			}
		}

		return sResult;
	};

	/**
	 * @param {boolean=} bWrapIsHtml = false
	 * @param {boolean=} bClearSignatureSigns = false
	 * @return {string}
	 */
	HtmlEditor.prototype.getDataWithHtmlMark = function (bWrapIsHtml, bClearSignatureSigns)
	{
		return (this.isHtml() ? ':HTML:' : '') + this.getData(bWrapIsHtml, bClearSignatureSigns);
	};

	HtmlEditor.prototype.modeToggle = function (bPlain, bResize)
	{
		if (this.editor)
		{
			try {
				if (bPlain)
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
			} catch(e) {}

			if (bResize)
			{
				this.resize();
			}
		}
	};

	HtmlEditor.prototype.setHtmlOrPlain = function (sText, bFocus)
	{
		if (':HTML:' === sText.substr(0, 6))
		{
			this.setHtml(sText.substr(6), bFocus);
		}
		else
		{
			this.setPlain(sText, bFocus);
		}
	};

	HtmlEditor.prototype.setHtml = function (sHtml, bFocus)
	{
		if (this.editor && this.__inited)
		{
			this.modeToggle(true);

			sHtml = sHtml.replace(/<p[^>]*><\/p>/ig, '');

			try {
				this.editor.setData(sHtml);
			} catch (e) {}

			if (bFocus)
			{
				this.focus();
			}
		}
	};

	HtmlEditor.prototype.replaceHtml = function (mFind, sReplaceHtml)
	{
		if (this.editor && this.__inited && 'wysiwyg' === this.editor.mode)
		{
			try {
				this.editor.setData(
					this.editor.getData().replace(mFind, sReplaceHtml));
			} catch (e) {}
		}
	};

	HtmlEditor.prototype.setPlain = function (sPlain, bFocus)
	{
		if (this.editor && this.__inited)
		{
			this.modeToggle(false);
			if ('plain' === this.editor.mode && this.editor.plugins.plain && this.editor.__plain)
			{
				return this.editor.__plain.setRawData(sPlain);
			}
			else
			{
				try {
					this.editor.setData(sPlain);
				} catch (e) {}
			}

			if (bFocus)
			{
				this.focus();
			}
		}
	};

	HtmlEditor.prototype.init = function ()
	{
		if (this.$element && this.$element[0] && !this.editor)
		{
			var
				self = this,
				fInit = function () {

					var
						oConfig = Globals.oHtmlEditorDefaultConfig,
						sLanguage = Settings.settingsGet('Language'),
						bSource = !!Settings.settingsGet('AllowHtmlEditorSourceButton'),
						bBiti = !!Settings.settingsGet('AllowHtmlEditorBitiButtons')
					;

					if ((bSource || !bBiti) && !oConfig.toolbarGroups.__cfgInited)
					{
						oConfig.toolbarGroups.__cfgInited = true;

						if (bSource)
						{
							oConfig.removeButtons = oConfig.removeButtons.replace(',Source', '');
						}

						if (!bBiti)
						{
							oConfig.removePlugins += (oConfig.removePlugins ? ',' : '')  + 'bidi';
						}
					}

					oConfig.enterMode = window.CKEDITOR.ENTER_BR;
					oConfig.shiftEnterMode = window.CKEDITOR.ENTER_P;

					oConfig.language = Globals.oHtmlEditorLangsMap[sLanguage] || 'en';
					if (window.CKEDITOR.env)
					{
						window.CKEDITOR.env.isCompatible = true;
					}

					self.editor = window.CKEDITOR.appendTo(self.$element[0], oConfig);

					self.editor.on('key', function(oEvent) {
						if (oEvent && oEvent.data && 9 /* Tab */ === oEvent.data.keyCode)
						{
							return false;
						}
					});

					self.editor.on('blur', function() {
						self.blurTrigger();
					});

					self.editor.on('mode', function() {

						self.blurTrigger();

						if (self.fOnModeChange)
						{
							self.fOnModeChange('plain' !== self.editor.mode);
						}
					});

					self.editor.on('focus', function() {
						self.focusTrigger();
					});

					if (window.FileReader)
					{
						self.editor.on('drop', function(evt) {
							if (0 < evt.data.dataTransfer.getFilesCount())
							{
								var file = evt.data.dataTransfer.getFile(0);
								if (file && window.FileReader && evt.data.dataTransfer.id &&
									file.type && file.type.match(/^image/i))
								{
									var
										id = evt.data.dataTransfer.id,
										imageId = '[img=' + id +']',
										reader  = new window.FileReader()
									;

									reader.onloadend = function () {
										if (reader.result)
										{
											self.replaceHtml(imageId, '<img src="' + reader.result + '" />');
										}
									};

									reader.readAsDataURL(file);

									evt.data.dataTransfer.setData('text/html', imageId);
								}
							}
						});
					}

					self.editor.on('instanceReady', function () {

						if (self.editor.removeMenuItem)
						{
							self.editor.removeMenuItem('cut');
							self.editor.removeMenuItem('copy');
							self.editor.removeMenuItem('paste');
						}

						self.__resizable = true;
						self.__inited = true;

						self.resize();

						if (self.fOnReady)
						{
							self.fOnReady();
						}

					});
				}
			;

			if (window.CKEDITOR)
			{
				fInit();
			}
			else
			{
				window.__initEditor = fInit;
			}
		}
	};

	HtmlEditor.prototype.focus = function ()
	{
		if (this.editor)
		{
			try {
				this.editor.focus();
			} catch (e) {}
		}
	};

	HtmlEditor.prototype.hasFocus = function ()
	{
		if (this.editor)
		{
			try {
				return !!this.editor.focusManager.hasFocus;
			} catch (e) {}
		}

		return false;
	};

	HtmlEditor.prototype.blur = function ()
	{
		if (this.editor)
		{
			try {
				this.editor.focusManager.blur(true);
			} catch (e) {}
		}
	};

	HtmlEditor.prototype.resize = function ()
	{
		if (this.editor && this.__resizable)
		{
			try {
				this.editor.resize(this.$element.width(), this.$element.innerHeight());
			} catch (e) {}
		}
	};

	HtmlEditor.prototype.setReadOnly = function (bValue)
	{
		if (this.editor)
		{
			try {
				this.editor.setReadOnly(!!bValue);
			} catch (e) {}
		}
	};

	HtmlEditor.prototype.clear = function (bFocus)
	{
		this.setHtml('', bFocus);
	};

	module.exports = HtmlEditor;

}());