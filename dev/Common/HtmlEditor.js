/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function HtmlEditor(oTextAreaElem, oHtmlAreaElem, oToolBarElement, oOptions)
{
	var
		oDefOptions = {
			'DisableHtml': false,
			'onSwitch': false,
			'LangSwitcherConferm': 'EDITOR_TEXT_SWITCHER_CONFIRM',
			'LangSwitcherTextLabel': 'EDITOR_SWITCHER_TEXT_LABEL',
			'LangSwitcherHtmlLabel': 'EDITOR_SWITCHER_HTML_LABEL'
		}
	;

	this.bIe = !!/msie/.test(navigator.userAgent.toLowerCase());

	oOptions = $.extend(oDefOptions, Utils.isUnd(oOptions) ? {} : oOptions);

	this.oOptions = oOptions;
	this.bOnlyPlain = !!this.oOptions.DisableHtml;
	this.fOnSwitch = this.oOptions.onSwitch;

	this.textarea = $(oTextAreaElem).empty().addClass('editorTextArea');
	this.htmlarea = $(oHtmlAreaElem).empty().addClass('editorHtmlArea').prop('contentEditable', 'true');
	this.toolbar = $(oToolBarElement).empty().addClass('editorToolbar');

	HtmlEditor.htmlInitEditor.apply(this);
	HtmlEditor.htmlInitToolbar.apply(this);
	HtmlEditor.htmlAttachEditorEvents.apply(this);

	if (this.bOnlyPlain)
	{
		this.toolbar.hide();
//		this.switchToPlain(false);
	}
}

/**
 * @param {string} mA
 * @param {string} mB
 * @param {string} mC
 */
HtmlEditor.prototype.initLanguage = function (mA, mB, mC)
{
	this.oOptions.LangSwitcherConferm = mA;
	this.oOptions.LangSwitcherTextLabel = mB;
	this.oOptions.LangSwitcherHtmlLabel = mC;
};

/**
 * @param {string} mA
 * @param {boolean=} mB
 * @param {string=} mC
 */
HtmlEditor.prototype.execCom = function (mA, mB, mC)
{
	if (window.document)
	{
		window.document.execCommand(mA, mB || false, mC || null);
		this.updateTextArea();
	}
};

HtmlEditor.prototype.getEditorSelection = function () {
	var mSelection = null;
	if (window.getSelection)
	{
		mSelection = window.getSelection();
	}
	else if (window.document.getSelection)
	{
		mSelection = window.document.getSelection();
	}
	else if (window.document.selection)
	{
		mSelection = window.document.selection;
	}
	return mSelection;
};

HtmlEditor.prototype.getEditorRange = function () {
	var oSelection = this.getEditorSelection();
	if (!oSelection || 0 === oSelection.rangeCount)
	{
		return null;
	}
	return (oSelection.getRangeAt) ? oSelection.getRangeAt(0) : oSelection.createRange();
};

/**
 * @param {string} mA
 * @param {boolean=} mB
 * @param {string=} mC
 */
HtmlEditor.prototype.ec = function (mA, mB, mC)
{
	this.execCom(mA, mB, mC);
};

/**
 * @param {number} iHeading
 */
HtmlEditor.prototype.heading = function (iHeading)
{
	this.ec('formatblock', false, (this.bIe) ? 'Heading ' + iHeading : 'h' + iHeading);
};

/**
 * @param {string} sSrc
 */
HtmlEditor.prototype.insertImage = function (sSrc)
{
	if (this.isHtml() && !this.bOnlyPlain)
	{
		this.htmlarea.focus();
		this.ec('insertImage', false, sSrc);
	}
};

HtmlEditor.prototype.focus = function ()
{
	if (this.isHtml() && !this.bOnlyPlain)
	{
		this.htmlarea.focus();
	}
	else
	{
		this.textarea.focus();
	}
};

/**
 * @param {string} sType
 * @param {string} sColor
 */
HtmlEditor.prototype.setcolor = function (sType, sColor)
{
	var
		oRange = null,
		sCmd = ''
	;

	if (this.bIe && !document['addEventListener'])
	{
		oRange = this.getEditorRange();
		if (oRange)
		{
			oRange.execCommand(('forecolor' === sType) ? 'ForeColor' : 'BackColor', false, sColor);
		}
	}
	else
	{
		if (this.bIe)
		{
			sCmd = ('forecolor' === sType) ? 'ForeColor' : 'BackColor';
		}
		else
		{
			sCmd = ('forecolor' === sType) ? 'foreColor' : 'backColor';
		}

		this.ec(sCmd, false, sColor);
	}
};

/**
 * @return {boolean}
 */
HtmlEditor.prototype.isHtml = function ()
{
	return (true === this.bOnlyPlain) ? false : this.textarea.is(':hidden');
};

/**
 * @return {string}
 */
HtmlEditor.prototype.toHtmlString = function ()
{
	return this.editor.innerHTML;
};

/**
 * @return {string}
 */
HtmlEditor.prototype.toString = function ()
{
	return this.editor.innerText;
};

HtmlEditor.prototype.updateTextArea = function ()
{
	this.textarea.val(this.toHtmlString());
};

HtmlEditor.prototype.updateHtmlArea = function ()
{
	this.editor.innerHTML = this.textarea.val();
};

/**
 * @param {string} sInnerText
 * @param {boolean} bIsHtml
 */
HtmlEditor.prototype.setRawText = function (sInnerText, bIsHtml)
{
	if (bIsHtml && !this.bOnlyPlain)
	{
		if (!this.isHtml())
		{
			this.textarea.val('');
			this.switchToHtml();
		}

		this.textarea.val(sInnerText.toString());
		this.updateHtmlArea();
	}
	else
	{
		this.textarea.val(sInnerText.toString());
		this.updateHtmlArea();
		this.switchToPlain(false);
	}
};

HtmlEditor.prototype.clear = function ()
{
	this.textarea.val('');
	this.editor.innerHTML = '';

	if (this.bOnlyPlain)
	{
		this.toolbar.hide();
		this.switchToPlain(false);
	}
	else
	{
		this.switchToHtml();
	}
};

/**
 * @return {string}
 */
HtmlEditor.prototype.getTextForRequest = function ()
{
	if (this.isHtml())
	{
		this.updateTextArea();
		return this.textarea.val();
	}

	return this.textarea.val();
};

/**
 * @param {boolean=} bWrap
 * @return {string}
 */
HtmlEditor.prototype.getTextFromHtml = function (bWrap)
{
	var
		sText = '',
		sQuoteChar = '> ',

		convertBlockquote = function () {
			if (arguments && 1 < arguments.length)
			{
				var	sText = Utils.trim(arguments[1])
					.replace(/__bq__start__([\s\S\n\r]*)__bq__end__/gm, convertBlockquote)
				;

				sText = '\n' + sQuoteChar + Utils.trim(sText).replace(/\n/gm, '\n' + sQuoteChar) + '\n>\n';

				return sText.replace(/\n([> ]+)/gm, function () {
					return (arguments && 1 < arguments.length) ? '\n' + Utils.trim(arguments[1].replace(/[\s]/, '')) + ' ' : '';
				});
			}

			return '';
		},

		convertDivs = function () {
			if (arguments && 1 < arguments.length)
			{
				var sText = Utils.trim(arguments[1]);
				if (0 < sText.length)
				{
					sText = sText.replace(/<div[^>]*>([\s\S]*)<\/div>/gmi, convertDivs);
					sText = '\n' + Utils.trim(sText) + '\n';
				}
				return sText;
			}
			return '';
		},

		convertLinks = function () {
			if (arguments && 1 < arguments.length)
			{
				var
					sName = Utils.trim(arguments[1])
//					sHref = Utils.trim(arguments[0].replace(/<a [\s\S]*href[ ]?=[ ]?["']?([^"']+).+<\/a>/gmi, '$1'))
				;

				return sName;
//				sName = (0 === Utils.trim(sName).length) ? '' : sName;
//				sHref = ('mailto:' === sHref.substr(0, 7)) ? '' : sHref;
//				sHref = ('http' === sHref.substr(0, 4)) ? sHref : '';
//				sHref = (sName === sHref) ? '' : sHref;
//				sHref = (0 < sHref.length) ? ' (' + sHref + ') ' : '';
//				return (0 < sName.length) ? sName + sHref : sName;
			}
			return '';
		}
	;

	bWrap = Utils.isUnd(bWrap) ? true : !!bWrap;

	sText = this.toHtmlString()
		.replace(/[\s]+/gm, ' ')
		.replace(/<br\s?\/?>/gmi, '\n')
		.replace(/<\/h\d>/gi, '\n')
		.replace(/<\/p>/gi, '\n\n')
		.replace(/<\/li>/gi, '\n')
		.replace(/<\/td>/gi, '\n')
		.replace(/<\/tr>/gi, '\n')
		.replace(/<hr[^>]*>/gmi, '\n_______________________________\n\n')
		.replace(/<img [^>]*>/gmi, '')
		.replace(/<div[^>]*>([\s\S]*)<\/div>/gmi, convertDivs)
		.replace(/<blockquote[^>]*>/gmi, '\n__bq__start__\n')
		.replace(/<\/blockquote>/gmi, '\n__bq__end__\n')
		.replace(/<a [^>]*>([\s\S]*?)<\/a>/gmi, convertLinks)
		.replace(/&nbsp;/gi, ' ')
		.replace(/<[^>]*>/gm, '')
		.replace(/&gt;/gi, '>')
		.replace(/&lt;/gi, '<')
		.replace(/&amp;/gi, '&')
		.replace(/&\w{2,6};/gi, '')
	;

	return (bWrap ? Utils.splitPlainText(sText) : sText)
		.replace(/\n[ \t]+/gm, '\n')
		.replace(/[\n]{3,}/gm, '\n\n')
		.replace(/__bq__start__([\s\S]*)__bq__end__/gm, convertBlockquote)
		.replace(/__bq__start__/gm, '')
		.replace(/__bq__end__/gm, '')
	;
};

/**
 * @return {string}
 */
HtmlEditor.prototype.getHtmlFromText = function ()
{
	return Utils.convertPlainTextToHtml(this.textarea.val());
};

HtmlEditor.prototype.switchToggle = function ()
{
	if (this.isHtml())
	{
		this.switchToPlain();
	}
	else
	{
		this.switchToHtml();
	}
};

/**
* @param {boolean=} bWithConfirm
*/
HtmlEditor.prototype.switchToPlain = function (bWithConfirm)
{
	bWithConfirm = Utils.isUnd(bWithConfirm) ? true : bWithConfirm;

	var
		sText = this.getTextFromHtml(),
		fSwitch = _.bind(function (bValue) {

			if (bValue)
			{
				this.toolbar.addClass('editorHideToolbar');
				$('.editorSwitcher', this.toolbar).text(this.switcherLinkText(false));

				this.textarea.val(sText);
				this.textarea.show();
//				this.textarea.css({'display': ''});
				this.htmlarea.hide();
				if (this.fOnSwitch)
				{
					this.fOnSwitch(false);
				}
			}

		}, this)
	;

	if (!bWithConfirm || 0 === Utils.trim(sText).length)
	{
		fSwitch(true);
	}
	else
	{
		fSwitch(window.confirm(this.oOptions.LangSwitcherConferm));
//			Utils.dialogConfirm(this.oOptions.LangSwitcherConferm, fSwitch);
	}
};

/**
 * @param {boolean} bIsPlain
 * @return {string}
 */
HtmlEditor.prototype.switcherLinkText = function (bIsPlain)
{
	return (bIsPlain) ? this.oOptions.LangSwitcherTextLabel : this.oOptions.LangSwitcherHtmlLabel;
//		return (bIsPlain) ? '« ' + 'EDITOR_TEXT_SWITCHER_PLAINT_TEXT' : 'EDITOR_TEXT_SWITCHER_RICH_FORMATTING' + ' »';
};

HtmlEditor.prototype.switchToHtml = function ()
{
	this.toolbar.removeClass('editorHideToolbar');
	$('.editorSwitcher', this.toolbar).text(this.switcherLinkText(true));

	this.textarea.val(this.getHtmlFromText());
	this.updateHtmlArea();
	this.textarea.hide();
	this.htmlarea.show();
//	this.htmlarea.css({'display': ''});

	if (this.fOnSwitch)
	{
		this.fOnSwitch(true);
	}
};

/**
 * @param {string} sName
 * @param {string} sTitle
 */
HtmlEditor.prototype.addButton = function (sName, sTitle)
{
	var	self = this;

	$('<div />').addClass('editorToolbarButtom').append($('<a tabindex="-1" href="javascript:void(0);"></a>').addClass(sName)).attr('title', sTitle).click(function (oEvent) {
		if (!Utils.isUnd(HtmlEditor.htmlFunctions[sName]))
		{
			HtmlEditor.htmlFunctions[sName].apply(self, [$(this), oEvent]);
		}
		else
		{
			window.alert(sName);
		}
	}).appendTo(this.toolbar);
};

HtmlEditor.htmlInitToolbar = function ()
{
	if (!this.bOnlyPlain)
	{
//		this.addButton('fontname', 'Select font');
		this.addButton('bold', 'Bold');
		this.addButton('italic', 'Italic');
		this.addButton('underline', 'Underline');
		this.addButton('strikethrough', 'Strikethrough');

		this.addButton('removeformat', 'removeformat');

		this.addButton('justifyleft', 'justifyleft');
		this.addButton('justifycenter', 'justifycenter');
		this.addButton('justifyright', 'justifyright');

		this.addButton('horizontalrule', 'horizontalrule');

		this.addButton('orderedlist', 'orderedlist');
		this.addButton('unorderedlist', 'unorderedlist');

		this.addButton('indent', 'indent');
		this.addButton('outdent', 'outdent');

		this.addButton('forecolor', 'forecolor');
//		this.addButton('backcolor', 'backcolor');

		(function ($, that) {

			$('<span />').addClass('editorSwitcher').text(that.switcherLinkText(true)).click(function () {
				that.switchToggle();
			}).appendTo(that.toolbar);

		}($, this));
	}
};

HtmlEditor.htmlInitEditor = function ()
{
	this.editor = this.htmlarea[0];
	this.editor.innerHTML = this.textarea.val();
};

HtmlEditor.htmlAttachEditorEvents = function ()
{
	var
		self = this,
				
		fIsImage = function (oItem) {
			return oItem && oItem.type && 0 === oItem.type.indexOf('image/');
		},

//		fUpdateHtmlArea = function () {
//			self.updateHtmlArea();
//		},
//
//		fUpdateTextArea = function () {
//			self.updateTextArea();
//		},

		fHandleFileSelect = function (oEvent) {

			oEvent = (oEvent && oEvent.originalEvent ?
				oEvent.originalEvent : oEvent) || window.event;

			if (oEvent)
			{
				oEvent.stopPropagation();
				oEvent.preventDefault();

				var
					oReader = null,
					oFile = null,
					aFiles = (oEvent.files || (oEvent.dataTransfer ? oEvent.dataTransfer.files : null))
				;

				if (aFiles && 1 === aFiles.length && fIsImage(aFiles[0]))
				{
					oFile = aFiles[0];

					oReader = new window.FileReader();
					oReader.onload = (function (oLocalFile) {
						return function (oEvent) {
							self.insertImage(oEvent.target.result, oLocalFile.name);
						};
					}(oFile));

					oReader.readAsDataURL(oFile);
				}
			}

			self.htmlarea.removeClass('editorDragOver');
		},

		fHandleDragLeave = function () {
			self.htmlarea.removeClass('editorDragOver');
		},

		fHandleDragOver = function (oEvent) {
			oEvent.stopPropagation();
			oEvent.preventDefault();

			self.htmlarea.addClass('editorDragOver');
		},

		fHandlePaste = function (oEvent) {

			var oClipboardData = oEvent && oEvent.clipboardData ? oEvent.clipboardData :
				(oEvent && oEvent.originalEvent && oEvent.originalEvent.clipboardData ? oEvent.originalEvent.clipboardData : null);

			if (oClipboardData && oClipboardData.items)
			{
				_.each(oClipboardData.items, function (oItem) {
					if (fIsImage(oItem) && oItem['getAsFile']) {
						var oReader = null, oFile = oItem['getAsFile']();
						if (oFile)
						{
							oReader = new window.FileReader();
							oReader.onload = (function (oLocalFile) {
								return function (oEvent) {
									self.insertImage(oEvent.target.result, oLocalFile.name);
								};
							}(oFile));

							oReader.readAsDataURL(oFile);
						}
					}
				});
			}
		}
	;

	if (!this.bOnlyPlain)
	{
//		this.textarea.on('click keyup keydown mousedown blur', fUpdateHtmlArea);
//		this.htmlarea.on('click keyup keydown mousedown blur', fUpdateTextArea);
//
		if (window.File && window.FileReader && window.FileList)
		{
			this.htmlarea.bind('dragover', fHandleDragOver);
			this.htmlarea.bind('dragleave', fHandleDragLeave);
			this.htmlarea.bind('drop', fHandleFileSelect);
			this.htmlarea.bind('paste', fHandlePaste);
		}
	}
};

HtmlEditor.htmlColorPickerColors = (function () {

	var
		aMaps = [],
		aColors = [],
		iIndex = 0,
		iIndexSub = 0,
		iIndexSubSub = 0,
		iLen = 0,
		sMap = ''
	;

	for (iIndex = 0; iIndex < 256; iIndex += 85)
	{
		sMap = iIndex.toString(16);
		aMaps.push(1 === sMap.length ? '0' + sMap : sMap);
	}

	iLen = aMaps.length;
	for (iIndex = 0; iIndex < iLen; iIndex++)
	{
		for (iIndexSub = 0; iIndexSub < iLen; iIndexSub++)
		{
			for (iIndexSubSub = 0; iIndexSubSub < iLen; iIndexSubSub++)
			{
				aColors.push('#' + aMaps[iIndex] + '' + aMaps[iIndexSub] + '' + aMaps[iIndexSubSub]);
			}
		}
	}

	return aColors;

}());

HtmlEditor.htmlFontPicker = (function () {

	var
		jqDoc = $(window.document),
		bIsAppented = false,
		oFontPickerHolder = $('<div style="position: absolute;" class="editorFontStylePicker"><div class="editorFpFonts"></div></div>'),
		oFonts = oFontPickerHolder.find('.editorFpFonts'),
		fCurrentFunc = function () {}
	;

	$.each(['Arial', 'Arial Black', 'Courier New', 'Tahoma', 'Times New Roman', 'Verdana'], function (iIndex, sFont) {
		oFonts.append(
			$('<a href="javascript:void(0);" tabindex="-1" class="editorFpFont" style="font-family: ' + sFont + ';">' + sFont + '</a>').click(function () {
				fCurrentFunc(sFont);
			})
		);
		oFonts.append('<br />');
	});

	oFontPickerHolder.hide();

	return function (oClickObject, fSelectFunc, oTollbar) {

		if (!bIsAppented)
		{
			oFontPickerHolder.appendTo(oTollbar);
			bIsAppented = true;
		}

		fCurrentFunc = fSelectFunc;

		jqDoc.unbind('click.fpNamespace');
		window.setTimeout(function () {
			jqDoc.one('click.fpNamespace', function () {
				oFontPickerHolder.hide();
			});
		}, 500);

		var oPos = $(oClickObject).position();
		oFontPickerHolder
			.css('top', (5 + oPos.top + $(oClickObject).height()) + 'px')
			.css('left', oPos.left + 'px')
			.show();
	};

}());

HtmlEditor.htmlColorPicker = (function () {

	var
		jqDoc = $(window.document),
		bIsAppented = false,
		oColorPickerHolder = $('<div style="position: absolute;" class="editorColorPicker"><div class="editorCpColors"></div></div>'),
		oColors = oColorPickerHolder.find('.editorCpColors'),
		fCurrentFunc = function () {}
	;

	$.each(HtmlEditor.htmlColorPickerColors, function (iIndex, sColor) {
		oColors.append('<a href="javascript:void(0);" tabindex="-1" class="editorCpColor" style="background-color: ' + sColor + ';"></a>');
	});

	oColorPickerHolder.hide();

	$('.editorCpColor', oColors).click(function (oEvent) {

		var
			iIndex = 1,
			sSelectedColor = '#000000',
			sRgbString = $(oEvent.target).css('background-color'),
			aParts = sRgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
		;

		if (aParts !== null)
		{
			delete (aParts[0]);
			for (; iIndex <= 3; ++iIndex)
			{
				aParts[iIndex] = Utils.pInt(aParts[iIndex]).toString(16);
				if (1 === aParts[iIndex].length)
				{
					aParts[iIndex] = '0' + aParts[iIndex];
				}
			}

			sSelectedColor = '#' + aParts.join('');
		}
		else
		{
			sSelectedColor = sRgbString;
		}

		fCurrentFunc(sSelectedColor);
	});

	return function (oClickObject, fSelectFunc, oTollbar) {

		if (!bIsAppented)
		{
			oColorPickerHolder.appendTo(oTollbar);
			bIsAppented = true;
		}

		var oPos = $(oClickObject).position();
		fCurrentFunc = fSelectFunc;

		jqDoc.unbind('click.cpNamespace');
		window.setTimeout(function () {
			jqDoc.one('click.cpNamespace', function () {
				oColorPickerHolder.hide();
			});
		}, 100);

		oColorPickerHolder
			.css('top', (5 + oPos.top + $(oClickObject).height()) + 'px')
			.css('left', oPos.left + 'px')
			.show();
	};

}());

/* ----------- */

HtmlEditor.htmlFunctions = {

	/**
	 * @this {HtmlEditor}
	 */
	'bold': function ()
	{
		this.ec('bold');
	},

	/**
	 * @this {HtmlEditor}
	 */
	'italic': function ()
	{
		this.ec('italic');
	},

	/**
	* @this {HtmlEditor}
	*/
	'underline': function ()
	{
		this.ec('underline');
	},

	/**
	* @this {HtmlEditor}
	*/
	'strikethrough': function ()
	{
		this.ec('strikethrough');
	},

	/**
	 * @this {HtmlEditor}
	 */
	'indent': function ()
	{
		this.ec('indent');
	},

	/**
	 * @this {HtmlEditor}
	 */
	'outdent': function ()
	{
		this.ec('outdent');
	},

	/**
	 * @this {HtmlEditor}
	 */
	'justifyleft': function ()
	{
		this.ec('justifyLeft');
	},

	/**
	 * @this {HtmlEditor}
	 */
	'justifycenter': function ()
	{
		this.ec('justifyCenter');
	},

	/**
	 * @this {HtmlEditor}
	 */
	'justifyright': function ()
	{
		this.ec('justifyRight');
	},

	/**
	 * @this {HtmlEditor}
	 */
	'horizontalrule': function ()
	{
		this.ec('insertHorizontalRule', false, 'ht');
	},

	/**
	 * @this {HtmlEditor}
	 */
	'removeformat': function ()
	{
		this.ec('removeFormat');
	},

	/**
	 * @this {HtmlEditor}
	 */
	'orderedlist': function ()
	{
		this.ec('insertorderedlist');
	},

	/**
	 * @this {HtmlEditor}
	 */
	'unorderedlist': function ()
	{
		this.ec('insertunorderedlist');
	},

	/**
	 * @this {HtmlEditor}
	 */
	'forecolor': function (oClickObject)
	{
		HtmlEditor.htmlColorPicker(oClickObject, _.bind(function (sValue) {
			this.setcolor('forecolor', sValue);
		}, this), this.toolbar);
	},

	/**
	 * @this {HtmlEditor}
	 */
	'backcolor': function (oClickObject)
	{
		HtmlEditor.htmlColorPicker(oClickObject, _.bind(function (sValue) {
			this.setcolor('backcolor', sValue);
		}, this), this.toolbar);
	},

	/**
	 * @this {HtmlEditor}
	 */
	'fontname': function (oClickObject)
	{
		HtmlEditor.htmlFontPicker(oClickObject, _.bind(function (sValue) {
			this.ec('fontname', false, sValue);
		}, this), this.toolbar);
	}
};
