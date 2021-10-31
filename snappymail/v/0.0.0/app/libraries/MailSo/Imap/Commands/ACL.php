<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap\Commands;

/**
 * @category MailSo
 * @package Imap
 */
trait ACL
{
	public function FolderSetACL(string $sFolderName, string $sIdentifier, string $sAccessRights) : void
	{
		$this->SendRequestGetResponse('SETACL', array(
			$this->EscapeString($sFolderName),
			$this->EscapeString($sIdentifier),
			$this->EscapeString($sAccessRights)
		));
	}

	public function FolderDeleteACL(string $sFolderName, string $sIdentifier) : void
	{
		$this->SendRequestGetResponse('DELETEACL', array(
			$this->EscapeString($sFolderName),
			$this->EscapeString($sIdentifier)
		));
	}

	public function FolderGetACL(string $sFolderName) : array
	{
		$oResponses = $this->SendRequestGetResponse('GETACL', array($this->EscapeString($sFolderName)));
		$aResult = array();
		foreach ($oResponses as $oResponse) {
			if (MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& isset($oResponse->ResponseList[4])
				&& 'ACL' === $oResponse->ResponseList[1]
				&& $sFolderName === $oResponse->ResponseList[2]
			)
			{
				$aResult[$oResponse->ResponseList[3]] = static::aclRightsToArray(\array_slice($oResponse->ResponseList, 4));
			}
		}
		return $aResult;
	}

	public function FolderListRights(string $sFolderName, string $sIdentifier) : ?array
	{
		$oResponses = $this->SendRequestGetResponse('LISTRIGHTS', array(
			$this->EscapeString($sFolderName),
			$this->EscapeString($sIdentifier)
		));
		foreach ($oResponses as $oResponse) {
			if (MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& isset($oResponse->ResponseList[4])
				&& 'LISTRIGHTS' === $oResponse->ResponseList[1]
				&& $sFolderName === $oResponse->ResponseList[2]
				&& $sIdentifier === $oResponse->ResponseList[3]
			)
			{
				return static::aclRightsToArray(\array_slice($oResponse->ResponseList, 4));
			}
		}
		return null;
	}

	public function FolderMyRights(string $sFolderName) : ?array
	{
		$oResponses = $this->SendRequestGetResponse('MYRIGHTS', array($this->EscapeString($sFolderName)));
		foreach ($oResponses as $oResponse) {
			if (MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& isset($oResponse->ResponseList[3])
				&& 'MYRIGHTS' === $oResponse->ResponseList[1]
				&& $sFolderName === $oResponse->ResponseList[2]
			)
			{
				return static::aclRightsToArray(\array_slice($oResponse->ResponseList, 3));
			}
		}
		return null;
	}

	private static function aclRightsToArray(array $rules) : array
	{
		$result = array();
		foreach ($rules as $rule) {
			$result = \array_merge($result, \str_split($rule));
		}
		return \array_unique($result);
	}

}
