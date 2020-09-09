import { data as GlobalsData, bMobileDevice, dropdownVisibility } from 'Common/Globals';
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
	addEventListener('unload', () => GlobalsData.bUnload = true);

	addEventListener('click', ()=>rl.Dropdowns.detectVisibility());

	rl.app = App;
	rl.logoutReload = () => App && App.logoutReload && App.logoutReload();

	rl.i18n = i18n;

	rl.addSettingsViewModel = Plugins.addSettingsViewModel;
	rl.addSettingsViewModelForAdmin = Plugins.addSettingsViewModelForAdmin;

	rl.settingsGet = Plugins.mainSettingsGet;
	rl.pluginSettingsGet = Plugins.settingsGet;
	rl.pluginRemoteRequest = Plugins.remoteRequest;

	rl.EmailModel = EmailModel;
	rl.Enums = Enums;

	rl.Dropdowns = [];
	rl.Dropdowns.registrate = function(element) {
		this.push(element);
		element.addEventListener('click', () => rl.Dropdowns.detectVisibility());
	};
	rl.Dropdowns.detectVisibility = (() =>
		dropdownVisibility(!!rl.Dropdowns.find(item => item.classList.contains('open')))
	).debounce(50);

	window.__APP_BOOT = fErrorCallback => {
		const doc = document,
			cb = () => setTimeout(() => {
				if (window.rainloopTEMPLATES && rainloopTEMPLATES[0]) {
					doc.getElementById('rl-templates').innerHTML = rainloopTEMPLATES[0];
					setTimeout(() => App.bootstart(), 10);
				} else {
					fErrorCallback();
				}

				window.__APP_BOOT = null;
			}, 10);
		('loading' !== doc.readyState) ? cb() : doc.addEventListener('DOMContentLoaded', cb);
	};
};
