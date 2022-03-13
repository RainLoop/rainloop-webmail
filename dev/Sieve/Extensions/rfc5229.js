/**
 * https://tools.ietf.org/html/rfc5229
 */

import {
	GrammarCommand,
	GrammarQuotedString,
	GrammarStringList,
	GrammarTest
} from 'Sieve/Grammar';

export class SetCommand extends GrammarCommand
{
	constructor()
	{
		super();
		this.modifiers = [];
		this._name    = new GrammarQuotedString;
		this._value   = new GrammarQuotedString;
	}

	get require() { return 'variables'; }

	toString()
	{
		return 'set'
			+ ' ' + this.modifiers.join(' ')
			+ ' ' + this._name
			+ ' ' + this._value;
	}

	get name()     { return this._name.value; }
	set name(str)  { this._name.value = str; }

	get value()    { return this._value.value; }
	set value(str) { this._value.value = str; }

	pushArguments(args)
	{
		[':lower', ':upper', ':lowerfirst', ':upperfirst', ':quotewildcard', ':length'].forEach(modifier => {
			args.includes(modifier) && this.modifiers.push(modifier);
		});
		this._name  = args[args.length-2];
		this._value = args[args.length-1];
	}
}

export class StringCommand extends GrammarTest
{
	constructor()
	{
		super();
		this.source   = new GrammarStringList;
		this.key_list = new GrammarStringList;
	}

	toString()
	{
		return 'string'
			+ ' ' + this.match_type
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.source.toString()
			+ ' ' + this.key_list.toString();
	}

	pushArguments(args)
	{
		this.source   = args[args.length-2];
		this.key_list = args[args.length-1];
	}
}
