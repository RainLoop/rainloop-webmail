
rl_signature_replacer = function (editor, sText, sSignature, bHtml, bInsertBefore)
{
	if (!bHtml)
	{
		sText = sText
			.replace(/\u200C\u200C/g, '\u0002\u0002')
			.replace(/\u200D\u200D/g, '\u0003\u0003')
		;
	}

	var
		sTextWithoutSignature = sText
			.replace(/\u0002\u0002[\s\S]*\u0002\u0002/gm, '')
			.replace(/\u0003\u0003[\s\S]*\u0003\u0003/gm, ''),
		bEmptyText = '' === $.trim(sTextWithoutSignature),
		sNewLine = (bHtml ? '<br />' : "\n")
	;

	if (!bEmptyText && bHtml)
	{
		bEmptyText = '' !== $.trim(editor.__plainUtils.htmlToPlain(sTextWithoutSignature));
	}

	if (!/\u0002\u0002/gm.test(sText))
	{
		sText = "\u0002\u0002\u0002\u0002" + sText;
	}

	if (!/\u0003\u0003/gm.test(sText))
	{
		sText = sText + "\u0003\u0003\u0003\u0003";
	}

	if (bInsertBefore)
	{
		sText = sText.replace(/\u0002\u0002[\s\S]*\u0002\u0002/gm, "\u0002\u0002" + sSignature + (bEmptyText ? '' : sNewLine) + "\u0002\u0002");
		sText = sText.replace(/\u0003\u0003[\s\S]*\u0003\u0003/gm, "\u0003\u0003\u0003\u0003");
	}
	else
	{
		sText = sText.replace(/\u0002\u0002[\s\S]*\u0002\u0002/gm, "\u0002\u0002\u0002\u0002");
		sText = sText.replace(/\u0003\u0003[\s\S]*\u0003\u0003/gm, "\u0003\u0003" + (bEmptyText ? '' : sNewLine) + sSignature + "\u0003\u0003");
	}

	if (!bHtml)
	{
		sText = sText
			.replace(/\u0002\u0002/g, '\u200C\u200C')
			.replace(/\u0003\u0003/g, '\u200D\u200D')
		;
	}

	return sText;
};

CKEDITOR.plugins.add('signature', {
	init: function(editor) {
		editor.addCommand('insertSignature', {
			modes: { wysiwyg: 1, plain: 1 },
			exec: function (editor, cfg)
			{

				var
					bIsHtml = false,
					bInsertBefore = false,
					sSignature = '',
					sResultSignature = ''
				;

				if (cfg)
				{
					bIsHtml = undefined === cfg.isHtml ? false : !!cfg.isHtml;
					bInsertBefore = undefined === cfg.insertBefore ? false : !!cfg.insertBefore;
					sSignature = undefined === cfg.signature ? '' : cfg.signature;
				}

				sResultSignature = sSignature;

				try
				{
					if ('plain' === editor.mode && editor.__plain && editor.__plainUtils)
					{
						if (editor.__plainUtils && editor.__plainUtils.htmlToPlain)
						{
							if (bIsHtml)
							{
								sResultSignature = editor.__plainUtils.htmlToPlain(sResultSignature);
							}
						}

						editor.__plain.setRawData(
							rl_signature_replacer(editor,
								editor.__plain.getRawData(), sResultSignature, false, bInsertBefore));

					}
					else
					{
						if (editor.__plainUtils && editor.__plainUtils.plainToHtml)
						{
							if (!bIsHtml)
							{
								sResultSignature = editor.__plainUtils.plainToHtml(sResultSignature);
							}
						}

						editor.setData(
							rl_signature_replacer(editor,
								editor.getData(), sResultSignature, true, bInsertBefore));
					}
				}
				catch (e) {}
			}
		});
	}
});