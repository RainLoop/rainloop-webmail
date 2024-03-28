/**
 * https://tools.ietf.org/html/rfc5235
 */

import {
	GrammarQuotedString,
	GrammarString,
	TestCommand
} from 'Sieve/Grammar';

export class SpamTestTest extends TestCommand
{
	constructor()
	{
		super();
		this.percent = false, // 0 - 100 else 0 - 10
		this.value = new GrammarQuotedString;
	}

//	get require() { return this.percent ? 'spamtestplus' : 'spamtest'; }
	get require() { return /:value|:count/.test(this.match_type) ? ['spamtestplus','relational'] : 'spamtestplus'; }

	toString()
	{
		return 'spamtest'
			+ (this.percent ? ' :percent' : '')
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.match_type
			+ ' ' + this.value;
	}

	pushArguments(args)
	{
		args.forEach(arg => {
			if (':percent' === arg) {
				this.percent = true;
			} else if (arg instanceof GrammarString) {
				this.value = arg;
			}
		});
	}
}

export class VirusTestTest extends TestCommand
{
	constructor()
	{
		super();
		this.value = new GrammarQuotedString; // 1 - 5
	}

	get require() { return /:value|:count/.test(this.match_type) ? ['virustest','relational'] : 'virustest'; }

	toString()
	{
		return 'virustest'
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.match_type
			+ ' ' + this.value;
	}

	pushArguments(args)
	{
		args.forEach(arg => {
			if (arg instanceof GrammarString) {
				this.value = arg;
			}
		});
	}
}
