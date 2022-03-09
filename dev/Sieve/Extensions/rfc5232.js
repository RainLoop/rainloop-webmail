/**
 * https://tools.ietf.org/html/rfc5232
 */

import {
	GrammarCommand,
	GrammarQuotedString,
	GrammarString,
	GrammarStringList,
	GrammarTest
} from 'Sieve/Grammar';

class FlagCommand extends GrammarCommand
{
	constructor()
	{
		super();
		this._variablename = new GrammarQuotedString;
		this.list_of_flags = new GrammarStringList;
	}

	get require() { return 'imap4flags'; }

	toString()
	{
		return this.identifier + ' ' + this._variablename + ' ' + this.list_of_flags.toString() + ';';
	}

	get variablename()
	{
		return this._variablename.value;
	}

	set variablename(value)
	{
		this._variablename.value = value;
	}

	pushArguments(args)
	{
		if (args[1]) {
			if (args[0] instanceof GrammarQuotedString) {
				this._variablename = args[0];
			}
			if (args[1] instanceof GrammarString) {
				this.list_of_flags = args[1];
			}
		} else if (args[0] instanceof GrammarString) {
			this.list_of_flags = args[0];
		}
	}
}

export class SetFlagCommand extends FlagCommand
{
}

export class AddFlagCommand extends FlagCommand
{
}

export class RemoveFlagCommand extends FlagCommand
{
}

export class HasFlagCommand extends GrammarTest
{
	constructor()
	{
		super();
		this.variable_list = new GrammarStringList;
		this.list_of_flags = new GrammarStringList;
	}

	get require() { return 'imap4flags'; }

	toString()
	{
		return 'hasflag'
			+ ' ' + this.match_type
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.variable_list.toString()
			+ ' ' + this.list_of_flags.toString();
	}

	pushArguments(args)
	{
		args.forEach((arg, i) => {
			if (arg instanceof GrammarStringList || arg instanceof GrammarString) {
				this[args[i+1] ? 'variable_list' : 'list_of_flags'] = arg;
			}
		});
	}
}
