/**
 * https://tools.ietf.org/html/rfc5228#section-2.9
 * A control structure is a control command that ends with a block instead of a semicolon.
 */

import {
	ControlCommand,
	GrammarCommands,
	GrammarStringList,
	GrammarQuotedString
} from 'Sieve/Grammar';

/**
 * https://tools.ietf.org/html/rfc5228#section-3.1
 * Usage:
 *    if <test1: test> <block1: block>
 *    elsif <test2: test> <block2: block>
 *    else <block3: block>
 */
export /*abstract*/ class ConditionalCommand extends ControlCommand
{
	constructor()
	{
/*
		if (this.constructor == ConditionalCommand) {
			throw Error("Abstract class can't be instantiated.");
		}
*/
		super();
		this.commands = new GrammarCommands;
	}
}

export class IfCommand extends ConditionalCommand
{
	constructor()
	{
		super();
		this._test = null; // must be descendent instanceof TestCommand
	}

	get test()
	{
		return this._test;
	}

	set test(value)
	{
/*
		if (!value instanceof TestCommand) {
			throw Error("test must be descendent instanceof TestCommand.");
		}
*/
		this._test = value;
	}

	toString()
	{
/*
		if (!this._test instanceof TestCommand) {
			throw Error("test must be descendent instanceof TestCommand.");
		}
*/
		return this.identifier + ' ' + this._test + ' ' + this.commands;
	}
}

export class ElsIfCommand extends IfCommand
{
}

export class ElseCommand extends ConditionalCommand
{
	toString()
	{
		return this.identifier + ' ' + this.commands;
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-3.2
 */
export class RequireCommand extends ControlCommand
{
	constructor()
	{
		super();
		this.capabilities = new GrammarStringList();
	}

	toString()
	{
		return 'require ' + this.capabilities + ';';
	}

	pushArguments(args)
	{
		if (args[0] instanceof GrammarStringList) {
			this.capabilities = args[0];
		} else if (args[0] instanceof GrammarQuotedString) {
			this.capabilities.push(args[0]);
		}
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-3.3
 */
export class StopCommand extends ControlCommand
{
}
