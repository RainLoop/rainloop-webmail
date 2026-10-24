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
		this._field_name = new GrammarQuotedString;
		this._value      = new GrammarQuotedString;
	}

	get require() { return 'editheader'; }

	get field_name() { return this._field_name.value; }
	set field_name(v) { this._field_name.value = v; }

	get value() { return this._value.value; }
	set value(v) { this._value.value = v; }

	toString()
	{
		return this.identifier
			+ (this.last ? ' :last' : '')
			+ ' ' + this._field_name
			+ ' ' + this._value + ';';
	}

	pushArguments(args)
	{
		this._value = args.pop();
		this._field_name = args.pop();
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
		this._field_name    = new GrammarQuotedString;
		this.value_patterns = new GrammarStringList;
	}

	get require() { return 'editheader'; }

	get field_name() { return this._field_name.value; }
	set field_name(v) { this._field_name.value = v; }

	toString()
	{
		return this.identifier
			+ (this.last ? ' :last' : (this.index.value ? ' :index ' + this.index : ''))
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.match_type
			+ ' ' + this._field_name
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
			this._field_name = args[l-1];
			this.value_patterns = args[l];
		} else {
			this._field_name = args[l];
		}
	}
}
