<?php

namespace TNEFDecoder;

/**
  * SquirrelMail TNEF Decoder Plugin
  *
  * Copyright (c) 2010- Paul Lesniewski <paul@squirrelmail.org>
  * Copyright (c) 2003  Bernd Wiegmann <bernd@wib-software.de>
  * Copyright (c) 2002  Graham Norburys <gnorbury@bondcar.com>
  *
  * Licensed under the GNU GPL. For full terms see the file COPYING.
  *
  * @package plugins
  * @subpackage tnef_decoder
  *
  */

class TNEFFileBase
{
	public bool $name_is_unicode = FALSE;
	public string
		$name = 'Untitled',
		$code_page = '',
		$message_code_page = '', // parent message's code page (the whole TNEF file)
		$type = 'application/octet-stream',
		$content = '';
	public ?TNEFDate
		$created = null,
		$modified = null;
	public bool $debug;

	public function __construct(bool $debug)
	{
		$this->debug = $debug;
	}

	public function setMessageCodePage(string $code_page): void
	{
		$this->message_code_page = $code_page;
	}

	public function getCodePage(): string
	{
		return empty($this->code_page)
			? $this->message_code_page
			: $this->code_page;
	}

	public function getName(): string
	{
		return $this->name_is_unicode
			? \substr(\mb_convert_encoding($this->name, "UTF-8" , "UTF-16LE"), 0, -1)
			: $this->name;
	}

	public function getType(): string
	{
		return $this->type;
	}

	public function getSize(): int
	{
		return \strlen($this->content);
	}

	public function getCreated(): ?TNEFDate
	{
		return $this->created;
	}

	public function getModified(): ?TNEFDate
	{
		return $this->modified;
	}

	public function getContent(): string
	{
		return $this->content;
	}

}
