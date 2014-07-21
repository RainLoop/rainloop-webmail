
(function() {

	var

		$div = $('<div></div>'),

		/**
		 * @param {string} sHtml
		 * @return {string}
		 */
		htmlToPlain = function (sHtml)
		{
			var
				iPos = 0,
				iP1 = 0,
				iP2 = 0,
				iP3 = 0,
				iLimit = 0,

				sText = '',

				splitPlainText = function (sText)
				{
					var
						iLen = 100,
						sPrefix = '',
						sSubText = '',
						sResult = sText,
						iSpacePos = 0,
						iNewLinePos = 0
					;

					while (sResult.length > iLen)
					{
						sSubText = sResult.substring(0, iLen);
						iSpacePos = sSubText.lastIndexOf(' ');
						iNewLinePos = sSubText.lastIndexOf('\n');

						if (-1 !== iNewLinePos)
						{
							iSpacePos = iNewLinePos;
						}

						if (-1 === iSpacePos)
						{
							iSpacePos = iLen;
						}

						sPrefix += sSubText.substring(0, iSpacePos) + '\n';
						sResult = sResult.substring(iSpacePos + 1);
					}

					return sPrefix + sResult;
				},

				convertBlockquote = function (sText) {
					sText = splitPlainText($.trim(sText));
					sText = '> ' + sText.replace(/\n/gm, '\n> ');
					return sText.replace(/(^|\n)([> ]+)/gm, function () {
						return (arguments && 2 < arguments.length) ? arguments[1] + $.trim(arguments[2].replace(/[\s]/, '')) + ' ' : '';
					});
				},

				convertDivs = function () {
					if (arguments && 1 < arguments.length)
					{
						var sText = $.trim(arguments[1]);
						if (0 < sText.length)
						{
							sText = sText.replace(/<div[^>]*>([\s\S\r\n]*)<\/div>/gmi, convertDivs);
							sText = '\n' + $.trim(sText) + '\n';
						}

						return sText;
					}

					return '';
				},

				fixAttibuteValue = function () {
					return (arguments && 1 < arguments.length) ?
						'' + arguments[1] + arguments[2].replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
				},

				convertLinks = function () {
					return (arguments && 1 < arguments.length) ? $.trim(arguments[1]) : '';
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
				.replace(/<div[^>]*>([\s\S\r\n]*)<\/div>/gmi, convertDivs)
				.replace(/<blockquote[^>]*>/gmi, '\n__bq__start__\n')
				.replace(/<\/blockquote>/gmi, '\n__bq__end__\n')
				.replace(/<a [^>]*>([\s\S\r\n]*?)<\/a>/gmi, convertLinks)
				.replace(/<\/div>/gi, '\n')
				.replace(/&nbsp;/gi, ' ')
				.replace(/&quot;/gi, '"')
				.replace(/&amp;/gi, '&')
				.replace(/<[^>]*>/gm, '')
			;

			sText = $div.html(sText).text();

			sText = sText
				.replace(/\n[ \t]+/gm, '\n')
				.replace(/[\n]{3,}/gm, '\n\n')
				.replace(/&gt;/gi, '>')
				.replace(/&lt;/gi, '<')
			;

			iPos = 0;
			iLimit = 100;

			while (0 < iLimit)
			{
				iLimit--;
				iP1 = sText.indexOf('__bq__start__', iPos);
				if (-1 < iP1)
				{
					iP2 = sText.indexOf('__bq__start__', iP1 + 5);
					iP3 = sText.indexOf('__bq__end__', iP1 + 5);

					if ((-1 === iP2 || iP3 < iP2) && iP1 < iP3)
					{
						sText = sText.substring(0, iP1) +
							convertBlockquote(sText.substring(iP1 + 13, iP3)) +
							sText.substring(iP3 + 11);

						iPos = 0;
					}
					else if (-1 < iP2 && iP2 < iP3)
					{
						iPos = iP2 - 1;
					}
					else
					{
						iPos = 0;
					}
				}
				else
				{
					break;
				}
			}

			sText = sText
				.replace(/__bq__start__/gm, '')
				.replace(/__bq__end__/gm, '')
			;

			return sText;
		},

		/**
		 * @param {string} sPlain
		 * @return {string}
		 */
		plainToHtml = function (sPlain)
		{
			sPlain = sPlain.toString().replace(/\r/g, '');

			var
				bIn = false,
				bDo = true,
				bStart = true,
				aNextText = [],
				sLine = '',
				iIndex = 0,
				aText = sPlain.split("\n")
			;

			do
			{
				bDo = false;
				aNextText = [];
				for (iIndex = 0; iIndex < aText.length; iIndex++)
				{
					sLine = aText[iIndex];
					bStart = '>' === sLine.substr(0, 1);
					if (bStart && !bIn)
					{
						bDo = true;
						bIn = true;
						aNextText.push('~~~blockquote~~~');
						aNextText.push(sLine.substr(1));
					}
					else if (!bStart && bIn)
					{
						bIn = false;
						aNextText.push('~~~/blockquote~~~');
						aNextText.push(sLine);
					}
					else if (bStart && bIn)
					{
						aNextText.push(sLine.substr(1));
					}
					else
					{
						aNextText.push(sLine);
					}
				}

				if (bIn)
				{
					bIn = false;
					aNextText.push('~~~/blockquote~~~');
				}

				aText = aNextText;
			}
			while (bDo);

			sPlain = aText.join("\n");

			sPlain = sPlain
				.replace(/&/g, '&amp;')
				.replace(/>/g, '&gt;').replace(/</g, '&lt;')
				.replace(/~~~blockquote~~~[\s]*/g, '<blockquote>')
				.replace(/[\s]*~~~\/blockquote~~~/g, '</blockquote>')
				.replace(/[\-_~]{10,}/g, '<hr />')
				.replace(/\n/g, '<br />');

			if ($.fn && $.fn.linkify)
			{
				sPlain = $div.html(sPlain)
					.linkify().find('.linkified').removeClass('linkified').end()
					.html();
			}

			return sPlain;
		}
	;

	CKEDITOR.plugins.add('plain', {
		lang: '',
		icons: 'plain',
		hidpi: true,
		init: function(editor)
		{
			if (editor.elementMode === CKEDITOR.ELEMENT_MODE_INLINE)
				return;

			var plain = CKEDITOR.plugins.plain;
			editor.addMode('plain', function(callback) {

				var
					contentsSpace = editor.ui.space('contents'),
					textarea = contentsSpace.getDocument().createElement('textarea')
				;

				textarea.setStyles(
					CKEDITOR.tools.extend({
						width: CKEDITOR.env.ie7Compat ? '99%' : '100%',
						height: '100%',
						resize: 'none',
						outline: 'none',
						'text-align': 'left'
					},
					CKEDITOR.tools.cssVendorPrefix('tab-size', 4)))
				;

				textarea.setAttribute('dir', 'ltr');
				textarea.addClass('cke_plain');

				contentsSpace.append(textarea);

				var editable = editor.editable(new plainEditable(editor, textarea));

				editable.setData(editor.getData(1));
				editor.__plain = editable;

				// Having to make <textarea> fixed sized to conquer the following bugs:
				// 1. The textarea height/width='100%' doesn't constraint to the 'td' in IE6/7.
				// 2. Unexpected vertical-scrolling behavior happens whenever focus is moving out of editor
				// if text content within it has overflowed. (#4762)
				if (CKEDITOR.env.ie) {
					editable.attachListener(editor, 'resize', onResize, editable);
					editable.attachListener(CKEDITOR.document.getWindow(), 'resize', onResize, editable);
					CKEDITOR.tools.setTimeout(onResize, 0, editable);
				}

				editor.fire('ariaWidget', this);
				callback();
			});

			editor.addCommand('plain', plain.commands.plain);

			if (editor.ui.addButton) {
				editor.ui.addButton('plain', {
					label: '',
					command: 'plain',
					toolbar: 'spec,10'
				});
			}

			editor.on('mode', function() {
				editor.getCommand('plain').setState(editor.mode === 'plain' ? CKEDITOR.TRISTATE_ON : CKEDITOR.TRISTATE_OFF);
				editor.editable().addClass('cke_enable_context_menu');
			});

			function onResize() {
				this.hide();
				this.setStyle('height', this.getParent().$.clientHeight + 'px');
				this.setStyle('width', this.getParent().$.clientWidth + 'px');
				this.show();
			}
		}
	});

	var plainEditable = CKEDITOR.tools.createClass({
		base: CKEDITOR.editable,
		proto: {
			setData: function(data) {
				this.setValue(htmlToPlain(data));
				this.editor.fire('dataReady');
			},
			setRawData: function(data) {
				this.setValue(data);
				this.editor.fire('dataReady');
			},
			getData: function() {
				return plainToHtml(this.getValue());
			},
			getRawData: function() {
				return this.getValue();
			},
			insertHtml: function() {},
			insertElement: function() {},
			insertText: function() {},
			setReadOnly: function( isReadOnly ) {
				this[(isReadOnly ? 'set' : 'remove') + 'Attribute' ]('readOnly', 'readonly');
			},
			detach: function() {
				plainEditable.baseProto.detach.call( this );
				this.clearCustomData();
				this.remove();
			}
		}
	});
})();

CKEDITOR.plugins.plain = {
	commands: {
		plain: {
			modes: {
				wysiwyg: 1, plain: 1
			},
			editorFocus: false,
			readOnly: 1,
			exec: function(editor) {
				if (editor.mode === 'wysiwyg') {
					editor.fire('saveSnapshot');
				}

				editor.getCommand('plain').setState(CKEDITOR.TRISTATE_DISABLED);
				editor.setMode(editor.mode === 'plain' ? 'wysiwyg' : 'plain');
			},
			canUndo: false
		}
	}
};
