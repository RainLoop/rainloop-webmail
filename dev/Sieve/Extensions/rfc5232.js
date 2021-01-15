/**
 * https://tools.ietf.org/html/rfc5232
 */

(Sieve => {

const Grammar = Sieve.Grammar;

class Flag extends Grammar.Command
{
	constructor(identifier)
	{
		super(identifier);
		this._variablename = new Grammar.QuotedString;
		this.list_of_flags = new Grammar.StringList;
	}

	get require() { return 'imap4flags'; }

	toString()
	{
		return this.identifier + ' ' + this._variablename + ' ' + this.list_of_flags.toString() + ';';
	}

	get variablename()
	{
		return this._variablename.value;
	}

	set variablename(value)
	{
		this._variablename.value = value;
	}

	pushArguments(args)
	{
		if (args[1]) {
			if (args[0] instanceof Grammar.QuotedString) {
				this._variablename = args[0];
			}
			if (args[1] instanceof Grammar.StringType) {
				this.list_of_flags = args[1];
			}
		} else if (args[0] instanceof Grammar.StringType) {
			this.list_of_flags = args[0];
		}
	}
}

class SetFlag extends Flag
{
	constructor()
	{
		super('setflag');
	}
}

class AddFlag extends Flag
{
	constructor()
	{
		super('addflag');
	}
}

class RemoveFlag extends Flag
{
	constructor()
	{
		super('removeflag');
	}
}

class HasFlag extends Grammar.Test
{
	constructor()
	{
		super('hasflag');
		this.variable_list = new Grammar.StringList;
		this.list_of_flags = new Grammar.StringList;
	}

	get require() { return 'imap4flags'; }

	toString()
	{
		return 'hasflag'
			+ ' ' + this.match_type
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.variable_list.toString()
			+ ' ' + this.list_of_flags.toString();
	}

	pushArguments(args)
	{
		args.forEach((arg, i) => {
			if (arg instanceof Grammar.StringList || arg instanceof Grammar.StringType) {
				this[args[i+1] ? 'variable_list' : 'list_of_flags'] = arg;
			}
		});
	}
}

Object.assign(Sieve.Commands, {
	setflag: SetFlag,
	addflag: AddFlag,
	removeflag: RemoveFlag,
	hasflag: HasFlag
//	mark and unmark	never made it into the RFC
});

})(this.Sieve);
