import ko from 'ko';

import { getNotification } from 'Common/Translator';
import { addObservablesTo } from 'Common/Utils';
import { delegateRunOnDestroy } from 'Common/UtilsUser';

import { SieveUserStore } from 'Stores/User/Sieve';
import Remote from 'Remote/User/Fetch';

import { SieveScriptModel } from 'Model/SieveScript';

import { showScreenPopup } from 'Knoin/Knoin';

import { SieveScriptPopupView } from 'View/Popup/SieveScript';

export class FiltersUserSettings /*extends AbstractViewSettings*/ {
	constructor() {
		this.scripts = SieveUserStore.scripts;
		this.loading = ko.observable(false).extend({ debounce: 200 });

		addObservablesTo(this, {
			serverError: false,
			serverErrorDesc: ''
		});

		this.scriptForDeletion = ko.observable(null).deleteAccessHelper();
	}

	setError(text) {
		this.serverError(true);
		this.serverErrorDesc(text);
	}

	updateList() {
		if (!this.loading()) {
			this.loading(true);
			this.serverError(false);

			Remote.filtersGet((iError, data) => {
				this.loading(false);
				this.scripts([]);

				if (iError) {
					SieveUserStore.capa([]);
					this.setError(getNotification(iError));
				} else {
					SieveUserStore.capa(data.Result.Capa);
/*
					this.scripts(
						data.Result.Scripts.map(aItem => SieveScriptModel.reviveFromJson(aItem)).filter(v => v)
					);
*/
					Object.values(data.Result.Scripts).forEach(value => {
						value = SieveScriptModel.reviveFromJson(value);
						value && this.scripts.push(value)
					});
				}
			});
		}
	}

	addScript() {
		showScreenPopup(SieveScriptPopupView, [new SieveScriptModel()]);
	}

	editScript(script) {
		showScreenPopup(SieveScriptPopupView, [script]);
	}

	deleteScript(script) {
		this.serverError(false);
		Remote.filtersScriptDelete(
			(iError, data) => {
				if (iError) {
					this.setError((data && data.ErrorMessageAdditional) || getNotification(iError));
				} else {
					this.scripts.remove(script);
					delegateRunOnDestroy(script);
				}
			},
			script.name()
		);
	}

	toggleScript(script) {
		let name = script.active() ? '' : script.name();
		this.serverError(false);
		Remote.filtersScriptActivate(
			(iError, data) => {
				if (iError) {
					this.setError((data && data.ErrorMessageAdditional) || iError)
				} else {
					this.scripts.forEach(script => script.active(script.name() === name));
				}
			},
			name
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
