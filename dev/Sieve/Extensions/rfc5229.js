/**
 * https://tools.ietf.org/html/rfc5229
 */

import {
	ActionCommand,
	GrammarQuotedString,
	GrammarStringList,
	TestCommand
} from 'Sieve/Grammar';

export class SetCommand extends ActionCommand
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
		this._value = args.pop();
		this._name  = args.pop();
	}
}

export class StringTest extends TestCommand
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
			+ ' ' + this.source
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		this.key_list = args.pop();
		this.source   = args.pop();
	}
}
