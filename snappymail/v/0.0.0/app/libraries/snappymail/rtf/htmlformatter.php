<?php

namespace SnappyMail\Rtf;

class HtmlFormatter
{
	private string $output = '';
	private string $RTFencoding = '';
	private $defaultFont;

	private ?Style $previousStyle = null;
	private array $styles = [];
	private ?Style $style = null;
	private array $openedTags = [];

	public function format(Document $document)
	{
		// Clear current output
		$this->output = '';
		// Keep track of style modifications
		$this->previousStyle = null;
		// and create a stack of styles
		$this->styles = array();
		// Put an initial standard style onto the stack
		$this->style = new Style();
		$this->styles[] = $this->style;

		// Keep track of opened html tags
		$this->openedTags = [
			'span' => false,
			'p' => false
		];
		// Create the first paragraph
		$this->openTag('p');
		// Begin format
		$this->processGroup($document->root);
		// Close opened tags
		$this->closeTags(true);
		return $this->output;
	}

	protected function processGroup(Group $group)
	{
		if ($group instanceof Groups\Destination) {
			$this->processDestination($group->children);
			return;
		}

		if ($group instanceof Groups\ColorTable) {
			Style::$colortbl = $group->getColors();
			return;
		}
		if ($group instanceof Groups\FontTable) {
			Style::$fonttbl = $group->getFonts();
			return;
		}
		if ($group instanceof Groups\Pict) {
			$this->output .= $group->getHTML();
			return;
		}
		if ($group instanceof Groups\StyleSheet) {
			// Stylesheet extraction not yet supported
			return;
		}

		if ($group instanceof Groups\FileTable
		 || $group instanceof Groups\Info
		 || $group instanceof Groups\ListTable
		 || $group instanceof Groups\ListText
		 || $group instanceof Groups\ListOverrideTable
		) {
			// Skip
			return;
		}

		// Special group processing:
		switch ($group->getType())
		{
			case 'nonshppict':
				// Ignore alternative images
				return;
		}

		// Pictures extraction not yet supported
		//if (\substr($group->getType(), 0, 4) == "pict") return;

		// Push a new style onto the stack:
		$this->style = clone $this->style;
		$this->styles[] = $this->style;

		foreach ($group->children as $child) {
			$this->processEntity($child);
		}

		// Pop style from stack
		\array_pop($this->styles);
		$this->style = \end($this->styles);
	}

	protected function processDestination(array $dest)
	{
		// Check if this is a Word 97 picture
		if ($dest[0] instanceof ControlWord && 'shppict' == $dest[0]->word) {
			$c = \count($dest);
			for ($i = 1; $i < $c; ++$i) {
				$this->processEntity($dest[$i]);
			}
		}
	}

	protected function processEntity(Entity $entry)
	{
		if ($entry instanceof Group) $this->processGroup($entry);
		else if ($entry instanceof ControlWord) $this->processControlWord($entry);
		else if ($entry instanceof ControlSymbol) $this->processControlSymbol($entry);
		else if ($entry instanceof Text) $this->write($entry);
	}

	protected function processControlWord(ControlWord $word)
	{
		switch ($word->word) {
			case 'plain': // Reset font formatting properties to default.
			case 'pard':  // Reset to default paragraph properties.
				$this->style->reset($this->defaultFont);
				break;

			/* Font formatting properties: */

			case 'b':          // Bold
			case 'caps':       // All capitals
			case 'embo':       // Emboss
			case 'i':          // Italic
			case 'impr':       // Engrave (imprint)
			case 'outl':       // Outline
			case 'scaps':      // Small capitals
			case 'shad':       // Shadow
			case 'strike':     // Strike-through
			case 'striked':    // Double strike-through
				$this->style->{$word->word} = $word->parameter;
				break;
			case 'sub':        // Subscripts
			case 'super':      // Superscripts
				$this->style->verticalAlign = $word->word;
				break;
			case 'nosupersub': // Turns off superscripting or subscripting
				$this->style->verticalAlign = null;
				break;
			case 'ul':         // Underline
			case 'uld':        // Dotted underline
			case 'uldash':     // Dashed underline
			case 'uldashd':    // Dash-dotted underline
			case 'uldashdd':   // Dash-dot-dotted underline
			case 'uldb':       // Double underline
			case 'ulhwave':    // Heavy wave underline
			case 'ulldash':    // Long dashed underline
			case 'ulnone':     // no underline
			case 'ulth':       // Thick underline
			case 'ulthd':      // Thick dotted underline
			case 'ulthdash':   // Thick dashed underline
			case 'ulthdashd':  // Thick dash-dotted underline
			case 'ulthdashdd': // Thick dash-dot-dotted underline
			case 'ulthldash':  // Thick long dashed underline
			case 'ululdbwave': // Double wave underline
			case 'ulw':        // Word underline
			case 'ulwave':     // Wave underline
				$this->style->underline = $word->word;
				break;
			case 'v': // hidden
				$this->style->hidden = $word->parameter;
				break;
			case 'fs': // Font size in half-points
				$this->style->fs = $word->parameter;
				break;
			case 'f': // Font number
				$this->style->font = $word->parameter;
				break;
			case 'deff': // Store default font
				$this->defaultFont = $word->parameter;
				break;
/*
			case 'ltrmark':
				$this->style->dir = 'ltr';
				break;
			case 'rtlmark':
				$this->style->dir = 'rtl';
				break;

			\ab*      Associated font is bold.
			\acaps*   Associated font is all capitals.
			\acfN     Associated foreground color (default is 0).
			\adnN     Associated font is subscript position in half-points (default is 6).
			\aexpndN  Expansion or compression of the space between characters in quarter-points; a negative value compresses (default is 0).
			\afN      Associated font number (default is 0).
			\afsN     Associated font size in half-points (default is 24).
			\ai*      Associated font is italic.
			\alangN   Language ID (see the standard language table) for the associated font.
			\aoutl*   Associated font is outline.
			\ascaps*  Associated font is small capitals.
			\ashad*   Associated font is shadow.
			\astrike* Associated font is strikethrough.
			\aul      Associated font is continuous underline. \aul0 turns off all underlining for the alternate font.
			\auld     Associated font is dotted underline.
			\auldb    Associated font is double underline.
			\aulnone  Associated font is no longer underlined.
			\aulw     Associated font is word underline.
			\aupN     Superscript position in half-points (default is 6).
			\fcsN     N = 1 means South East Asian complex script; N = 0 means not South East Asian script
			\loch     The text consists of single-byte low-ANSI (0x00–0x7F) characters.
			\hich     The text consists of single-byte high-ANSI (0x80–0xFF) characters.
			\dbch     The text consists of double-byte characters.
*/

			/* Colors */

			case 'cf':
			case 'chcfpat':
				$this->style->fontcolor = $word->parameter;
				break;
			case 'cb':
			case 'chcbpat':
				$this->style->background = $word->parameter;
				break;
			case 'highlight':
			case 'ulc':        // Underline color
				$this->style->{$word->word} = $word->parameter;
				break;

			/* Special characters */

			case 'lquote':    $this->write('‘'); break;
			case 'rquote':    $this->write('’'); break;
			case 'ldblquote': $this->write('“'); break;
			case 'rdblquote': $this->write('”'); break;
			case 'bullet':    $this->write('•'); break;
			case 'endash':    $this->write('–'); break;
			case 'emdash':    $this->write('—'); break;
			case 'enspace':   $this->write(' '); break;
			case 'emspace':   $this->write(' '); break;
			case 'qmspace':   $this->write(' '); break;
			case 'tab':       $this->write("\t"); break;
			case 'line':      $this->output .= '<br/>'; break; // "\r\n"
//			case 'lbr':       $this->output .= '<br/>'; break;
			case 'zwbo':      $this->write("\xC2\x82"); break;
			case 'zwnbo':     $this->write("\xC2\x83"); break;
			case 'zwj':       $this->write("\xE2\x80\x8D"); break;
			case 'zwnj':      $this->write("\xE2\x80\x8C"); break;

			/* Unicode characters */

			case 'u':
				$this->write($this->decodeUnicode($word->parameter));
				break;

			/* Paragraphs */

			case 'par': // End of paragraph
			case 'row': // End of table row
				// Close previously opened tags
				$this->closeTags();
				// Begin a new paragraph
				$this->openTag('p');
				break;

			/* Tables */
			case 'cell':     // End of table cell
			case 'nestcell': // End of nested table cell
			case 'nestrow':  // End of nested table row
				break;

			/* Code pages */
			case 'ansi':
			case 'mac':
			case 'pc':
			case 'pca':
				$this->RTFencoding = Encoding::getFromCodepage($word->word);
				break;
			case 'ansicpg':
				if ($word->parameter) {
					$this->RTFencoding = Encoding::getFromCodepage($word->parameter);
				}
				break;

			case 'fromtext': // Indicates document was originally plain text email.
			case 'fromhtml': // Indicates document was originally HTML email and may contain encapsulated HTML tags.
				break;

		}
	}

	protected function decodeUnicode($code, $srcEnc = 'UTF-8')
	{
		$utf8 = '';
		if ($srcEnc && 'UTF-8' != $srcEnc) {
			// convert character to Unicode
			$utf8 = \iconv($srcEnc, 'UTF-8', \chr($code));
		}
		return $utf8 ? $utf8 : \mb_convert_encoding("&#{$code};", 'UTF-8', 'HTML-ENTITIES');
	}

	protected function write(string $txt)
	{
		//$tag = \str_replace('er', '', $this->style->verticalAlign ?: 'span'); // sub / sup / span
		// Create a new 'span' element only when a style change occurs.
		// 1st case: style change occured
		// 2nd case: there is no change in style but the already created 'span'
		// element is somehow closed (ex. because of an end of paragraph)
		if (!$this->style->equals($this->previousStyle) ||
		   ($this->style->equals($this->previousStyle) && !$this->openedTags['span'])
		) {
			$this->closeTag('span');
			$this->previousStyle = clone $this->style;
			$this->openTag('span', $this->style);
		}
		$this->output .= $txt;
	}

	protected function openTag(string $tag, string $attr = '')
	{
		$this->output .= $attr ? "<{$tag} {$attr}>" : "<{$tag}>";
		$this->openedTags[$tag] = true;
	}

	protected function closeTag(string $tag, bool $end = false)
	{
		if ($this->openedTags[$tag]) {
			// Check for empty html elements
			if (\substr($this->output , -\strlen("<{$tag}>")) == "<{$tag}>") {
				if ('p' === $tag && !$end) {
					// Replace empty 'p' element with a line break
					$this->output = \substr($this->output ,0, -3) . "<br>";
				} else {
					// Delete empty elements
					$this->output = \substr($this->output ,0, -\strlen("<{$tag}>"));
				}
			} else {
				$this->output .= "</{$tag}>";
			}
			$this->openedTags[$tag] = false;
		}
	}

	protected function closeTags(bool $end = false)
	{
		foreach ($this->openedTags as $tag => $b) {
			$this->closeTag($tag, $end);
		}
	}

	protected function processControlSymbol(ControlSymbol $symbol)
	{
		if ("'" === $symbol->symbol) {
			// "\'hh" = A hexadecimal value, based on the specified character set
			$enc = $this->getSourceEncoding();
			$uchar = $this->decodeUnicode($symbol->parameter, $enc);
			$this->write($uchar);
		} else if ('~' === $symbol->symbol) {
			// Non breaking space
//			$this->write('&nbsp;');
//			$this->write("\xC2\xA0");
			$this->write(' ');
		} else if ('-' === $symbol->symbol) {
			// Optional hyphen
//			$this->write("&#173;");
//			$this->write("\xC2\xAD");
			$this->write('­');
		} else if ('_' === $symbol->symbol) {
			// Non breaking hyphen
//			$this->write("&#8209;");
//			$this->write("\xE2\x80\x91");
			$this->write('‑');
		}
	}

	protected function getSourceEncoding()
	{
		if (isset($this->style->font)) {
			if (isset(Style::$fonttbl[$this->style->font]->codepage)) {
				return Style::$fonttbl[$this->style->font]->codepage;
			}
			if (isset(Style::$fonttbl[$this->style->font]->charset)) {
				return Style::$fonttbl[$this->style->font]->charset;
			}
		}
		return $this->RTFencoding;
	}

	protected function ord_utf8($chr)
	{
		$ord0 = \ord($chr);
		if ($ord0 >= 0 && $ord0 <= 127)
			return $ord0;

		$ord1 = \ord($chr[1]);
		if ($ord0 >= 192 && $ord0 <= 223)
			return ($ord0 - 192) * 64 + ($ord1 - 128);

		$ord2 = \ord($chr[2]);
		if ($ord0 >= 224 && $ord0 <= 239)
			return ($ord0 - 224) * 4096 + ($ord1 - 128) * 64 + ($ord2 - 128);

		$ord3 = \ord($chr[3]);
		if ($ord0 >= 240 && $ord0 <= 247)
			return ($ord0 - 240) * 262144 + ($ord1 - 128) * 4096 + ($ord2 - 128) * 64 + ($ord3 - 128);

		$ord4 = \ord($chr[4]);
		if ($ord0 >= 248 && $ord0 <= 251)
			return ($ord0 - 248) * 16777216 + ($ord1 - 128) * 262144 + ($ord2 - 128) * 4096 + ($ord3 - 128) * 64 + ($ord4 - 128);

		if ($ord0 >= 252 && $ord0 <= 253)
			return ($ord0 - 252) * 1073741824 + ($ord1 - 128) * 16777216 + ($ord2 - 128) * 262144 + ($ord3 - 128) * 4096 + ($ord4 - 128) * 64 + (\ord($chr[5]) - 128);

		\trigger_error("Invalid Unicode character: {$chr}");
	}
}

class Style implements \Stringable
{
	public static
		$fonttbl = [],
		$colortbl = [];

	private static
		$highlights = [
			1  => 'Black',
			2  => 'Blue',
			3  => 'Cyan',
			4  => 'Green',
			5  => 'Magenta',
			6  => 'Red',
			7  => 'Yellow',
			8  => 'Unused',
			9  => 'DarkBlue',
			10 => 'DarkCyan',
			11 => 'DarkGreen',
			12 => 'DarkMagenta',
			13 => 'DarkRed',
			14 => 'DarkYellow',
			15 => 'DarkGray',
			16 => 'LightGray'
		],
		$underlineStyles = [
			'ul'         => 'solid 1px', // Underline
			'uld'        => 'dotted 1px', // Dotted underline
			'uldash'     => 'dashed 1px', // Dashed underline
			'uldashd'    => 'dashed 1px', // Dash-dotted underline
			'uldashdd'   => 'dashed 1px', // Dash-dot-dotted underline
			'uldb'       => 'double 1px', // Double underline
			'ulhwave'    => 'wavy 3px', // Heavy wave underline
			'ulldash'    => 'dashed 1px', // Long dashed underline
			'ulnone'     => '', // no underline
			'ulth'       => 'solid 2px', // Thick underline
			'ulthd'      => 'dotted 2px', // Thick dotted underline
			'ulthdash'   => 'dashed 2px', // Thick dashed underline
			'ulthdashd'  => 'dashed 2px', // Thick dash-dotted underline
			'ulthdashdd' => 'dashed 2px', // Thick dash-dot-dotted underline
			'ulthldash'  => 'dashed 2px', // Thick long dashed underline
			'ululdbwave' => 'wavy 2px', // Double wave underline
//			'ulw'        => 'wavy 1px', // Word underline
			'ulwave'     => 'wavy 1px', // Wave underline
		];

	public bool
		$b = false,          // Bold
		$caps = false,       // All capitals
		$embo = false,       // Emboss
		$i = false,          // Italic
		$impr = false,       // Engrave (imprint)
		$outl = false,       // Outline
		$scaps = false,      // Small capitals
		$shad = false,       // Shadow
		$strike = false,     // Strike-through
		$striked = false,    // Double strike-through
		$hidden = false;

	public int
		$fs = 0; // Font size in half-points, default is 24 = 12pt

	public
		$underline = 'ulnone',
		$verticalAlign = '', // sub / super
		$fontcolor = null,
		$background = null,
		$font = null,
		$highlight = null,
		$ulc = null;         // Underline color

	public function reset($defaultFont = null) : void
	{
		$this->b = false;
		$this->caps = false;
		$this->embo = false;
		$this->i = false;
		$this->impr = false;
		$this->outl = false;
		$this->scaps = false;
		$this->shad = false;
		$this->strike = false;
		$this->striked = false;
		$this->hidden = false;
		$this->fs = 0;
		$this->underline = 'ulnone';
		$this->verticalAlign = '';
		$this->fontcolor = null;
		$this->background = null;
		$this->highlight = null;
		$this->ulc = null;
		$this->font = isset($defaultFont) ? $defaultFont : null;
	}

	public function __toString(): string
	{
		$style = [];

		if ($this->b         ) $style[] = 'font-weight:bold';
		if ($this->caps      ) $style[] = 'text-transform:uppercase';
//		if ($this->embo      ) $style[] = 'text-shadow: 1px 4px 4px #555;background-clip:text';
		if ($this->i         ) $style[] = 'font-style:italic';
//		if ($this->impr      ) $style[] = 'text-shadow: rgba(245,245,245,0.5) 3px 5px 1px;background-clip:text';
//		if ($this->outl      ) $style[] = '';
		if ($this->scaps     ) $style[] = 'font-variant:small-caps';
//		if ($this->shad      ) $style[] = '';
		if ($this->strike    ) $style[] = 'text-decoration:line-through';
//		if ($this->striked   ) $style[] = '';
		if ($this->verticalAlign) $style[] = "vertical-align:{$this->verticalAlign};font-size:smaller";
		if (!empty(static::$underlineStyles[$this->underline])) {
			$value = 'text-decoration:underline';
			if (!empty(static::$colortbl[$this->ulc])) {
				$value .= ' ' . static::$colortbl[$this->ulc];
			}
			$value .= ' ' . static::$underlineStyles[$this->underline];
			$style[] = $value;
		}
		if ($this->hidden) $style[] = 'display:none';
		if (!empty(static::$fonttbl[$this->font])) {
			$font = (string) static::$fonttbl[$this->font];
			if ($font) {
				$style[] = $font;
			}
		}
		if (0 < $this->fs) {
//			$style[] = 'font-size:'.\ceil($this->fs / 2).'pt';
//			$style[] = 'font-size:'.\ceil($word->parameter * 16 / 24).'px';
			$style[] = 'font-size:'.\round($this->fs / 24, 2).'em';
		}
		if (!empty(static::$colortbl[$this->fontcolor])) {
			$style[] = 'color:' . static::$colortbl[$this->fontcolor];
		}
		if (!empty(static::$colortbl[$this->background])) {
			$style[] = 'background-color:' . static::$colortbl[$this->background];
		} else if (!empty(static::$highlights[$this->highlight])) {
			$style[] = 'background-color:' . static::$highlights[$this->highlight];
		}
		return $style ? 'style="'.\implode(';', $style).'"' : '';
	}

	/*
	 * Check whether this Style is equal to another Style.
	 */
	public function equals(?Style $style) : bool
	{
		return $style
		 && ($this->b == $style->b)
		 && ($this->caps == $style->caps)
//		 && ($this->embo == $style->embo)
		 && ($this->i == $style->i)
//		 && ($this->impr == $style->impr)
//		 && ($this->outl == $style->outl)
		 && ($this->scaps == $style->scaps)
//		 && ($this->shad == $style->shad)
		 && ($this->strike == $style->strike)
		 && ($this->striked == $style->striked)
		 && ($this->verticalAlign == $style->verticalAlign)
		 && ($this->underline == $style->underline)
		 && ($this->ulc == $style->ulc)
		 && ($this->hidden == $style->hidden)
		 && ($this->fs == $style->fs)
		 && ($this->fontcolor == $style->fontcolor)
		 && ($this->background == $style->background)
		 && ($this->highlight == $style->highlight)
		 && ($this->font == $style->font)
		;
	}
}
