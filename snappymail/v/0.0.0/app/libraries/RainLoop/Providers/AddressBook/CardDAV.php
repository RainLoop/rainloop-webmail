<?php

namespace RainLoop\Providers\AddressBook;

use \SnappyMail\DAV\Client as DAVClient;

trait CardDAV
{
	protected function prepareDavSyncData(DAVClient $oClient, string $sPath)
	{
		$mResult = false;
		$aResponse = null;
		try
		{
			$this->oLogger->Write('PROPFIND '.$sPath, \MailSo\Log\Enumerations\Type::INFO, 'DAV');

			$aResponse = $oClient->propFind($sPath, array(
				'{DAV:}getlastmodified',
				'{DAV:}resourcetype',
				'{DAV:}getetag'
			), 1);

//			$this->oLogger->WriteDump($aResponse);
		}
		catch (\Throwable $oException)
		{
			$this->oLogger->WriteException($oException);
		}

		/**
		 * find every <response><href>*.vcf</href> with empty <resourcetype/>
		 */
		if (\is_array($aResponse))
		{
			$mResult = array();
			foreach ($aResponse as $sKey => $aItem)
			{
				$sKey = \rtrim(\trim($sKey), '\\/');
				if (!empty($sKey) && is_array($aItem))
				{
					if (isset($aItem['{DAV:}getetag']))
					{
						$aMatch = array();
						if (\preg_match('/\/([^\/?]+)$/', $sKey, $aMatch) && !empty($aMatch[1])
						 && !static::hasDAVCollection($aItem))
						{
							$sVcfFileName = \urldecode(\urldecode($aMatch[1]));
							$sKeyID = \preg_replace('/\.vcf$/i', '', $sVcfFileName);

							$mResult[$sKeyID] = array(
								'deleted' => false,
								'uid' => $sKeyID,
								'vcf' => $sVcfFileName,
								'etag' => \trim(\trim($aItem['{DAV:}getetag']), '"\''),
								'lastmodified' => '',
								'changed' => 0
							);

							if (isset($aItem['{DAV:}getlastmodified']))
							{
								$mResult[$sKeyID]['lastmodified'] = $aItem['{DAV:}getlastmodified'];
								$mResult[$sKeyID]['changed'] = \MailSo\Base\DateTimeHelper::ParseRFC2822DateString(
									$aItem['{DAV:}getlastmodified']);
							}
							else
							{
								$mResult[$sKeyID]['changed'] = \MailSo\Base\DateTimeHelper::TryToParseSpecEtagFormat($mResult[$sKeyID]['etag']);
								$mResult[$sKeyID]['lastmodified'] = 0 < $mResult[$sKeyID]['changed'] ?
									\gmdate('c', $mResult[$sKeyID]['changed']) : '';
							}

							$mResult[$sKeyID]['changed_'] = \gmdate('c', $mResult[$sKeyID]['changed']);
						}
					}
				}
			}
		}

		return $mResult;
	}

	protected function davClientRequest(DAVClient $oClient, string $sCmd, string $sUrl, $mData = null) : ?\SnappyMail\HTTP\Response
	{
		\MailSo\Base\Utils::ResetTimeLimit();

		$this->oLogger->Write($sCmd.' '.$sUrl.(('PUT' === $sCmd || 'POST' === $sCmd) && null !== $mData ? ' ('.\strlen($mData).')' : ''),
			\MailSo\Log\Enumerations\Type::INFO, 'DAV');

//		if ('PUT' === $sCmd || 'POST' === $sCmd)
//		{
//			$this->oLogger->Write($mData, \MailSo\Log\Enumerations\Type::INFO, 'DAV');
//		}

		try
		{
			if (('PUT' === $sCmd || 'POST' === $sCmd) && null !== $mData)
			{
				return $oClient->request($sCmd, $sUrl, $mData, array(
					'Content-Type' => 'text/vcard; charset=utf-8'
				));
			}
			else
			{
				return $oClient->request($sCmd, $sUrl);
			}

//			if ('GET' === $sCmd)
//			{
//				$this->oLogger->WriteDump($aResponse, \MailSo\Log\Enumerations\Type::INFO, 'DAV');
//			}
		}
		catch (\Throwable $oException)
		{
			$this->oLogger->WriteException($oException);
		}

		return null;
	}

	private function detectionPropFind(DAVClient $oClient, string $sPath) : ?array
	{
		$aResponse = null;

		try
		{
			$this->oLogger->Write('PROPFIND '.$sPath, \MailSo\Log\Enumerations\Type::INFO, 'DAV');

			$aResponse = $oClient->propFind($sPath, array(
				'{DAV:}current-user-principal',
				'{DAV:}resourcetype',
				'{DAV:}displayname',
				'{urn:ietf:params:xml:ns:carddav}addressbook-home-set'
			), 1);

//			$this->oLogger->WriteDump($aResponse);
		}
		catch (\Throwable $oException)
		{
			$this->oLogger->WriteException($oException);
		}

		return $aResponse;
	}

	private function getContactsPaths(DAVClient $oClient, string $sUser, string $sPassword, string $sProxy = '') : array
	{
		$aContactsPaths = array();

		$sCurrentUserPrincipal = '';
		$sAddressbookHomeSet = '';

//		[{DAV:}current-user-principal] => /cloud/remote.php/carddav/principals/admin/
//		[{urn:ietf:params:xml:ns:carddav}addressbook-home-set] => /cloud/remote.php/carddav/addressbooks/admin/

		$aResponse = $this->detectionPropFind($oClient, '/.well-known/carddav');

		$sNextPath = '';
		$sFirstNextPath = '';
		if (\is_array($aResponse))
		{
			foreach ($aResponse as $sKey => $aItem)
			{
				if (empty($sAddressbookHomeSet) && !empty($aItem['{urn:ietf:params:xml:ns:carddav}addressbook-home-set']) &&
					false === \strpos($aItem['{urn:ietf:params:xml:ns:carddav}addressbook-home-set'], '/calendar-proxy'))
				{
					$sAddressbookHomeSet = $aItem['{urn:ietf:params:xml:ns:carddav}addressbook-home-set'];
					continue;
				}

				if (empty($sCurrentUserPrincipal) && !empty($aItem['{DAV:}current-user-principal']))
				{
					$sCurrentUserPrincipal = $aItem['{DAV:}current-user-principal'];
					continue;
				}

				if (!empty($sKey))
				{
					if (empty($sFirstNextPath))
					{
						$sFirstNextPath = $sKey;
					}

					if (empty($sNextPath))
					{
						if (static::hasDAVCollection($aItem))
						{
							$sNextPath = $sKey;
							continue;
						}
					}
				}
			}

			if (empty($sNextPath) && empty($sCurrentUserPrincipal) && empty($sAddressbookHomeSet) && !empty($sFirstNextPath))
			{
				$sNextPath = $sFirstNextPath;
			}
		}

		if (empty($sCurrentUserPrincipal) && empty($sAddressbookHomeSet))
		{
			if (empty($sNextPath))
			{
				return $aContactsPaths;
			}
			else
			{
				if (\preg_match('/^http[s]?:\/\//i', $sNextPath))
				{
					$oClient = $this->getDavClientFromUrl($sNextPath, $sUser, $sPassword, $sProxy);
					if ($oClient)
					{
						$sNextPath = $oClient->__UrlPath__;
					}
					else
					{
						return $aContactsPaths;
					}
				}

				$aResponse = $this->detectionPropFind($oClient, $sNextPath);
				if (\is_array($aResponse))
				{
					foreach ($aResponse as $sKey => $aItem)
					{
						if (empty($sAddressbookHomeSet) && !empty($aItem['{urn:ietf:params:xml:ns:carddav}addressbook-home-set']) &&
							false === \strpos($aItem['{urn:ietf:params:xml:ns:carddav}addressbook-home-set'], '/calendar-proxy'))
						{
							$sAddressbookHomeSet = $aItem['{urn:ietf:params:xml:ns:carddav}addressbook-home-set'];
							continue;
						}

						if (empty($sCurrentUserPrincipal) && !empty($aItem['{DAV:}current-user-principal']))
						{
							$sCurrentUserPrincipal = $aItem['{DAV:}current-user-principal'];
							continue;
						}
					}
				}
			}
		}

		if (empty($sAddressbookHomeSet))
		{
			if (empty($sCurrentUserPrincipal))
			{
				return $aContactsPaths;
			}
			else
			{
				if (\preg_match('/^http[s]?:\/\//i', $sCurrentUserPrincipal))
				{
					$oClient = $this->getDavClientFromUrl($sCurrentUserPrincipal, $sUser, $sPassword, $sProxy);
					if ($oClient)
					{
						$sCurrentUserPrincipal = $oClient->__UrlPath__;
					}
					else
					{
						return $aContactsPaths;
					}
				}

				$aResponse = $this->detectionPropFind($oClient, $sCurrentUserPrincipal);
				if (\is_array($aResponse))
				{
					foreach ($aResponse as $sKey => $aItem)
					{
						if (empty($sAddressbookHomeSet) && !empty($aItem['{urn:ietf:params:xml:ns:carddav}addressbook-home-set']) &&
							false === \strpos($aItem['{urn:ietf:params:xml:ns:carddav}addressbook-home-set'], '/calendar-proxy'))
						{
							$sAddressbookHomeSet = $aItem['{urn:ietf:params:xml:ns:carddav}addressbook-home-set'];
							continue;
						}
					}
				}
			}
		}

		if (empty($sAddressbookHomeSet))
		{
			return $aContactsPaths;
		}
		else
		{
			if (\preg_match('/^http[s]?:\/\//i', $sAddressbookHomeSet))
			{
				$oClient = $this->getDavClientFromUrl($sAddressbookHomeSet, $sUser, $sPassword, $sProxy);
				if ($oClient)
				{
					$sAddressbookHomeSet = $oClient->__UrlPath__;
				}
				else
				{
					return $aContactsPaths;
				}
			}

			$aResponse = $this->detectionPropFind($oClient, $sAddressbookHomeSet);
			if (\is_array($aResponse))
			{
				foreach ($aResponse as $sKey => $aItem)
				{
					if (!empty($sKey) && static::hasDAVCollection($aItem)
					 && \in_array('{urn:ietf:params:xml:ns:carddav}addressbook', $aItem['{DAV:}resourcetype']))
					{
						$aContactsPaths[$sKey] = isset($aItem['{DAV:}displayname']) ? \trim($aItem['{DAV:}displayname']) : '';
					}
				}
			}
		}

		return $aContactsPaths;
	}

	private function checkContactsPath(DAVClient $oClient, string $sPath) : bool
	{
		if (!$oClient)
		{
			return false;
		}

		$this->oLogger->Write('PROPFIND '.$sPath, \MailSo\Log\Enumerations\Type::INFO, 'DAV');

		$aResponse = null;
		try
		{
			$aResponse = $oClient->propFind($sPath, array(
				'{DAV:}resourcetype'
			), 1);

//			$this->oLogger->WriteDump($aResponse);
		}
		catch (\Throwable $oException)
		{
			$this->oLogger->WriteException($oException);
		}

		$bGood = false;
		if (\is_array($aResponse))
		{
			foreach ($aResponse as $sKey => $aItem)
			{
				if (!empty($sKey) && static::hasDAVCollection($aItem)
				 && \in_array('{urn:ietf:params:xml:ns:carddav}addressbook', $aItem['{DAV:}resourcetype']))
				{
					$bGood = true;
				}
			}
		}

		if ($bGood)
		{
			$oClient->__UrlPath__ = $sPath;
		}

		return $bGood;
	}

	private function getDavClientFromUrl(string $sUrl, string $sUser, string $sPassword, string $sProxy = '') : DAVClient
	{
		if (!\preg_match('/^http[s]?:\/\//i', $sUrl))
		{
			$sUrl = \preg_replace('/^fruux\.com/i', 'dav.fruux.com', $sUrl);
			$sUrl = \preg_replace('/^icloud\.com/i', 'contacts.icloud.com', $sUrl);
			$sUrl = \preg_replace('/^gmail\.com/i', 'google.com', $sUrl);
			$sUrl = 'https://'.$sUrl;
		}

		$aUrl = \parse_url($sUrl);
		if (!\is_array($aUrl))
		{
			$aUrl = array();
		}

		$aUrl['scheme'] = $aUrl['scheme'] ?? 'http';
		$aUrl['host'] = $aUrl['host'] ?? 'localhost';
		$aUrl['port'] = $aUrl['port'] ?? 0;
		$aUrl['path'] = isset($aUrl['path']) ? \rtrim($aUrl['path'], '\\/').'/' : '/';

		$aSettings = array(
			'baseUri' => $aUrl['scheme'].'://'.$aUrl['host'].($aUrl['port'] ? ':'.$aUrl['port'] : ''),
			'userName' => $sUser,
			'password' => $sPassword
		);

		$this->oLogger->AddSecret($sPassword);

		if (!empty($sProxy))
		{
			$aSettings['proxy'] = $sProxy;
		}

		$oClient = new DAVClient($aSettings);
		$oClient->setVerifyPeer(false);

		$oClient->__UrlPath__ = $aUrl['path'];

		$this->oLogger->Write('DavClient: User: '.$aSettings['userName'].', Url: '.$sUrl, \MailSo\Log\Enumerations\Type::INFO, 'DAV');

		return $oClient;
	}

	protected function getDavClient(string $sUrl, string $sUser, string $sPassword, string $sProxy = '') : ?DAVClient
	{
		$aMatch = array();
		$sUserAddressBookNameName = '';

		if (\preg_match('/\|(.+)$/', $sUrl, $aMatch) && !empty($aMatch[1]))
		{
			$sUserAddressBookNameName = \trim($aMatch[1]);
			$sUserAddressBookNameName = \MailSo\Base\Utils::StrToLowerIfAscii($sUserAddressBookNameName);

			$sUrl = \preg_replace('/\|(.+)$/', '', $sUrl);
		}

		$oClient = $this->getDavClientFromUrl($sUrl, $sUser, $sPassword, $sProxy);

		$sPath = $oClient->__UrlPath__;

		$bGood = true;
		if ('' === $sPath || '/' === $sPath || !$this->checkContactsPath($oClient, $sPath))
		{
			$sNewPath = '';

			$aPaths = $this->getContactsPaths($oClient, $sUser, $sPassword, $sProxy);
			$this->oLogger->WriteDump($aPaths);

			if (\is_array($aPaths))
			{
				if (1 < \count($aPaths))
				{
					if ('' !== $sUserAddressBookNameName)
					{
						foreach ($aPaths as $sKey => $sValue)
						{
							$sValue = \MailSo\Base\Utils::StrToLowerIfAscii(\trim($sValue));
							if ($sValue === $sUserAddressBookNameName)
							{
								$sNewPath = $sKey;
								break;
							}
						}
					}

					if (empty($sNewPath))
					{
						foreach ($aPaths as $sKey => $sValue)
						{
							$sValue = \MailSo\Base\Utils::StrToLowerIfAscii($sValue);
							if (\in_array($sValue, array('contacts', 'default', 'addressbook', 'address book')))
							{
								$sNewPath = $sKey;
								break;
							}
						}
					}
				}

				if (empty($sNewPath))
				{
					foreach ($aPaths as $sKey => $sValue)
					{
						$sNewPath = $sKey;
						break;
					}
				}
			}

			$sPath = $sNewPath;

			$bGood = $this->checkContactsPath($oClient, $sPath);
		}

		return $bGood ? $oClient : null;
	}

	private static function hasDAVCollection($aItem)
	{
		return !empty($aItem['{DAV:}resourcetype'])
			&& \is_array($aItem['{DAV:}resourcetype'])
			&& \in_array('{DAV:}collection', $aItem['{DAV:}resourcetype']);
	}

}
