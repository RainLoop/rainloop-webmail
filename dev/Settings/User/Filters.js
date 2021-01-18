import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';

import FilterStore from 'Stores/User/Filter';
import SieveStore from 'Stores/User/Sieve';
import Remote from 'Remote/User/Fetch';

import { FilterModel } from 'Model/Filter';
import { SieveScriptModel } from 'Model/SieveScript';

import { showScreenPopup } from 'Knoin/Knoin';

class FiltersUserSettings {
	constructor() {
		this.filters = FilterStore.filters;
		this.sieve = SieveStore;
		this.scripts = SieveStore.scripts;

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
		if (!this.filters.loading()) {
			this.filters.loading(true);

			Remote.filtersGet((result, data) => {
				this.filters.loading(false);
				this.serverError(false);
				this.scripts([]);

				if (StorageResultType.Success === result && data && data.Result && Array.isArray(data.Result.Filters)) {
					this.serverError(false);

					this.filters(
						data.Result.Filters.map(aItem => FilterModel.reviveFromJson(aItem)).filter(v => v)
					);

					FilterStore.modules(data.Result.Capa);

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

					FilterStore.raw(data.Result.Scripts['rainloop.user.raw'].body);
					FilterStore.capa(data.Result.Capa.join(' '));
//					this.filterRaw.active(data.Result.Scripts['rainloop.user.raw'].active);
//					this.filterRaw.allow(!!data.Result.RawIsAllow);
				} else {
					this.filters([]);
					FilterStore.modules({});

					SieveStore.capa([]);

					FilterStore.raw('');
					FilterStore.capa({});

					this.serverError(true);
					this.serverErrorDesc(
						data && data.ErrorCode ? getNotification(data.ErrorCode) : getNotification(Notification.CantGetFilters)
					);
				}
			});
		}
	}

	addScript() {
		const script = new SieveScriptModel();
		showScreenPopup(require('View/Popup/SieveScript'), [
			script,
			() => {
				if (!this.scripts[script.name]) {
					this.scripts[script.name] = script.name;
				}
			},
			false
		]);
	}

	editScript(script) {
		showScreenPopup(require('View/Popup/SieveScript'), [
			script,
			() => {
				// TODO on save
			},
			true
		]);
	}

	deleteScript() {
		// TODO
	}

	toggleScript(script) {
		// TODO: activate/deactivate script
		script.active(!script.active());
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
