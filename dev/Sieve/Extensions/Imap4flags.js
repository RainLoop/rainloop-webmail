/**
 * https://tools.ietf.org/html/rfc5232
 */

(Sieve => {

Sieve.Extensions.Imap4flags = class
{
	/**
	 * setflag [<variablename: string>] <list-of-flags: string-list>
	 * addflag [<variablename: string>] <list-of-flags: string-list>
	 * removeflag [<variablename: string>] <list-of-flags: string-list>
	 * hasflag [MATCH-TYPE] [COMPARATOR] [<variable-list: string-list>] <list-of-flags: string-list>
	 */
};

})(this.Sieve);
