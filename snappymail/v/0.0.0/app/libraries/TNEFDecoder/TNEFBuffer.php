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

class TNEFBuffer
{
	private string $data;
	private int $offset;

	function __construct(string $data)
	{
		$this->data = $data;
		$this->offset = 0;
	}

	function getBytes(int $numBytes): ?string
	{
		if ($this->getRemainingBytes() < $numBytes) {
			$this->offset = \strlen($this->data);
			return null;
		}

		$this->offset += $numBytes;
		return \substr($this->data, $this->offset - $numBytes, $numBytes);
	}

	function getRemainingBytes(): int
	{
		return \strlen($this->data) - $this->offset;
	}
}



