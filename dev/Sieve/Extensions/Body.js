/**
 * https://tools.ietf.org/html/rfc5173
 */

(Sieve => {

Sieve.Extensions.Body = class
{
	constructor()
	{
		this.comparator = 'i;ascii-casemap',
		this.match_type = ':is',
		this.body_transform = ''; // :raw, :content <string-list>, :text
		this.key_list = new Sieve.Grammar.StringList;
	}

	toString()
	{
		return 'body'
//			+ ' ' + this.comparator
			+ ' ' + this.match_type
			+ ' ' + this.body_transform
			+ ' ' + this.key_list;
	}
};

})(this.Sieve);

