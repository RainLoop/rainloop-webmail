/**
 * https://tools.ietf.org/html/rfc5228#section-2.9
 * A control structure is a control command that ends with a block instead of a semicolon.
 */

import {
	ControlCommand,
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
export class ConditionalCommand extends ControlCommand
{
	constructor(identifier)
	{
		super(identifier);
		this.test = null;
	}

	toString()
	{
		return this.identifier + ' ' + this.test + ' ' + this.commands;
	}
/*
	public function pushArguments(array $args): void
	{
		args.forEach((arg, i) => {
			if (i && ':' === args[i-1][0]) {
				this[args[i-1].replace(':','_')].value = arg.value;
			}
		});
		print_r($args);
		exit;
	}
*/
}

export class IfCommand extends ConditionalCommand
{
}

export class ElsIfCommand extends ConditionalCommand
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
