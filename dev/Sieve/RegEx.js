/**
 * https://tools.ietf.org/html/rfc5228#section-8
 */

export const
	/**************************************************
	 * https://tools.ietf.org/html/rfc5228#section-8.1
	 **************************************************/

	/**
	 * octet-not-crlf = %x01-09 / %x0B-0C / %x0E-FF
	 * a single octet other than NUL, CR, or LF
	 */
	OCTET_NOT_CRLF = '[^\\x00\\r\\n]',

	/**
	 * octet-not-period = %x01-09 / %x0B-0C / %x0E-2D / %x2F-FF
	 * a single octet other than NUL, CR, LF, or period
	 */
	OCTET_NOT_PERIOD = '[^\\x00\\r\\n\\.]',

	/**
	 * octet-not-qspecial = %x01-09 / %x0B-0C / %x0E-21 / %x23-5B / %x5D-FF
	 * a single octet other than NUL, CR, LF, double-quote, or backslash
	 */
	OCTET_NOT_QSPECIAL = '[^\\x00\\r\\n"\\\\]',

	/**
	 * hash-comment = "#" *octet-not-crlf CRLF
	 */
	HASH_COMMENT = '#' + OCTET_NOT_CRLF + '*\\r\\n',

	/**
	 * QUANTIFIER = "K" / "M" / "G"
	 */
	QUANTIFIER = '[KMGkmg]',

	/**
	 * quoted-safe = CRLF / octet-not-qspecial
	 * either a CRLF pair, OR a single octet other than NUL, CR, LF, double-quote, or backslash
	 */
	QUOTED_SAFE = '\\r\\n|' + OCTET_NOT_QSPECIAL,

	/**
	 * quoted-special = "\" (DQUOTE / "\")
	 * represents just a double-quote or backslash
	 */
	QUOTED_SPECIAL = '\\\\\\\\|\\\\"',

	/**
	 * quoted-text = *(quoted-safe / quoted-special / quoted-other)
	 */
	QUOTED_TEXT = '(?:' + QUOTED_SAFE + '|' + QUOTED_SPECIAL + ')*',

	/**
	 * multiline-literal = [ octet-not-period *octet-not-crlf ] CRLF
	 */
	MULTILINE_LITERAL = OCTET_NOT_PERIOD + OCTET_NOT_CRLF + '*\\r\\n',

	/**
	 * multiline-dotstart = "." 1*octet-not-crlf CRLF
		; A line containing only "." ends the multi-line.
		; Remove a leading '.' if followed by another '.'.
	 */
	MULTILINE_DOTSTART = '\\.' + OCTET_NOT_CRLF + '+\\r\\n',

	/**
	 * not-star = CRLF / %x01-09 / %x0B-0C / %x0E-29 / %x2B-FF
	 * either a CRLF pair, OR a single octet other than NUL, CR, LF, or star
	 */
//	NOT_STAR: '\\r\\n|[^\\x00\\r\\n*]',

	/**
	 * not-star-slash = CRLF / %x01-09 / %x0B-0C / %x0E-29 / %x2B-2E / %x30-FF
	 * either a CRLF pair, OR a single octet other than NUL, CR, LF, star, or slash
	 */
//	NOT_STAR_SLASH: '\\r\\n|[^\\x00\\r\\n*\\\\]',

	/**
	 * STAR = "*"
	 */
//	STAR = '\\*',

	/**
	 * bracket-comment = "/*" *not-star 1*STAR *(not-star-slash *not-star 1*STAR) "/"
	 */
	BRACKET_COMMENT = '/\\*[\\s\\S]*?\\*/',

	/**
	 * identifier = (ALPHA / "_") *(ALPHA / DIGIT / "_")
	 */
	IDENTIFIER = '[a-zA-Z_][a-zA-Z0-9_]*',

	/**
	 * multi-line = "text:" *(SP / HTAB) (hash-comment / CRLF)
		*(multiline-literal / multiline-dotstart)
		"." CRLF
	 */
	MULTI_LINE = 'text:[ \\t]*(?:' + HASH_COMMENT + ')?\\r\\n'
		+ '(?:' + MULTILINE_LITERAL + '|' + MULTILINE_DOTSTART + ')*'
		+ '\\.\\r\\n',

	/**
	 * number = 1*DIGIT [ QUANTIFIER ]
	 */
	NUMBER = '[0-9]+' + QUANTIFIER + '?',

	/**
	 * quoted-string = DQUOTE quoted-text DQUOTE
	 */
	QUOTED_STRING = '"' + QUOTED_TEXT + '"',

	/**
	 * tag = ":" identifier
	 */
	TAG = ':[a-zA-Z_][a-zA-Z0-9_]*',

	/**
	 * comment = bracket-comment / hash-comment
	 */
//	COMMENT = BRACKET_COMMENT + '|' + HASH_COMMENT;

	/**************************************************
	 * https://tools.ietf.org/html/rfc5228#section-8.2
	 **************************************************/

	/**
	 * string = quoted-string / multi-line
	 */
	STRING = QUOTED_STRING + '|' + MULTI_LINE,

	/**
	 * string-list = "[" string *("," string) "]" / string
	 * if there is only a single string, the brackets are optional
	 */
	STRING_LIST = '\\[\\s*(?:' + STRING + ')(?:\\s*,\\s*(?:' + STRING + '))*\\s*\\]',
//		+ '|(?:' + STRING + ')',

	/**
	 * argument = string-list / number / tag
	 */
	ARGUMENT = STRING_LIST + '|' + STRING + '|' + NUMBER + '|' + TAG;

	/**
	 * arguments = *argument [ test / test-list ]
	 * This is not possible with regular expressions
	 */
//	ARGUMENTS = '(?:\\s+' . self::ARGUMENT . ')*(\\s+?:' . self::TEST . '|' . self::TEST_LIST . ')?',

	/**
	 * block = "{" commands "}"
	 * This is not possible with regular expressions
	 */
//	BLOCK = '{' . self::COMMANDS . '}',

	/**
	 * command = identifier arguments (";" / block)
	 * This is not possible with regular expressions
	 */
//	COMMAND = self::IDENTIFIER . self::ARGUMENTS . '\\s+(?:;|' . self::BLOCK . ')',

	/**
	 * commands = *command
	 * This is not possible with regular expressions
	 */
//	COMMANDS = '(?:' . self::COMMAND . ')*',

	/**
	 * start = commands
	 * This is not possible with regular expressions
	 */
//	START = self::COMMANDS,

	/**
	 * test = identifier arguments
	 * This is not possible with regular expressions
	 */
//	TEST = self::IDENTIFIER . self::ARGUMENTS,

	/**
	 * test-list = "(" test *("," test) ")"
	 * This is not possible with regular expressions
	 */
//	TEST_LIST = '\\(\\s*' . self::TEST . '(?:\\s*,\\s*' . self::TEST . ')*\\s*\\)',

	/**************************************************
	 * https://tools.ietf.org/html/rfc5228#section-8.3
	 **************************************************/

	/**
	 * ADDRESS-PART = ":localpart" / ":domain" / ":all"
	 */
//	ADDRESS_PART = ':localpart|:domain|:all',

	/**
	 * COMPARATOR = ":comparator" string
	 */
//	COMPARATOR = ':comparator\\s+(?:' + STRING + ')';

	/**
	 * MATCH-TYPE = ":is" / ":contains" / ":matches"
	 */
//	MATCH_TYPE = ':is|:contains|:matches'
