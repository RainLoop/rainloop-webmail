
function RainLoopFormHelper(sID, sAjaxFile, fCallback)
{
	try
	{
		var
			oForm = $(sID),
			oSubmit = $('#rainloop-save-button', oForm),
			sSubmitValue = oSubmit.val(),
			oDesc = oForm.find('.rainloop-result-desc')
		;

		oSubmit.click(function (oEvent) {

			var oDefAjax = null;

			oEvent.preventDefault();

			oForm
				.addClass('rainloop-ajax')
				.removeClass('rainloop-error')
				.removeClass('rainloop-success')
			;

			oDesc.text('');
			oSubmit.val('...');

			oDefAjax = $.ajax({
				'type': 'POST',
				'async': true,
				'url': OC.filePath('rainloop', 'ajax', sAjaxFile),
				'data': oForm.serialize(),
				'dataType': 'json',
				'global': true
			});

			oDefAjax.always(function (oData) {

				var bResult = false;

				oForm.removeClass('rainloop-ajax');
				oSubmit.val(sSubmitValue);

				if (oData)
				{
					bResult = 'success' === oData['status'];
					if (oData['Message'])
					{
						oDesc.text(oData['Message']);
					}
				}

				if (bResult)
				{
					oForm.addClass('rainloop-success');
				}
				else
				{
					oForm.addClass('rainloop-error');
					if ('' === oDesc.text())
					{
						oDesc.text('Error');
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
