
$(function () {
	if (window.snowFall && window.rl && !window.rl.settingsGet('Auth'))
	{
		var
			sUserAgent = (navigator.userAgent || '').toLowerCase(),
			bIsiOSDevice = -1 < sUserAgent.indexOf('iphone') || -1 < sUserAgent.indexOf('ipod') || -1 < sUserAgent.indexOf('ipad'),
			bIsAndroidDevice = -1 < sUserAgent.indexOf('android')
		;

		if (!bIsiOSDevice && !bIsAndroidDevice)
		{
			window.snowFall.snow(document.getElementsByTagName('body'), {
				shadow: true, round: true,  minSize: 2, maxSize: 5
			});
		}
	}
});