import ko from 'ko';

import { delegateRunOnDestroy } from 'Common/UtilsUser';
import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';
import { i18nToNodes } from 'Common/Translator';

import Remote from 'Remote/User/Fetch';
import { FilterModel } from 'Model/Filter';
import SieveStore from 'Stores/User/Sieve';

import { showScreenPopup/*, command*/ } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { FilterPopupView } from 'View/Popup/Filter';

class SieveScriptPopupView extends AbstractViewPopup {
	constructor() {
		super('SieveScript');

		ko.addObservablesTo(this, {
			saveError: false,
			saveErrorText: '',
			rawActive: false,
			allowToggle: false,
			script: null
		});

		this.sieveCapabilities = SieveStore.capa.join(' ');
		this.saving = false;

		this.filterForDeletion = ko.observable(null).deleteAccessHelper();
	}

//	@command()
	saveScriptCommand() {
		let self = this,
			script = self.script();
		if (!self.saving/* && script.hasChanges()*/) {
			if (!script.verify()) {
				return false;
			}

			if (!script.exists() && SieveStore.scripts.find(item => item.name() === script.name())) {
				script.nameError(true);
				return false;
			}

			self.saving = true;
			self.saveError(false);

			if (self.allowToggle()) {
				script.body(script.filtersToRaw());
			}

			Remote.filtersScriptSave(
				(result, data) => {
					self.saving = false;

					if (StorageResultType.Success === result && data && data.Result) {
						script.exists() || SieveStore.scripts.push(script);
						script.exists(true);
						script.hasChanges(false);
					} else {
						self.saveError(true);
						self.saveErrorText((data && data.ErrorCode)
							? (data.ErrorMessageAdditional || getNotification(data.ErrorCode))
							: getNotification(Notification.CantSaveFilters)
						);
					}
				},
				script
			);
		}

		return true;
	}

	deleteFilter(filter) {
		this.script().filters.remove(filter);
		delegateRunOnDestroy(filter);
	}

	addFilter() {
		/* this = SieveScriptModel */
		const filter = new FilterModel();
		filter.generateID();
		showScreenPopup(FilterPopupView, [
			filter,
			() => {
				this.filters.push(filter);
			},
			false
		]);
	}

	editFilter(filter) {
		const clonedFilter = filter.cloneSelf();
		showScreenPopup(FilterPopupView, [
			clonedFilter,
			() => {
				const script = this.script(),
					filters = script.filters(),
					index = filters.indexOf(filter);
				if (-1 < index) {
					delegateRunOnDestroy(filters[index]);
					filters[index] = clonedFilter;
					script.filters(filters);
				}
			},
			true
		]);
	}

	toggleFiltersRaw() {
		if (!this.rawActive()) {
			let script = this.script(),
				changed = script.hasChanges();
			script.body(script.filtersToRaw());
			script.hasChanges(changed);
		}
		this.rawActive(!this.rawActive());
	}

	onBuild(oDom) {
		oDom.addEventListener('click', event => {
			const el = event.target.closestWithin('.filter-item .e-action', oDom),
				filter = el && ko.dataFor(el);
			filter && this.editFilter(filter);
		});
	}

	onShow(oScript) {
		this.script(oScript);
		this.rawActive(!oScript.allowFilters());
		this.allowToggle(oScript.allowFilters());
		this.saveError(false);
	}

	onShowWithDelay() {
		// Sometimes not everything is translated, try again
		i18nToNodes(this.viewModelDom);
	}
}

export { SieveScriptPopupView, SieveScriptPopupView as default };
