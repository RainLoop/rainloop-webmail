import ko from 'ko';

import { AbstractModel } from 'Knoin/AbstractModel';
import { FilterModel } from 'Model/Filter';

class SieveScriptModel extends AbstractModel
{
	constructor() {
		super();

		this.addObservables({
			name: '',
			nameError: false,
			nameFocused: false,

			active: false,

			body: '',

			deleteAccess: false,
			canBeDeleted: false
		});

		this.filters = ko.observableArray([]);

		this.addSubscribables({
			name: sValue => this.nameError(!sValue)
		});
	}

	setFilters() {
		/*let tree = */window.Sieve.parseScript(this.body);
//		this.filters = ko.observableArray(tree);
	}

	verify() {
		if (!this.name()) {
			this.nameError(true);
			return false;
		}
		this.nameError(false);
		return true;
	}

	toJson() {
		return {
			name: this.name(),
			active: this.active ? '1' : '0',
			body: this.body,
//			filters: this.filters()
		};
	}

	/**
	 * Only 'rainloop.user' script supports filters
	 */
	allowFilters() {
		return 'rainloop.user' === this.name();
	}

	/**
	 * @static
	 * @param {FetchJsonScript} json
	 * @returns {?SieveScriptModel}
	 */
	static reviveFromJson(json) {
		const script = super.reviveFromJson(json);
		if (script) {
			script.filters([]);
			if (script.allowFilters() && Array.isNotEmpty(json.filters)) {
				script.filters(
					json.filters.map(aData => FilterModel.reviveFromJson(aData)).filter(v => v)
				);
			}
		}
		return script;
	}

}

export { SieveScriptModel, SieveScriptModel as default };
