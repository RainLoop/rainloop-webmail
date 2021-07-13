
if (!/iphone|ipod|ipad|android/i.test(navigator.userAgent))
{
	document.addEventListener('DOMContentLoaded', () => {
		if (window.snowFall && window.rl && !rl.settings.get('Auth'))
		{
			window.snowFall.snow(document.getElementsByTagName('body'), {
				shadow: true, round: true,  minSize: 2, maxSize: 5
			});
		}
	});
}
