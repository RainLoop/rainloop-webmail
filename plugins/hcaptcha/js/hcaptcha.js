(function ($, window) {

	$(function () {

		var
			nId = null,
			bStarted = false
		;

		function ShowHcaptcha()
		{
			if (window.hcaptcha && window.rl)
			{
				if (null === nId)
				{
					var
						oEl = null,
						oLink = $('.plugin-mark-Login-BottomControlGroup')
					;

					if (oLink && oLink[0])
					{
						oEl = $('<div class="controls"></div>');

						$(oLink[0]).after(oEl);

						nId = window.hcaptcha.render(oEl[0], {
							'sitekey': window.rl.pluginSettingsGet('hcaptcha', 'site_key'),
							'theme': window.rl.pluginSettingsGet('hcaptcha', 'theme')
						});
					}
				}
			}
		}

		window.__globalShowHcaptcha = ShowHcaptcha;

		function StartHcaptcha()
		{
			if (!window.hcaptcha && window.rl)
			{
				$.getScript('https://hcaptcha.com/1/api.js?onload=__globalShowHcaptcha&render=explicit');
			}
			else
			{
				ShowHcaptcha();
			}
		}

		if (window.rl)
		{
			window.rl.addHook('user-login-submit', function (fSubmitResult) {
				if (null !== nId && !window.hcaptcha.getResponse(nId))
				{
					fSubmitResult(105);
				}
			});

			window.rl.addHook('view-model-on-show', function (sName, oViewModel) {
				if (!bStarted && oViewModel &&
					('View:RainLoop:Login' === sName || 'View/App/Login' === sName || 'LoginViewModel' === sName || 'LoginAppView' === sName) &&
					window.rl.pluginSettingsGet('hcaptcha', 'show_captcha_on_login'))
				{
					bStarted = true;
					StartHcaptcha();
				}
			});

			window.rl.addHook('ajax-default-request', function (sAction, oParameters) {
				if ('Login' === sAction && oParameters && null !== nId && window.hcaptcha)
				{
					oParameters['h-captcha-response'] = window.hcaptcha.getResponse(nId);
				}
			});

			window.rl.addHook('ajax-default-response', function (sAction, oData, sType) {
				if ('Login' === sAction)
				{
					if (!oData || 'success' !== sType || !oData['Result'])
					{
						if (null !== nId && window.hcaptcha)
						{
							window.hcaptcha.reset(nId);
						}
						else if (oData && oData['Captcha'])
						{
							StartHcaptcha();
						}
					}
				}
			});
		}
	});

}($, window));
