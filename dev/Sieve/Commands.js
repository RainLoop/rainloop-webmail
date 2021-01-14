/**
 * https://tools.ietf.org/html/rfc5228#section-2.9
 */

(Sieve => {

const Grammar = Sieve.Grammar, Command = Grammar.Command;

/**
 * https://tools.ietf.org/html/rfc5228#section-3.1
 * Usage:
 *    if <test1: test> <block1: block>
 *    elsif <test2: test> <block2: block>
 *    else <block3: block>
 */
class Conditional extends Command
{
	constructor(identifier = 'if')
	{
		super(identifier);
		this.test = null;
	}

	toString()
	{
		return this.identifier
			+ ('else' !== this.identifier ? ' ' + this.test : '')
			+ ' ' + this.commands;
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
class Require extends Command
{
	constructor()
	{
		super('require');
		this.capabilities = new Grammar.StringList();
	}

	toString()
	{
		return 'require ' + this.capabilities.toString() + ';';
	}

	pushArguments(args)
	{
		if (args[0] instanceof Grammar.StringList) {
			this.capabilities = args[0];
		} else if (args[0] instanceof Grammar.QuotedString) {
			this.capabilities.push(args[0]);
		}
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-3.3
 */
class Stop extends Command
{
	constructor()
	{
		super('stop');
	}

	toString()
	{
		return 'stop;';
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-4.1
 */
class FileInto extends Command
{
//	const REQUIRE = 'fileinto';

	constructor()
	{
		super('fileinto');
		// QuotedString / MultiLine
		this._mailbox = new Grammar.QuotedString();
	}

	toString()
	{
		return 'fileinto ' + this._mailbox + ';';
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
		if (args[0] instanceof Grammar.StringType) {
			this._mailbox = args[0];
		}
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-4.2
 */
class Redirect extends Command
{
	constructor()
	{
		super('redirect');
		// QuotedString / MultiLine
		this._address = new Grammar.QuotedString();
	}

	toString()
	{
		return 'redirect ' + this.address + ';';
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
class Keep extends Command
{
	constructor()
	{
		super('keep');
	}

	toString()
	{
		return 'keep;';
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-4.4
 */
class Discard extends Command
{
	constructor()
	{
		super('discard');
	}

	toString()
	{
		return 'discard;';
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
