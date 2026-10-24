/**
 * https://tools.ietf.org/html/rfc5463
 */

import {
	ControlCommand,
	TestCommand,
	GrammarQuotedString,
	GrammarStringList
} from 'Sieve/Grammar';

/**
 * https://datatracker.ietf.org/doc/html/rfc5463#section-4
 */
export class IHaveTest extends TestCommand
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
		this.capabilities = args.pop();
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5463#section-5
 */
export class ErrorCommand extends ControlCommand
{
	constructor()
	{
		super();
		this._message = new GrammarQuotedString;
	}

	get require() { return 'ihave'; }

	get message() { return this._message.value; }
	set message(v) { this._message.value = v; }

	toString()
	{
		return 'error ' + this._message + ';';
	}

	pushArguments(args)
	{
		this._message = args.pop();
	}
}
