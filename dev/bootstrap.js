import window from 'window';
import { killCtrlACtrlS, detectDropdownVisibility, createCommandLegacy, domReady } from 'Common/Utils';
import { $win, $html, data as GlobalsData, bMobileDevice } from 'Common/Globals';
import * as Enums from 'Common/Enums';
import * as Plugins from 'Common/Plugins';
import { i18n } from 'Common/Translator';
import { EmailModel } from 'Model/Email';

export default (App) => {
	GlobalsData.__APP__ = App;

	$win.on('keydown', killCtrlACtrlS).on('unload', () => {
		GlobalsData.bUnload = true;
	});

	$html.addClass(bMobileDevice ? 'mobile' : 'no-mobile').on('click.dropdown.data-api', detectDropdownVisibility);

	const rl = window.rl || {};

	rl.i18n = i18n;
	rl.createCommand = createCommandLegacy;

	rl.addSettingsViewModel = Plugins.addSettingsViewModel;
	rl.addSettingsViewModelForAdmin = Plugins.addSettingsViewModelForAdmin;

	rl.addHook = Plugins.addHook;
	rl.settingsGet = Plugins.mainSettingsGet;
	rl.pluginSettingsGet = Plugins.settingsGet;
	rl.pluginRemoteRequest = Plugins.remoteRequest;

	rl.EmailModel = EmailModel;
	rl.Enums = Enums;

	window.rl = rl;

	const start = () => {
		window.setTimeout(() => {
			$html.removeClass('no-js rl-booted-trigger').addClass('rl-booted');

			App.bootstart();
		}, Enums.Magics.Time10ms);
	};

	window.__APP_BOOT = (fErrorCallback) => {
		domReady(() => {
			window.setTimeout(() => {
				if (window.document.getElementById('rainloop-templates-id')) {
					start();
				} else if (window.rainloopTEMPLATES && window.rainloopTEMPLATES[0]) {
					window.document.getElementById('rl-templates').innerHTML = window.rainloopTEMPLATES[0];
					start();
				} else {
					fErrorCallback();
				}

				window.__APP_BOOT = null;
			}, Enums.Magics.Time10ms);
		});
	};
};
