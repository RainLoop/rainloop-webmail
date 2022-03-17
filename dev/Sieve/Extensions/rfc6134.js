/**
 * https://tools.ietf.org/html/rfc6134
 */

import {
	GrammarStringList,
	TestCommand
} from 'Sieve/Grammar';

/**
 * https://datatracker.ietf.org/doc/html/rfc6134#section-2.7
 */
export class ValidExtListTest extends TestCommand
{
	constructor()
	{
		super();
		this.ext_list_names = new GrammarStringList;
	}

	get require() { return 'foreverypart'; }

	toString()
	{
		return 'valid_ext_list ' + this.ext_list_names;
	}

	pushArguments(args)
	{
		this.ext_list_names = args.pop();
	}
}
