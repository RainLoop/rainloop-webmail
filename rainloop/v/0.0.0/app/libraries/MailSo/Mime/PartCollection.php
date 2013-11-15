<?php

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
