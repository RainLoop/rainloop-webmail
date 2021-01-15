/**
 * https://tools.ietf.org/html/rfc5230
 * https://tools.ietf.org/html/rfc6131
 */

(Sieve => {

const Grammar = Sieve.Grammar;

class Vacation extends Grammar.Command
{
	constructor()
	{
		super('vacation');
		this._days      = new Grammar.Number;
//		this._seconds   = new Grammar.Number;
		this._subject   = new Grammar.QuotedString;
		this._from      = new Grammar.QuotedString;
		this.addresses  = new Grammar.StringList;
		this.mime       = false;
		this._handle    = new Grammar.QuotedString;
		this._reason    = new Grammar.QuotedString; // QuotedString / MultiLine
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
				this._reason.value = arg.value; // Grammar.QuotedString
			} else switch (args[i-1]) {
				case ':days':
					this._days.value = arg.value; // Grammar.Number
					break;
//				case ':seconds':
//					this._seconds.value = arg.value; // Grammar.Number
//					break;
				case ':subject':
					this._subject.value = arg.value; // Grammar.QuotedString
					break;
				case ':from':
					this._from.value = arg.value; // Grammar.QuotedString
					break;
				case ':addresses':
					this.addresses = arg; // Grammar.StringList
					break;
				case ':handle':
					this._from.value = arg.value; // Grammar.QuotedString
					break;
			}
		});
	}
}

Sieve.Commands.vacation = Vacation;

})(this.Sieve);
