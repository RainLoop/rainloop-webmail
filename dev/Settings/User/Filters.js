import ko from 'ko';

import { delegateRunOnDestroy } from 'Common/Utils';
import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';

import FilterStore from 'Stores/User/Filter';
import Remote from 'Remote/User/Fetch';

import { FilterModel } from 'Model/Filter';

import { showScreenPopup, command } from 'Knoin/Knoin';

class FiltersUserSettings {
	constructor() {
		this.modules = FilterStore.modules;
		this.filters = FilterStore.filters;

		this.inited = ko.observable(false);
		this.serverError = ko.observable(false);
		this.serverErrorDesc = ko.observable('');
		this.haveChanges = ko.observable(false);

		this.saveErrorText = ko.observable('');

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

		this.filters.subscribe(() => {
			this.haveChanges(true);
		});

		this.filterRaw.subscribe(() => {
			this.haveChanges(true);
			this.filterRaw.error(false);
		});

		this.haveChanges.subscribe(() => {
			this.saveErrorText('');
		});

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

	scrollableOptions(wrapper) {
		return {
			handle: '.drag-handle',
			containment: wrapper || 'parent',
			axis: 'y'
		};
	}

	updateList() {
		if (!this.filters.loading()) {
			this.filters.loading(true);

			Remote.filtersGet((result, data) => {
				this.filters.loading(false);
				this.serverError(false);

				if (StorageResultType.Success === result && data && data.Result && Array.isArray(data.Result.Filters)) {
					this.inited(true);
					this.serverError(false);

					this.filters(
						data.Result.Filters.map(aItem => {
							const filter = new FilterModel();
							return filter && filter.parse(aItem) ? filter : null;
						}).filter(value => !!value)
					);

					this.modules(data.Result.Modules ? data.Result.Modules : {});

					this.filterRaw(data.Result.Raw || '');
					this.filterRaw.capa(Array.isArray(data.Result.Capa) ? data.Result.Capa.join(' ') : '');
					this.filterRaw.active(!!data.Result.RawIsActive);
					this.filterRaw.allow(!!data.Result.RawIsAllow);
				} else {
					this.filters([]);
					this.modules({});
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

	deleteFilter(filter) {
		this.filters.remove(filter);
		delegateRunOnDestroy(filter);
	}

	addFilter() {
		const filter = new FilterModel();

		filter.generateID();
		showScreenPopup(require('View/Popup/Filter'), [
			filter,
			() => {
				this.filters.push(filter);
				this.filterRaw.active(false);
			},
			false
		]);
	}

	editFilter(filter) {
		const clonedFilter = filter.cloneSelf();

		showScreenPopup(require('View/Popup/Filter'), [
			clonedFilter,
			() => {
				const filters = this.filters(),
					index = filters.indexOf(filter);

				if (-1 < index && filters[index]) {
					delegateRunOnDestroy(filters[index]);
					filters[index] = clonedFilter;

					this.filters(filters);
					this.haveChanges(true);
				}
			},
			true
		]);
	}

	onBuild(oDom) {
		oDom.addEventListener('click', event => {
			const el = event.target.closestWithin('.filter-item .e-action', oDom);
			el && ko.dataFor(el) && this.editFilter(ko.dataFor(el));
		});
	}

	onShow() {
		this.updateList();
	}
}

export { FiltersUserSettings, FiltersUserSettings as default };
