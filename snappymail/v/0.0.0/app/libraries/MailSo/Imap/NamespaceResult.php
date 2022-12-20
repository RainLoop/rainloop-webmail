<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap;

/**
 * @category MailSo
 * @package Imap
 */
class NamespaceResult
{
	private string $sPersonal = '';

	private string $sPersonalDelimiter = '';
/*
	private string $sOtherUser = '';

	private string $sOtherUserDelimiter = '';

	private string $sShared = '';

	private string $sSharedDelimiter = '';
*/
	function __construct(Response $oImapResponse)
	{
		$space = static::getNamespace($oImapResponse, 2);
		if ($space) {
			$this->sPersonal = $space[0];
			$this->sPersonalDelimiter = $space[1];
		}
/*
		$space = static::getNamespace($oImapResponse, 3);
		if ($space) {
			$this->sOtherUser = $space[0];
			$this->sOtherUserDelimiter = $space[1];
		}

		$space = static::getNamespace($oImapResponse, 4);
		if ($space) {
			$this->sShared = $space[0];
			$this->sSharedDelimiter = $space[1];
		}
*/
	}

	public function GetPersonalNamespace() : string
	{
		return $this->sPersonal;
	}

	private static function getNamespace(Response $oImapResponse, int $section) : ?array
	{
		if (isset($oImapResponse->ResponseList[$section][0])
		 && \is_array($oImapResponse->ResponseList[$section][0])
		 && 2 <= \count($oImapResponse->ResponseList[$section][0]))
		{
			$sName = $oImapResponse->ResponseList[$section][0][0];
			$sDelimiter = $oImapResponse->ResponseList[$section][0][1];
			$sName = 'INBOX'.$sDelimiter === \substr(\strtoupper($sName), 0, 6)
				? 'INBOX'.$sDelimiter.\substr($sName, 6)
				: $sName;
			return [$sName, $sDelimiter];
		}
		return null;
	}

}
