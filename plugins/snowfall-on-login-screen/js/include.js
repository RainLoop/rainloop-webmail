
$(function () {
	if (window.snowFall && !window.rl.settingsGet('Auth'))
	{
		window.snowFall.snow(document.getElementsByTagName('body'), {
			shadow: true, round: true,  minSize: 2, maxSize: 5
		});
	}
});