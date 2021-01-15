/**
 * https://tools.ietf.org/html/rfc6609
 */

(Sieve => {

const Grammar = Sieve.Grammar;

class Include extends Grammar.Command
{
	constructor()
	{
		super('include');
		this.global = false; // ':personal' / ':global';
		this.once = false;
		this.optional = false;
		this.value = new Grammar.QuotedString;
	}

	get require() { return 'include'; }

	toString()
	{
		return this.identifier
			+ (this.global ? ' :global' : '')
			+ (this.once ? ' :once' : '')
			+ (this.optional ? ' :optional' : '')
			+ ' ' + this.value + ';';
	}

	pushArguments(args)
	{
		args.forEach(arg => {
			if (':global' === arg || ':once' === arg || ':optional' === arg) {
				this[arg.substr(1)] = true;
			} else if (arg instanceof Grammar.QuotedString) {
				this.value = arg;
			}
		});
	}
}

class Return extends Grammar.Command
{
	constructor()
	{
		super('return');
	}

	get require() { return 'include'; }

	toString()
	{
		return 'return;';
	}
}

Object.assign(Sieve.Commands, {
	include: Include,
	return: Return
});

})(this.Sieve);
