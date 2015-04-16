
$(function () {

	var
		bStarted = false,
		bShown = false
	;

	function ShowRecaptcha()
	{
		if (window.Recaptcha)
		{
			if (bShown)
			{
				window.Recaptcha.reload();
			}
			else
			{
				window.Recaptcha.create(window.rl.pluginSettingsGet('recaptcha', 'public_key'), 'recaptcha-place', {
					'theme': 'custom',
					'lang': window.rl.settingsGet('Language')
				});
			}

			bShown = true;
		}
	}

	function StartRecaptcha()
	{
		if (!window.Recaptcha)
		{
			$.getScript('//www.google.com/recaptcha/api/js/recaptcha_ajax.js', ShowRecaptcha);
		}
		else
		{
			ShowRecaptcha();
		}
	}

	if (window.rl)
	{
		window.rl.addHook('view-model-on-show', function (sName, oViewModel) {
			if (!bStarted && oViewModel &&
				('View:RainLoop:Login' === sName || 'View/App/Login' === sName || 'LoginViewModel' === sName || 'LoginAppView' === sName) &&
				window.rl.pluginSettingsGet('recaptcha', 'show_captcha_on_login'))
			{
				bStarted = true;
				StartRecaptcha();
			}
		});

		window.rl.addHook('ajax-default-request', function (sAction, oParameters) {
			if ('Login' === sAction && oParameters && bShown && window.Recaptcha)
			{
				oParameters['RecaptchaChallenge'] = window.Recaptcha.get_challenge();
				oParameters['RecaptchaResponse'] = window.Recaptcha.get_response();
			}
		});

		window.rl.addHook('ajax-default-response', function (sAction, oData, sType) {
			if ('Login' === sAction)
			{
				if (!oData || 'success' !== sType || !oData['Result'])
				{
					if (bShown && window.Recaptcha)
					{
						window.Recaptcha.reload();
					}
					else if (oData && oData['Captcha'])
					{
						StartRecaptcha();
					}
				}
			}
		});
	}
});