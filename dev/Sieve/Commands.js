/**
 * https://tools.ietf.org/html/rfc5228#section-2.9
 */

(Sieve => {

/**
 * https://tools.ietf.org/html/rfc5228#section-3.1
 * Usage:
 *    if <test1: test> <block1: block>
 *    elsif <test2: test> <block2: block>
 *    else <block3: block>
 */
class Conditional
{
	constructor(identifier = 'if')
	{
		this.identifier = identifier;
		this.test = null,
		this.commands = [];
	}

	toString()
	{
		return this.identifier
			+ ('else' !== this.identifier ? ' ' + this.test : '')
			+ (this.commands.length
				? ' {\r\n\t' + Sieve.arrayToString(this.commands, ';\r\n\t') + ';\r\n}'
				: ';'
			);
	}
/*
	public function pushArguments(array $args): void
	{
		print_r($args);
		exit;
	}
*/
}

/**
 * https://tools.ietf.org/html/rfc5228#section-3.2
 */
class Require /* extends Array*/
{
	constructor()
	{
		this.capabilities = new Sieve.Grammar.StringList();
	}

	toString()
	{
		return 'require ' + this.capabilities.toString();
	}

	pushArguments(args)
	{
		if (args[0] instanceof Sieve.Grammar.StringList) {
			this.capabilities = args[0];
		} else if (args[0] instanceof Sieve.Grammar.QuotedString) {
			this.capabilities.push(args[0]);
		}
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-3.3
 */
class Stop
{
	toString()
	{
		return 'stop';
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-4.1
 */
class FileInto
{
//	const REQUIRE = 'fileinto';

	constructor()
	{
		// QuotedString / MultiLine
		this._mailbox = new Sieve.Grammar.QuotedString();
	}

	toString()
	{
		return 'fileinto ' + this._mailbox;
	}

	get mailbox()
	{
		return this._mailbox.value;
	}

	set mailbox(value)
	{
		this._mailbox.value = value;
	}

	pushArguments(args)
	{
		if (args[0] instanceof Sieve.Grammar.StringType) {
			this._mailbox = args[0];
		}
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-4.2
 */
class Redirect
{
	constructor()
	{
		// QuotedString / MultiLine
		this._address = new Sieve.Grammar.QuotedString();
	}

	toString()
	{
		return 'redirect ' + this.address;
	}

	get address()
	{
		return this._address.value;
	}

	set address(value)
	{
		this._address.value = value;
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-4.3
 */
class Keep
{
	toString()
	{
		return 'keep';
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-4.4
 */
class Discard
{
	toString()
	{
		return 'discard';
	}
}

Sieve.Commands = {
	// Control commands
	Conditional: Conditional,
	Require: Require,
	Stop: Stop,
	// Action commands
	Discard: Discard,
	Fileinto: FileInto,
	Keep: Keep,
	Redirect: Redirect
};

})(this.Sieve);
