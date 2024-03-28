/**
 * https://tools.ietf.org/html/rfc5260
 */

import {
	GrammarNumber,
	GrammarQuotedString,
	GrammarStringList,
	TestCommand
} from 'Sieve/Grammar';

export class DateTest extends TestCommand
{
	constructor()
	{
		super();
		this.zone         = new GrammarQuotedString;
		this.originalzone = false;
		this.header_name  = new GrammarQuotedString;
		this.date_part    = new GrammarQuotedString;
		this.key_list     = new GrammarStringList;
		// rfc5260#section-6
		this.index        = new GrammarNumber;
		this.last         = false;
	}

//	get require() { return ['date','index']; }
	get require() { return 'date'; }

	toString()
	{
		return 'date'
			+ (this.last ? ' :last' : (this.index.value ? ' :index ' + this.index : ''))
			+ (this.originalzone ? ' :originalzone' : (this.zone.length ? ' :zone ' + this.zone : ''))
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.match_type
			+ ' ' + this.header_name
			+ ' ' + this.date_part
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		this.key_list = args.pop();
		this.date_part = args.pop();
		this.header_name = args.pop();
		args.forEach((arg, i) => {
			if (':originalzone' === arg) {
				this.originalzone = true;
			} else if (':last' === arg) {
				this.last = true;
			} else if (i && ':zone' === args[i-1]) {
				this.zone.value = arg.value;
			} else if (i && ':index' === args[i-1]) {
				this.index.value = arg.value;
			}
		});
	}
}

export class CurrentDateTest extends TestCommand
{
	constructor()
	{
		super();
		this.zone       = new GrammarQuotedString;
		this.date_part  = new GrammarQuotedString;
		this.key_list   = new GrammarStringList;
	}

	get require() { return 'date'; }

	toString()
	{
		return 'currentdate'
			+ (this.zone.length ? ' :zone ' + this.zone : '')
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.match_type
			+ ' ' + this.date_part
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		this.key_list = args.pop();
		this.date_part = args.pop();
		args.forEach((arg, i) => {
			if (i && ':zone' === args[i-1]) {
				this.zone.value = arg.value;
			}
		});
	}
}
