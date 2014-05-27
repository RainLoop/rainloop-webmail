
(function() {

	var

		$div = $('<div></div>'),

		trim = $.trim,

		/**
		 * @param {string} sHtml
		 * @return {string}
		 */
		htmlToPlain = function (sHtml)
		{
			var
				sText = '',
				sQuoteChar = '> ',

				convertBlockquote = function () {
					if (arguments && 1 < arguments.length)
					{
						var
							sText = trim(arguments[1])
								.replace(/__bq__start__([\s\S\n\r]*)__bq__end__/gm, convertBlockquote)
						;

						sText = '\n' + sQuoteChar + trim(sText).replace(/\n/gm, '\n' + sQuoteChar) + '\n>\n';

						return sText.replace(/\n([> ]+)/gm, function () {
							return (arguments && 1 < arguments.length) ? '\n' + trim(arguments[1].replace(/[\s]/, '')) + ' ' : '';
						});
					}

					return '';
				},

				convertDivs = function () {
					if (arguments && 1 < arguments.length)
					{
						var sText = trim(arguments[1]);
						if (0 < sText.length)
						{
							sText = sText.replace(/<div[^>]*>([\s\S\r\n]*)<\/div>/gmi, convertDivs);
							sText = '\n' + trim(sText) + '\n';
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
					return (arguments && 1 < arguments.length) ? trim(arguments[1]) : '';
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
				.replace(/&nbsp;/gi, ' ')
				.replace(/&gt;/gi, '>')
				.replace(/&lt;/gi, '<')
				.replace(/&amp;/gi, '&')
				.replace(/<[^>]*>/gm, '')
			;

			sText = sText
				.replace(/\n[ \t]+/gm, '\n')
				.replace(/[\n]{3,}/gm, '\n\n')
				.replace(/__bq__start__([\s\S\r\n]*)__bq__end__/gm, convertBlockquote)
				.replace(/__bq__start__/gm, '')
				.replace(/__bq__end__/gm, '')
			;

			return $div.html(sText).text();
		},

		/**
		 * @param {string} sPlain
		 * @return {string}
		 */
		plainToHtml = function (sPlain)
		{
			return sPlain.toString()
				.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;')
				.replace(/\r/g, '').replace(/\n/g, '<br />');
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
