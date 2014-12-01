
CKEDITOR.plugins.add('signature', {
	init: function(editor) {
		editor.addCommand('insertSignature', {
			exec: function (editor) {
				window.console.log(arguments);
				if ('wysiwyg' === editor.mode)
				{

				}
				else
				{

				}
			}
		});
	}
});
