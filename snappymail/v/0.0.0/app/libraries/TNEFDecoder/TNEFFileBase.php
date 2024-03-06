<?php namespace TNEFDecoder;

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
	public string $name = 'Untitled';
	public string $code_page = '';
	public string $message_code_page = ''; // parent message's code page (the whole TNEF file)
	public string $type = 'application/octet-stream';
	public string $content = '';
	var $created;
	var $modified;

	function setMessageCodePage(string $code_page)
	{
		$this->message_code_page = $code_page;
	}

	function getCodePage()
	{
		return empty($this->code_page)
			? $this->message_code_page
			: $this->code_page;
	}

	function getName()
	{
		if ($this->name_is_unicode) {
			return \substr(\mb_convert_encoding($this->name, "UTF-8" , "UTF-16LE"), 0, -1);
		}
		return $this->name;
	}

	function getSize()
	{
		return \strlen($this->content);
	}
}
