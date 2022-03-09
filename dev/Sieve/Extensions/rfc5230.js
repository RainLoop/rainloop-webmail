/**
 * https://tools.ietf.org/html/rfc5230
 * https://tools.ietf.org/html/rfc6131
 */

import {
	GrammarCommand,
	GrammarNumber,
	GrammarQuotedString,
	GrammarStringList
} from 'Sieve/Grammar';

export class VacationCommand extends GrammarCommand
{
	constructor()
	{
		super();
		this._days      = new GrammarNumber;
//		this._seconds   = new GrammarNumber;
		this._subject   = new GrammarQuotedString;
		this._from      = new GrammarQuotedString;
		this.addresses  = new GrammarStringList;
		this.mime       = false;
		this._handle    = new GrammarQuotedString;
		this._reason    = new GrammarQuotedString; // QuotedString / MultiLine
	}

//	get require() { return ['vacation','vacation-seconds']; }
	get require() { return 'vacation'; }

	toString()
	{
		let result = 'vacation';
		if (0 < this._days.value) {
			result += ' :days ' + this._days;
//		} else if (0 < this._seconds.value) {
//			result += ' :seconds ' + this._seconds;
		}
		if (this._subject.length) {
			result += ' :subject ' + this._subject;
		}
		if (this._from.length) {
			result += ' :from ' + this.arguments[':from'];
		}
		if (this.addresses.length) {
			result += ' :addresses ' + this.addresses.toString();
		}
		if (this.mime) {
			result += ' :mime';
		}
		if (this._handle.length) {
			result += ' :handle ' + this._handle;
		}
		return result + ' ' + this._reason;
	}

	get days()      { return this._days.value; }
//	get seconds()   { return this._seconds.value; }
	get subject()   { return this._subject.value; }
	get from()      { return this._from.value; }
	get handle()    { return this._handle.value; }
	get reason()    { return this._reason.value; }

	set days(int)    { this._days.value = int; }
//	set seconds(int) { this._seconds.value = int; }
	set subject(str) { this._subject.value = str; }
	set from(str)    { this._from.value = str; }
	set handle(str)  { this._handle.value = str; }
	set reason(str)  { this._reason.value = str; }

	pushArguments(args)
	{
		args.forEach((arg, i) => {
			if (':mime' === arg) {
				this.mime = true;
			} else if (i === args.length-1) {
				this._reason.value = arg.value; // GrammarQuotedString
			} else switch (args[i-1]) {
				case ':days':
					this._days.value = arg.value; // GrammarNumber
					break;
//				case ':seconds':
//					this._seconds.value = arg.value; // GrammarNumber
//					break;
				case ':subject':
					this._subject.value = arg.value; // GrammarQuotedString
					break;
				case ':from':
					this._from.value = arg.value; // GrammarQuotedString
					break;
				case ':addresses':
					this.addresses = arg; // GrammarStringList
					break;
				case ':handle':
					this._from.value = arg.value; // GrammarQuotedString
					break;
			}
		});
	}
}
