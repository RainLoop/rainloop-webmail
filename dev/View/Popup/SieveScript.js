import ko from 'ko';

import { getNotification, i18nToNodes } from 'Common/Translator';
import { addObservablesTo } from 'Common/Utils';
import { delegateRunOnDestroy } from 'Common/UtilsUser';

import Remote from 'Remote/User/Fetch';
import { FilterModel } from 'Model/Filter';
import { SieveUserStore } from 'Stores/User/Sieve';

import { showScreenPopup/*, decorateKoCommands*/ } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { FilterPopupView } from 'View/Popup/Filter';

class SieveScriptPopupView extends AbstractViewPopup {
	constructor() {
		super('SieveScript');

		addObservablesTo(this, {
			saveError: false,
			saveErrorText: '',
			rawActive: false,
			allowToggle: false,
			script: null
		});

		this.sieveCapabilities = SieveUserStore.capa.join(' ');
		this.saving = false;

		this.filterForDeletion = ko.observable(null).deleteAccessHelper();
/*
		decorateKoCommands(this, {
			saveScriptCommand: 1
		});
*/
	}

	saveScriptCommand() {
		let self = this,
			script = self.script();
		if (!self.saving/* && script.hasChanges()*/) {
			if (!script.verify()) {
				return false;
			}

			if (!script.exists() && SieveUserStore.scripts.find(item => item.name() === script.name())) {
				script.nameError(true);
				return false;
			}

			self.saving = true;
			self.saveError(false);

			if (self.allowToggle()) {
				script.body(script.filtersToRaw());
			}

			Remote.filtersScriptSave(
				(iError, data) => {
					self.saving = false;

					if (iError) {
						self.saveError(true);
						self.saveErrorText((data && data.ErrorMessageAdditional) || getNotification(iError));
					} else {
						script.exists() || SieveUserStore.scripts.push(script);
						script.exists(true);
						script.hasChanges(false);
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
			const el = event.target.closestWithin('td.e-action', oDom),
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
