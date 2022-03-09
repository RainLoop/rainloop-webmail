/**
 * https://tools.ietf.org/html/rfc5293
 */

import {
	GrammarCommand,
	GrammarNumber,
	GrammarQuotedString,
	GrammarString,
	GrammarStringList
} from 'Sieve/Grammar';

export class AddHeaderCommand extends GrammarCommand
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
		this.last = args.includes(':last');
		this.field_name = args[args.length - 2];
		this.value = args[args.length - 1];
	}
}

export class DeleteHeaderCommand extends GrammarCommand
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
			} else if (':index' === args[i-1]) {
				this.index.value = arg.value;
				args[i] = null;
			}
		});

		if (args[l-1] instanceof GrammarString) {
			this.field_name = args[l-1];
			this.value_patterns = args[l];
		} else {
			this.field_name = args[l];
		}
	}
}
/*
Object.assign(Sieve.Commands, {
	addheader: AddHeaderCommand,
	deleteheader: DeleteHeaderCommand
});
*/
