import ko from 'ko';

import { delegateRunOnDestroy } from 'Common/UtilsUser';
import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';

import Remote from 'Remote/User/Fetch';
import FilterStore from 'Stores/User/Filter';
import FilterModel from 'Model/Filter';

import { popup, showScreenPopup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/SieveScript',
	templateID: 'PopupsSieveScript'
})
class SieveScriptPopupView extends AbstractViewNext {
	constructor() {
		super();

//		this.filters = FilterStore.filters;
		this.filters = ko.observableArray([]);
		this.filters.loading = ko.observable(false).extend({ throttle: 200 });
		this.filters.saving = ko.observable(false).extend({ throttle: 200 });

		this.modules = FilterStore.modules;

		this.script = {
			filters: FilterStore.filters,
			saving: () => FilterStore.filters.saving()
		};

		ko.addObservablesTo(this, {
			isNew: true,
			serverError: false,
			serverErrorDesc: '',
			saveErrorText: '',
			haveChanges: false,
			filterRaw: ''
		});

		this.serverError.subscribe(value => value || this.serverErrorDesc(''), this);

//		this.filterRaw = FilterStore.raw;
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
	saveScriptCommand() {
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
			const el = event.target.closestWithin('.filter-item .e-action', oDom),
				filter = el && ko.dataFor(el);
			filter && this.editFilter(ko.dataFor(el));
		});
	}

	onShow(oScript, fTrueCallback, bEdit) {
		this.clearPopup();

		this.fTrueCallback = fTrueCallback;
		this.filters(oScript.filters());

		this.filterRaw(oScript.body());
		this.filterRaw.active(!oScript.allowFilters());
		this.filterRaw.error(false);

		this.isNew(!bEdit);

		if (!bEdit && oScript) {
//			oScript.nameFocused(true);
		}
	}

	onShowWithDelay() {
	}

	clearPopup() {
		this.isNew(true);
		this.fTrueCallback = null;
		this.filters([]);
	}

}

export { SieveScriptPopupView, SieveScriptPopupView as default };
