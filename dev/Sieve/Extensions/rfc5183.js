/**
 * https://tools.ietf.org/html/rfc5183
 */

(Sieve => {

const Grammar = Sieve.Grammar;

class Environment extends Grammar.Test
{
	constructor()
	{
		super('environment');
		this.name     = new Grammar.QuotedString;
		this.key_list = new Grammar.StringList;
	}

	get require() { return 'environment'; }

	toString()
	{
		return 'body'
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.match_type
			+ ' ' + this.name
			+ ' ' + this.key_list.toString();
	}

	pushArguments(args)
	{
		this.name     = args[args.length-2];
		this.key_list = args[args.length-1];
	}
}

Sieve.Commands.environment = Environment;

})(this.Sieve);
