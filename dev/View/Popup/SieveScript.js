import ko from 'ko';

import { getNotification, i18nToNodes } from 'Common/Translator';
import { addObservablesTo } from 'External/ko';

import Remote from 'Remote/User/Fetch';
import { FilterModel } from 'Model/Filter';
import { SieveUserStore } from 'Stores/User/Sieve';

import { showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { FilterPopupView } from 'View/Popup/Filter';

export class SieveScriptPopupView extends AbstractViewPopup {
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

		this.filterForDeletion = ko.observable(null).askDeleteHelper();
	}

	saveScript() {
		let self = this,
			script = self.script();
		if (!self.saving/* && script.hasChanges()*/) {
			if (!script.verify()) {
				return;
			}

			if (!script.exists() && SieveUserStore.scripts.find(item => item.name() === script.name())) {
				script.nameError(true);
				return;
			}

			self.saving = true;
			self.saveError(false);

			if (self.allowToggle()) {
				script.body(script.filtersToRaw());
			}

			Remote.request('FiltersScriptSave',
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
				script.toJson()
			);
		}
	}

	deleteFilter(filter) {
		this.script().filters.remove(filter);
	}

	addFilter() {
		/* this = SieveScriptModel */
		const filter = new FilterModel();
		filter.generateID();
		showScreenPopup(FilterPopupView, [
			filter,
			() => this.filters.push(filter)
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
					filters[index] = clonedFilter;
					script.filters(filters);
				}
			},
			true
		]);
	}

	toggleFiltersRaw() {
		let script = this.script(), notRaw = !this.rawActive();
		if (notRaw) {
			script.body(script.filtersToRaw());
			script.hasChanges(script.hasChanges());
		}
		this.rawActive(notRaw);
	}

	onBuild(oDom) {
		oDom.addEventListener('click', event => {
			const el = event.target.closestWithin('td.e-action', oDom),
				filter = el && ko.dataFor(el);
			filter && this.editFilter(filter);
		});
	}

	onShow(oScript) {
		let raw = !oScript.allowFilters();
		this.script(oScript);
		this.rawActive(raw);
		this.allowToggle(!raw);
		this.saveError(false);
	}

	afterShow() {
		// Sometimes not everything is translated, try again
		i18nToNodes(this.viewModelDom);
	}
}
