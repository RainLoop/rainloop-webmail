import window from 'window';
import { detectDropdownVisibility, createCommandLegacy, domReady } from 'Common/Utils';
import { $html, $htmlCL, data as GlobalsData, bMobileDevice } from 'Common/Globals';
import * as Enums from 'Common/Enums';
import * as Plugins from 'Common/Plugins';
import { i18n } from 'Common/Translator';
import { EmailModel } from 'Model/Email';

export default (App) => {
	GlobalsData.__APP__ = App;

	window.addEventListener('keydown', event => {
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

				if (window.getSelection) {
					window.getSelection().removeAllRanges();
				} else if (window.document.selection && window.document.selection.clear) {
					window.document.selection.clear();
				}

				event.preventDefault();
			}
		}
	});
	window.addEventListener('unload', () => {
		GlobalsData.bUnload = true;
	});

	$htmlCL.add(bMobileDevice ? 'mobile' : 'no-mobile');
	$html.on('click.dropdown.data-api', detectDropdownVisibility);

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
			$htmlCL.remove('no-js', 'rl-booted-trigger');
			$htmlCL.add('rl-booted');

			App.bootstart();
		}, Enums.Magics.Time10ms);
	};

	window.__APP_BOOT = (fErrorCallback) => {
		domReady(() => {
			window.setTimeout(() => {
				if (window.rainloopTEMPLATES && window.rainloopTEMPLATES[0]) {
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
