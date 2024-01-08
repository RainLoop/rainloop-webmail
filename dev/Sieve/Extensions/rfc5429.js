/**
 * https://tools.ietf.org/html/rfc5429
 */

import {
	ActionCommand,
	GrammarQuotedString,
	GrammarString
} from 'Sieve/Grammar';

class rfc5429Command extends ActionCommand
{
	constructor(identifier)
	{
		super(identifier);
		this._reason = new GrammarQuotedString;
	}

	toString()
	{
		return this.require + ' ' + this._reason + ';';
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
 * https://tools.ietf.org/html/rfc5429#section-2.1
 */
export class ErejectCommand extends rfc5429Command
{
	constructor() { super('ereject'); }
	get require() { return 'ereject'; }
}

/**
 * https://tools.ietf.org/html/rfc5429#section-2.2
 */
export class RejectCommand extends rfc5429Command
{
	constructor() { super('reject'); }
	get require() { return 'reject'; }
}
