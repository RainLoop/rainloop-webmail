/**
 * https://tools.ietf.org/html/rfc5228#section-8
 */

(Sieve => {

const
	RegEx = Sieve.RegEx,

	T_UNKNOWN           = 0,
	T_STRING_LIST       = 1,
	T_QUOTED_STRING     = 2,
	T_MULTILINE_STRING  = 3,
	T_HASH_COMMENT      = 4,
	T_BRACKET_COMMENT   = 5,
	T_BLOCK_START       = 6,
	T_BLOCK_END         = 7,
	T_LEFT_PARENTHESIS  = 8,
	T_RIGHT_PARENTHESIS = 9,
	T_COMMA             = 10,
	T_SEMICOLON         = 11,
	T_TAG               = 12,
	T_IDENTIFIER        = 13,
	T_NUMBER            = 14,
	T_WHITESPACE        = 15,

	TokensRegEx = '(' + [
		/* T_STRING_LIST       */ RegEx.STRING_LIST,
		/* T_QUOTED_STRING     */ RegEx.QUOTED_STRING,
		/* T_MULTILINE_STRING  */ RegEx.MULTI_LINE,
		/* T_HASH_COMMENT      */ RegEx.HASH_COMMENT,
		/* T_BRACKET_COMMENT   */ RegEx.BRACKET_COMMENT,
		/* T_BLOCK_START       */ '\\{',
		/* T_BLOCK_END         */ '\\}',
		/* T_LEFT_PARENTHESIS  */ '\\(', // anyof / allof
		/* T_RIGHT_PARENTHESIS */ '\\)', // anyof / allof
		/* T_COMMA             */ ',',
		/* T_SEMICOLON         */ ';',
		/* T_TAG               */ RegEx.TAG,
		/* T_IDENTIFIER        */ RegEx.IDENTIFIER,
		/* T_NUMBER            */ RegEx.NUMBER,
		/* T_WHITESPACE        */ '(?: |\\r\\n|\\t)+',
		/* T_UNKNOWN           */ '[^ \\r\\n\\t]+'
	].join(')|(') + ')';

Sieve.parseScript = script => {
	let match,
		line = 1,
		tree = [],

		// Create one regex to find the tokens
		// Use exec() to forward since lastIndex
		regex = RegExp(TokensRegEx, 'gm'),

		levels = [],
		command = null,
		args = [];

	const
		error = message => {
			throw new SyntaxError(message + ' at ' + regex.lastIndex + ' line ' + line, 'script.sieve', line)
		},
		pushArgs = () => {
			if (command && args.length) {
				command.pushArguments(args);
				args = [];
			}
		};

	levels.last = () => levels[levels.length - 1];

	while ((match = regex.exec(script))) {
		// the last element in match will contain the matched value and the key will be the type
		let type = match.findIndex((v,i) => 0 < i && undefined !== v),
			value = match[type];

		// create the part
		switch (type)
		{
		case T_IDENTIFIER: {
			pushArgs();
			value = value.toLowerCase();
			let new_command,
				className = value[0].toUpperCase() + value.substring(1);
			if ('if' === value) {
				new_command = new Sieve.Commands.Conditional(value);
			} else if ('elsif' === value || 'else' === value) {
				(command instanceof Sieve.Commands.Conditional)
					|| error('Not after IF condition');
				new_command = new Sieve.Commands.Conditional(value);
			} else if ('allof' === value || 'anyof' === value) {
				(command instanceof Sieve.Commands.Conditional)
					|| error('Test-list not in conditional');
				new_command = new Sieve.Tests[className]();
			} else if (Sieve.Tests[className]) {
				// address / envelope / exists / header / not / size
				new_command = new Sieve.Tests[className]();
			} else if (Sieve.Commands[className]) {
				// discard / fileinto / keep / redirect / require / stop
				new_command = new Sieve.Commands[className]();
			} else if (Sieve.Extensions[className]) {
				// body / ereject / reject / imap4flags / vacation
				new_command = new Sieve.Extensions[className]();
			} else {
				error('Unknown command ' + value);
//				new_command = new Sieve.Grammar.Command(value);
			}

			if (command instanceof Sieve.Commands.Conditional && !command.test) {
				if (new_command instanceof Sieve.Grammar.TestList) {
					levels.push(new_command);
				} else {
					new_command = new Sieve.Grammar.Test(value);
				}
				command.test = new_command;
			} else {
				if (levels.length) {
					let cmd = levels.last();
					if (cmd instanceof Sieve.Grammar.TestList) {
						cmd.push(new_command);
					} else {
						cmd.commands.push(new_command);
					}
				} else {
					tree.push(new_command);
				}
				if (new_command instanceof Sieve.Commands.Conditional || new_command instanceof Sieve.Grammar.TestList) {
					levels.push(new_command);
				}
			}
			command = new_command;
			break; }

		case T_TAG:
			command
				? args.push(value.toLowerCase())
				: error('Tag must be command argument');
			break;
		case T_STRING_LIST:
			command
				? args.push(Sieve.Grammar.StringList.fromString(value))
				: error('String list must be command argument');
			break;
		case T_MULTILINE_STRING:
			command
				? args.push(new Sieve.Grammar.MultiLine(value))
				: error('Multi-line string must be command argument');
			break;
		case T_QUOTED_STRING:
			command
				? args.push(new Sieve.Grammar.QuotedString(value.substr(1,value.length-2)))
				: error('Quoted string must be command argument');
			break;
		case T_NUMBER:
			command
				? args.push(new Sieve.Grammar.Number(value))
				: error('Number must be command argument');
			break;

		case T_BRACKET_COMMENT:
			(command ? command.commands : tree).push(
				new Sieve.Grammar.BracketComment(value.substr(2, value.length-4))
			);
			break;

		case T_HASH_COMMENT:
			(command ? command.commands : tree).push(
				new Sieve.Grammar.HashComment(value.substr(1).trim())
			);
			break;

		case T_WHITESPACE:
//			(command ? command.commands : tree).push(value.trim());
			command || tree.push(value.trim());
			break;

		case T_SEMICOLON:
			command || error('Semicolon not at end of command');
			pushArgs();
//			levels.pop();
			command = levels.last();
			break;

		case T_BLOCK_START:
			// https://tools.ietf.org/html/rfc5228#section-2.9
			// Action commands do not take tests or blocks
			levels.length || error('Block start not part of control command');
			command || error('Block start not at end of command arguments');
			pushArgs();
			command = levels.last();
			break;
		case T_BLOCK_END:
			levels.length || error('Block end has no matching block start');
			levels.pop();
			command = levels.last();
			break;

		// anyof / allof
		case T_LEFT_PARENTHESIS:
			(levels.last() instanceof Sieve.Grammar.TestList)
				|| error('Test start not part of test-list');
			command || error('Not inside command');
			pushArgs();
			command = levels.last();
			break;
		case T_RIGHT_PARENTHESIS:
			(levels.last() instanceof Sieve.Grammar.TestList)
				|| error('Test end not part of test-list');
			pushArgs();
			levels.pop();
			command = levels.last();
			break;
		case T_COMMA:
			// Must be inside PARENTHESIS aka test-list
			(levels.last() instanceof Sieve.Grammar.TestList)
				|| error('Comma not part of test-list');
			pushArgs();
			command = levels.last();
			break;

		case T_UNKNOWN:
			error('Invalid token ' + value);
		}

		// Set current script position
		line += (value.split('\n').length - 1); // (value.match(/\n/g) || []).length;
	}

	return tree;
};

})(this.Sieve);
