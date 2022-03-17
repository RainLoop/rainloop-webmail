/**
 * https://tools.ietf.org/html/rfc5183
 */

import {
	GrammarQuotedString,
	GrammarStringList,
	TestCommand
} from 'Sieve/Grammar';

export class EnvironmentTest extends TestCommand
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
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		this.key_list = args.pop();
		this.name     = args.pop();
	}
}
