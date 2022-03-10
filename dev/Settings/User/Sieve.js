import { getNotification } from 'Common/Translator';

import Remote from 'Remote/User/Fetch';

//export class UserSettingsFilters /*extends AbstractViewSettings*/ {
export class UserSettingsSieve /*extends AbstractViewSettings*/ {
	constructor() {
		const Sieve = window.Sieve;
		this.scripts = Sieve.scripts;
		this.loading = Sieve.loading;
		this.serverError = Sieve.serverError;
		this.serverErrorDesc = Sieve.serverErrorDesc;
		this.scriptForDeletion = ko.observable(null).askDeleteHelper();
	}

	setError(text) {
		this.serverError(true);
		this.serverErrorDesc(text);
	}

	updateList() {
		window.Sieve.updateList();
	}

	addScript() {
		window.Sieve.ScriptView.showModal();
	}

	editScript(script) {
		window.Sieve.ScriptView.showModal([script]);
	}

	deleteScript(script) {
		this.serverError(false);
		Remote.request('FiltersScriptDelete',
			(iError, data) => {
				if (iError) {
					this.setError((data && data.ErrorMessageAdditional) || getNotification(iError));
				} else {
					this.scripts.remove(script);
				}
			},
			{name:script.name()}
		);
	}

	toggleScript(script) {
		let name = script.active() ? '' : script.name();
		this.serverError(false);
		Remote.request('FiltersScriptActivate',
			(iError, data) => {
				if (iError) {
					this.setError((data && data.ErrorMessageAdditional) || iError)
				} else {
					this.scripts.forEach(script => script.active(script.name() === name));
				}
			},
			{name:name}
		);
	}

	onBuild(oDom) {
		oDom.addEventListener('click', event => {
			const el = event.target.closestWithin('.script-item .e-action', oDom),
				script = el && ko.dataFor(el);
			script && this.editScript(script);
		});
	}

	onShow() {
		this.updateList();
	}
}
