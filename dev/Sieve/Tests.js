/**
 * https://tools.ietf.org/html/rfc5228#section-5
 */

import {
	GrammarNumber,
	GrammarString,
	GrammarStringList,
	GrammarTest,
	GrammarTestList
} from 'Sieve/Grammar';

const
	isAddressPart = tag => ':localpart' === tag || ':domain' === tag || ':all' === tag || isSubAddressPart(tag),
	// https://tools.ietf.org/html/rfc5233
	isSubAddressPart = tag => ':user' === tag || ':detail' === tag;

/**
 * https://tools.ietf.org/html/rfc5228#section-5.1
 */
export class AddressCommand extends GrammarTest
{
	constructor()
	{
		super();
		this.address_part = ':all';
		this.header_list  = new GrammarStringList;
		this.key_list     = new GrammarStringList;
		// rfc5260#section-6
//		this.index        = new GrammarNumber;
//		this.last         = false;
	}

	get require() {
		let requires = [];
		isSubAddressPart(this.address_part) && requires.push('subaddress');
		(this.last || (this.index && this.index.value)) && requires.push('index');
		return requires;
	}

	toString()
	{
		return 'address'
//			+ (this.last ? ' :last' : (this.index.value ? ' :index ' + this.index : ''))
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.address_part
			+ ' ' + this.match_type
			+ ' ' + this.header_list.toString()
			+ ' ' + this.key_list.toString();
	}

	pushArguments(args)
	{
		args.forEach((arg, i) => {
			if (isAddressPart(arg)) {
				this.address_part = arg;
			} else if (':last' === arg) {
				this.last = true;
			} else if (':index' === args[i-1]) {
				this.index.value = arg.value;
			} else if (arg instanceof GrammarStringList || arg instanceof GrammarString) {
				this[args[i+1] ? 'header_list' : 'key_list'] = arg;
//				(args[i+1] ? this.header_list : this.key_list) = arg;
			}
		});
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.2
 */
export class AllOfCommand extends GrammarTest
{
	constructor()
	{
		super();
		this.tests = new GrammarTestList;
	}

	toString()
	{
		return 'allof ' + this.tests.toString();
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.3
 */
export class AnyOfCommand extends GrammarTest
{
	constructor()
	{
		super();
		this.tests = new GrammarTestList;
	}

	toString()
	{
		return 'anyof ' + this.tests.toString();
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.4
 */
export class EnvelopeCommand extends GrammarTest
{
	constructor()
	{
		super();
		this.address_part = ':all';
		this.envelope_part = new GrammarStringList;
		this.key_list      = new GrammarStringList;
	}

	get require() { return isSubAddressPart(this.address_part) ? ['envelope','subaddress'] : 'envelope'; }

	toString()
	{
		return 'envelope'
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.address_part
			+ ' ' + this.match_type
			+ ' ' + this.envelope_part.toString()
			+ ' ' + this.key_list.toString();
	}

	pushArguments(args)
	{
		args.forEach((arg, i) => {
			if (isAddressPart(arg)) {
				this.address_part = arg;
			} else if (arg instanceof GrammarStringList || arg instanceof GrammarString) {
				this[args[i+1] ? 'envelope_part' : 'key_list'] = arg;
//				(args[i+1] ? this.envelope_part : this.key_list) = arg;
			}
		});
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.5
 */
export class ExistsCommand extends GrammarTest
{
	constructor()
	{
		super();
		this.header_names = new GrammarStringList;
	}

	toString()
	{
		return 'exists ' + this.header_names.toString();
	}

	pushArguments(args)
	{
		if (args[0] instanceof GrammarStringList) {
			this.header_names = args;
		} else if (args[0] instanceof GrammarString) {
			this.header_names.push(args[0].value);
		}
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.6
 */
export class FalseCommand extends GrammarTest
{
	toString()
	{
		return "false";
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.7
 */
export class HeaderCommand extends GrammarTest
{
	constructor()
	{
		super();
		this.address_part = ':all';
		this.header_names = new GrammarStringList;
		this.key_list     = new GrammarStringList;
		// rfc5260#section-6
//		this.index        = new GrammarNumber;
//		this.last         = false;
	}

	get require() {
		let requires = [];
		isSubAddressPart(this.address_part) && requires.push('subaddress');
		(this.last || (this.index && this.index.value)) && requires.push('index');
		return requires;
	}

	toString()
	{
		return 'header'
//			+ (this.last ? ' :last' : (this.index.value ? ' :index ' + this.index : ''))
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.match_type
			+ ' ' + this.header_names.toString()
			+ ' ' + this.key_list.toString();
	}

	pushArguments(args)
	{
		args.forEach((arg, i) => {
			if (isAddressPart(arg)) {
				this.address_part = arg;
			} else if (':last' === arg) {
				this.last = true;
			} else if (':index' === args[i-1]) {
				this.index.value = arg.value;
			} else if (arg instanceof GrammarStringList || arg instanceof GrammarString) {
				this[args[i+1] ? 'header_names' : 'key_list'] = arg;
//				(args[i+1] ? this.header_names : this.key_list) = arg;
			}
		});
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.8
 */
export class NotCommand extends GrammarTest
{
	constructor()
	{
		super();
		this.test = new GrammarTest;
	}

	toString()
	{
		return 'not ' + this.test;
	}

	pushArguments()
	{
		throw 'No arguments';
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.9
 */
export class SizeCommand extends GrammarTest
{
	constructor()
	{
		super();
		this.mode  = ':over'; // :under
		this.limit = 0;
	}

	toString()
	{
		return 'size ' + this.mode + ' ' + this.limit;
	}

	pushArguments(args)
	{
		args.forEach(arg => {
			if (':over' === arg || ':under' === arg) {
				this.mode = arg;
			} else if (arg instanceof GrammarNumber) {
				this.limit = arg;
			}
		});
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.10
 */
export class TrueCommand extends GrammarTest
{
	toString()
	{
		return 'true';
	}
}
