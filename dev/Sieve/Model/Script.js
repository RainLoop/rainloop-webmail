import { AbstractModel } from 'Sieve/Model/Abstract';
import { FilterModel } from 'Sieve/Model/Filter';
import { koArrayWithDestroy } from 'Sieve/Utils';

const SIEVE_FILE_NAME = 'rainloop.user';

// collectionToFileString
function filtersToSieveScript(filters)
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

	const quote = string => '"' + string.trim().replace(/(\\|")/g, '\\$1') + '"';
	const StripSpaces = string => string.replace(/\s+/, ' ').trim();

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

			if (('From' === field || 'Recipient' === field) && value.includes(',')) {
				result += ' [' + value.split(',').map(value => quote(value)).join(', ').trim() + ']';
			} else if ('Size' === field) {
				result += ' ' + value;
			} else {
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
			result = [],
			conditions = filter.conditions();

		const errorAction = type => result.push(sTab + '# @Error (' + type + '): empty action value');

		// Conditions
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
		block ? result.push('{') : (sTab = '');

		if (filter.markAsRead() && ['None','MoveTo','Forward'].includes(filter.actionType())) {
			require.imap4flags = 1;
			result.push(sTab + 'addflag "\\\\Seen";');
		}

		let value = filter.actionValue().trim();
		value = value.length ? quote(value) : 0;
		switch (filter.actionType())
		{
			case 'None':
				break;
			case 'Discard':
				result.push(sTab + 'discard;');
				break;
			case 'Vacation':
				if (value) {
					require.vacation = 1;

					let days = 1,
						subject = '',
						addresses = '',
						paramValue = filter.actionValueSecond().trim();

					if (paramValue.length) {
						subject = ':subject ' + quote(StripSpaces(paramValue)) + ' ';
					}

					paramValue = ('' + (filter.actionValueThird() || '')).trim();
					if (paramValue.length) {
						days = Math.max(1, parseInt(paramValue, 10));
					}

					paramValue = ('' + (filter.actionValueFourth() || '')).trim()
					if (paramValue.length) {
						paramValue = paramValue.split(',').map(email =>
							email.trim().length ? quote(email) : ''
						).filter(email => email.length);
						if (paramValue.length) {
							addresses = ':addresses [' + paramValue.join(', ') + '] ';
						}
					}

					result.push(sTab + 'vacation :days ' + days + ' ' + addresses + subject + value + ';');
				} else {
					errorAction('vacation');
				}
				break;
			case 'Reject': {
				if (value) {
					require.reject = 1;
					result.push(sTab + 'reject ' + value + ';');
				} else {
					errorAction('reject');
				}
				break; }
			case 'Forward':
				if (value) {
					if (filter.keep()) {
						require.fileinto = 1;
						result.push(sTab + 'fileinto "INBOX";');
					}
					result.push(sTab + 'redirect ' + value + ';');
				} else {
					errorAction('redirect');
				}
				break;
			case 'MoveTo':
				if (value) {
					require.fileinto = 1;
					result.push(sTab + 'fileinto ' + value + ';');
				} else {
					errorAction('fileinto');
				}
				break;
		}

		filter.stop() && result.push(sTab + 'stop;');

		block && result.push('}');

		return result.join(eol);
	};

	filters.forEach(filter => {
		parts.push([
			'/*',
			'BEGIN:FILTER:' + filter.id,
			'BEGIN:HEADER',
			btoa(unescape(encodeURIComponent(JSON.stringify(filter)))).match(split).join(eol) + 'END:HEADER',
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

// fileStringToCollection
function sieveScriptToFilters(script)
{
	let regex = /BEGIN:HEADER([\s\S]+?)END:HEADER/gm,
		filters = [],
		json,
		filter;
	if (script.length && script.includes('RAINLOOP:SIEVE')) {
		while ((json = regex.exec(script))) {
			json = decodeURIComponent(escape(atob(json[1].replace(/\s+/g, ''))));
			if (json && json.length && (json = JSON.parse(json))) {
				json['@Object'] = 'Object/Filter';
				json.Conditions.forEach(condition => condition['@Object'] = 'Object/FilterCondition');
				filter = FilterModel.reviveFromJson(json);
				filter && filters.push(filter);
			}
		}
	}
	return filters;
}

export class SieveScriptModel extends AbstractModel
{
	constructor() {
		super();

		this.addObservables({
			name: '',
			active: false,
			body: '',

			exists: false,
			nameError: false,
			askDelete: false,
			canBeDeleted: true,
			hasChanges: false
		});

		this.filters = koArrayWithDestroy();
//		this.saving = ko.observable(false).extend({ debounce: 200 });

		this.addSubscribables({
			name: () => this.hasChanges(true),
			filters: () => this.hasChanges(true),
			body: () => this.hasChanges(true)
		});
	}

	filtersToRaw() {
		return filtersToSieveScript(this.filters);
//		this.body(filtersToSieveScript(this.filters));
	}

	rawToFilters() {
		return sieveScriptToFilters(this.body());
//		this.filters(sieveScriptToFilters(this.body()));
	}

	verify() {
		this.nameError(!this.name().trim());
		return !this.nameError();
	}

	toJSON() {
		return {
			name: this.name,
			active: this.active,
			body: this.body
//			body: this.allowFilters() ? this.body() : this.filtersToRaw()
		};
	}

	/**
	 * Only 'rainloop.user' script supports filters
	 */
	allowFilters() {
		return SIEVE_FILE_NAME === this.name();
	}

	/**
	 * @static
	 * @param {FetchJsonScript} json
	 * @returns {?SieveScriptModel}
	 */
	static reviveFromJson(json) {
		const script = super.reviveFromJson(json);
		if (script) {
			if (script.allowFilters()) {
				script.filters(sieveScriptToFilters(script.body()));
			}
			script.canBeDeleted(SIEVE_FILE_NAME !== json.name);
			script.exists(true);
			script.hasChanges(false);
		}
		return script;
	}

}
