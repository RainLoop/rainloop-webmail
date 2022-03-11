import { FilterModel } from 'Sieve/Model/Filter';
import { SieveScriptModel } from 'Sieve/Model/Script';

import { FilterPopupView } from 'Sieve/View/Filter';

//import { parseScript } from 'Sieve/Parser';

import {
	capa,
	scripts,
	getNotification,
	Remote
} from 'Sieve/Utils';

export class SieveScriptPopupView extends rl.pluginPopupView {
	constructor() {
		super('SieveScript');

		this.addObservables({
			saveError: false,
			saveErrorText: '',
			rawActive: false,
			allowToggle: false,
			script: null
		});

		this.sieveCapabilities = capa.join(' ');
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

			if (!script.exists() && scripts.find(item => item.name() === script.name())) {
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
						script.exists() || scripts.push(script);
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
		FilterPopupView.showModal([
			filter,
			() => this.filters.push(filter)
		]);
	}

	editFilter(filter) {
		const clonedFilter = filter.cloneSelf();
		FilterPopupView.showModal([
			clonedFilter,
			() => {
				const script = this.script(),
					filters = script.filters(),
					index = filters.indexOf(filter);
				if (-1 < index) {
//					script.filters.splice(index, 1, clonedFilter);
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

	beforeShow(oScript) {
//	onShow(oScript) {
		oScript = oScript || new SieveScriptModel();
		let raw = !oScript.allowFilters();
		this.script(oScript);
		this.rawActive(raw);
		this.allowToggle(!raw);
		this.saveError(false);

/*
		// TODO: Sieve GUI
		let tree = parseScript(oScript.body(), oScript.name());
		console.dir(tree);
		console.log(tree.join('\r\n'));
*/
	}
}
