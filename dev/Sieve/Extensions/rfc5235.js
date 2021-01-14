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
		this.comparator = 'i;ascii-casemap',
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
		args.forEach((arg, i) => {
			if (':is' === arg || ':contains' === arg || ':matches' === arg) {
				this.match_type = arg;
			} else if (':percent' === arg) {
				this.percent = true;
			} else if (arg instanceof Grammar.StringType) {
				if (':comparator' === args[i-1]) {
					this.comparator = arg;
				} else if (':value' === args[i-1] || ':count' === args[i-1]) {
					// Sieve relational [RFC5231] match types
					this.match_type = args[i-1] + ' ' + arg;
				} else {
					this.value = arg;
				}
			}
		});
	}
}

class VirusTest extends Grammar.Test
{
	constructor()
	{
		super('virustest');
		this.comparator = 'i;ascii-casemap',
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
		args.forEach((arg, i) => {
			if (':is' === arg || ':contains' === arg || ':matches' === arg) {
				this.match_type = arg;
			} else if (arg instanceof Grammar.StringType) {
				if (':comparator' === args[i-1]) {
					this.comparator = arg;
				} else if (':value' === args[i-1] || ':count' === args[i-1]) {
					// Sieve relational [RFC5231] match types
					this.match_type = args[i-1] + ' ' + arg;
				} else {
					this.value = arg;
				}
			}
		});
	}
}

Object.assign(Sieve.Commands, {
	spamtest: SpamTest,
	virustest: VirusTest
});


})(this.Sieve);
