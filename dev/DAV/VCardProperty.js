/**
 * Inspired by https://github.com/mcpar-land/vcfer
 */

export class VCardProperty {

	/**
	 * A class describing a single vCard property.
	 * Will almost always be a member of a
	 * {@link VCard}'s [props]{@link VCard.props} map.
	 *
	 * Accepts either 2-4 arguments, or 1 argument in jCard property format.
	 * @param arg the field, or a jCard property
	 * @param value
	 * @param params
	 * @param type
	 */
	constructor(arg, value, params, type = 'text')
	{
		this.field = '';

		/**
		 * the value of the property.
		 * @example '(123) 456 7890'
		 */
		this.value = '';

		/**
		 * the type of the property value.
		 * @example 'text'
		 */
		this.type = '';

		/**
		 * https://www.rfc-editor.org/rfc/rfc6350.html#section-5
		 * An jCard parameters object.
		 * @example
		 * {
		 * 	type: ['work', 'voice', 'pref'],
		 * 	value: 'uri'
		 * }
		 */
		this.params = {};

		// Construct from arguments
		if (value !== undefined && typeof arg === 'string') {
			this.field = arg;
			this.value = value;
			this.params = params || {};
			this.type = type;
		}
		// construct from jcard
		else if (value === undefined && params === undefined && typeof arg === 'object') {
			this.parseFromJCardProperty(arg);
		}
		// invalid property
		else {
			throw Error('invalid Property constructor');
		}
	}

	parseFromJCardProperty(jCardProp)
	{
		jCardProp = JSON.parse(JSON.stringify(jCardProp));
		this.field = jCardProp[0].toLowerCase();
		this.params = jCardProp[1];
		this.type = jCardProp[2];
		this.value = jCardProp[3];
	}

	addParam(key, value)
	{
		if (Array.isArray(this.params[key])) {
			this.params[key].push(value);
		}
		else if (this.params[key] != null) {
			this.params[key] = [this.params[key], value];
		}
		else {
			this.params[key] = value;
		}
	}

	/** Returns a copy of the Property's string value. */
	getValue()
	{
		return '' + this.value;
	}

	/**
	 * https://www.rfc-editor.org/rfc/rfc6350.html#section-5.3
	 */
	pref()
	{
		return this.params.pref || 100;
	}

	/**
	 * https://www.rfc-editor.org/rfc/rfc6350.html#section-5.6
	 */
	tags()
	{
		return this.params.type || [];
	}

	/** Returns `true` if all the following are true:
	 * - the property's value contains charactes other than `;`
	 * - the property has no parameters
	 */
	isEmpty()
	{
		return ((null == this.value || !/[^;]+/.test(this.value)) && !Object.keys(this.params).length);
	}

	notEmpty()
	{
		return !this.isEmpty();
	}

	/** Returns a readonly string copy of the property's field. */
	getField()
	{
		return '' + this.field;
	}

	/**
	 * Returns stringified JSON
	 */
	toString()
	{
		return JSON.stringify(this);
	}

	/**
	 * Returns a JSON array in a [jCard property]{@link JCardProperty} format
	 */
	toJSON()
	{
		return [
			this.field,
			this.params,
			this.type || 'text',
			this.value
		];
	}
}
