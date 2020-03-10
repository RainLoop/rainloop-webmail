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
class ParserMemory extends ParserEmpty implements ParserInterface
{
	/**
	 * @var \MailSo\Mime\Part
	 */
	protected $oCurrentMime = null;

	public function StartParseMimePart(\MailSo\Mime\Part $oPart) : void
	{
		$this->oCurrentMime = $oPart;
	}

	public function WriteBody(string $sBuffer) : void
	{
		if (null === $this->oCurrentMime->Body)
		{
			$this->oCurrentMime->Body = \MailSo\Base\ResourceRegistry::CreateMemoryResource();
		}

		if (\is_resource($this->oCurrentMime->Body))
		{
			\fwrite($this->oCurrentMime->Body, $sBuffer);
		}
	}
}
