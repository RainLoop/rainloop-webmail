/**
 * https://datatracker.ietf.org/doc/html/rfc7095
 *
 * Inspired by https://github.com/mcpar-land/vcfer
 */

import { VCardProperty } from './VCardProperty'

export class JCard {

	constructor(input)
	{
		this.props = new Map()
		this.version = '4.0'
		if (input) {
			// read from jCard
			if (typeof input !== 'object') {
				throw Error('error reading vcard')
			}
			this.parseFromJCard(input)
		}
	}

	parseFromJCard(json)
	{
		json = JSON.parse(JSON.stringify(json));
		if (!/vcard/i.test(json[0])) {
			throw new SyntaxError('Incorrect jCard format');
		}
		json[1].forEach(jprop => this.add(new VCardProperty(jprop)));
	}

	/**
	 * Retrieve an array of {@link VCardProperty} objects under the specified field.
	 * Returns [] if there are no VCardProperty objects found.
	 * Properites are always stored in an array.
	 * @param field to get.
	 * @param type If provided, only return {@link VCardProperty}s with the specified
	 * type as a param.
	 */
	get(field, type)
	{
		if (type) {
			let props = this.props.get(field);
			return props
				? props.filter(prop => {
					let types = prop.type;
					return (Array.isArray(types) ? types : [types]).includes(type);
				})
				: [];
		}
		return this.props.get(field) || [];
		// TODO with type filter-er
	}

	/**
	 * Retrieve a _single_ VCardProperty of the specified field. Attempts to pick based
	 * on the following priorities, in order:
	 * - `TYPE={type}` of the value specified in the `type` argument. Ignored
	 * if the argument isn't supplied.
	 * - `TYPE=pref` is present.
	 * - is the VCardProperty at index 0 from get(field)
	 * @param field
	 * @param type
	 */
	getOne(field, type)
	{
		return this.get(field, type || 'pref')[0] || this.get(field)[0];
	}

	/**
	 * Set the contents of a field to contain a single {@link VCardProperty}.
	 *
	 * Accepts either 2-4 arguments to construct a VCardProperty,
	 * or 1 argument of a preexisting VCardProperty object.
	 *
	 * This will always overwrite all existing properties of the given
	 * field. For just adding a new VCardProperty, see {@link VCard#add}
	 * @param arg the field, or a VCardProperty object
	 * @param value the value for the VCardProperty object
	 * @param params the parameters for the VCardProperty object
	 * @param type the type for the VCardProperty object
	 */
	set(arg, value, params, type)
	{
		if (typeof arg === 'string') {
			arg = new VCardProperty(String(arg), value, params, type);
		}
		if (!(arg instanceof VCardProperty)) {
			throw Error('invalid argument of VCard.set(), expects string arguments or a VCardProperty');
		}
		let field = arg.getField();
		this.props.set(field, [arg]);
		return arg;
	}

	add(arg, value, params, type)
	{
		// string arguments
		if (typeof arg === 'string') {
			arg = new VCardProperty(String(arg), value, params, type);
		}
		if (!(arg instanceof VCardProperty)) {
			throw Error('invalid argument of VCard.add(), expects string arguments or a VCardProperty');
		}
		// VCardProperty arguments
		let field = arg.getField();
		if (this.props.get(field)) this.props.get(field)?.push(arg)
		else this.props.set(field, [arg])
		return arg;
	}

	/**
	 * Removes a {@link VCardProperty}, or all properties of the supplied field.
	 * @param arg the field, or a {@link VCardProperty} object
	 * @param paramFilter (incomplete)
	 */
	remove(arg) {
		// string arguments
		if (typeof arg === 'string') {
			// TODO filter by param
			this.props.delete(arg);
		}
		// VCardProperty argument
		else if (arg instanceof VCardProperty) {
			let propArray = this.props.get(arg.getField());
			if (!(propArray === null || propArray === void 0 ? void 0 : propArray.includes(arg)))
				throw Error("Attempted to remove VCardProperty VCard does not have: ".concat(arg));
			propArray.splice(propArray.indexOf(arg), 1);
			if (propArray.length === 0)
				this.props.delete(arg.getField());
		}
		// incorrect arguments
		else
			throw Error('invalid argument of VCard.remove(), expects ' +
				'string and optional param filter or a VCardProperty');
	}

	/**
	 * Returns true if the vCard has at least one @{link VCardProperty}
	 * of the given field.
	 * @param field The field to query
	 */
	has(field)
	{
		return (!!this.props.get(field) && this.props.get(field).length > 0);
	}


	/**
	 * Returns stringified JSON
	 */
	toString()
	{
		return JSON.stringify(this);
	}

	/**
	 * Returns a {@link JCard} object as a JSON array.
	 */
	toJSON()
	{
		let data = [['version', {}, 'text', '4.0']];
/*
		this.props.forEach((props, field) =>
			(field === 'version')  || props.forEach(prop => prop.isEmpty() || data.push(prop.toJSON()))
		);
*/
		for (const [field, props] of this.props.entries()) {
			if ('version' !== field) {
				for (const prop of props) {
					prop.isEmpty() || data.push(prop.toJSON());
				}
			}
		}

		return ['vcard', data];
	}

	/**
	 * Automatically generate the 'fn' VCardProperty from the preferred 'n' VCardProperty.
	 *
	 * #### `set` (`boolean`)
	 *
	 * - `false`: (default) return the generated full name string without
	 * modifying the VCard.
	 *
	 * - `true`: modify the VCard's `fn` VCardProperty directly, as specified
	 * by `append`
	 *
	 * #### `append` (`boolean`)
	 *
	 * (ignored if `set` is `false`)
	 *
	 * - `false`: (default) replace the existing 'fn' VCardProperty/properties with
	 * a new one.
	 *
	 * - `true`: append a new `fn` VCardProperty to the array.
	 *
	 * see: [RFC 6350 section 6.2.1](https://tools.ietf.org/html/rfc6350#section-6.2.1)
	 */
	parseFullName(options) {
		let n = this.getOne('n');
		if (n === undefined) {
			throw Error('\'fn\' VCardProperty not present in card, cannot parse full name');
		}
		let fnString = '';
		// Position in n -> position in fn
		[3, 1, 2, 0, 4].forEach(pos => {
			let splitStr = n.value[pos];
			if (splitStr) {
				// comma separated values separated by spaces
				fnString += ' ' + splitStr.replace(',', ' ');
			}
		});
		fnString = fnString.trim();
		let fn = new VCardProperty('fn', fnString);
		if (options?.set) {
			if (options.append) {
				this.add(fn);
			} else {
				this.set(fn);
			}
		}
		return fn;
	}
}
