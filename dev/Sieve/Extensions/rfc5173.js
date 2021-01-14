/**
 * https://tools.ietf.org/html/rfc5173
 */

(Sieve => {

const Grammar = Sieve.Grammar;

class Body extends Grammar.Test
{
	constructor()
	{
		super('body');
		this.comparator = 'i;ascii-casemap',
		this.match_type = ':is',
		this.body_transform = ''; // :raw, :content <string-list>, :text
		this.key_list = new Grammar.StringList;
//		this.require = 'body';
	}

	toString()
	{
		return 'body'
//			+ ' ' + this.comparator
			+ ' ' + this.match_type
			+ ' ' + this.body_transform
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		args.forEach((arg, i) => {
			if (':is' === arg || ':contains' === arg || ':matches' === arg) {
				this.match_type = arg;
			} else if (':raw' === arg || ':text' === arg) {
				this.body_transform = arg;
			} else if (':content' === arg) {
				// string-list
			} else if (arg instanceof Grammar.StringList || arg instanceof Grammar.StringType) {
				this[args[i+1] ? 'content_list' : 'key_list'] = arg;
			}
		});
	}
}

Sieve.Commands.body = Body;

})(this.Sieve);

