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
	private int $offset = 0;

	public function __construct(string $data)
	{
		$this->data = $data;
	}

	public function getBytes(int $numBytes): ?string
	{
		if ($this->getRemainingBytes() < $numBytes) {
			$this->offset = \strlen($this->data);
			return null;
		}

		$this->offset += $numBytes;
		return \substr($this->data, $this->offset - $numBytes, $numBytes);
	}

	public function getRemainingBytes(): int
	{
		return \strlen($this->data) - $this->offset;
	}

	public function geti8(): ?int
	{
		$bytes = $this->getBytes(1);
		return (null === $bytes) ? null : \ord($bytes[0]);
	}

	public function geti16(): ?int
	{
		$bytes = $this->getBytes(2);
		return (null === $bytes) ? null : \ord($bytes[0]) + (\ord($bytes[1]) << 8);
	}

	public function geti32(): ?int
	{
		$bytes = $this->getBytes(4);
		return (null === $bytes) ? null
			: \ord($bytes[0])
			+ (\ord($bytes[1]) << 8)
			+ (\ord($bytes[2]) << 16)
			+ (\ord($bytes[3]) << 24);
	}
}
