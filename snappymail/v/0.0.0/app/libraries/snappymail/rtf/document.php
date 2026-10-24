<?php
/**
 * Based on https://github.com/henck/rtf-html-php
 */

declare(strict_types=1);

namespace SnappyMail\Rtf;

class Document
{
	private string $rtf; // RTF string being parsed
	private int $len = 0; // Length of RTF string
	private int $pos = 0; // Current position in RTF string
	public ?Group $root = null; // Root group
	private ?Group $group = null; // Current group

	private string $char = '';
	private array $uc = [];

	private static array $groups = [
		'colortbl'   => Groups\ColorTable::class,
		'filetbl'    => Groups\FileTable::class,
		'fonttbl'    => Groups\FontTable::class,
		'generator'  => Groups\Generator::class,
		'info'       => Groups\Info::class,
		'listtable'  => Groups\ListTable::class,
		'listtext'  => Groups\ListText::class,
		'listoverridetable' => Groups\ListOverrideTable::class,
		'pict'       => Groups\Pict::class,
		'stylesheet' => Groups\StyleSheet::class
	];

	public function __construct(string $rtf)
	{
		/*
		 * Attempt to parse an RTF string.
		 */
		$this->rtf = $rtf;
		$this->len = \strlen($rtf);
		$this->pos = 0;
		$this->root = null;
		$this->group = null;
		$this->char = '';
		$this->uc = [];

		while ($this->pos < $this->len-1) {
			// Read next character:
			$this->nextChar();

			// Ignore \r and \n
			if ($this->is_endofline()) continue;

			// What type of character is this?
			switch ($this->char)
			{
				// Group handling
				case '{':
					$this->startGroup();
					break;
				case '}':
					$this->endGroup();
					break;

				case '\\':
					// If there is no current group, then this is not a valid RTF file.
					if (!$this->group) {
						throw new \RuntimeException('Parse error: RTF text outside of group.');
					}
					// Beginning of an RTF control word or control symbol.
					// Look ahead by one character to see if it starts with
					// a letter (control word) or another symbol (control symbol):
					$this->group->children[] = \ctype_alpha($this->nextChar(true))
						? $this->parseControlWord()
						: $this->parseControlSymbol();
					break;

				default:
					$this->parseText();
					break;
			}
		}
		$this->rtf = '';
		$this->group = null;
	}

	// Get the next character from the RTF stream.
	// Parsing is aborted when reading beyond end of input string.
	protected function nextChar(bool $peek = false): string
	{
		if ($this->pos >= $this->len) {
			$this->char = null;
			throw new \RuntimeException("Parse error: Tried to read past end of input; RTF is probably truncated.");
		}
		if ($peek) {
			return $this->rtf[$this->pos];
		}
		$this->char = $this->rtf[$this->pos++];
		return $this->char;
	}

	/*
	 * (Helper method)
	 * Is the current character end-of-line (EOL)?
	 */
	protected function is_endofline(): bool
	{
		if (\strspn($this->char, "\r\n")) {
			// Checks for a Windows/Acron type EOL
			if (\strspn($this->nextChar(true), "\r\n")) {
				++$this->pos;
			}
			return true;
		}
		return false;
	}

	// Store state of document on stack.
	protected function startGroup()
	{
		$group = new Group();
		if ('\\' === $this->nextChar(true)) {
			$cword = null;
			if (\ctype_alpha($this->rtf[$this->pos+1])) {
				$this->nextChar();
				$cword = $this->parseControlWord();
				// Replace group with special group?
				if (isset(static::$groups[$cword->word])) {
					$group = new static::$groups[$cword->word]();
				} else {
					$group->children[] = $cword;
				}
			}
			else if ('*' === $this->rtf[$this->pos+1]) {
				$group = new Groups\Destination();
				$this->nextChar();
				$this->parseControlSymbol();
//				$group->children[] = $this->parseControlSymbol();
				if (\ctype_alpha($this->rtf[$this->pos+1])) {
					/**
					 * Destinations added after the 1987 RTF Specification may be preceded by the control symbol \*
					 * This control symbol identifies destinations whose related text should be
					 * ignored if the RTF reader does not recognize the destination control word.
					 */
					$this->nextChar();
					$cword = $this->parseControlWord();
					// Replace group with special group?
					if (isset(static::$groups[$cword->word])) {
						$group = new static::$groups[$cword->word]();
					} else {
						$group->children[] = $cword;
					}
				}
			}
		}

		// Is there a current group? Then make the new group its child:
		if ($this->group) {
			$group->parent = $this->group;
			$this->group->children[] = $group;
			$this->uc[] = \end($this->uc);
		}
		// If there is no parent group, then set this group
		// as the root group.
		else {
			$this->root = $group;
			// Create uc stack and insert the first default value
			$this->uc = [1];
		}
		// Set the new group as the current group:
		$this->group = $group;
	}

	// Retrieve state of document from stack.
	protected function endGroup()
	{
		$this->group = $this->group->parent;
		\array_pop($this->uc);
	}

	protected function parseControlSymbol(): Entity
	{
		// Read symbol (one character only).
		$symbol = $this->nextChar();

		// Exceptional case:
		// Treat EOL symbols as \par control word
		if ($this->is_endofline()) {
			$cword = new ControlWord();
			$cword->word = 'par';
			$cword->parameter = 0;
			return $cword;
		}

		// Symbols ordinarily have no parameter. However,
		// if this is \' (a single quote), then it is
		// followed by a 2-digit hex-code:
		$parameter = 0;
		if ('\'' === $symbol) {
			$parameter = \hexdec($this->nextChar() . $this->nextChar());
		}

		// Add new control symbol as a child to the current group:
		$csymbol = new ControlSymbol();
		$csymbol->symbol = $symbol;
		$csymbol->parameter = $parameter;
		return $csymbol;
	}

	protected function parseControlWord(): ControlWord
	{
		// Read letters until a non-letter is reached.
		$word = '';
		$this->nextChar();
		while (\ctype_alpha($this->char)) {
			$word .= $this->char;
			$this->nextChar();
		}

		// Read parameter (if any) consisting of digits.
		// Parameter may be negative, i.e., starting with a '-'
		$negative = false;
		if ('-' === $this->char) {
			$this->nextChar();
			$negative = true;
		}
		$parameter = null;
		while (\ctype_digit($this->char)) {
			if (!$parameter) $parameter = 0;
			$parameter = $parameter * 10 + (int) $this->char;
			$this->nextChar();
		}
		// If no parameter present, assume control word's default (usually 1)
		// If no default then assign 0 to the parameter
		if (null === $parameter) $parameter = 1;

		// Convert parameter to a negative number when applicable
		if ($negative) $parameter = -$parameter;

		// Update uc value
		if ('uc' === $word) {
			\array_pop($this->uc);
			$this->uc[] = $parameter;
		}

		// Skip space delimiter
		if (' ' !== $this->char && !$this->is_endofline()) {
			--$this->pos;
		}

		// If this is \u, then the parameter will be followed
		// by {$this->uc} characters.
		if ('u' === $word) {
			// Convert parameter to unsigned decimal unicode
			if ($negative) {
				$parameter = 65536 + $parameter;
			}

			// Will ignore replacement characters $uc times
			$uc = \end($this->uc);
			while (0 < $uc--) {
				$this->nextChar();
				// If the replacement character is encoded as
				// hexadecimal value \'hh then jump over it
				if ('\\' === $this->char && '\'' === $this->rtf[$this->pos])
					$this->pos = $this->pos + 3;

				// Break if it's an RTF scope delimiter
				else if (\strspn($this->char, '{}'))
					break;
			}
		}

		$cword = new ControlWord();
		$cword->word = $word;
		$cword->parameter = $parameter;
		return $cword;
	}

	protected function parseText(): void
	{
		// If there is no current group, then this is not a valid RTF file.
		if (!$this->group) {
			throw new \RuntimeException('Parse error: RTF text outside of group.');
		}

		// Parse plain text up to backslash or brace,
		// unless escaped.
		$text = '';
		$terminate = false;
		do
		{
			// Ignore EOL characters
			if ($this->is_endofline()) {
				$this->nextChar();
				continue;
			}
			// Is this an escape?
			if ('\\' == $this->char) {
				// Perform lookahead to see if this
				// is really an escape sequence.
				$this->nextChar();
				switch ($this->char)
				{
					case '\\': break;
					case '{': break;
					case '}': break;
					default:
						// Not an escape. Roll back.
						$this->pos = $this->pos - 2;
						$terminate = true;
						break;
				}
			} else if (\strspn($this->char, '{}')) {
				--$this->pos;
				$terminate = true;
			}

			if (!$terminate) {
				// Save plain text
				$text .= $this->char;
				$this->nextChar();
			}
		}
		while (!$terminate && $this->pos < $this->len);

		// Create new Text element:
		$text = new Text($text);

		// Add text as a child to the current group:
		$this->group->children[] = $text;
	}

	public function toHTML(): string
	{
		return (new HtmlFormatter())->format($this);
	}
}
