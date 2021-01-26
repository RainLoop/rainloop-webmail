const config = {
	title: false,
	stylesSet: false,
	customConfig: '',
	contentsCss: '',
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

	removePlugins: 'liststyle',
	removeButtons: 'Format,Undo,Redo,Cut,Copy,Paste,Anchor,Strike,Subscript,Superscript,Image,SelectAll',
	removeDialogTabs: 'link:advanced;link:target;image:advanced;images:advanced',

	extraPlugins: 'plain,signature',

	allowedContent: true,
	extraAllowedContent: true,

	fillEmptyBlocks: false,
	ignoreEmptyParagraph: true,
	disableNativeSpellChecker: false,

	colorButton_enableAutomatic: false,
	colorButton_enableMore: true,

	font_defaultLabel: 'Arial',
	fontSize_defaultLabel: '13',
	fontSize_sizes: '10/10px;12/12px;13/13px;14/14px;16/16px;18/18px;20/20px;24/24px;28/28px;36/36px;48/48px'
},

htmlEditorLangsMap = {
	'ar_sa': 'ar-sa',
	'pt_br': 'pt-br',
	'zh_cn': 'zh-cn',
};

export function createCKEditor(element)
{
	const language = (rl.settings.get('Language') || 'en').toLowerCase(),
		noSource = !rl.settings.app('allowHtmlEditorSourceButton'),
		noBidi = !rl.settings.app('allowHtmlEditorBitiButtons');

	if (!config.__cfgInited) {
		config.__cfgInited = true;

		if (noSource) {
			config.removeButtons += ',Source';
		}

		if (noBidi) {
			config.removePlugins += ',bidi';
		}
	}

	config.enterMode = CKEDITOR.ENTER_BR;
	config.shiftEnterMode = CKEDITOR.ENTER_P;

	config.language = htmlEditorLangsMap[language] || language.substr(0,2);

	if (CKEDITOR.env) {
		CKEDITOR.env.isCompatible = true;
	}

	const editor = CKEDITOR.appendTo(element, config);

	editor.on('key', event => !(event && event.data && 'Tab' == event.data.key));

	if (window.FileReader) {
		editor.on('drop', event => {
			if (0 < event.data.dataTransfer.getFilesCount()) {
				const file = event.data.dataTransfer.getFile(0);
				if (file && event.data.dataTransfer.id && file.type && file.type.match(/^image/i)) {
					const id = event.data.dataTransfer.id,
						imageId = `[img=${id}]`,
						reader = new FileReader();

					reader.onloadend = () => {
						if (reader.result && 'wysiwyg' === editor.mode) {
							try {
								editor.setData(editor.getData().replace(imageId, `<img src="${reader.result}" />`));
							} catch (e) {} // eslint-disable-line no-empty
						}
					};

					reader.readAsDataURL(file);

					event.data.dataTransfer.setData('text/html', imageId);
				}
			}
		});
	}

	return editor;
}
