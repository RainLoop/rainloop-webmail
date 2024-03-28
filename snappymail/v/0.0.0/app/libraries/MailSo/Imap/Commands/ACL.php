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
	private $ACLDisabled = false;

	/**
	 * https://datatracker.ietf.org/doc/html/rfc4314#section-4
	 */
	public function ACLAllow(string $sFolderName, string $command) : bool
	{
		if ($this->ACLDisabled || !$this->hasCapability('ACL')) {
			return false;
		}

		// The "RIGHTS=" capability MUST NOT include any of the rights defined in RFC 2086:
		// "l", "r", "s", "w", "i", "p", "a", "c", "d", and the digits ("0" .. "9")
		// So it is: RIGHTS=texk
//		$mainRights = \str_split($this->CapabilityValue('RIGHTS') ?: '');

		if ('MYRIGHTS' === $command) {
			// at least one of the "l", "r", "i", "k", "x", "a" rights is required
			return true;
		}

		if (\in_array($command, ['GETACL','SETACL','LISTRIGHTS','DELETEACL'])) {
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
/*
			case 'SUBSCRIBE':
				return $rights->hasRight('l') || true;
			case 'UNSUBSCRIBE':
				return true;
			case 'CLOSE':
				return $rights->hasRight('e') || true;
			case 'FETCH':
				return $rights->hasRight('s') || true;
			case 'STORE':
				return $rights->hasRight('s') || $rights->hasRight('w') || $rights->hasRight('t');
*/
			case 'GETACL':
			case 'SETACL':
			case 'LISTRIGHTS':
			case 'DELETEACL':
				return $rights->hasRight('a');
			}
		}
		return true;
	}

	private function FolderACLRequest(string $sFolderName, string $sCommand, array $aParams) : \MailSo\Imap\ResponseCollection
	{
		if ($this->ACLAllow($sFolderName, $sCommand)) try {
			return $this->SendRequestGetResponse($sCommand, $aParams);
		} catch (\Throwable $oException) {
			// Error in IMAP command $sCommand: ACLs disabled
			$this->ACLDisabled = true;
			throw $oException;
		}
	}

	public function FolderSetACL(string $sFolderName, string $sIdentifier, string $sAccessRights) : void
	{
		$this->FolderACLRequest($sFolderName, 'SETACL', array(
			$this->EscapeFolderName($sFolderName),
			$this->EscapeString($sIdentifier),
			$this->EscapeString($sAccessRights)
		));
	}

	public function FolderDeleteACL(string $sFolderName, string $sIdentifier) : void
	{
		$this->FolderACLRequest($sFolderName, 'DELETEACL', array(
			$this->EscapeFolderName($sFolderName),
			$this->EscapeString($sIdentifier)
		));
	}

	public function FolderGetACL(string $sFolderName) : array
	{
		$aResult = array();
		$oResponses = $this->FolderACLRequest($sFolderName, 'GETACL', array($this->EscapeFolderName($sFolderName)));
		foreach ($oResponses as $oResponse) {
			// * ACL INBOX.shared demo@snappymail.eu akxeilprwtscd foobar@snappymail.eu akxeilprwtscd demo2@snappymail.eu lrwstipekxacd
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& isset($oResponse->ResponseList[4])
				&& 'ACL' === $oResponse->ResponseList[1]
				&& $sFolderName === $oResponse->ResponseList[2]
			)
			{
				$c = \count($oResponse->ResponseList);
				for ($i = 3; $i < $c; $i += 2) {
					$aResult[] = new ACLResponse(
						$oResponse->ResponseList[$i],
						$oResponse->ResponseList[$i+1]
					);
				}
			}
		}
		return $aResult;
	}

	public function FolderListRights(string $sFolderName, string $sIdentifier) : ?ACLResponse
	{
		$oResponses = $this->FolderACLRequest($sFolderName, 'LISTRIGHTS', array(
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
				foreach (\array_slice($oResponse->ResponseList, 4) as $rule) {
					$result = \array_merge($result, \str_split($rule));
				}
				return new ACLResponse($sIdentifier, \implode('', \array_unique($result)));
			}
		}
		return null;
	}

	public function FolderMyRights(string $sFolderName) : ?ACLResponse
	{
		$oResponses = $this->FolderACLRequest($sFolderName, 'MYRIGHTS', array($this->EscapeFolderName($sFolderName)));
		foreach ($oResponses as $oResponse) {
			if (\MailSo\Imap\Enumerations\ResponseType::UNTAGGED === $oResponse->ResponseType
				&& isset($oResponse->ResponseList[3])
				&& 'MYRIGHTS' === $oResponse->ResponseList[1]
				&& $sFolderName === $oResponse->ResponseList[2]
			)
			{
				return new ACLResponse('', $oResponse->ResponseList[3]);
			}
		}
		return null;
	}
}
