/**
 * https://tools.ietf.org/html/rfc5228#section-5
 */

import { capa } from 'Sieve/Utils';

import {
	GrammarNumber,
	GrammarString,
	GrammarStringList,
	TestCommand,
	GrammarTestList
} from 'Sieve/Grammar';

const
	isAddressPart = tag => ':localpart' === tag || ':domain' === tag || ':all' === tag || isSubAddressPart(tag),
	// https://tools.ietf.org/html/rfc5233
	isSubAddressPart = tag => ':user' === tag || ':detail' === tag,

	asStringList = arg => {
		if (arg instanceof GrammarStringList) {
			return arg;
		}
		let args = new GrammarStringList();
		if (arg instanceof GrammarString) {
			args.push(arg.value);
		}
		return args;
	};

/**
 * https://tools.ietf.org/html/rfc5228#section-5.1
 */
export class AddressTest extends TestCommand
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
		// rfc5703#section-6
//		this.mime
//		this.anychild
	}

	get require() {
		let requires = [];
		isSubAddressPart(this.address_part) && requires.push('subaddress');
		(this.last || (this.index && this.index.value)) && requires.push('index');
		(this.mime || this.anychild) && requires.push('mime');
		return requires;
	}

	toString()
	{
		let result = 'address';
		if (capa.includes('mime')) {
			if (this.mime) {
				result += ' :mime';
			}
			if (this.anychild) {
				result += ' :anychild';
			}
		}
		return result
//			+ (this.last ? ' :last' : (this.index.value ? ' :index ' + this.index : ''))
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.address_part
			+ ' ' + this.match_type
			+ ' ' + this.header_list
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		this.key_list = asStringList(args.pop());
		this.header_list = asStringList(args.pop());
		args.forEach((arg, i) => {
			if (isAddressPart(arg)) {
				this.address_part = arg;
			} else if (':last' === arg) {
				this.last = true;
			} else if (':mime' === arg) {
				this.mime = true;
			} else if (':anychild' === arg) {
				this.anychild = true;
			} else if (i && ':index' === args[i-1]) {
				this.index.value = arg.value;
			}
		});
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.2
 */
export class AllOfTest extends TestCommand
{
	constructor()
	{
		super();
		this.tests = new GrammarTestList;
	}

	toString()
	{
		return 'allof ' + this.tests;
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.3
 */
export class AnyOfTest extends TestCommand
{
	constructor()
	{
		super();
		this.tests = new GrammarTestList;
	}

	toString()
	{
		return 'anyof ' + this.tests;
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.4
 */
export class EnvelopeTest extends TestCommand
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
			+ ' ' + this.envelope_part
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		this.key_list = asStringList(args.pop());
		this.envelope_part = asStringList(args.pop());
		args.forEach(arg => {
			if (isAddressPart(arg)) {
				this.address_part = arg;
			}
		});
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.5
 */
export class ExistsTest extends TestCommand
{
	constructor()
	{
		super();
		this.header_names = new GrammarStringList;
		// rfc5703#section-6
//		this.mime
//		this.anychild
	}

	get require() {
		return (this.mime || this.anychild) ? ['mime'] : null;
	}

	toString()
	{
		let result = 'exists';
		if (capa.includes('mime')) {
			if (this.mime) {
				result += ' :mime';
			}
			if (this.anychild) {
				result += ' :anychild';
			}
		}
		return result + ' ' + this.header_names;
	}

	pushArguments(args)
	{
		this.header_names = asStringList(args.pop());
		args.forEach(arg => {
			if (':mime' === arg) {
				this.mime = true;
			} else if (':anychild' === arg) {
				this.anychild = true;
			}
		});
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.6
 */
export class FalseTest extends TestCommand
{
	toString()
	{
		return "false";
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.7
 */
export class HeaderTest extends TestCommand
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
		// rfc5703#section-6
		this.mime         = false;
		this.anychild     = false;
		// when ":mime" is used:
		this.type         = false;
		this.subtype      = false;
		this.contenttype  = false;
		this.param        = new GrammarStringList;
	}

	get require() {
		let requires = [];
		isSubAddressPart(this.address_part) && requires.push('subaddress');
		(this.last || (this.index && this.index.value)) && requires.push('index');
		(this.mime || this.anychild) && requires.push('mime');
		return requires;
	}

	toString()
	{
		let result = 'header';
		if (capa.includes('mime')) {
			if (this.mime) {
				result += ' :mime';
				if (this.type) {
					result += ' :type';
				}
				if (this.subtype) {
					result += ' :subtype';
				}
				if (this.contenttype) {
					result += ' :contenttype';
				}
				if (this.param.length) {
					result += ' :param ' + this.param;
				}
			}
			if (this.anychild) {
				result += ' :anychild';
			}
		}
		return result
//			+ (this.last ? ' :last' : (this.index.value ? ' :index ' + this.index : ''))
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.match_type
			+ ' ' + this.header_names
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		this.key_list = asStringList(args.pop());
		this.header_names = asStringList(args.pop());
		args.forEach((arg, i) => {
			if (isAddressPart(arg)) {
				this.address_part = arg;
			} else if (':last' === arg) {
				this.last = true;
			} else if (i && ':index' === args[i-1]) {
				this.index.value = arg.value;
			}
		});
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.8
 */
export class NotTest extends TestCommand
{
	constructor()
	{
		super();
		this.test = new TestCommand;
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
export class SizeTest extends TestCommand
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
export class TrueTest extends TestCommand
{
	toString()
	{
		return 'true';
	}
}
