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
		this._zone        = new GrammarQuotedString;
		this.originalzone = false;
		this._header_name = new GrammarQuotedString;
		this._date_part   = new GrammarQuotedString;
		this.key_list     = new GrammarStringList;
		// rfc5260#section-6
		this.index        = new GrammarNumber;
		this.last         = false;
	}

//	get require() { return ['date','index']; }
	get require() { return 'date'; }

	get zone() { return this._zone.value; }
	set zone(v) { this._zone.value = v; }

	get header_name() { return this._header_name.value; }
	set header_name(v) { this._header_name.value = v; }

	get date_part() { return this._date_part.value; }
	set date_part(v) { this._date_part.value = v; }

	toString()
	{
		return 'date'
			+ (this.last ? ' :last' : (this.index.value ? ' :index ' + this.index : ''))
			+ (this.originalzone ? ' :originalzone' : (this._zone.length ? ' :zone ' + this._zone : ''))
			+ (this._comparator ? ' :comparator ' + this._comparator : '')
			+ (this._match_type ? ' ' + this._match_type : '')
			+ (this.relational_match ? ' ' + this.relational_match : '')
			+ ' ' + this._header_name
			+ ' ' + this._date_part
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		this.key_list = args.pop();
		this._date_part = args.pop();
		this._header_name = args.pop();
		args.forEach((arg, i) => {
			if (':originalzone' === arg) {
				this.originalzone = true;
			} else if (':last' === arg) {
				this.last = true;
			} else if (i && ':zone' === args[i-1]) {
				this._zone.value = arg.value;
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
		this._zone      = new GrammarQuotedString;
		this._date_part = new GrammarQuotedString;
		this.key_list   = new GrammarStringList;
	}

	get require() { return 'date'; }

	get zone() { return this._zone.value; }
	set zone(v) { this._zone.value = v; }

	get date_part() { return this._date_part.value; }
	set date_part(v) { this._date_part.value = v; }

	toString()
	{
		return 'currentdate'
			+ (this._zone.length ? ' :zone ' + this._zone : '')
			+ (this._comparator ? ' :comparator ' + this._comparator : '')
			+ (this._match_type ? ' ' + this._match_type : '')
			+ (this.relational_match ? ' ' + this.relational_match : '')
			+ ' ' + this._date_part
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		this.key_list = args.pop();
		this._date_part = args.pop();
		args.forEach((arg, i) => {
			if (i && ':zone' === args[i-1]) {
				this._zone.value = arg.value;
			}
		});
	}
}
