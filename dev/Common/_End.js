/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

$html.addClass(Globals.bMobileDevice ? 'mobile' : 'no-mobile');

$window.keydown(Utils.killCtrlAandS).keyup(Utils.killCtrlAandS);
$window.unload(function () {
	Globals.bUnload = true;
});

// export
window.rl = window.rl || {};
window.rl.addHook = Plugins.addHook;
window.rl.settingsGet = Plugins.mainSettingsGet;
window.rl.remoteRequest = Plugins.remoteRequest;
window.rl.pluginSettingsGet = Plugins.settingsGet;
window.rl.addSettingsViewModel = Utils.addSettingsViewModel;
window.rl.createCommand = Utils.createCommand;

window.rl.EmailModel = EmailModel;
window.rl.Enums = Enums;

window['__RLBOOT'] = function (fCall) {

	// boot
	$(function () {

		if (window['rainloopTEMPLATES'] && window['rainloopTEMPLATES'][0])
		{
			$('#rl-templates').html(window['rainloopTEMPLATES'][0]);
			
			window.setInterval(function () {
				Globals.minuteTick(!Globals.minuteTick());
			}, 1000 * 60);
			
			window.setInterval(function () {
				Globals.fiveMinuteTick(!Globals.fiveMinuteTick());
			}, 1000 * 60 * 5);

			_.delay(function () {
				window['rainloopAppData'] = {};
				window['rainloopI18N'] = {};
				window['rainloopTEMPLATES'] = {};

				kn.setBoot(RL).bootstart();

				$html.addClass('rl-started');
				
			}, 50);
		}
		else
		{
			fCall(false);
		}

		window['__RLBOOT'] = null;
	});
};
