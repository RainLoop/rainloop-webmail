import ko from 'ko';

import { AbstractModel } from 'Knoin/AbstractModel';
import { FilterModel } from 'Model/Filter';

class SieveScriptModel extends AbstractModel
{
	constructor() {
		super();

		this.addObservables({
			name: '',
			active: false,
			body: '',

			nameError: false,
			bodyError: false,
			deleteAccess: false,
			canBeDeleted: false,
			hasChanges: false
		});

		this.filters = ko.observableArray([]);
//		this.saving = ko.observable(false).extend({ throttle: 200 });

		this.addSubscribables({
			name: () => this.hasChanges(true),
			filters: () => this.hasChanges(true),
			body: () => this.hasChanges(true)
		});
	}

	setFilters() {
		/*let tree = */window.Sieve.parseScript(this.body);
//		this.filters = ko.observableArray(tree);
	}

	verify() {
		this.nameError(!this.name().trim());
		this.bodyError(this.allowFilters() ? !this.filters().length : !this.body().trim());
		return !this.nameError() && !this.bodyError();
	}

	toJson() {
		return {
			name: this.name(),
			active: this.active() ? '1' : '0',
			body: this.body(),
			filters: this.filters().map(item => item.toJson())
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
			if (script.allowFilters() && Array.isNotEmpty(json.filters)) {
				script.filters(
					json.filters.map(aData => FilterModel.reviveFromJson(aData)).filter(v => v)
				);
			} else {
				script.filters([]);
			}
			script.hasChanges(false);
		}
		return script;
	}

}

export { SieveScriptModel, SieveScriptModel as default };
