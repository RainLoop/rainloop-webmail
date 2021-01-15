/**
 * https://tools.ietf.org/html/rfc5235
 */

(Sieve => {

const Grammar = Sieve.Grammar;

class SpamTest extends Grammar.Test
{
	constructor()
	{
		super('spamtest');
		this.percent = false, // 0 - 100 else 0 - 10
		this.comparator = '',
		this.match_type = ':is',
		this.value = new Grammar.QuotedString;
	}

//	get require() { return this.percent ? 'spamtestplus' : 'spamtest'; }
//	get require() { return /:value|:count/.test(this.match_type) ? 'relational' : ''; }
	get require() { return 'spamtestplus'; }

	toString()
	{
		return 'spamtest'
			+ (this.percent ? ' :percent' : '')
//			+ ' ' + this.comparator
			+ ' ' + this.match_type
			+ ' ' + this.value;
	}

	pushArguments(args)
	{
		args.forEach(arg => {
			if (':percent' === arg) {
				this.percent = true;
			} else if (arg instanceof Grammar.StringType) {
				this.value = arg;
			}
		});
	}
}

class VirusTest extends Grammar.Test
{
	constructor()
	{
		super('virustest');
		this.comparator = '',
		this.match_type = ':is',
		this.value = new Grammar.QuotedString; // 1 - 5
	}

//	get require() { return /:value|:count/.test(this.match_type) ? ['virustest','relational'] : 'virustest'; }
	get require() { return 'virustest'; }

	toString()
	{
		return 'virustest'
//			+ ' ' + this.comparator
			+ ' ' + this.match_type
			+ ' ' + this.value;
	}

	pushArguments(args)
	{
		args.forEach(arg => {
			if (arg instanceof Grammar.StringType) {
				this.value = arg;
			}
		});
	}
}

Object.assign(Sieve.Commands, {
	spamtest: SpamTest,
	virustest: VirusTest
});


})(this.Sieve);
