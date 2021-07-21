// Do the following things once the document is fully loaded.
document.onreadystatechange = function () {
	if (document.readyState === 'complete') {
		watchIFrameTitle();
	}
}

// The SnappyMail application is already configured to modify the <title> element
// of its root document with the number of unread messages in the inbox.
// However, its document is the SnappyMail iframe. This function sets up a
// Mutation Observer to watch the <title> element of the iframe for changes in
// the unread message count and propagates that to the parent <title> element,
// allowing the unread message count to be displayed in the NC tab's text when
// the SnappyMail app is selected.
function watchIFrameTitle() {
	iframe = document.getElementById('rliframe');
	if (!iframe) {
		return;
	}
	target = iframe.contentDocument.getElementsByTagName('title')[0];
	config = {
		characterData: true,
		childList: true,
		subtree: true
	}
	observer = new MutationObserver(function(mutations) {
		title = mutations[0].target.innerText;
		if (title) {
			matches = title.match(/\(([0-9]+)\)/);
			if (matches) {
				document.title = '('+ matches[1] + ') ' + t('snappymail', 'Email') + ' - Nextcloud';
			} else {
				document.title = t('snappymail', 'Email') + ' - Nextcloud';
			}
		}
	});
	observer.observe(target, config);
}

function SnappyMailFormHelper(sID, sAjaxFile, fCallback)
{
	try
	{
		var
			oForm = $(sID),
			oSubmit = $('#snappymail-save-button', oForm),
			sSubmitValue = oSubmit.val(),
			oDesc = oForm.find('.snappymail-result-desc')
		;

		oSubmit.click(function (oEvent) {

			var oDefAjax = null;

			oEvent.preventDefault();

			oForm
				.addClass('snappymail-ajax')
				.removeClass('snappymail-error')
				.removeClass('snappymail-success')
			;

			oDesc.text('');
			oSubmit.val('...');

			oDefAjax = $.ajax({
				'type': 'POST',
				'async': true,
				'url': OC.filePath('snappymail', 'ajax', sAjaxFile),
				'data': oForm.serialize(),
				'dataType': 'json',
				'global': true
			});

			oDefAjax.always(function (oData) {

				var bResult = false;

				oForm.removeClass('snappymail-ajax');
				oSubmit.val(sSubmitValue);

				if (oData)
				{
					bResult = 'success' === oData['status'];
					if (oData['Message'])
					{
						oDesc.text(t('snappymail', oData['Message']));
					}
				}

				if (bResult)
				{
					oForm.addClass('snappymail-success');
				}
				else
				{
					oForm.addClass('snappymail-error');
					if ('' === oDesc.text())
					{
						oDesc.text(t('snappymail', 'Error'));
					}
				}

				if (fCallback)
				{
					fCallback(bResult, oData);
				}
			});

			return false;
		});
	}
	catch(e) {}
}
