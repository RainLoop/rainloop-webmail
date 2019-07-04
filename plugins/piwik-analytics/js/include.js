
$(function () {

	if (!window.rl)
	{
		return;
	}

	var
		sPiwikURL = '' + window.rl.pluginSettingsGet('piwik-analytics', 'piwik_url'),
		sSiteID = '' + window.rl.pluginSettingsGet('piwik-analytics', 'site_id')
	;

	if ('' !== sPiwikURL && '' !== sSiteID)
	{
		sPiwikURL = sPiwikURL.replace(/[\\\/\s]+$/, '') + '/';
		if (!/^https?:/i.test(sPiwikURL))
		{
			sPiwikURL = 'http://' + sPiwikURL;
		}

		window._paq = window._paq || [];
		(function(window){
			window._paq.push(['setSiteId', sSiteID]);
			window._paq.push(['setTrackerUrl', sPiwikURL + 'piwik.php']);
			window._paq.push(['trackPageView']);
			window.setInterval(function () {
				window._paq.push(['trackPageView']);
			}, 1000 * 60 * 2);
			var d = window.document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
			g.type = 'text/javascript'; g.defer = true; g.async = true; g.src = sPiwikURL + 'piwik.js';
			if (s && s.parentNode) {
				s.parentNode.insertBefore(g, s);
			}
		}(window));
	}
});