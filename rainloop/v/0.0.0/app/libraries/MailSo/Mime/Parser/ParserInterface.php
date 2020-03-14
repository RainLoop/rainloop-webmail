<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mime\Parser;

/**
 * @category MailSo
 * @package Mime
 * @subpackage Parser
 */
interface ParserInterface
{
	/**
	 * @param \MailSo\Mime\Part $oPart
	 *
	 */
	public function StartParse(\MailSo\Mime\Part &$oPart) : void;

	/**
	 * @param \MailSo\Mime\Part $oPart
	 *
	 */
	public function EndParse(\MailSo\Mime\Part &$oPart) : void;

	/**
	 * @param \MailSo\Mime\Part $oPart
	 *
	 */
	public function StartParseMimePart(\MailSo\Mime\Part &$oPart) : void;

	/**
	 * @param \MailSo\Mime\Part $oMimePart
	 *
	 */
	public function EndParseMimePart(\MailSo\Mime\Part &$oPart) : void;

	public function InitMimePartHeader() : void;

	public function ReadBuffer(string $sBuffer) : void;

	public function WriteBody(string $sBuffer) : void;
}
