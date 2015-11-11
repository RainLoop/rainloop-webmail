
(function (CKEDITOR, $, undefined) {

	'use strict';

	var rl_signature_replacer = function (editor, sText, sSignature, bHtml, bInsertBefore)
	{
		if (!bHtml)
		{
			sText = sText
				.replace(/\u200C([\s\S]*)\u200C/g, '\u0002$1\u0002')
				.replace(/\u200C/g, '')
			;
		}

		var
			sP = '~~~~@~~~~',
			bEmptyText = false,
			sNewLine = (bHtml ? '<br />' : "\n")
		;

		sText = sText.replace(/\u0002([\s\S]*)\u0002/gm, sP + '$1' + sP);

		if (editor.__previos_signature)
		{
			sText = sText
				.replace(sP + editor.__previos_signature + sP, '')
				.replace(sP + editor.__previos_signature + sP, '')
				.replace(sP + editor.__previos_signature + sP, '')
			;
		}

		sText = sText.replace(sP, '').replace(sP, '').replace(sP, '').replace(sP, '');

		bEmptyText = '' === $.trim(sText);
		if (!bEmptyText && bHtml)
		{
			bEmptyText = '' !== $.trim(editor.__plainUtils.htmlToPlain(sText));
		}

		if (bInsertBefore)
		{
			sText = "\u0002" + sSignature + (bEmptyText ? '' : sNewLine) + "\u0002" + sText;
			editor.__previos_signature = sSignature + (bEmptyText ? '' : sNewLine);
		}
		else
		{
			sText = sText + "\u0002" + (bEmptyText ? '' : sNewLine) + sSignature + "\u0002";
			editor.__previos_signature = (bEmptyText ? '' : sNewLine) + sSignature;
		}

		if (!bHtml)
		{
			sText = sText
				.replace(/\u0002([\s\S]*)\u0002/g, '\u200C$1\u200C')
				.replace(/\u0002/g, '')
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

}(CKEDITOR, $));
