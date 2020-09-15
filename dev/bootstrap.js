import { dropdownVisibility } from 'Common/Globals';
import * as Enums from 'Common/Enums';
import * as Plugins from 'Common/Plugins';
import { i18n } from 'Common/Translator';

export default (App) => {

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

	addEventListener('click', ()=>rl.Dropdowns.detectVisibility());

	rl.app = App;
	rl.logoutReload = () => App && App.logoutReload && App.logoutReload();

	rl.i18n = i18n;

	rl.addSettingsViewModel = Plugins.addSettingsViewModel;
	rl.addSettingsViewModelForAdmin = Plugins.addSettingsViewModelForAdmin;

	rl.settingsGet = Plugins.mainSettingsGet;
	rl.pluginSettingsGet = Plugins.settingsGet;
	rl.pluginRemoteRequest = Plugins.remoteRequest;

	rl.Enums = Enums;

	rl.Dropdowns = [];
	rl.Dropdowns.registrate = function(element) {
		this.push(element);
		element.addEventListener('click', () => rl.Dropdowns.detectVisibility());
	};
	rl.Dropdowns.detectVisibility = (() =>
		dropdownVisibility(!!rl.Dropdowns.find(item => item.classList.contains('open')))
	).debounce(50);

	rl.fetchJSON = (resource, init, timeout, postData) => {
		init = Object.assign({
			mode: 'same-origin',
			cache: 'no-cache',
			redirect: 'error',
			referrerPolicy: 'no-referrer',
			credentials: 'same-origin'
		}, init);

		if (postData) {
			init.method = 'POST';
			init.headers = {
//				'Content-Type': 'application/json'
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
			};
			postData.XToken = rl.settings.app('token');
//			init.body = JSON.stringify(postData);
			const formData = new FormData(),
			buildFormData = (formData, data, parentKey) => {
				if (data && typeof data === 'object' && !(data instanceof Date || data instanceof File)) {
					Object.keys(data).forEach(key =>
						buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key)
					);
				} else {
					formData.set(parentKey, data == null ? '' : data);
				}
			};
			buildFormData(formData, postData);
			init.body = new URLSearchParams(formData);
		}

		return fetch(resource, init).then(response => response.json());
/*
		let f = fetch(resource, init);
		if (reviver) {
			return f.then(response => response.text())
				.then(json => {
					try {
						return JSON.parse(json, reviver);
					} catch (e) {
						console.error(e);
						throw e;
					}
				});
		}
		return f.then(response => response.json());
*/
	};

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
