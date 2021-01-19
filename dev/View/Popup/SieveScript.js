import ko from 'ko';

import { delegateRunOnDestroy } from 'Common/UtilsUser';
import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';
import { i18nToNodes } from 'Common/Translator';

import Remote from 'Remote/User/Fetch';
import FilterModel from 'Model/Filter';
import SieveStore from 'Stores/User/Sieve';

import { popup, showScreenPopup/*, command*/ } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/SieveScript',
	templateID: 'PopupsSieveScript'
})
class SieveScriptPopupView extends AbstractViewNext {
	constructor() {
		super();

		ko.addObservablesTo(this, {
			isNew: true,
			saveError: false,
			saveErrorText: '',
			rawActive: false,
			script: null
		});

		this.sieveCapabilities = SieveStore.capa.join(' ');
		this.saving = false;

		this.filterForDeletion = ko.observable(null).deleteAccessHelper();
	}

//	@command()
	saveScriptCommand() {
		let script = this.script();
		if (!this.saving/* && script.hasChanges()*/) {
			if (!script.verify()) {
				return false;
			}

			if (this.isNew() && SieveStore.scripts.find(item => item.name() === script.name())) {
				script.nameError(true);
				return false;
			}

			this.saving = true;
			this.saveError(false);

			Remote.filtersScriptSave(
				(result, data) => {
					this.saving = false;

					if (StorageResultType.Success === result && data && data.Result) {
						script.hasChanges(false);
						SieveStore.scripts.push(script);
					} else {
						this.saveError(true);
						this.saveErrorText((data && data.ErrorCode)
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
		showScreenPopup(require('View/Popup/Filter'), [
			filter,
			() => {
				this.filters.push(filter);
			},
			false
		]);
	}

	editFilter(filter) {
		const clonedFilter = filter.cloneSelf();
		showScreenPopup(require('View/Popup/Filter'), [
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
		this.isNew(!oScript.name());
		this.saveError(false);
	}

	onShowWithDelay() {
		// Sometimes not everything is translated, try again
		i18nToNodes(this.viewModelDom);
	}
}

export { SieveScriptPopupView, SieveScriptPopupView as default };
