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
	 * @return void
	 */
	public function StartParse(\MailSo\Mime\Part &$oPart);

	/**
	 * @param \MailSo\Mime\Part $oPart
	 *
	 * @return void
	 */
	public function EndParse(\MailSo\Mime\Part &$oPart);

	/**
	 * @param \MailSo\Mime\Part $oPart
	 *
	 * @return void
	 */
	public function StartParseMimePart(\MailSo\Mime\Part &$oPart);

	/**
	 * @param \MailSo\Mime\Part $oMimePart
	 *
	 * @return void
	 */
	public function EndParseMimePart(\MailSo\Mime\Part &$oPart);

	/**
	 * @return void
	 */
	public function InitMimePartHeader();

	/**
	 * @param string $sBuffer
	 * 
	 * @return void
	 */
	public function ReadBuffer($sBuffer);

	/**
	 * @param string $sBuffer
	 * @return void
	 */
	public function WriteBody($sBuffer);
}
