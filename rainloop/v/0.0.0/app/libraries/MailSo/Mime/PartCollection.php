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
	public static function NewInstance() : self
	{
		return new self();
	}

	public function append($oPart, bool $bToTop = false) : void
	{
		assert($oPart instanceof Part);
		parent::append($oPart, $bToTop);
	}

	/**
	 * @return resource
	 */
	public function ToStream(string $sBoundary)
	{
		if (0 < \strlen($sBoundary))
		{
			$aResult = array();

			foreach ($this as $oPart)
			{
				if (0 < count($aResult))
				{
					$aResult[] = Enumerations\Constants::CRLF.
						'--'.$sBoundary.Enumerations\Constants::CRLF;
				}

				$aResult[] = $oPart->ToStream();
			}

			return \MailSo\Base\StreamWrappers\SubStreams::CreateStream($aResult);
		}

		return null;
	}
}
