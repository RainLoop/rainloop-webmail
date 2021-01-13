/**
 * https://tools.ietf.org/html/rfc5429#section-2.1
 */

(Sieve => {

Sieve.Extensions.Ereject = class
{
	constructor()
	{
		this.reason = new Sieve.Grammar.QuotedString;
	}

	toString()
	{
		return 'ereject ' + this.reason;
	}

	get reason()
	{
		return this.reason.value;
	}

	set reason(value)
	{
		this.reason.value = value;
	}
};

})(this.Sieve);
