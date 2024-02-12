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
	// prefix => separator
	private array $namespaces = [
//		'' => '.', // default
//		'virtual.' => '.',
//		'shared.' => '.',
//		etc.
	];

	function __construct(Response $oImapResponse)
	{
		// * NAMESPACE (("" ".")("virtual." ".")) (("shared." ".")) NIL\r\n
		$i = 1;
		while (isset($oImapResponse->ResponseList[++$i])) {
			$entries = $oImapResponse->ResponseList[$i];
			if ($entries) {
				foreach ($entries as $entry) {
					if (\is_array($entry) && 2 <= \count($entry)) {
						$this->namespaces[$entry[0]] = $entry[1];
					}
				}
			}
		}
	}

	public function GetPrivateNamespace() : string
	{
		$sName = '';
		if (isset($oImapResponse->ResponseList[2][0][0])) {
			$sName = $oImapResponse->ResponseList[2][0][0];
			$sSeparator = $oImapResponse->ResponseList[2][0][1];
			if ('INBOX'.$sSeparator === \substr(\strtoupper($sName), 0, 6)) {
				$sName = 'INBOX'.$sSeparator.\substr($sName, 6);
			};
		}
		return $sName;
	}
}
