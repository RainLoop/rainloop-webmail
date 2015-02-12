
rl_signature_replacer = function (editor, sText, sSignature, bHtml, bInsertBefore)
{
	var
		bEmptyText = '' === $.trim(sText),
		sNewLine = (bHtml ? '<br />' : "\n")
	;

	if (!bEmptyText && bHtml)
	{
		bEmptyText = '' !== $.trim(editor.__plainUtils.htmlToPlain(sText));
	}

	if (!/\u0002\u0002/gm.test(sText))
	{
		sText = "\u0002\u0002\u0003\u0003" + sText;
	}

	if (!/\u0004\u0004/gm.test(sText))
	{
		sText = sText + "\u0004\u0004\u0005\u0005";
	}

	if (bInsertBefore)
	{
		sText = sText.replace(/\u0002\u0002[\s\S]*\u0003\u0003/gm, "\u0002\u0002" + sSignature + sNewLine + "\u0003\u0003");
		sText = sText.replace(/\u0004\u0004[\s\S]*\u0005\u0005/gm, "\u0004\u0004\u0005\u0005");
	}
	else
	{
		sText = sText.replace(/\u0002\u0002[\s\S]*\u0003\u0003/gm, "\u0002\u0002\u0003\u0003");
		sText = sText.replace(/\u0004\u0004[\s\S]*\u0005\u0005/gm, "\u0004\u0004" + (bEmptyText ? '' : sNewLine) + sSignature + "\u0005\u0005");
	}

	return sText;
};

CKEDITOR.plugins.add('signature', {
	init: function(editor) {
		editor.addCommand('insertSignature', {
			modes: { wysiwyg: 1, plain: 1 },
			exec: function (editor, cfg) {

				var
					bIsHtml = false,
					bInsertBefore = false,
					sSignature = ''
				;

				if (cfg) {
					bIsHtml = undefined === cfg.isHtml ? false : !!cfg.isHtml;
					bInsertBefore = undefined === cfg.insertBefore ? false : !!cfg.insertBefore;
					sSignature = undefined === cfg.signature ? '' : cfg.signature;
				}

				try {
					if ('plain' === editor.mode && editor.__plain && editor.__plainUtils) {
						if (bIsHtml && editor.__plainUtils.htmlToPlain) {
							sSignature = editor.__plainUtils.htmlToPlain(sSignature);
						}

						editor.__plain.setRawData(
							rl_signature_replacer(editor,
								editor.__plain.getRawData(), sSignature, false, bInsertBefore));

					} else {
						if (!bIsHtml && editor.__plainUtils && editor.__plainUtils.plainToHtml) {
							sSignature = editor.__plainUtils.plainToHtml(sSignature);
						}

						editor.setData(
							rl_signature_replacer(editor,
								editor.getData(), sSignature, true, bInsertBefore));
					}
				} catch (e) {}
			}
		});
	}
});