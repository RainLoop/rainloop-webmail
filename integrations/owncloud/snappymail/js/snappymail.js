/**
 * Nextcloud - SnappyMail mail plugin
 *
 * @author RainLoop Team, Nextgen-Networks (@nextgen-networks), Tab Fitts (@tabp0le), Pierre-Alain Bandinelli (@pierre-alain-b), SnappyMail
 *
 * Based initially on https://github.com/RainLoop/rainloop-webmail/tree/master/build/owncloud/rainloop-app
 */

// Do the following things once the document is fully loaded.
document.onreadystatechange = () => {
	if (document.readyState === 'complete') {
		watchIFrameTitle();
		let form = document.querySelector('form.snappymail');
		form && SnappyMailFormHelper(form);
	}
};

// The SnappyMail application is already configured to modify the <title> element
// of its root document with the number of unread messages in the inbox.
// However, its document is the SnappyMail iframe. This function sets up a
// Mutation Observer to watch the <title> element of the iframe for changes in
// the unread message count and propagates that to the parent <title> element,
// allowing the unread message count to be displayed in the NC tab's text when
// the SnappyMail app is selected.
function watchIFrameTitle() {
	let iframe = document.getElementById('rliframe');
	if (!iframe) {
		return;
	}
	let target = iframe.contentDocument.getElementsByTagName('title')[0];
	let config = {
		characterData: true,
		childList: true,
		subtree: true
	};
	let observer = new MutationObserver(mutations => {
		let title = mutations[0].target.innerText;
		if (title) {
			let matches = title.match(/\(([0-9]+)\)/);
			if (matches) {
				document.title = '('+ matches[1] + ') ' + t('snappymail', 'Email') + ' - Nextcloud';
			} else {
				document.title = t('snappymail', 'Email') + ' - Nextcloud';
			}
		}
	});
	observer.observe(target, config);
}

function SnappyMailFormHelper(oForm)
{
	try
	{
		var
			oSubmit = document.getElementById('snappymail-save-button'),
			sSubmitValue = oSubmit.textContent,
			oDesc = oForm.querySelector('.snappymail-result-desc')
		;

		oForm.addEventListener('submit', oEvent => {
			oEvent.preventDefault();

			oForm.classList.add('snappymail-fetch')
			oForm.classList.remove('snappymail-error')
			oForm.classList.remove('snappymail-success')

			oDesc.textContent = '';
			oSubmit.textContent = '...';

			let data = new FormData(oForm);
			data.set('appname', 'snappymail');

			fetch(OC.filePath('snappymail', 'fetch', oForm.getAttribute('action')), {
				mode: 'same-origin',
				cache: 'no-cache',
				redirect: 'error',
				referrerPolicy: 'no-referrer',
				credentials: 'same-origin',
				method: 'POST',
				headers: {},
				body: data
			})
			.then(response => response.json())
			.then(oData => {
				let bResult = 'success' === oData?.status;
				oForm.classList.remove('snappymail-fetch');
				oSubmit.textContent = sSubmitValue;
				if (oData?.Message) {
					oDesc.textContent = t('snappymail', oData.Message);
				}
				if (bResult) {
					oForm.classList.add('snappymail-success');
				} else {
					oForm.classList.add('snappymail-error');
					if ('' === oDesc.textContent) {
						oDesc.textContent = t('snappymail', 'Error');
					}
				}
			});

			return false;
		});
	}
	catch(e) {
		console.error(e);
	}
}
