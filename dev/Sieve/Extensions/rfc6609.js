/**
 * https://tools.ietf.org/html/rfc6609
 */

import {
	GrammarCommand,
	GrammarQuotedString
} from 'Sieve/Grammar';

export class IncludeCommand extends GrammarCommand
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
		return this.identifier
			+ (this.global ? ' :global' : '')
			+ (this.once ? ' :once' : '')
			+ (this.optional ? ' :optional' : '')
			+ ' ' + this.value + ';';
	}

	pushArguments(args)
	{
		args.forEach(arg => {
			if (':global' === arg || ':once' === arg || ':optional' === arg) {
				this[arg.substr(1)] = true;
			} else if (arg instanceof GrammarQuotedString) {
				this.value = arg;
			}
		});
	}
}

export class ReturnCommand extends GrammarCommand
{
	get require() { return 'include'; }
}
