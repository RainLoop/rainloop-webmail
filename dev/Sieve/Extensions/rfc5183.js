/**
 * https://tools.ietf.org/html/rfc5183
 */

import {
	GrammarQuotedString,
	GrammarStringList,
	GrammarTest
} from 'Sieve/Grammar';

export class EnvironmentTest extends GrammarTest
{
	constructor()
	{
		super();
		this.name     = new GrammarQuotedString;
		this.key_list = new GrammarStringList;
	}

	get require() { return 'environment'; }

	toString()
	{
		return 'environment'
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
