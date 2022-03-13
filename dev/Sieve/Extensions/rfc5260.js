/**
 * https://tools.ietf.org/html/rfc5260
 */

import {
	GrammarNumber,
	GrammarQuotedString,
	GrammarStringList,
	GrammarTest
} from 'Sieve/Grammar';

export class DateCommand extends GrammarTest
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
			+ ' ' + this.key_list.toString();
	}

	pushArguments(args)
	{
		let l = args.length - 1;
		args.forEach((arg, i) => {
			if (':originalzone' === arg) {
				this.originalzone = true;
			} else if (':last' === arg) {
				this.last = true;
			} else if (':zone' === args[i-1]) {
				this.zone.value = arg.value;
			} else if (':index' === args[i-1]) {
				this.index.value = arg.value;
			} else if (l-2 === i) {
				this.header_name = arg;
			} else if (l-1 === i) {
				this.date_part = arg;
			} else if (l === i) {
				this.key_list = arg;
			}
		});
	}
}

export class CurrentDateCommand extends GrammarTest
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
			+ ' ' + this.key_list.toString();
	}

	pushArguments(args)
	{
		let l = args.length - 1;
		args.forEach((arg, i) => {
			if (':zone' === args[i-1]) {
				this.zone.value = arg.value;
			} else if (l-1 === i) {
				this.date_part = arg;
			} else if (l === i) {
				this.key_list = arg;
			}
		});
	}
}
