/**
 * https://tools.ietf.org/html/rfc5228#section-8
 */

(Sieve => {

const
	RegEx = Sieve.RegEx,

	M = {
		UNKNOWN          : 0,
		STRING_LIST      : 1,
		QUOTED_STRING    : 2,
		MULTILINE_STRING : 3,
		HASH_COMMENT     : 4,
		BRACKET_COMMENT  : 5,
		BLOCK_START      : 6,
		BLOCK_END        : 7,
		LEFT_PARENTHESIS : 8,
		RIGHT_PARENTHESIS: 9,
		COMMA            : 10,
		SEMICOLON        : 11,
		TAG              : 12,
		IDENTIFIER       : 13,
		NUMBER           : 14,
		WHITESPACE       : 15
	},

	MRegEx = [
		/* M.STRING_LIST       */ RegEx.STRING_LIST,
		/* M.QUOTED_STRING     */ RegEx.QUOTED_STRING,
		/* M.MULTILINE_STRING  */ RegEx.MULTI_LINE,
		/* M.HASH_COMMENT      */ RegEx.HASH_COMMENT,
		/* M.BRACKET_COMMENT   */ RegEx.BRACKET_COMMENT,
		/* M.BLOCK_START       */ '\\{',
		/* M.BLOCK_END         */ '\\}',
		/* M.LEFT_PARENTHESIS  */ '\\(', // anyof / allof
		/* M.RIGHT_PARENTHESIS */ '\\)', // anyof / allof
		/* M.COMMA             */ ',',
		/* M.SEMICOLON         */ ';',
		/* M.TAG               */ RegEx.TAG,
		/* M.IDENTIFIER        */ RegEx.IDENTIFIER,
		/* M.NUMBER            */ RegEx.NUMBER,
		/* M.WHITESPACE        */ '(?: |\\r\\n|\\t)+',
		/* M.UNKNOWN           */ '[^ \\r\\n\\t]+'
	].join(')|(');

Sieve.parseScript = script => {
	let match,
		line = 1,
		tree = [],

		// create one regex to find the right match
		// avoids looping over all possible tokens: increases performance
		regex = RegExp(MRegEx, 'g'),

		levels = [],
		command = null,
		args = [];

	const
		error = message => { throw new SyntaxError(message + ' at ' + regex.lastIndex, 'script.sieve', line) },
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
		case M.IDENTIFIER: {
			pushArgs();
			let new_command;
			if ('if' === value) {
				new_command = new Sieve.Commands.Conditional(value);
			} else if ('elsif' === value || 'else' === value) {
				(command instanceof Sieve.Commands.Conditional)
					|| error('Not after IF condition');
				new_command = new Sieve.Commands.Conditional(value);
			} else if ('allof' === value || 'anyof' === value) {
				(command instanceof Sieve.Commands.Conditional)
					|| error('Test-list not in conditional');
				new_command = new Sieve.Tests[value]();
			} else if (Sieve.Tests[value]) {
				// address / envelope / exists / header / not / size
				new_command = new Sieve.Tests[value]();
			} else if (Sieve.Commands[value]) {
				// discard / fileinto / keep / redirect / require / stop
				new_command = new Sieve.Commands[value]();
			} else if (Sieve.Extensions[value]) {
				// body / ereject / reject / imap4flags / vacation
				new_command = new Sieve.Extensions[value]();
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
				if (new_command instanceof Sieve.Commands.Conditional || new_command instanceof Sieve.Commands.TestList) {
					levels.push(new_command);
				}
			}
			command = new_command;
			break; }

		case M.TAG:
			command
				? args.push(value)
				: error('Tag must be command argument');
			break;
		case M.STRING_LIST:
			command
				? args.push(Sieve.Grammar.StringList.fromString(value))
				: error('String list must be command argument');
			break;
		case M.MULTILINE_STRING:
			command
				? args.push(new Sieve.Grammar.MultiLine(value))
				: error('Multi-line string must be command argument');
			break;
		case M.QUOTED_STRING:
			command
				? args.push(new Sieve.Grammar.QuotedString(value.substr(1,value.length-2)))
				: error('Quoted string must be command argument');
			break;
		case M.NUMBER:
			command
				? args.push(new Sieve.Grammar.Number(value))
				: error('Number must be command argument');
			break;

		case M.BRACKET_COMMENT:
			(command ? command.commands : tree).push(
				new Sieve.Grammar.BracketComment(value.substr(1,value.length-4))
			);
			break;

		case M.HASH_COMMENT:
			(command ? command.commands : tree).push(
				new Sieve.Grammar.HashComment(value.substr(1).trim())
			);
			break;

		case M.WHITESPACE:
//			(command ? command.commands : tree).push(value.trim());
			command || tree.push(value.trim());
			break;

		case M.SEMICOLON:
			command || error('Semicolon not at end of command');
			pushArgs();
//			levels.pop();
			command = levels.last();
			break;

		case M.BLOCK_START:
			// https://tools.ietf.org/html/rfc5228#section-2.9
			// Action commands do not take tests or blocks
			levels.length || error('Block start not part of control command');
			command || error('Block start not at end of command arguments');
			pushArgs();
			command = levels.last();
			break;
		case M.BLOCK_END:
			levels.length || error('Block end has no matching block start');
			levels.pop();
			command = levels.last();
			break;

		// anyof / allof
		case M.LEFT_PARENTHESIS:
			(levels.last() instanceof Sieve.Grammar.TestList)
				|| error('Test start not part of test-list');
			command || error('Not inside command');
			pushArgs();
			command = levels.last();
			break;
		case M.RIGHT_PARENTHESIS:
			(levels.last() instanceof Sieve.Grammar.TestList)
				|| error('Test end not part of test-list');
			pushArgs();
			levels.pop();
			command = levels.last();
			break;
		case M.COMMA:
			// Must be inside PARENTHESIS aka test-list
			(levels.last() instanceof Sieve.Grammar.TestList)
				|| error('Comma not part of test-list');
			pushArgs();
			command = levels.last();
			break;

		case M.UNKNOWN:
			error('Invalid token ' + value);
		}

		// Set current script position
		line += (value.split('\n').length - 1); // (value.match(/\n/g) || []).length;
	}

	return tree;
};

})(this.Sieve);
