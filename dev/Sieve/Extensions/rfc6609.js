/**
 * https://tools.ietf.org/html/rfc6609
 */

import {
	ControlCommand,
	GrammarQuotedString,
	GrammarStringList
} from 'Sieve/Grammar';

export class IncludeCommand extends ControlCommand
{
	constructor()
	{
		super();
		this.global = false; // ':personal' / ':global';
		this.once = false;
		this.optional = false;
		this.value = new GrammarQuotedString;
	}

	get require() { return 'include'; }

	toString()
	{
		return 'include'
			+ (this.global ? ' :global' : '')
			+ (this.once ? ' :once' : '')
			+ (this.optional ? ' :optional' : '')
			+ ' ' + this.value + ';';
	}

	pushArguments(args)
	{
		args.forEach(arg => {
			if (':global' === arg || ':once' === arg || ':optional' === arg) {
				this[arg.slice(1)] = true;
			} else if (arg instanceof GrammarQuotedString) {
				this.value = arg;
			}
		});
	}
}

export class ReturnCommand extends ControlCommand
{
	get require() { return 'include'; }
}

export class GlobalCommand extends ControlCommand
{
	constructor()
	{
		super();
		this.value = new GrammarStringList;
	}

	get require() { return ['include', 'variables']; }

	toString()
	{
		return 'global ' + this.value + ';';
	}

	pushArguments(args)
	{
		this.value = args.pop();
	}
}
