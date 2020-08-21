import { detectDropdownVisibility } from 'Common/Utils';
import { $html, $htmlCL, data as GlobalsData, bMobileDevice } from 'Common/Globals';
import * as Enums from 'Common/Enums';
import * as Plugins from 'Common/Plugins';
import { i18n } from 'Common/Translator';
import { EmailModel } from 'Model/Email';

export default (App) => {
	GlobalsData.__APP__ = App;

	addEventListener('keydown', event => {
		event = event || window.event;
		if (event && event.ctrlKey && !event.shiftKey && !event.altKey) {
			const key = event.keyCode || event.which;
			if (key === Enums.EventKeyCode.S) {
				event.preventDefault();
				return;
			} else if (key === Enums.EventKeyCode.A) {
				const sender = event.target || event.srcElement;
				if (
					sender &&
					('true' === '' + sender.contentEditable || (sender.tagName && sender.tagName.match(/INPUT|TEXTAREA/i)))
				) {
					return;
				}

				getSelection().removeAllRanges();

				event.preventDefault();
			}
		}
	});
	addEventListener('unload', () => {
		GlobalsData.bUnload = true;
	});

	$htmlCL.add(bMobileDevice ? 'mobile' : 'no-mobile');
	$html.on('click.dropdown.data-api', detectDropdownVisibility);

	const rl = window.rl || {};

	rl.i18n = i18n;

	rl.addSettingsViewModel = Plugins.addSettingsViewModel;
	rl.addSettingsViewModelForAdmin = Plugins.addSettingsViewModelForAdmin;

	rl.settingsGet = Plugins.mainSettingsGet;
	rl.pluginSettingsGet = Plugins.settingsGet;
	rl.pluginRemoteRequest = Plugins.remoteRequest;

	rl.EmailModel = EmailModel;
	rl.Enums = Enums;

	window.rl = rl;

	const start = () => {
		setTimeout(() => {
			$htmlCL.remove('no-js', 'rl-booted-trigger');
			$htmlCL.add('rl-booted');

			App.bootstart();
		}, 10);
	};

	window.__APP_BOOT = fErrorCallback => {
		jQuery(() => {
			setTimeout(() => {
				if (window.rainloopTEMPLATES && rainloopTEMPLATES[0]) {
					document.getElementById('rl-templates').innerHTML = rainloopTEMPLATES[0];
					start();
				} else {
					fErrorCallback();
				}

				window.__APP_BOOT = null;
			}, 10);
		});
	};
};
