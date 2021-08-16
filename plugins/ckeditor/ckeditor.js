(rl => {
	if (rl) {
		const path = (rl.settings.app('webVersionPath') || 'snappymail/v/' + rl.settings.app('version') + '/'),
			script = document.createElement('script');
		script.src = path + 'static/ckeditor/ckeditor.js';
		document.head.append(script);

		rl.createWYSIWYG = (container, onReady) => {
			if (!window.CKEDITOR) {
				return null;
			}

			const
				language = (rl.settings.get('Language') || 'en').toLowerCase(),
				htmlEditorLangsMap = {
					'ar_sa': 'ar-sa',
					'pt_br': 'pt-br',
					'zh_cn': 'zh-cn',
				},
				editor = CKEDITOR.appendTo(container, {
					title: false,
					stylesSet: false,
//					customConfig: '',
//					contentsCss: '',
					toolbarGroups: [
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

					removePlugins: 'liststyle' + (rl.settings.app('allowHtmlEditorBitiButtons') ? '' : ',bidi'),
					removeButtons: 'Format,Undo,Redo,Cut,Copy,Paste,Anchor,Strike,Subscript,Superscript,Image,SelectAll',
					removeDialogTabs: 'link:advanced;link:target;image:advanced;images:advanced',

					extraPlugins: 'plain,signature',

					allowedContent: true,
					extraAllowedContent: true,

					fillEmptyBlocks: false,
//					ignoreEmptyParagraph: true,
					disableNativeSpellChecker: false,

					colorButton_enableAutomatic: false,
//					colorButton_enableMore: true,

					font_defaultLabel: 'Arial',
					fontSize_defaultLabel: '13',
					fontSize_sizes: '10/10px;12/12px;13/13px;14/14px;16/16px;18/18px;20/20px;24/24px;28/28px;36/36px;48/48px',

					enterMode: CKEDITOR.ENTER_BR,
					shiftEnterMode: CKEDITOR.ENTER_P,
					language: htmlEditorLangsMap[language] || language.substr(0,2)
				});

			editor.on('key', event => !(event && event.data && 'Tab' == event.data.key));

			editor.on('drop', event => {
				const dt = event.data.dataTransfer,
					id = dt.id,
					file = dt.getFilesCount() ? dt.getFile(0) : 0;
				if (file && id && file.type && file.type.match(/^image/i)) {
					const imageId = `[img=${id}]`,
						reader = new FileReader();

					reader.onloadend = () => {
						if (reader.result && 'wysiwyg' === editor.mode) {
							try {
								editor.setData(editor.getData().replace(imageId, `<img src="${reader.result}"/>`));
							} catch (e) {} // eslint-disable-line no-empty
						}
					};

					reader.readAsDataURL(file);

					dt.setData('text/html', imageId);
				}
			});

			editor.on('instanceReady', onReady);

			return editor;
		}
	}

})(window.rl);
