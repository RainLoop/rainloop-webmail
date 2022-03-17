import { FilterModel } from 'Sieve/Model/Filter';
import { SieveScriptModel } from 'Sieve/Model/Script';

import { FilterPopupView } from 'Sieve/View/Filter';

import { parseScript } from 'Sieve/Parser';

import { availableActions, availableControls, availableTests } from 'Sieve/Commands';

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
			errorText: '',
			rawActive: false,
			allowToggle: false,
			script: null,

			sieveCapabilities: '',
			availableActions: '',
			availableControls: '',
			availableTests: ''
		});

		this.saving = false;

		this.filterForDeletion = ko.observable(null).askDeleteHelper();
	}

	validateScript() {
		try {
			this.errorText('');
			parseScript(this.script().body());
		} catch (e) {
			this.errorText(e.message);
		}
	}

	saveScript() {
		let self = this,
			script = self.script();
		if (!self.saving/* && script.hasChanges()*/) {
			this.errorText('');
			self.saveError(false);

			if (!script.verify()) {
				return;
			}

			if (!script.exists() && scripts.find(item => item.name() === script.name())) {
				script.nameError(true);
				return;
			}

			try {
				parseScript(this.script().body());
			} catch (e) {
				this.errorText(e.message);
				return;
			}

			self.saving = true;

			if (self.allowToggle()) {
				script.body(script.filtersToRaw());
			}

			Remote.request('FiltersScriptSave',
				(iError, data) => {
					self.saving = false;

					if (iError) {
						self.saveError(true);
						self.errorText((data && data.ErrorMessageAdditional) || getNotification(iError));
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
		this.sieveCapabilities(capa.join(' '));
		this.availableActions([...Object.keys(availableActions())].join(', '));
		this.availableControls([...Object.keys(availableControls())].join(', '));
		this.availableTests([...Object.keys(availableTests())].join(', '));

		oScript = oScript || new SieveScriptModel();
		let raw = !oScript.allowFilters();
		this.script(oScript);
		this.rawActive(raw);
		this.allowToggle(!raw);
		this.saveError(false);
		this.errorText('');

/*
		// TODO: Sieve GUI
		let tree = parseScript(oScript.body(), oScript.name());
		console.dir(tree);
		console.log(tree.join('\r\n'));
*/
	}
}
