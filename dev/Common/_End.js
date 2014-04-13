/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

$html.addClass(Globals.bMobileDevice ? 'mobile' : 'no-mobile');

$window.keydown(Utils.killCtrlAandS).keyup(Utils.killCtrlAandS);
$window.unload(function () {
	Globals.bUnload = true;
});

$html.on('click.dropdown.data-api', function () {
	Utils.detectDropdownVisibility();
});

// export
window['rl'] = window['rl'] || {};
window['rl']['addHook'] = Plugins.addHook;
window['rl']['settingsGet'] = Plugins.mainSettingsGet;
window['rl']['remoteRequest'] = Plugins.remoteRequest;
window['rl']['pluginSettingsGet'] = Plugins.settingsGet;
window['rl']['addSettingsViewModel'] = Utils.addSettingsViewModel;
window['rl']['createCommand'] = Utils.createCommand;

window['rl']['EmailModel'] = EmailModel;
window['rl']['Enums'] = Enums;

window['__RLBOOT'] = function (fCall) {

	// boot
	$(function () {

		if (window['rainloopTEMPLATES'] && window['rainloopTEMPLATES'][0])
		{
			$('#rl-templates').html(window['rainloopTEMPLATES'][0]);

			_.delay(function () {
				window['rainloopAppData'] = {};
				window['rainloopI18N'] = {};
				window['rainloopTEMPLATES'] = {};

				kn.setBoot(RL).bootstart();
				$html.removeClass('no-js rl-booted-trigger').addClass('rl-booted');
				
			}, 50);
		}
		else
		{
			fCall(false);
		}

		window['__RLBOOT'] = null;
	});
};
