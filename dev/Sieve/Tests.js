/**
 * https://tools.ietf.org/html/rfc5228#section-5
 */

(Sieve => {

const Grammar = Sieve.Grammar,
	Test = Grammar.Test,
	StringList = Grammar.StringList;

/**
 * https://tools.ietf.org/html/rfc5228#section-5.1
 */
class Address extends Test
{
	constructor()
	{
		super('address');
		this.comparator   = 'i;ascii-casemap';
		this.address_part = ':all'; // :localpart | :domain | :all
		this.match_type   = ':is';
		this.header_list  = new StringList;
		this.key_list     = new StringList;
	}

	toString()
	{
		return 'address'
//			+ ' ' + this.comparator
			+ ' ' + this.address_part
			+ ' ' + this.match_type
			+ ' ' + this.header_list
			+ ' ' + this.key_list;
	}

	pushArguments(/*args*/)
	{
		throw 'TODO';
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
		return 'allof' + this.tests;
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
		return 'anyof' + this.tests;
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
		this.comparator   = 'i;ascii-casemap';
		this.address_part = ':all'; // :localpart | :domain | :all
		this.match_type   = ':is';
		this.envelope_part = new StringList;
		this.key_list      = new StringList;
	}

	get require() { return 'envelope'; }

	toString()
	{
		return 'envelope'
//			+ ' ' + this.comparator
			+ ' ' + this.address_part
			+ ' ' + this.match_type
			+ ' ' + this.envelope_part
			+ ' ' + this.key_list;
	}

	pushArguments(/*args*/)
	{
		throw 'TODO';
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
		return 'exists ' + this.header_names;
	}

	pushArguments(/*args*/)
	{
		throw 'TODO';
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
		this.comparator   = 'i;ascii-casemap';
		this.address_part = ':all'; // :localpart | :domain | :all
		this.match_type   = ':is';
		this.header_names = new StringList;
		this.key_list     = new StringList;
	}

	toString()
	{
		return 'header'
//			+ ' ' + this.comparator
			+ ' ' + this.match_type
			+ ' ' + this.header_names
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		args.forEach((arg, i) => {
			if (':is' === arg || ':contains' === arg || ':matches' === arg) {
				this.match_type = arg;
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

	pushArguments(/*args*/)
	{
		throw 'TODO';
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
