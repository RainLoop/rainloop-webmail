/**
 * https://tools.ietf.org/html/rfc5235
 */

import {
	GrammarQuotedString,
	TestCommand
} from 'Sieve/Grammar';

export class SpamTestTest extends TestCommand
{
	constructor()
	{
		super();
		this.percent = false, // 0 - 100 else 0 - 10
		this._value = new GrammarQuotedString;
	}

//	get require() { return this.percent ? 'spamtestplus' : 'spamtest'; }
	get require() { return /:value|:count/.test(this._match_type) ? ['spamtestplus','relational'] : 'spamtestplus'; }

	get value() { return this._value.value; }
	set value(v) { this._value.value = v; }

	toString()
	{
		return 'spamtest'
			+ (this.percent ? ' :percent' : '')
			+ (this._comparator ? ' :comparator ' + this._comparator : '')
			+ (this._match_type ? ' ' + this._match_type : '')
			+ (this.relational_match ? ' ' + this.relational_match : '')
			+ ' ' + this._value;
	}

	pushArguments(args)
	{
		args.forEach(arg => {
			if (':percent' === arg) {
				this.percent = true;
			} else if (arg instanceof GrammarQuotedString) {
				this._value = arg;
			}
		});
	}
}

export class VirusTestTest extends TestCommand
{
	constructor()
	{
		super();
		this._value = new GrammarQuotedString; // 1 - 5
	}

	get require() { return ':value' == this._match_type ? ['virustest','relational'] : 'virustest'; }

	get value() { return this._value.value; }
	set value(v) { this._value.value = v; }

	toString()
	{
		return 'virustest'
			+ (this._comparator ? ' :comparator ' + this._comparator : '')
			+ (this._match_type ? ' ' + this._match_type : '')
			+ (this.relational_match ? ' ' + this.relational_match : '')
			+ ' ' + this._value;
	}

	pushArguments(args)
	{
		args.forEach(arg => {
			if (arg instanceof GrammarQuotedString) {
				this._value = arg;
			}
		});
	}
}
