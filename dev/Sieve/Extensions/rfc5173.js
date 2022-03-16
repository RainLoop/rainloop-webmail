/**
 * https://tools.ietf.org/html/rfc5173
 */

import {
	GrammarString,
	GrammarStringList,
	GrammarTest
} from 'Sieve/Grammar';

export class BodyTest extends GrammarTest
{
	constructor()
	{
		super();
		this.body_transform = ''; // :raw, :content <string-list>, :text
		this.key_list = new GrammarStringList;
	}

	get require() { return 'body'; }

	toString()
	{
		return 'body'
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.match_type
			+ ' ' + this.body_transform
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		args.forEach((arg, i) => {
			if (':raw' === arg || ':text' === arg) {
				this.body_transform = arg;
			} else if (arg instanceof GrammarStringList || arg instanceof GrammarString) {
				if (':content' === args[i-1]) {
					this.body_transform = ':content ' + arg;
				} else {
					this[args[i+1] ? 'content_list' : 'key_list'] = arg;
				}
			}
		});
	}
}
