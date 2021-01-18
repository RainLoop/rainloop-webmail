import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';

import FilterStore from 'Stores/User/Filter';
import SieveStore from 'Stores/User/Sieve';
import Remote from 'Remote/User/Fetch';

import { FilterModel } from 'Model/Filter';
import { SieveScriptModel } from 'Model/SieveScript';

import { showScreenPopup, command } from 'Knoin/Knoin';

class FiltersUserSettings {
	constructor() {
		this.modules = FilterStore.modules;
		this.filters = FilterStore.filters;
		this.sieve = SieveStore;
		this.scripts = SieveStore.scripts;

		ko.addObservablesTo(this, {
			inited: false,
			serverError: false,
			serverErrorDesc: '',
			haveChanges: false,

			saveErrorText: ''
		});

		this.serverError.subscribe((value) => {
			if (!value) {
				this.serverErrorDesc('');
			}
		}, this);

		this.filterRaw = FilterStore.raw;
		this.filterRaw.capa = FilterStore.capa;
		this.filterRaw.active = ko.observable(false);
		this.filterRaw.allow = ko.observable(false);
		this.filterRaw.error = ko.observable(false);

		this.filterForDeletion = ko.observable(null).deleteAccessHelper();

		this.filters.subscribe(() => this.haveChanges(true));

		this.filterRaw.subscribe(() => {
			this.haveChanges(true);
			this.filterRaw.error(false);
		});

		this.haveChanges.subscribe(() => this.saveErrorText(''));

		this.filterRaw.active.subscribe(() => {
			this.haveChanges(true);
			this.filterRaw.error(false);
		});
	}

	@command((self) => self.haveChanges())
	saveChangesCommand() {
		if (!this.filters.saving()) {
			if (this.filterRaw.active() && !this.filterRaw().trim()) {
				this.filterRaw.error(true);
				return false;
			}

			this.filters.saving(true);
			this.saveErrorText('');

			Remote.filtersSave(
				(result, data) => {
					this.filters.saving(false);

					if (StorageResultType.Success === result && data && data.Result) {
						this.haveChanges(false);
						this.updateList();
					} else if (data && data.ErrorCode) {
						this.saveErrorText(data.ErrorMessageAdditional || getNotification(data.ErrorCode));
					} else {
						this.saveErrorText(getNotification(Notification.CantSaveFilters));
					}
				},
				this.filters(),
				this.filterRaw(),
				this.filterRaw.active()
			);
		}

		return true;
	}

	updateList() {
		if (!this.filters.loading()) {
			this.filters.loading(true);

			Remote.filtersGet((result, data) => {
				this.filters.loading(false);
				this.serverError(false);
				this.scripts([]);

				if (StorageResultType.Success === result && data && data.Result && Array.isArray(data.Result.Filters)) {
					this.inited(true);
					this.serverError(false);

					this.filters(
						data.Result.Filters.map(aItem => FilterModel.reviveFromJson(aItem)).filter(v => v)
					);

					this.modules(data.Result.Capa);

					this.sieve.capa(data.Result.Capa);
/*
					this.scripts(
						data.Result.Scripts.map(aItem => SieveScriptModel.reviveFromJson(aItem)).filter(v => v)
					);
*/
					Object.values(data.Result.Scripts).forEach(value => {
						value = SieveScriptModel.reviveFromJson(value);
						value && this.scripts.push(value)
					});

					this.filterRaw(data.Result.Scripts['rainloop.user.raw'].body);
					this.filterRaw.capa(data.Result.Capa.join(' '));
					this.filterRaw.active(data.Result.Scripts['rainloop.user.raw'].active);
					this.filterRaw.allow(!!data.Result.RawIsAllow);
				} else {
					this.filters([]);
					this.modules({});

					this.sieve.capa([]);

					this.filterRaw('');
					this.filterRaw.capa({});

					this.serverError(true);
					this.serverErrorDesc(
						data && data.ErrorCode ? getNotification(data.ErrorCode) : getNotification(Notification.CantGetFilters)
					);
				}

				this.haveChanges(false);
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
