/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	module.exports = function (App) {

		var
			window = require('window'),
			_ = require('_'),
			$ = require('$'),
			$win = require('$win'),
			$html = require('$html'),

			Globals = require('Globals'),
			Plugins = require('Plugins'),
			Utils = require('Utils'),
			Enums = require('Enums'),

			EmailModel = require('Model:Email')
		;

		Globals.__APP = App;

		App.setupSettings();

		Plugins.__boot = App;
		Plugins.__remote = App.remote();
		Plugins.__data = App.data();

		$html.addClass(Globals.bMobileDevice ? 'mobile' : 'no-mobile');

		$win.keydown(Utils.killCtrlAandS).keyup(Utils.killCtrlAandS);
		
		$win.unload(function () {
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
		window['rl']['createCommand'] = Utils.createCommand;

		window['rl']['EmailModel'] = EmailModel;
		window['rl']['Enums'] = Enums;

		window['__APP_BOOT'] = function (fCall) {

			// boot
			$(function () {

				if (window['rainloopTEMPLATES'] && window['rainloopTEMPLATES'][0])
				{
					$('#rl-templates').html(window['rainloopTEMPLATES'][0]);

					_.delay(function () {

						App.bootstart();
						$html.removeClass('no-js rl-booted-trigger').addClass('rl-booted');

					}, 10);
				}
				else
				{
					fCall(false);
				}

				window['__APP_BOOT'] = null;
			});
		};

	};

}(module, require));