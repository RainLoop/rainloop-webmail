
$(function () {

	if (!window.rl)
	{
		return;
	}

	var
		sAccount = window.rl.pluginSettingsGet('google-analytics', 'account'),
		sDomain = window.rl.pluginSettingsGet('google-analytics', 'domain_name'),
		bUniversalAnalytics = !!window.rl.pluginSettingsGet('google-analytics', 'universal_analytics'),
		bTrackPageview = !!window.rl.pluginSettingsGet('google-analytics', 'track_pageview'),
		bSendEvent = !!window.rl.pluginSettingsGet('google-analytics', 'send_events'),
		fSendEvent = null
	;

	if (sAccount && '' !== sAccount)
	{
		if (bUniversalAnalytics)
		{
			(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
				(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
				m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
			})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

			if (window.ga)
			{
				if (sDomain)
				{
					window.ga('create', sAccount, sDomain);
				}
				else
				{
					window.ga('create', sAccount);
				}

				if (bTrackPageview)
				{
					window.ga('send', 'pageview');
					window.setInterval(function () {
						window.ga('send', 'pageview');
					}, 1000 * 60 * 2);
				}

				if (bSendEvent)
				{
					fSendEvent = function(sCategory, sAction, sLabel) {
						window.ga('send', 'event', sCategory, sAction, sLabel);
					};
				}
			}
		}
		else
		{
			window._gaq = window._gaq || [];
			window._gaq.push(['_setAccount', sAccount]);

			if (sDomain)
			{
				window._gaq.push(['_setDomainName', sDomain]);
			}

			if (bTrackPageview)
			{
				window._gaq.push(['_trackPageview']);
				window.setInterval(function () {
					window._gaq.push(['_trackPageview']);
				}, 1000 * 60 * 2);
			}

			if (bSendEvent)
			{
				fSendEvent = function(sCategory, sAction, sLabel) {
					window._gaq.push(['_trackEvent', sCategory, sAction, sLabel]);
				};
			}

			var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
			ga.src = ('https:' === document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
			var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
		}

		if (fSendEvent)
		{
			window.rl.addHook('ajax-default-response', function (sAction, oData, sType) {
				switch (sAction)
				{
					case 'Login':
					case 'SendMessage':
					case 'MessageMove':
					case 'MessageDelete':
						fSendEvent('RainLoop', sAction,
							'success' === sType && oData && oData['Result'] ? 'true' : 'false');
						break;
				}
			});
		}
	}
});