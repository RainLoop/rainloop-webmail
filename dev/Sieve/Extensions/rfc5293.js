/**
 * https://tools.ietf.org/html/rfc5293
 */

import {
	ActionCommand,
	GrammarNumber,
	GrammarQuotedString,
	GrammarString,
	GrammarStringList
} from 'Sieve/Grammar';

export class AddHeaderCommand extends ActionCommand
{
	constructor()
	{
		super();
		this.last       = false;
		this.field_name = new GrammarQuotedString;
		this.value      = new GrammarQuotedString;
	}

	get require() { return 'editheader'; }

	toString()
	{
		return this.identifier
			+ (this.last ? ' :last' : '')
			+ ' ' + this.field_name
			+ ' ' + this.value + ';';
	}

	pushArguments(args)
	{
		this.value = args.pop();
		this.field_name = args.pop();
		this.last = args.includes(':last');
	}
}

export class DeleteHeaderCommand extends ActionCommand
{
	constructor()
	{
		super();
		this.index          = new GrammarNumber;
		this.last           = false;
		this.comparator     = '',
		this.match_type     = ':is',
		this.field_name     = new GrammarQuotedString;
		this.value_patterns = new GrammarStringList;
	}

	get require() { return 'editheader'; }

	toString()
	{
		return this.identifier
			+ (this.last ? ' :last' : (this.index.value ? ' :index ' + this.index : ''))
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.match_type
			+ ' ' + this.field_name
			+ ' ' + this.value_patterns + ';';
	}

	pushArguments(args)
	{
		let l = args.length - 1;
		args.forEach((arg, i) => {
			if (':last' === arg) {
				this.last = true;
			} else if (i && ':index' === args[i-1]) {
				this.index.value = arg.value;
				args[i] = null;
			}
		});

		if (l && args[l-1] instanceof GrammarString) {
			this.field_name = args[l-1];
			this.value_patterns = args[l];
		} else {
			this.field_name = args[l];
		}
	}
}
