/**
 * https://tools.ietf.org/html/rfc5429
 */

import {
	GrammarCommand,
	GrammarQuotedString,
	GrammarString
} from 'Sieve/Grammar';

/**
 * https://tools.ietf.org/html/rfc5429#section-2.1
 */
export class ErejectCommand extends GrammarCommand
{
	constructor()
	{
		super();
		this._reason = new GrammarQuotedString;
	}

	get require() { return 'ereject'; }

	toString()
	{
		return 'ereject ' + this._reason + ';';
	}

	get reason()
	{
		return this._reason.value;
	}

	set reason(value)
	{
		this._reason.value = value;
	}

	pushArguments(args)
	{
		if (args[0] instanceof GrammarString) {
			this._reason = args[0];
		}
	}
}

/**
 * https://tools.ietf.org/html/rfc5429#section-2.2
 */
export class RejectCommand extends GrammarCommand
{
	constructor()
	{
		super();
		this._reason = new GrammarQuotedString;
	}

	get require() { return 'reject'; }

	toString()
	{
		return 'reject ' + this._reason + ';';
	}

	get reason()
	{
		return this._reason.value;
	}

	set reason(value)
	{
		this._reason.value = value;
	}

	pushArguments(args)
	{
		if (args[0] instanceof GrammarString) {
			this._reason = args[0];
		}
	}
}
