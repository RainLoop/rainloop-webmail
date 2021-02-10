import ko from 'ko';

import { delegateRunOnDestroy } from 'Common/UtilsUser';
import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';

import SieveStore from 'Stores/User/Sieve';
import Remote from 'Remote/User/Fetch';

import { SieveScriptModel } from 'Model/SieveScript';

import { showScreenPopup } from 'Knoin/Knoin';

import { SieveScriptPopupView } from 'View/Popup/SieveScript';

export class FiltersUserSettings {
	constructor() {
		this.scripts = SieveStore.scripts;
		this.loading = ko.observable(false).extend({ debounce: 200 });

		ko.addObservablesTo(this, {
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

			Remote.filtersGet((result, data) => {
				this.loading(false);
				this.scripts([]);

				if (StorageResultType.Success === result && data && data.Result) {
					SieveStore.capa(data.Result.Capa);
/*
					this.scripts(
						data.Result.Scripts.map(aItem => SieveScriptModel.reviveFromJson(aItem)).filter(v => v)
					);
*/
					Object.values(data.Result.Scripts).forEach(value => {
						value = SieveScriptModel.reviveFromJson(value);
						value && this.scripts.push(value)
					});
				} else {
					SieveStore.capa([]);
					this.setError(
						data && data.ErrorCode ? getNotification(data.ErrorCode) : getNotification(Notification.CantGetFilters)
					);
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
			(result, data) => {
				if (StorageResultType.Success === result && data && data.Result) {
					this.scripts.remove(script);
					delegateRunOnDestroy(script);
				} else {
					this.setError((data && data.ErrorCode)
						? (data.ErrorMessageAdditional || getNotification(data.ErrorCode))
						: getNotification(Notification.CantActivateFiltersScript)
					);
				}
			},
			script.name()
		);
	}

	toggleScript(script) {
		let name = script.active() ? '' : script.name();
		this.serverError(false);
		Remote.filtersScriptActivate(
			(result, data) => {
				if (StorageResultType.Success === result && data && data.Result) {
					this.scripts.forEach(script => script.active(script.name() === name));
				} else {
					this.setError((data && data.ErrorCode)
						? (data.ErrorMessageAdditional || getNotification(data.ErrorCode))
						: getNotification(Notification.CantActivateFiltersScript)
					);
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
