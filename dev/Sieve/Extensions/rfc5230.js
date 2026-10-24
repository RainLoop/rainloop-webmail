/**
 * https://tools.ietf.org/html/rfc5230
 * https://tools.ietf.org/html/rfc6131
 */

import { capa } from 'Sieve/Utils';

import {
	ActionCommand,
	GrammarNumber,
	GrammarQuotedString,
	GrammarStringList
} from 'Sieve/Grammar';

export class VacationCommand extends ActionCommand
{
	constructor()
	{
		super();
		this._days      = new GrammarNumber;
		this._seconds   = new GrammarNumber;
		this._subject   = new GrammarQuotedString;
		this._from      = new GrammarQuotedString;
		this.addresses  = new GrammarStringList;
		this.mime       = false;
		this._handle    = new GrammarQuotedString;
		this._reason    = new GrammarQuotedString; // QuotedString / MultiLine
	}

//	get require() { return ['vacation','vacation-seconds']; }
	get require() { return 'vacation'; }

	get days()      { return this._days.value; }
	get seconds()   { return this._seconds.value; }
	get subject()   { return this._subject.value; }
	get from()      { return this._from.value; }
	get handle()    { return this._handle.value; }
	get reason()    { return this._reason.value; }

	set days(int)    { this._days.value = int; }
	set seconds(int) { this._seconds.value = int; }
	set subject(str) { this._subject.value = str; }
	set from(str)    { this._from.value = str; }
	set handle(str)  { this._handle.value = str; }
	set reason(str)  { this._reason.value = str; }

	toString()
	{
		let result = 'vacation';
		if (0 < this._seconds.value && capa.includes('vacation-seconds')) {
			result += ' :seconds ' + this._seconds;
		} else if (0 < this._days.value) {
			result += ' :days ' + this._days;
		}
		if (this._subject.length) {
			result += ' :subject ' + this._subject;
		}
		if (this._from.length) {
			result += ' :from ' + this._from;
		}
		if (this.addresses.length) {
			result += ' :addresses ' + this.addresses;
		}
		if (this.mime) {
			result += ' :mime';
		}
		if (this._handle.length) {
			result += ' :handle ' + this._handle;
		}
		return result + ' ' + this._reason;
	}

	pushArguments(args)
	{
		this._reason.value = args.pop().value; // GrammarQuotedString
		args.forEach((arg, i) => {
			if (':mime' === arg) {
				this.mime = true;
			} else if (i && ':addresses' === args[i-1]) {
				this.addresses = arg; // GrammarStringList
			} else if (i && ':' === args[i-1][0]) {
				// :days, :seconds, :subject, :from, :handle
				let p = args[i-1].replace(':','_');
				this[p] ? (this[p].value = arg.value) : console.log('Unknown VacationCommand :' + p);
			}
		});
	}
}
