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
		this.body_transform = ''; // :raw, :content <string-list>, :text
		this.key_list = new Grammar.StringList;
	}

	get require() { return 'body'; }

	toString()
	{
		return 'body'
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.match_type
			+ ' ' + this.body_transform
			+ ' ' + this.key_list.toString();
	}

	pushArguments(args)
	{
		args.forEach((arg, i) => {
			if (':raw' === arg || ':text' === arg) {
				this.body_transform = arg;
			} else if (arg instanceof Grammar.StringList || arg instanceof Grammar.StringType) {
				if (':content' === args[i-1]) {
					this.body_transform = ':content ' + arg;
				} else {
					this[args[i+1] ? 'content_list' : 'key_list'] = arg;
				}
			}
		});
	}
}

Sieve.Commands.body = Body;

})(this.Sieve);

