/**
 * https://tools.ietf.org/html/rfc5229
 */

(Sieve => {

const Grammar = Sieve.Grammar;

class Set extends Grammar.Command
{
	constructor()
	{
		super('set');
		this.modifiers = [];
		this._name    = new Grammar.QuotedString;
		this._value   = new Grammar.QuotedString;
	}

	get require() { return 'variables'; }

	toString()
	{
		return 'set'
			+ ' ' + this.modifiers.join(' ')
			+ ' ' + this._name
			+ ' ' + this._value;
	}

	get name()     { return this._name.value; }
	set name(str)  { this._name.value = str; }

	get value()    { return this._value.value; }
	set value(str) { this._value.value = str; }

	pushArguments(args)
	{
		[':lower', ':upper', ':lowerfirst', ':upperfirst', ':quotewildcard', ':length'].forEach(modifier => {
			args.includes(modifier) && this.modifiers.push(modifier);
		});
		this._name  = args[args.length-2];
		this._value = args[args.length-1];
	}
}

class String extends Grammar.Test
{
	constructor()
	{
		super('string');
		this.source   = new Grammar.StringList;
		this.key_list = new Grammar.StringList;
	}

	toString()
	{
		return 'string'
			+ ' ' + this.match_type
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.source.toString()
			+ ' ' + this.key_list.toString();
	}

	pushArguments(args)
	{
		this.source   = args[args.length-2];
		this.key_list = args[args.length-1];
	}
}

Sieve.Commands.set = Set;
Sieve.Commands.string = String;

})(this.Sieve);
