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



/**
  * Debugging output --> to a file (/tmp/squirrelmail_tnef_decoder.log)
  *
  * Note this assumes a world-writable /tmp directory
  *
  * @param string $string The text to be logged
  *
  * @return boolean TRUE on success, FALSE when a problem occurred
  *
  */
function tnef_log($string)
{
	\SnappyMail\Log::debug('TNEF', $string);
}




/**
  * TNEF decoding helper function
  *
  */
function tnef_getx($size, TNEFBuffer $buf)
{
	return $buf->getBytes($size);
}



/**
  * TNEF decoding helper function
  *
  */
function tnef_geti8(TNEFBuffer $buf)
{
	$bytes = $buf->getBytes(1, $buf);
	if ($bytes === null) {
		return null;
	}

	return ord($bytes[0]);
}



/**
  * TNEF decoding helper function
  *
  */
function tnef_geti16(TNEFBuffer $buf): ?int
{
	$bytes = $buf->getBytes(2, $buf);
	if ($bytes === null) {
		return null;
	}

	return ord($bytes[0])
		+ (ord($bytes[1]) << 8);
}



/**
  * TNEF decoding helper function
  *
  */
function tnef_geti32(TNEFBuffer $buf): ?int
{
	$bytes = $buf->getBytes(4, $buf);
	if ($bytes === null) {
		return null;
	}

	return ord($bytes[0])
		+ (ord($bytes[1]) << 8)
		+ (ord($bytes[2]) << 16)
		+ (ord($bytes[3]) << 24);
}
