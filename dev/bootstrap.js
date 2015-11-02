
(function () {

	'use strict';

	module.exports = function (App) {

		var
			window = require('window'),
			_ = require('_'),
			$ = require('$'),

			Globals = require('Common/Globals'),
			Plugins = require('Common/Plugins'),
			Utils = require('Common/Utils'),
			Enums = require('Common/Enums'),
			Translator = require('Common/Translator'),

			EmailModel = require('Model/Email')
		;

		Globals.__APP__ = App;

		Globals.$win
			.keydown(Utils.kill_CtrlA_CtrlS)
			.unload(function () {
				Globals.bUnload = true;
			})
		;

		Globals.$html
			.addClass(Globals.bMobileDevice ? 'mobile' : 'no-mobile')
			.on('click.dropdown.data-api', function () {
				Utils.detectDropdownVisibility();
			})
		;

		// export
		window['rl'] = window['rl'] || {};
		window['rl']['i18n'] = _.bind(Translator.i18n, Translator);

		window['rl']['addHook'] = _.bind(Plugins.addHook, Plugins);
		window['rl']['settingsGet'] = _.bind(Plugins.mainSettingsGet, Plugins);
		window['rl']['createCommand'] = Utils.createCommand;

		window['rl']['addSettingsViewModel'] = _.bind(Plugins.addSettingsViewModel, Plugins);

		window['rl']['pluginRemoteRequest'] = _.bind(Plugins.remoteRequest, Plugins);
		window['rl']['pluginSettingsGet'] = _.bind(Plugins.settingsGet, Plugins);

		window['rl']['EmailModel'] = EmailModel;
		window['rl']['Enums'] = Enums;

		window['__APP_BOOT'] = function (fCall) {

			$(_.delay(function () {

				if (!$('#rl-content').is(':visible'))
				{
					Globals.$html.addClass('no-css');
				}

				if (window['rainloopTEMPLATES'] && window['rainloopTEMPLATES'][0])
				{
					$('#rl-templates').html(window['rainloopTEMPLATES'][0]);

					_.delay(function () {

						App.bootstart();

						Globals.$html
							.removeClass('no-js rl-booted-trigger')
							.addClass('rl-booted')
						;

					}, 10);
				}
				else
				{
					fCall(false);
				}

				window['__APP_BOOT'] = null;

			}, 10));
		};

	};

}());