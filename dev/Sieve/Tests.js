/**
 * https://tools.ietf.org/html/rfc5228#section-5
 */

(Sieve => {

/**
 * https://tools.ietf.org/html/rfc5228#section-5.1
 */
class Address
{
	constructor()
	{
		this.comparator   = 'i;ascii-casemap';
		this.address_part = ':all'; // :localpart | :domain | :all
		this.match_type   = ':is';
		this.header_list  = new Sieve.Grammar.StringList;
		this.key_list     = new Sieve.Grammar.StringList;
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
class AllOf extends Sieve.Grammar.TestList
{
	constructor()
	{
		super('allof');
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.3
 */
class AnyOf extends Sieve.Grammar.TestList
{
	constructor()
	{
		super('anyof');
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.4
 */
class Envelope
{
	constructor()
	{
		this.comparator   = 'i;ascii-casemap';
		this.address_part = ':all'; // :localpart | :domain | :all
		this.match_type   = ':is';
		this.envelope_part = new Sieve.Grammar.StringList;
		this.key_list      = new Sieve.Grammar.StringList;
	}

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
class Exists
{
	constructor()
	{
		this.header_names = new Sieve.Grammar.StringList;
	}

	toString()
	{
		return "exists {this.header_names}";
	}

	pushArguments(/*args*/)
	{
		throw 'TODO';
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.6
 */
class False
{
	toString()
	{
		return "false";
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.7
 */
class Header
{
	constructor()
	{
		this.comparator   = 'i;ascii-casemap';
		this.address_part = ':all'; // :localpart | :domain | :all
		this.match_type   = ':is';
		this.header_names = new Sieve.Grammar.StringList;
		this.key_list     = new Sieve.Grammar.StringList;
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
			} else if (arg instanceof Sieve.Grammar.StringList || arg instanceof Sieve.Grammar.StringType) {
				this[args[i+1] ? 'header_names' : 'key_list'] = arg;
//				(args[i+1] ? this.header_names : this.key_list) = arg;
			}
		});
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.8
 */
class Not
{
	constructor()
	{
		this.test = new Sieve.Grammar.Test;
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
class Size
{
	constructor()
	{
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
			} else if (arg instanceof Sieve.Grammar.Number) {
				this.limit = arg;
			}
		});
	}
}

Sieve.Tests = {
	Address: Address,
	AllOf: AllOf,
	AnyOf: AnyOf,
	Envelope: Envelope,
	Exists: Exists,
	False: False,
	Header: Header,
	Not: Not,
	Size: Size
};

})(this.Sieve);
