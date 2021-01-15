/**
 * https://tools.ietf.org/html/rfc5228#section-5
 */

(Sieve => {

const Grammar = Sieve.Grammar,
	Test = Grammar.Test,
	StringList = Grammar.StringList,

	isAddressPart = tag => ':localpart' === tag || ':domain' === tag || ':all' === tag || isSubAddressPart(tag),
	// https://tools.ietf.org/html/rfc5233
	isSubAddressPart = tag => ':user' === tag || ':detail' === tag;

/**
 * https://tools.ietf.org/html/rfc5228#section-5.1
 */
class Address extends Test
{
	constructor()
	{
		super('address');
		this.address_part = ':all';
		this.header_list  = new StringList;
		this.key_list     = new StringList;
		// rfc5260#section-6
//		this.index        = new Grammar.Number;
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
			} else if (arg instanceof StringList || arg instanceof Grammar.StringType) {
				this[args[i+1] ? 'header_list' : 'key_list'] = arg;
//				(args[i+1] ? this.header_list : this.key_list) = arg;
			}
		});
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.2
 */
class AllOf extends Test
{
	constructor()
	{
		super('allof');
		this.tests = new Grammar.TestList;
	}

	toString()
	{
		return 'allof ' + this.tests.toString();
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.3
 */
class AnyOf extends Test
{
	constructor()
	{
		super('anyof');
		this.tests = new Grammar.TestList;
	}

	toString()
	{
		return 'anyof ' + this.tests.toString();
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.4
 */
class Envelope extends Test
{
	constructor()
	{
		super('envelope');
		this.address_part = ':all';
		this.envelope_part = new StringList;
		this.key_list      = new StringList;
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
			} else if (arg instanceof StringList || arg instanceof Grammar.StringType) {
				this[args[i+1] ? 'envelope_part' : 'key_list'] = arg;
//				(args[i+1] ? this.envelope_part : this.key_list) = arg;
			}
		});
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.5
 */
class Exists extends Test
{
	constructor()
	{
		super('exists');
		this.header_names = new StringList;
	}

	toString()
	{
		return 'exists ' + this.header_names.toString();
	}

	pushArguments(args)
	{
		if (args[0] instanceof StringList) {
			this.header_names = args;
		} else if (args[0] instanceof Grammar.StringType) {
			this.header_names.push(args[0].value);
		}
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.6
 */
class False extends Test
{
	toString()
	{
		return "false";
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.7
 */
class Header extends Test
{
	constructor()
	{
		super('header');
		this.address_part = ':all';
		this.header_names = new StringList;
		this.key_list     = new StringList;
		// rfc5260#section-6
//		this.index        = new Grammar.Number;
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
			} else if (arg instanceof StringList || arg instanceof Grammar.StringType) {
				this[args[i+1] ? 'header_names' : 'key_list'] = arg;
//				(args[i+1] ? this.header_names : this.key_list) = arg;
			}
		});
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.8
 */
class Not extends Test
{
	constructor()
	{
		super('not');
		this.test = new Test;
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
class Size extends Test
{
	constructor()
	{
		super('size');
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
			} else if (arg instanceof Grammar.Number) {
				this.limit = arg;
			}
		});
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.10
 */
class True extends Test
{
	toString()
	{
		return 'true';
	}
}

Object.assign(Sieve.Commands, {
	address: Address,
	allof: AllOf,
	anyof: AnyOf,
	envelope: Envelope,
	exists: Exists,
	false: False,
	header: Header,
	not: Not,
	size: Size,
	true: True
});

})(this.Sieve);
