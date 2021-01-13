/**
 * https://tools.ietf.org/html/rfc5429#section-2.2
 */

(Sieve => {

Sieve.Extensions.Reject = class
{
	constructor()
	{
		this.reason = new Sieve.Grammar.QuotedString;
	}

	toString()
	{
		return 'reject ' + this.reason;
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
