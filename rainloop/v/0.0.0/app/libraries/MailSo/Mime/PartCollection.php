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
	/**
	 * @access protected
	 */
	protected function __construct()
	{
		parent::__construct();
	}

	/**
	 * @return \MailSo\Mime\PartCollection
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @param string $sBoundary
	 *
	 * @return resorce
	 */
	public function ToStream($sBoundary)
	{
		$rResult = null;
		if (0 < \strlen($sBoundary))
		{
			$aResult = array();

			$aParts =& $this->GetAsArray();
			foreach ($aParts as /* @var $oPart \MailSo\Mime\Part */ &$oPart)
			{
				if (0 < count($aResult))
				{
					$aResult[] = \MailSo\Mime\Enumerations\Constants::CRLF.
						'--'.$sBoundary.\MailSo\Mime\Enumerations\Constants::CRLF;
				}

				$aResult[] = $oPart->ToStream();
			}

			return \MailSo\Base\StreamWrappers\SubStreams::CreateStream($aResult);
		}

		return $rResult;
	}
}
