
/**
 * @constructor
 * @param {Object} oElement
 * @param {Function=} fOnBlur
 * @param {Function=} fOnReady
 */
function HtmlEditorWrapper(oElement, fOnBlur, fOnReady)
{
	var self = this;

	self.editor = null;
	self.bHtml = true;
	self.bPlainDirty = false;
	self.iBlurTimer = 0;
	
	self.fOnBlur = fOnBlur || null;
	self.fOnReady = fOnReady || null;
	
	self.$element = $(oElement);

	self.LANG = {
		'HTML': 'Rich formatting',
		'PLAIN': 'Plain text',
		'FULL': 'Fullscreen'
	};
	
	self.init();
}

HtmlEditorWrapper.prototype.addInputFormatStyle = function ()
{
	if (this.$plain)
	{
		this.$plain.addClass('styled');
	}

	if (this.$html)
	{
		this.$html.addClass('styled');
	}
};

HtmlEditorWrapper.prototype.setupLang = function (sHtml, sPlain, sFullscreen)
{
	this.LANG = {
		'HTML': sHtml || this.LANG.HTML,
		'PLAIN': sPlain || this.LANG.PLAIN,
		'FULL': sFullscreen || this.LANG.FULL
	};

	this.setModeButtonText();
};

HtmlEditorWrapper.prototype.blurTrigger = function ()
{
	if (this.fOnBlur)
	{
		var self = this;
		window.clearTimeout(self.iBlurTimer);
		self.iBlurTimer = window.setTimeout(function () {
				self.fOnBlur();
		}, 200);
	}
};

HtmlEditorWrapper.prototype.focusTrigger = function ()
{
	if (this.fOnBlur)
	{
		window.clearTimeout(this.iBlurTimer);
	}
};

HtmlEditorWrapper.prototype.hideEditorToolbar = function ()
{
	if (this.editor)
	{
		$('.cke.cke_float').hide();
	}
};

/**
 * @param {string} sHtml
 * @return {string}
 */
HtmlEditorWrapper.prototype.htmlToPlain = function (sHtml)
{
	var
		sText = '',
		sQuoteChar = '> ',

		convertBlockquote = function () {
			if (arguments && 1 < arguments.length)
			{
				var	sText = $.trim(arguments[1])
					.replace(/__bq__start__(.|[\s\S\n\r]*)__bq__end__/gm, convertBlockquote)
				;

				sText = '\n' + sQuoteChar + $.trim(sText).replace(/\n/gm, '\n' + sQuoteChar) + '\n>\n';

				return sText.replace(/\n([> ]+)/gm, function () {
					return (arguments && 1 < arguments.length) ? '\n' + $.trim(arguments[1].replace(/[\s]/, '')) + ' ' : '';
				});
			}

			return '';
		},

		convertDivs = function () {
			if (arguments && 1 < arguments.length)
			{
				var sText = $.trim(arguments[1]);
				if (0 < sText.length)
				{
					sText = sText.replace(/<div[^>]*>(.|[\s\S\r\n]*)<\/div>/gmi, convertDivs);
					sText = '\n' + $.trim(sText) + '\n';
				}
				return sText;
			}
			return '';
		},

		fixAttibuteValue = function () {
			if (arguments && 1 < arguments.length)
			{
				return '' + arguments[1] + arguments[2].replace(/</g, '&lt;').replace(/>/g, '&gt;');
			}

			return '';
		},

		convertLinks = function () {
			if (arguments && 1 < arguments.length)
			{
				var
					sName = $.trim(arguments[1])
//					sHref = $.trim(arguments[0].replace(/<a [\s\S]*href[ ]?=[ ]?["']?([^"']+).+<\/a>/gmi, '$1'))
				;

				return sName;
//				sName = (0 === trim(sName).length) ? '' : sName;
//				sHref = ('mailto:' === sHref.substr(0, 7)) ? '' : sHref;
//				sHref = ('http' === sHref.substr(0, 4)) ? sHref : '';
//				sHref = (sName === sHref) ? '' : sHref;
//				sHref = (0 < sHref.length) ? ' (' + sHref + ') ' : '';
//				return (0 < sName.length) ? sName + sHref : sName;
			}
			return '';
		}
	;

	sText = sHtml
		.replace(/[\s]+/gm, ' ')
		.replace(/((?:href|data)\s?=\s?)("[^"]+?"|'[^']+?')/gmi, fixAttibuteValue)
		.replace(/<br\s?\/?>/gmi, '\n')
		.replace(/<\/h\d>/gi, '\n')
		.replace(/<\/p>/gi, '\n\n')
		.replace(/<\/li>/gi, '\n')
		.replace(/<\/td>/gi, '\n')
		.replace(/<\/tr>/gi, '\n')
		.replace(/<hr[^>]*>/gmi, '\n_______________________________\n\n')
		.replace(/<img [^>]*>/gmi, '')
		.replace(/<div[^>]*>(.|[\s\S\r\n]*)<\/div>/gmi, convertDivs)
		.replace(/<blockquote[^>]*>/gmi, '\n__bq__start__\n')
		.replace(/<\/blockquote>/gmi, '\n__bq__end__\n')
		.replace(/<a [^>]*>(.|[\s\S\r\n]*)<\/a>/gmi, convertLinks)
		.replace(/&nbsp;/gi, ' ')
		.replace(/<[^>]*>/gm, '')
		.replace(/&gt;/gi, '>')
		.replace(/&lt;/gi, '<')
		.replace(/&amp;/gi, '&')
		.replace(/&\w{2,6};/gi, '')
	;

	return sText
		.replace(/\n[ \t]+/gm, '\n')
		.replace(/[\n]{3,}/gm, '\n\n')
		.replace(/__bq__start__(.|[\s\S\r\n]*)__bq__end__/gm, convertBlockquote)
		.replace(/__bq__start__/gm, '')
		.replace(/__bq__end__/gm, '')
	;
};

/**
 * @param {string} sPlain
 * @return {string}
 */
HtmlEditorWrapper.prototype.plainToHtml = function (sPlain)
{
	return sPlain.toString()
		.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;')
		.replace(/\r/g, '').replace(/\n/g, '<br />');
};

HtmlEditorWrapper.prototype.fullScreenToggle = function ()
{
	$('html').toggleClass('html-editor-wrapper-fullscreen');
	$('body').toggleClass('html-editor-wrapper-fullscreen');

	this.focus();
};

HtmlEditorWrapper.prototype.initToolbar = function ()
{
	var self = this;

//	self.$fullscreen = $('<a tabindex="-1" href="jav' + 'ascript:void(0);">fullscreen</a>')
//		.addClass('html-editor-wrapper-fullscreen-button')
//		.on('click', function () {
//			self.fullScreenToggle();
//		})
//	;

	self.$mode = $('<a tabindex="-1" href="jav' + 'ascript:void(0);">html</a>')
		.addClass('html-editor-wrapper-mode-button')
		.on('click', function () {
			self.modeToggle(true);
		})
	;
	
	self.$toolbar
		.append(self.$mode)
//		.append(self.$fullscreen)
	;
};

/**
 * @return {boolean}
 */
HtmlEditorWrapper.prototype.isHtml = function ()
{
	return this.bHtml;
};

/**
 * @return {boolean}
 */
HtmlEditorWrapper.prototype.checkDirty = function ()
{
	return this.bHtml && this.editor ? this.editor.checkDirty() : this.bPlainDirty;
};

HtmlEditorWrapper.prototype.resetDirty = function ()
{
	if (this.editor)
	{
		this.editor.resetDirty();
	}

	this.bPlainDirty = false;
};

/**
 * @return {string}
 */
HtmlEditorWrapper.prototype.getData = function ()
{
	if (this.bHtml && this.editor)
	{
		return this.editor.getData();
	}
	else
	{
		return this.$plain.val();
	}
};

HtmlEditorWrapper.prototype.setHtml = function (sHtml, bFocus)
{
	if (this.editor)
	{
		if (!this.bHtml)
		{
			this.modeToggle(bFocus);
		}

		this.editor.setData(sHtml);
	}
};

HtmlEditorWrapper.prototype.setPlain = function (sPlain, bFocus)
{
	if (this.bHtml)
	{
		this.modeToggle(bFocus);
	}

	this.$plain.val(sPlain);
};

HtmlEditorWrapper.prototype.init = function ()
{
	if (this.$element && this.$element[0])
	{
		var
			self = this,
			oConfig = Globals.oHtmlEditorDefaultConfig,
			sLanguage = RL.settingsGet('Language'),
			bSource = !!RL.settingsGet('AllowHtmlEditorSourceButton')
		;

		self.$toolbar = $('<div></div>')
			.addClass('html-editor-wrapper-toolbar')
		;

		self.$plain = $('<textarea></textarea>')
			.addClass('html-editor-wrapper-plain')
			.on('change', function () {
				self.bPlainDirty = true;
			})
			.on('blur', function() {
				self.blurTrigger();
			})
			.on('focus', function() {
				self.focusTrigger();
			})
			.hide()
		;

		self.$html = $('<div></div>')
			.addClass('html-editor-wrapper-html')
			.attr('contenteditable', 'true')
			.on('blur', function() {
				self.blurTrigger();
			})
			.on('focus', function() {
				self.focusTrigger();
			})
			.hide()
		;

		if (self.bHtml) {
			self.$html.show();
		} else {
			self.$plain.show();
		}

		self.$element
			.addClass('html-editor-wrapper')
			.append(self.$toolbar)
			.append(self.$plain)
			.append(self.$html)
		;

		if (bSource && oConfig.toolbarGroups && !oConfig.toolbarGroups.__SourceInited)
		{
			oConfig.toolbarGroups.__SourceInited = true;
			oConfig.toolbarGroups.push({name: 'document', groups: ['mode', 'document', 'doctools']});
		}

		oConfig.language = Globals.oHtmlEditorLangsMap[sLanguage] || 'en';
		self.editor = window.CKEDITOR.inline(self.$html[0], oConfig);

		if (self.fOnReady)
		{
			self.editor.on('instanceReady', function () {
				self.fOnReady();
			});
		}
		
		self.initToolbar();
		self.setModeButtonText();
	}
};

HtmlEditorWrapper.prototype.focus = function ()
{
	if (this.bHtml) {
		this.$html.focus();
	} else {
		this.$plain.focus();
	}
};

HtmlEditorWrapper.prototype.blur = function ()
{
	if (this.bHtml) {
		this.$html.blur();
	} else {
		this.$plain.blur();
	}
};

HtmlEditorWrapper.prototype.setModeButtonText = function ()
{
	this.$mode.text(this.bHtml ? this.LANG.PLAIN : this.LANG.HTML);
};

HtmlEditorWrapper.prototype.clear = function (bFocus)
{
	this.setHtml('', bFocus);
};

HtmlEditorWrapper.prototype.modeToggle = function (bFocus)
{
	bFocus = Utils.isUnd(bFocus) ? true : !!bFocus;
	if (bFocus)
	{
		this.blur();
	}

	if (this.bHtml) {
		this.$html.hide();

		this.$plain
			.val(this.htmlToPlain(this.$html.html()))
			.show()
		;

		this.bHtml = false;
		this.bPlainDirty = true;
	} else {
		this.$plain.hide();

		this.$html
			.html(this.plainToHtml(this.$plain.val()))
			.show()
		;

		this.bHtml = true;
		this.bPlainDirty = true;
	}

	this.setModeButtonText();

	if (bFocus)
	{
		this.focus();
	}

	this.blurTrigger();
};
