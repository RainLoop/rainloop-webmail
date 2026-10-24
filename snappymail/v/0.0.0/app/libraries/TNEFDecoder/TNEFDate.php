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

class TNEFDate extends \DateTime
{
	public function __construct(string $datetime = "now", ?\DateTimeZone $timezone = null)
	{
		parent::__construct($datetime, new \DateTimeZone('UTC'));
	}

	public function setTnefBuffer(TNEFBuffer $buffer)
	{
		$this->setDate(
			$buffer->geti16(), // year
			$buffer->geti16(), // month
			$buffer->geti16()  // day
		);
		$this->setTime(
			$buffer->geti16(), // hour
			$buffer->geti16(), // minute
			$buffer->geti16()  // second
		);
	}
}
