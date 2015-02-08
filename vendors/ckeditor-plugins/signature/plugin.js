
rl_signature_replacer = function (editor, sText, sSignature, bHtml, bInsertBefore)
{
	var
		bEmptyText = '' === $.trim(sText),
		sNewLine = (bHtml ? '<br />' : "\n"),
		sS1 = "\u0002\u0002",
		sE1 = "\u0003\u0003",
		sSS1 = '---1beg1---',
		sEE1 = '---1end1---',
		sS2 = "\u0004\u0004",
		sE2 = "\u0005\u0005",
		sSS2 = '---2beg2---',
		sEE2 = '---2end2---'
	;

	if (!bEmptyText && bHtml)
	{
		bEmptyText = '' !== $.trim(editor.__plainUtils.htmlToPlain(sText));
	}

	sText = sText.replace(sS1, sSS1).replace(sS1, sSS1).replace(sS1, sSS1).replace(sS1, sSS1);
	sText = sText.replace(sE1, sEE1).replace(sE1, sEE1).replace(sE1, sEE1).replace(sE1, sEE1);
	sText = sText.replace(sS2, sSS2).replace(sS2, sSS2).replace(sS2, sSS2).replace(sS2, sSS2);
	sText = sText.replace(sE2, sEE2).replace(sE2, sEE2).replace(sE2, sEE2).replace(sE2, sEE2);

	if (!/---1beg1---/gm.test(sText))
	{
		sText = sSS1 + sEE1 + sText;
	}

	if (!/---2beg2---/gm.test(sText))
	{
		sText = sText + sSS2 + sEE2;
	}

	if (bInsertBefore)
	{
		sText = sText.replace(/---1beg1---[\s\S]*---1end1---/gm, sSS1 + sSignature + sNewLine + sEE1);
		sText = sText.replace(/---2beg2---[\s\S]*---2end2---/gm, sSS2 + '' + sEE2);
	}
	else
	{
		sText = sText.replace(/---1beg1---[\s\S]*---1end1---/gm, sSS1 + '' + sEE1);
		sText = sText.replace(/---2beg2---[\s\S]*---2end2---/gm, sSS2 + (bEmptyText ? '' : sNewLine) + sSignature + sEE2);
	}

	sText = sText.replace(/---1beg1---/g, sS1);
	sText = sText.replace(/---1end1---/g, sE1);
	sText = sText.replace(/---2beg2---/g, sS2);
	sText = sText.replace(/---2end2---/g, sE2);

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