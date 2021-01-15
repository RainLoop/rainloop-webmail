/**
 * https://tools.ietf.org/html/rfc5293
 */

(Sieve => {

const Grammar = Sieve.Grammar;

class AddHeader extends Grammar.Command
{
	constructor()
	{
		super('addheader');
		this.last       = false;
		this.field_name = new Grammar.QuotedString;
		this.value      = new Grammar.QuotedString;
	}

	get require() { return 'editheader'; }

	toString()
	{
		return this.identifier
			+ (this.last ? ' :last' : '')
			+ ' ' + this.field_name
			+ ' ' + this.value + ';';
	}

	pushArguments(args)
	{
		this.last = args.includes(':last');
		this.field_name = args[args.length - 2];
		this.value = args[args.length - 1];
	}
}

class DeleteHeader extends Grammar.Command
{
	constructor()
	{
		super('deleteheader');
		this.index          = new Grammar.Number;
		this.last           = false;
		this.comparator     = '',
		this.match_type     = ':is',
		this.field_name     = new Grammar.QuotedString;
		this.value_patterns = new Grammar.StringList;
	}

	get require() { return 'editheader'; }

	toString()
	{
		return this.identifier
			+ (this.last ? ' :last' : (this.index.value ? ' :index ' + this.index : ''))
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.match_type
			+ ' ' + this.field_name
			+ ' ' + this.value_patterns + ';';
	}

	pushArguments(args)
	{
		let l = args.length - 1;
		args.forEach((arg, i) => {
			if (':last' === arg) {
				this.last = true;
			} else if (':index' === args[i-1]) {
				this.index.value = arg.value;
				args[i] = null;
			}
		});

		if (args[l-1] instanceof Grammar.StringType) {
			this.field_name = args[l-1];
			this.value_patterns = args[l];
		} else {
			this.field_name = args[l];
		}
	}
}

Object.assign(Sieve.Commands, {
	addheader: AddHeader,
	deleteheader: DeleteHeader
});

})(this.Sieve);
