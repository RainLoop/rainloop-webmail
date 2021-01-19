import ko from 'ko';

import { delegateRunOnDestroy } from 'Common/UtilsUser';
import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';

import SieveStore from 'Stores/User/Sieve';
import Remote from 'Remote/User/Fetch';

import { SieveScriptModel } from 'Model/SieveScript';

import { showScreenPopup } from 'Knoin/Knoin';

class FiltersUserSettings {
	constructor() {
		this.sieve = SieveStore;

		this.scripts = SieveStore.scripts;
		this.loading = ko.observable(false).extend({ throttle: 200 });

		ko.addObservablesTo(this, {
			serverError: false,
			serverErrorDesc: ''
		});

		this.serverError.subscribe((value) => {
			if (!value) {
				this.serverErrorDesc('');
			}
		}, this);

		this.scriptForDeletion = ko.observable(null).deleteAccessHelper();
	}

	updateList() {
		if (!this.loading()) {
			this.loading(true);

			Remote.filtersGet((result, data) => {
				this.loading(false);
				this.serverError(false);
				this.scripts([]);

				if (StorageResultType.Success === result && data && data.Result) {
					this.serverError(false);

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
					this.scripts([]);
					SieveStore.capa([]);
					this.serverError(true);
					this.serverErrorDesc(
						data && data.ErrorCode ? getNotification(data.ErrorCode) : getNotification(Notification.CantGetFilters)
					);
				}
			});
		}
	}

	addScript() {
		showScreenPopup(require('View/Popup/SieveScript'), [new SieveScriptModel()]);
	}

	editScript(script) {
		showScreenPopup(require('View/Popup/SieveScript'), [script]);
	}

	deleteScript(script) {
		if (!script.active()) {
			Remote.filtersScriptDelete(
				(result, data) => {
					if (StorageResultType.Success === result && data && data.Result) {
						this.scripts.remove(script);
						delegateRunOnDestroy(script);
					} else {
						this.saveError(true);
						this.saveErrorText((data && data.ErrorCode)
							? (data.ErrorMessageAdditional || getNotification(data.ErrorCode))
							: getNotification(Notification.CantActivateFiltersScript)
						);
					}
				},
				script.name()
			);
		}
	}

	toggleScript(script) {
		let name = script.active() ? '' : script.name();
		Remote.filtersScriptActivate(
			(result, data) => {
				if (StorageResultType.Success === result && data && data.Result) {
					this.scripts().forEach(script => script.active(script.name() === name));
				} else {
					this.saveError(true);
					this.saveErrorText((data && data.ErrorCode)
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

export { FiltersUserSettings, FiltersUserSettings as default };
