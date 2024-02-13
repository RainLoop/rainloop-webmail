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
class NamespaceResult implements \JsonSerializable
{
	public array
		$aPersonal = [],
		$aOtherUsers = [],
		$aShared = [];

	function __construct(Response $oImapResponse)
	{
		if (!empty($oImapResponse->ResponseList[2])) {
			foreach ($oImapResponse->ResponseList[2] as $entry) {
				if (\is_array($entry) && 2 <= \count($entry)) {
					$this->aPersonal[] = [
						'prefix' => \array_shift($entry),
						'separator' => \array_shift($entry),
						'extension' => $entry
					];
				}
			}
		}
		if (!empty($oImapResponse->ResponseList[3])) {
			foreach ($oImapResponse->ResponseList[3] as $entry) {
				if (\is_array($entry) && 2 <= \count($entry)) {
					$this->aOtherUsers[] = [
						'prefix' => \array_shift($entry),
						'separator' => \array_shift($entry),
						'extension' => $entry
					];
				}
			}
		}
		if (!empty($oImapResponse->ResponseList[4])) {
			foreach ($oImapResponse->ResponseList[4] as $entry) {
				if (\is_array($entry) && 2 <= \count($entry)) {
					$this->aShared[] = [
						'prefix' => \array_shift($entry),
						'separator' => \array_shift($entry),
						'extension' => $entry
					];
				}
			}
		}
	}

	public function GetPersonalPrefix() : string
	{
		$sPrefix = '';
		if (isset($this->aPersonal[0])) {
			$sPrefix = $this->aPersonal[0]['prefix'];
			$sSeparator = $this->aPersonal[0]['separator'];
			if ('INBOX'.$sSeparator === \substr(\strtoupper($sPrefix), 0, 6)) {
				$sPrefix = 'INBOX'.$sSeparator.\substr($sPrefix, 6);
			};
		}
		return $sPrefix;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return array(
			'@Object' => 'Object/Namespaces',
			'personal' => $this->aPersonal,
			'users' => $this->aOtherUsers,
			'shared' => $this->aShared,
		);
	}
}
