
import window from 'window';
import _ from '_';
import $ from '$';
import {kill_CtrlA_CtrlS, detectDropdownVisibility, createCommand} from 'Common/Utils';
import {$win, $html, data as GlobalsData, bMobileDevice} from 'Common/Globals';
import Plugins from 'Common/Plugins';
import Translator from 'Common/Translator';
import EmailModel from 'Model/Email';
import * as Enums from 'Common/Enums';

export default (App) => {

	GlobalsData.__APP__ = App;

	$win
		.on('keydown', kill_CtrlA_CtrlS)
		.on('unload', () => {
			GlobalsData.bUnload = true;
		})
	;

	$html
		.addClass(bMobileDevice ? 'mobile' : 'no-mobile')
		.on('click.dropdown.data-api', () => {
			detectDropdownVisibility();
		})
	;

	const rl = window.rl || {};

	rl.i18n = _.bind(Translator.i18n, Translator);

	rl.addHook = _.bind(Plugins.addHook, Plugins);
	rl.settingsGet = _.bind(Plugins.mainSettingsGet, Plugins);
	rl.createCommand = createCommand;

	rl.addSettingsViewModel = _.bind(Plugins.addSettingsViewModel, Plugins);
	rl.addSettingsViewModelForAdmin = _.bind(Plugins.addSettingsViewModelForAdmin, Plugins);

	rl.pluginRemoteRequest = _.bind(Plugins.remoteRequest, Plugins);
	rl.pluginSettingsGet = _.bind(Plugins.settingsGet, Plugins);

	rl.EmailModel = EmailModel;
	rl.Enums = Enums;

	window.rl = rl;

	window.__APP_BOOT = (fErrorCallback) => {

		$(() => {

			_.delay(() => {

				if (window.rainloopTEMPLATES && window.rainloopTEMPLATES[0])
				{
					$('#rl-templates').html(window.rainloopTEMPLATES[0]);

					_.delay(() => {

						App.bootstart();

						$html
							.removeClass('no-js rl-booted-trigger')
							.addClass('rl-booted')
						;

					}, 10);
				}
				else
				{
					fErrorCallback();
				}

				window.__APP_BOOT = null;

			}, 10);

		});
	};
};
