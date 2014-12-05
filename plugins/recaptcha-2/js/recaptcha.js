
$(function () {

	var
		nId = null,
		bStarted = false
	;

	function ShowRecaptcha()
	{
		if (window.grecaptcha)
		{
			if (null === nId)
			{
				$('#recaptcha-place').show();

				nId = window.grecaptcha.render('recaptcha-div', {
					'sitekey': window.rl.pluginSettingsGet('recaptcha-2', 'public_key'),
					'theme': window.rl.pluginSettingsGet('recaptcha-2', 'theme')
				});
			}
		}
	}

	window.__globalShowRecaptcha = ShowRecaptcha;

	function StartRecaptcha()
	{
		if (!window.grecaptcha && window.rl)
		{
			$.getScript('https://www.google.com/recaptcha/api.js?onload=__globalShowRecaptcha&render=explicit&hl=' + window.rl.settingsGet('Language'));
		}
		else
		{
			ShowRecaptcha();
		}
	}

	if (window.rl)
	{
		window.rl.addHook('user-login-submit', function (fSubmitResult) {
			if (null !== nId && !window.grecaptcha.getResponse(nId))
			{
				fSubmitResult(105);
			}
		});

		window.rl.addHook('view-model-on-show', function (sName, oViewModel) {
			if (!bStarted && oViewModel &&
				('View:RainLoop:Login' === sName || 'View/App/Login' === sName || 'LoginViewModel' === sName || 'LoginAppView' === sName) &&
				window.rl.pluginSettingsGet('recaptcha-2', 'show_captcha_on_login'))
			{
				bStarted = true;
				StartRecaptcha();
			}
		});

		window.rl.addHook('ajax-default-request', function (sAction, oParameters) {
			if ('Login' === sAction && oParameters && null !== nId && window.grecaptcha)
			{
				oParameters['RecaptchaResponse'] = window.grecaptcha.getResponse(nId);
			}
		});

		window.rl.addHook('ajax-default-response', function (sAction, oData, sType) {
			if ('Login' === sAction)
			{
				if (!oData || 'success' !== sType || !oData['Result'])
				{
					if (null !== nId && window.grecaptcha)
					{
						window.grecaptcha.reset(nId);
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