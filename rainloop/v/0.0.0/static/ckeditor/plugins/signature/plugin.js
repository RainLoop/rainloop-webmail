
rl_signature_replacer = function (editor, sText, sSignature, bHtml, bInsertBefore)
{
	if (!bHtml)
	{
		sText = sText
			.replace(/\u200C([\s\S]*)\u200C/g, '<x-signature>$1</x-signature>')
			.replace(/\u200C/g, '')
		;
	}

	sText = sText.replace(/<x-signature>[\s\S]*<\/x-signature>/gm, '');

	var
		bEmptyText = '' === $.trim(sText),
		sNewLine = (bHtml ? '<br />' : "\n")
	;

	if (!bEmptyText && bHtml)
	{
		bEmptyText = '' !== $.trim(editor.__plainUtils.htmlToPlain(sText));
	}

	if (bInsertBefore)
	{
		sText = '<x-signature>' + sSignature + (bEmptyText ? '' : sNewLine) + '</x-signature>' + sText;
	}
	else
	{
		sText = sText + '<x-signature>' + (bEmptyText ? '' : sNewLine) + sSignature + '</x-signature>';
	}

	if (!bHtml)
	{
		sText = sText
			.replace(/<x-signature>([\s\S]*)<\/x-signature>/gm, '\u200C$1\u200C')
			.replace(/<x-signature>/gm, '')
			.replace(/<\/x-signature>/gm, '')
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
							rl_signature_replacer(editor, editor.__plain.getRawData(), sResultSignature, false, bInsertBefore));

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
							rl_signature_replacer(editor, editor.getData(), sResultSignature, true, bInsertBefore));
					}
				}
				catch (e) {}
			}
		});
	}
});