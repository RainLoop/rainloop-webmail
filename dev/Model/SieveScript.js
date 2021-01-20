import ko from 'ko';

import { AbstractModel } from 'Knoin/AbstractModel';
import { FilterModel } from 'Model/Filter';

// collectionToFileString
function filtersToSieveScript(aFilters)
{
	let eol = '\r\n',
		split = /.{0,74}/g,
		require = {},
		parts = [
			'# This is SnappyMail sieve script.',
			'# Please don\'t change anything here.',
			'# RAINLOOP:SIEVE',
			''
		];

	const quote = sValue => '"' + sValue.trim().replace(/(\\|")/, '\\\\$1') + '"';
	const StripSpaces = sValue => sValue.replace(/\s+/, ' ').trim();

	// conditionToSieveScript
	const conditionToString = (condition, require) =>
	{
		let result = '',
			type = condition.type(),
			field = condition.field(),
			value = condition.value().trim(),
			valueSecond = condition.valueSecond().trim();

		if (value.length && ('Header' !== field || valueSecond.length)) {
			switch (type)
			{
				case 'NotEqualTo':
					result += 'not ';
					type = ':is';
					break;
				case 'EqualTo':
					type = ':is';
					break;
				case 'NotContains':
					result += 'not ';
					type = ':contains';
					break;
				case 'Text':
				case 'Raw':
				case 'Over':
				case 'Under':
				case 'Contains':
					type = ':' + type.toLowerCase();
					break;
				case 'Regex':
					type = ':regex';
					require.regex = 1;
					break;
				default:
					return '/* @Error: unknown type value ' + type + '*/ false';
			}

			switch (field)
			{
				case 'From':
					result += 'header ' + type + ' ["From"]';
					break;
				case 'Recipient':
					result += 'header ' + type + ' ["To", "CC"]';
					break;
				case 'Subject':
					result += 'header ' + type + ' ["Subject"]';
					break;
				case 'Header':
					result += 'header ' + type + ' [' + quote(valueSecond) + ']';
					break;
				case 'Body':
					// :text :raw :content
					result += 'body ' + type + ' :contains';
					require.body = 1;
					break;
				case 'Size':
					result += 'size ' + type;
					break;
				default:
					return '/* @Error: unknown field value ' + field + ' */ false';
			}

			if (('From' === field || 'Recipient' === field) && value.includes(','))
			{
				result += ' [' + value.split(',').map(value => quote(value)).join(', ').trim() + ']';
			}
			else if ('Size' === field)
			{
				result += ' ' + value;
			}
			else
			{
				result += ' ' + quote(value);
			}

			return StripSpaces(result);
		}

		return '/* @Error: empty condition value */ false';
	};

	// filterToSieveScript
	const filterToString = (filter, require) =>
	{
		let sTab = '    ',
			block = true,
			result = [];

		const errorAction = type => result.push(sTab + '# @Error (' + type + '): empty action value');

		// Conditions
		let conditions = filter.conditions();
		if (1 < conditions.length) {
			result.push('Any' === filter.conditionsType()
				? 'if anyof('
				: 'if allof('
			);
			result.push(conditions.map(condition => sTab + conditionToString(condition, require)).join(',' + eol));
			result.push(')');
		} else if (conditions.length) {
			result.push('if ' + conditionToString(conditions[0], require));
		} else {
			block = false;
		}

		// actions
		if (block) {
			result.push('{');
		} else {
			sTab = '';
		}

		if (filter.actionMarkAsRead() && ['None','MoveTo','Forward'].includes(filter.actionType())) {
			require.imap4flags = 1;
			result.push(sTab + 'addflag "\\\\Seen";');
		}

		switch (filter.actionType())
		{
			// case FiltersAction.None:
			case 'None':
				break;
			case 'Discard':
				result.push(sTab + 'discard;');
				break;
			case 'Vacation': {
				let value = filter.actionValue().trim();
				if (value.length) {
					require.vacation = 1;

					let days = 1,
						subject = '',
						addresses = '',
						paramValue = filter.actionValueSecond().trim();

					if (paramValue.length) {
						subject = ':subject ' + quote(StripSpaces(paramValue)) + ' ';
					}

					paramValue = filter.actionValueThird().trim();
					if (paramValue.length) {
						days = Math.max(1, parseInt(paramValue, 10));
					}

					paramValue = filter.actionValueFourth().trim()
					if (paramValue.length) {
						paramValue = paramValue.split(',').map(email =>
							email.trim().length ? quote(email) : ''
						).filter(email => email.length);
						if (paramValue.length) {
							addresses = ':addresses [' + paramValue.join(', ') + '] ';
						}
					}

					result.push(sTab + 'vacation :days ' + days + ' ' + addresses + subject + quote(value) + ';');
				} else {
					errorAction('vacation');
				}
				break; }
			case 'Reject': {
				let value = filter.actionValue().trim();
				if (value.length) {
					require.reject = 1;
					result.push(sTab + 'reject ' + quote(value) + ';');
				} else {
					errorAction('reject');
				}
				break; }
			case 'Forward': {
				let value = filter.actionValue();
				if (value.length) {
					if (filter.actionKeep()) {
						require.fileinto = 1;
						result.push(sTab + 'fileinto "INBOX";');
					}
					result.push(sTab + 'redirect ' + quote(value) + ';');
				} else {
					errorAction('redirect');
				}
				break; }
			case 'MoveTo': {
				let value = filter.actionValue();
				if (value.length) {
					require.fileinto = 1;
					result.push(sTab + 'fileinto ' + quote(value) + ';');
				} else {
					errorAction('fileinto');
				}
				break; }
		}

		filter.actionNoStop() || result.push(sTab + 'stop;');

		block && result.push('}');

		return result.join(eol);
	};

	aFilters.forEach(filter => {
		parts.push([
			'/*',
			'BEGIN:FILTER:' + filter.id,
			'BEGIN:HEADER',
			btoa(unescape(encodeURIComponent(JSON.stringify(filter.toJson())))).match(split).join(eol) + 'END:HEADER',
			'*/',
			filter.enabled() ? '' : '/* @Filter is disabled ',
			filterToString(filter, require),
			filter.enabled() ? '' : '*/',
			'/* END:FILTER */',
			''
		].join(eol));
	});

	require = Object.keys(require);
	return (require.length ? 'require ' + JSON.stringify(require) + ';' + eol : '') + eol + parts.join(eol);
}

class SieveScriptModel extends AbstractModel
{
	constructor() {
		super();

		this.addObservables({
			name: '',
			active: false,
			body: '',

			exists: false,
			nameError: false,
			bodyError: false,
			deleteAccess: false,
			canBeDeleted: true,
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

	filtersToRaw() {
		return filtersToSieveScript(this.filters);
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
			script.canBeDeleted(0 !== json.name.indexOf('rainloop.user'));
			script.exists(true);
			script.hasChanges(false);
		}
		return script;
	}

}

export { SieveScriptModel, SieveScriptModel as default };
