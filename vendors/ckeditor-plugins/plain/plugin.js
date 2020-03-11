
(function() {

	var
		selectRange = function (el, start, end) {
			if (!el) {
				return;
			}
			if (end === undefined) {
				end = start;
			}
			if('selectionStart' in el) {
				el.selectionStart = start;
				el.selectionEnd = end;
			} else if(el.setSelectionRange) {
				el.setSelectionRange(start, end);
			} else if(el.createTextRange) {
				var range = el.createTextRange();
				range.collapse(true);
				range.moveEnd('character', end);
				range.moveStart('character', start);
				range.select();
			}
		},
		toTop = function (el) {
			selectRange(el, 0);
			if (el) {
				el.scrollTop = 0;
			}
		},
		simplePlainToHtml = function (sPlain) {
			return sPlain
				.replace(/&/g, '&amp;')
				.replace(/>/g, '&gt;').replace(/</g, '&lt;')
				.replace(/[\-_~]{10,}/g, '<hr />')
				.replace(/\n/g, '<br />')
				.replace(/ /g, '&nbsp;')
			;
		},
		simpleHtmlToPlain = function (sHtml) {

			var sText = sHtml
				.replace(/[\s]+/gm, ' ')
				.replace(/<br[^>]*>/gmi, '\n')
				.replace(/<\/h[\d]>/gi, '\n')
				.replace(/<\/p>/gi, '\n\n')
				.replace(/<\/li>/gi, '\n')
				.replace(/<\/td>/gi, '\n')
				.replace(/<\/tr>/gi, '\n')
				.replace(/<\/div>/gi, '\n')
				.replace(/<blockquote[^>]*>/gmi, '\n')
				.replace(/<\/blockquote>/gi, '\n')
				.replace(/<hr[^>]*>/gmi, '\n_______________________________\n\n')
				.replace(/&nbsp;/gi, ' ')
				.replace(/&quot;/gi, '"')
				.replace(/<[^>]*>/gm, '')
			;

			sText = $('<div></div>').html(sText).text();

			sText = sText
				.replace(/\n[ \t]+/gm, '\n')
				.replace(/[\n]{3,}/gm, '\n\n')
				.replace(/&gt;/gi, '>')
				.replace(/&lt;/gi, '<')
				.replace(/&amp;/gi, '&')
			;

			return sText;
		}
	;

	CKEDITOR.plugins.add('plain', {
		lang: '',
		icons: 'plain',
		hidpi: true,
		init: function(editor)
		{
			if (editor.elementMode === CKEDITOR.ELEMENT_MODE_INLINE) {
				return;
			}

			editor.__textUtils = {
				plainToHtml: function(data) {
					return window.rainloop_Utils_plainToHtml ?
						window.rainloop_Utils_plainToHtml(data, true) : simplePlainToHtml(data);
				},
				htmlToPlain: function(data) {
					return window.rainloop_Utils_htmlToPlain ?
						window.rainloop_Utils_htmlToPlain(data, true) : simpleHtmlToPlain(data);
				}
			};

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

				CKEDITOR.plugins.clipboard.preventDefaultDropOnElement(textarea);

				contentsSpace.append(textarea);

				var editable = editor.editable(new plainEditable(editor, textarea));

				editable.setData(editor.getData(1));
				editor.__plain = editable;
				editor.__textarea = textarea.$;

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
					label: window.rl && window.rl.i18n ? window.rl.i18n('EDITOR/TEXT_SWITCHER_PLAINT_TEXT') : 'Plain',
					command: 'plain',
					toolbar: 'spec,10'
				});
			}

			editor.on('mode', function() {
				editor.getCommand('plain').setState(editor.mode === 'plain' ? CKEDITOR.TRISTATE_ON : CKEDITOR.TRISTATE_OFF);
				editor.editable().addClass('cke_enable_context_menu');

				editor.focus();

				if (editor.mode === 'plain') {
					toTop(editor.__textarea);
				}
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
				this.setValue(this.editor.__textUtils.htmlToPlain(data));
				this.editor.fire('dataReady');
			},
			setRawData: function(data) {
				this.setValue(data);
				this.editor.fire('dataReady');
			},
			getData: function() {
				return this.editor.__textUtils.plainToHtml(this.getValue());
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

	CKEDITOR.plugins.plain = {
		commands: {
			plain: {
				modes: {
					wysiwyg: 1, plain: 1
				},
				editorFocus: true,
				readOnly: false,
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
}());
