import { parseScript } from 'Sieve/Parser';

import { FilterModel } from 'Model/Filter';
import { SieveScriptModel } from 'Model/SieveScript';
import { FilterPopupView } from 'View/Popup/Filter';

//import { getNotification, i18nToNodes } from 'Common/Translator';
import { forEachObjectValue } from 'Common/Utils';
import { koArrayWithDestroy } from 'External/ko';

// SieveUserStore
const
/*
	getNotificationMessage = code => {
		let key = getKeyByValue(Notification, code);
		return key ? I18N_DATA.NOTIFICATIONS[i18nKey(key).replace('_NOTIFICATION', '_ERROR')] : '';
		rl.i18n('NOTIFICATIONS/')
	},
	getNotification = (code, message = '', defCode = 0) => {
		code = parseInt(code, 10) || 0;
		if (Notification.ClientViewError === code && message) {
			return message;
		}

		return getNotificationMessage(code)
			|| getNotificationMessage(parseInt(defCode, 10))
			|| '';
	},
*/
	getNotification = code => 'ERROR ' + code,

	Remote = rl.app.Remote,

	Sieve = {
		// capabilities
		capa: ko.observableArray(),

		// Sieve scripts SieveScriptModel
		scripts: koArrayWithDestroy(),

		parseScript: parseScript,

		setError: text => {
			Sieve.serverError(true);
			Sieve.serverErrorDesc(text);
		},
		updateList: () => {
			if (!Sieve.loading()) {
				Sieve.loading(true);
				Sieve.serverError(false);

				Remote.request('Filters', (iError, data) => {
					Sieve.loading(false);
					Sieve.scripts([]);

					if (iError) {
						Sieve.capa([]);
						Sieve.setError(getNotification(iError));
					} else {
						Sieve.capa(data.Result.Capa);
	/*
						Sieve.scripts(
							data.Result.Scripts.map(aItem => SieveScriptModel.reviveFromJson(aItem)).filter(v => v)
						);
	*/
						forEachObjectValue(data.Result.Scripts, value => {
							value = SieveScriptModel.reviveFromJson(value);
							value && Sieve.scripts.push(value)
						});
					}
				});
			}
		},

		loading: ko.observable(false).extend({ debounce: 200 }),
		serverError: ko.observable(false),
		serverErrorDesc: ko.observable('')
	};

Sieve.ScriptView = class SieveScriptPopupView extends rl.pluginPopupView {
	constructor() {
		super('SieveScript');

		this.addObservables({
			saveError: false,
			saveErrorText: '',
			rawActive: false,
			allowToggle: false,
			script: null
		});

		this.sieveCapabilities = Sieve.capa.join(' ');
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

			if (!script.exists() && Sieve.scripts.find(item => item.name() === script.name())) {
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
						script.exists() || Sieve.scripts.push(script);
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

	afterShow() {
		// Sometimes not everything is translated, try again
//		i18nToNodes(this.viewModelDom);
	}
}

window.Sieve = Sieve;
