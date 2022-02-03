<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mime;

/**
 * @category MailSo
 * @package Mime
 */
class PartCollection extends \MailSo\Base\Collection
{
	public function append($oPart, bool $bToTop = false) : void
	{
		assert($oPart instanceof Part);
		parent::append($oPart, $bToTop);
	}

	/**
	 * @return resource|bool|null
	 */
	public function ToStream(string $sBoundary)
	{
		if (\strlen($sBoundary))
		{
			$aResult = array();

			foreach ($this as $oPart)
			{
				if (\count($aResult))
				{
					$aResult[] = "\r\n--{$sBoundary}\r\n";
				}

				$aResult[] = $oPart->ToStream();
			}

			return \MailSo\Base\StreamWrappers\SubStreams::CreateStream($aResult);
		}

		return null;
	}
}
