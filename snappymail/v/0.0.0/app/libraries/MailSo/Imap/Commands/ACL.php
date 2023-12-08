<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2021 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap\Commands;

use MailSo\Imap\Responses\ACL as ACLResponse;

/**
 * @category MailSo
 * @package Imap
 */
trait ACL
{
	/**
	 * https://datatracker.ietf.org/doc/html/rfc4314#section-4
	 */
	public function ACLAllow(string $sFolderName, string $command) : bool
	{
		if ($this->hasCapability('ACL') || $this->CapabilityValue('RIGHTS')) {
			if ('MYRIGHTS' === $command) {
				return true;
			}
			$rights = $this->FolderMyRights($sFolderName);
			if ($rights) {
				switch ($command)
				{
				case 'LIST':
				case 'LSUB':
					return $rights->hasRight('LOOKUP');
				case 'CREATE':
					return true; // $parent->$rights->hasRight('k');
				case 'DELETE':
					return $rights->hasRight('x');
				case 'RENAME':
					return $rights->hasRight('k') && $rights->hasRight('x');
				case 'SELECT':
				case 'EXAMINE':
				case 'STATUS':
					return $rights->hasRight('r');
				case 'APPEND':
				case 'COPY':
					return $rights->hasRight('i');
				case 'EXPUNGE':
					return $rights->hasRight('e');

//				case 'SUBSCRIBE':
//				case 'UNSUBSCRIBE':
//				case 'CLOSE':
//				case 'FETCH':
//				case 'STORE':

				case 'GETACL':
				case 'SETACL':
				case 'LISTRIGHTS':
				case 'DELETEACL':
					return $rights->hasRight('a');
				}
			}
		}
		return !\in_array($command, ['GETACL','SETACL','LISTRIGHTS','DELETEACL','MYRIGHTS']);
	}

	public function FolderSetACL(string $sFolderName, string $sIdentifier, string $sAccessRights) : void
	{
//		if ($this->ACLAllow($sFolderName, 'SETACL')) {
		$this->SendRequestGetResponse('SETACL', array(
			$this->EscapeFolderName($sFolderName),
			$this->EscapeString($sIdentifier),
			$this->EscapeString($sAccessRights)
		));
	}

	public function FolderDeleteACL(string $sFolderName, string $sIdentifier) : void
	{
//		if ($this->ACLAllow($sFolderName, 'DELETEACL')) {
		$this->SendRequestGetResponse('DELETEACL', array(
			$this->EscapeFolderName($sFolderName),
			$this->EscapeString($sIdentifier)
		));
	}

	public function FolderGetACL(string $sFolderName) : array
	{
//		if ($this->ACLAllow($sFolderName, 'GETACL')) {
		$oResponses = $this->SendRequestGetResponse('GETACL', array($this->EscapeFolderName($sFolderName)));
		$aResult = array();
		foreach ($oResponses as $oResponse) {
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& isset($oResponse->ResponseList[4])
				&& 'ACL' === $oResponse->ResponseList[1]
				&& $sFolderName === $oResponse->ResponseList[2]
			)
			{
				$aResult[$oResponse->ResponseList[3]] = static::aclRightsToClass(\array_slice($oResponse->ResponseList, 4));
			}
		}
		return $aResult;
	}

	public function FolderListRights(string $sFolderName, string $sIdentifier) : ?ACLResponse
	{
//		if ($this->ACLAllow($sFolderName, 'LISTRIGHTS')) {
		$oResponses = $this->SendRequestGetResponse('LISTRIGHTS', array(
			$this->EscapeFolderName($sFolderName),
			$this->EscapeString($sIdentifier)
		));
		foreach ($oResponses as $oResponse) {
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& isset($oResponse->ResponseList[4])
				&& 'LISTRIGHTS' === $oResponse->ResponseList[1]
				&& $sFolderName === $oResponse->ResponseList[2]
				&& $sIdentifier === $oResponse->ResponseList[3]
			)
			{
				return static::aclRightsToClass(\array_slice($oResponse->ResponseList, 4));
			}
		}
		return null;
	}

	public function FolderMyRights(string $sFolderName) : ?ACLResponse
	{
//		if ($this->ACLAllow($sFolderName, 'MYRIGHTS')) {
//		if ($this->hasCapability('ACL')) {
		$oResponses = $this->SendRequestGetResponse('MYRIGHTS', array($this->EscapeFolderName($sFolderName)));
		foreach ($oResponses as $oResponse) {
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& isset($oResponse->ResponseList[3])
				&& 'MYRIGHTS' === $oResponse->ResponseList[1]
				&& $sFolderName === $oResponse->ResponseList[2]
			)
			{
				return static::aclRightsToClass(\array_slice($oResponse->ResponseList, 3));
			}
		}
		return null;
	}

	private static function aclRightsToClass(array $rules) : ACLResponse
	{
		$result = array();
		foreach ($rules as $rule) {
			$result = \array_merge($result, \str_split($rule));
		}
		return new ACLResponse(\array_unique($result));
	}

}
