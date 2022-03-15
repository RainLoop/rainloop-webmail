/**
 * https://tools.ietf.org/html/rfc5463
 */

import {
	GrammarCommand,
	GrammarTest,
	GrammarString,
	GrammarStringList
} from 'Sieve/Grammar';

/**
 * https://datatracker.ietf.org/doc/html/rfc5463#section-4
 */
export class IHaveTest extends GrammarTest
{
	constructor()
	{
		super();
		this.capabilities = new GrammarStringList;
	}

	get require() { return 'ihave'; }

	toString()
	{
		return 'ihave ' + this.capabilities;
	}

	pushArguments(args)
	{
		let l = args.length;
		if (args[l-1] instanceof GrammarString) {
			this.method = args[l-1];
		}
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5463#section-5
 */
export class ErrorCommand extends GrammarCommand
{
	constructor()
	{
		super();
		this.message = new GrammarString;
	}

	get require() { return 'ihave'; }

	toString()
	{
		return 'error ' + this.message + ';';
	}

	pushArguments(args)
	{
		let l = args.length;
		if (args[l-1] instanceof GrammarString) {
			this.method = args[l-1];
		}
	}
}
