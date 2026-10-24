/**
 * https://tools.ietf.org/html/rfc5173
 */

import {
	GrammarString,
	GrammarStringList,
	TestCommand
} from 'Sieve/Grammar';

export class BodyTest extends TestCommand
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
			+ (this._comparator ? ' :comparator ' + this._comparator : '')
			+ (this._match_type ? ' ' + this._match_type : '')
			+ (this.relational_match ? ' ' + this.relational_match : '')
			+ ' ' + this.body_transform
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		args.forEach((arg, i) => {
			if (':raw' === arg || ':text' === arg) {
				this.body_transform = arg;
			} else if (arg instanceof GrammarStringList || arg instanceof GrammarString) {
				if (i && ':content' === args[i-1]) {
					this.body_transform = ':content ' + arg;
				} else {
					this[args[i+1] ? 'content_list' : 'key_list'] = arg;
				}
			}
		});
	}
}
