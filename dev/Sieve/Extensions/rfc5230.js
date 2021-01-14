/**
 * https://tools.ietf.org/html/rfc5230
 */

(Sieve => {

const Grammar = Sieve.Grammar;

class Vacation extends Grammar.Command
{
	constructor()
	{
		super('vacation');
		this.arguments = {
			':days'     : new Grammar.Number,
			':subject'  : new Grammar.QuotedString,
			':from'     : new Grammar.QuotedString,
			':addresses': new Grammar.StringList,
			':mime'     : false,
			':handle'   : new Grammar.QuotedString
		};
		this.reason = ''; // QuotedString / MultiLine
	}

	get require() { return 'vacation'; }

	toString()
	{
		let result = 'vacation';
		if (0 < this.arguments[':days'].value) {
			result += ' :days ' + this.arguments[':days'];
		}
		if (this.arguments[':subject'].length()) {
			result += ' :subject ' + this.arguments[':subject'];
		}
		if (this.arguments[':from'].length()) {
			result += ' :from ' + this.arguments[':from'];
		}
		if (this.arguments[':addresses'].length) {
			result += ' :addresses ' + this.arguments[':addresses'];
		}
		if (this.arguments[':mime']) {
			result += ' :mime';
		}
		if (this.arguments[':handle'].length()) {
			result += ' :handle ' + this.arguments[':handle'];
		}
		return result + ' ' + this.reason;
	}
/*
	function __get($key)
	{
		if ('reason' === $key) {
			return this.reason;
		}
		if (isset(this.arguments[":{$key}"])) {
			return this.arguments[":{$key}"];
		}
	}

	function __set($key, $value)
	{
		if ('days' === $key) {
			this.arguments[":{$key}"] = (int) $value;
		} else if ('mime' === $key) {
			this.arguments[":{$key}"] = (bool) $value;
		} else if ('reason' === $key) {
			this.reason = (string) $value;
		} else if ('addresses' !== $key && isset(this.arguments[":{$key}"])) {
			this.arguments[":{$key}"] = (string) $value;
		}
	}

	public function pushArguments(array $args): void
	{
		foreach ($args as $i => $arg) {
			if (\in_array($arg, [':days',':subject',':from',':addresses', ':handle'])) {
				this.arguments[$arg] = $args[$i+1];
			} else if (':mime' === $arg) {
				this.arguments[':mime'] = true;
			} else if (!isset($args[$i+1])) {
				this.reason = $arg;
			}
		}
	}
*/
}

Sieve.Commands.vacation = Vacation;

})(this.Sieve);
