<?php

class LdapContactsSuggestions implements \RainLoop\Providers\Suggestions\ISuggestions
{
	/**
	 * @var string
	 */
	private $sLdapUri = 'ldap://localhost:389';

	/**
	 * @var bool
	 */
	private $bUseStartTLS = True;

	/**
	 * @var string
	 */
	private $sBindDn = null;

	/**
	 * @var string
	 */
	private $sBindPassword = null;

	/**
	 * @var string
	 */
	private $sBaseDn = 'ou=People,dc=example,dc=com';

	/**
	 * @var string
	 */
	private $sObjectClasses = 'inetOrgPerson';

	/**
	 * @var string
	 */
	private $sUidAttributes = 'uid';

	/**
	 * @var string
	 */
	private $sNameAttributes = 'displayName,cn,givenName,sn';

	/**
	 * @var string
	 */
	private $sEmailAttributes = 'mailAddress,mail,mailAlternateAddress,mailAlias';

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	/**
	 * @var string
	 */
	private $sAllowedEmails = '*';

	/**
	 * @param string $sLdapUri
	 * @param bool $bUseStartTLS
	 * @param string $sBindDn
	 * @param string $sBindPassword
	 * @param string $sBaseDn
	 * @param string $sObjectClasses
	 * @param string $sNameAttributes
	 * @param string $sEmailAttributes
	 * @param string $sUidAttributes
	 * @param string $sAllowedEmails
	 *
	 * @return \LdapContactsSuggestions
	 */
	public function SetConfig($sLdapUri, $bUseStartTLS, $sBindDn, $sBindPassword, $sBaseDn, $sObjectClasses, $sUidAttributes, $sNameAttributes, $sEmailAttributes, $sAllowedEmails)
	{
		$this->sLdapUri = $sLdapUri;
		$this->bUseStartTLS = $bUseStartTLS;
		if (0 < \strlen($sBindDn))
		{
			$this->sBindDn = $sBindDn;
			$this->sBindPassword = $sBindPassword;
		}
		$this->sBaseDn = $sBaseDn;
		$this->sObjectClasses = $sObjectClasses;
		$this->sUidAttributes = $sUidAttributes;
		$this->sNameAttributes = $sNameAttributes;
		$this->sEmailAttributes = $sEmailAttributes;
		$this->sAllowedEmails = $sAllowedEmails;

		return $this;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sQuery
	 * @param int $iLimit = 20
	 *
	 * @return array
	 */
	public function Process(RainLoop\Model\Account $oAccount, string $sQuery, int $iLimit = 20): array
	{
		$sQuery = \trim($sQuery);

		if (2 > \strlen($sQuery))
		{
			return array();
		}
		else if (!$oAccount || !\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $this->sAllowedEmails))
		{
			return array();
		}

		$aResult = $this->ldapSearch($oAccount, $sQuery);

		$aResult = \RainLoop\Utils::RemoveSuggestionDuplicates($aResult);
		if ($iLimit < \count($aResult))
		{
			$aResult = \array_slice($aResult, 0, $iLimit);
		}

		return $aResult;
	}

	/**
	 * @param array $aLdapItem
	 * @param array $aEmailAttributes
	 * @param array $aNameAttributes
	 * @param array $aUidAttributes
	 *
	 * @return array
	 */
	private function findNameAndEmail($aLdapItem, $aEmailAttributes, $aNameAttributes, $aUidAttributes)
	{
		$sEmail = $sName = $sUid = '';
		if ($aLdapItem)
		{
			foreach ($aEmailAttributes as $sField)
			{
				$sField = \strtolower($sField);
				if (!empty($aLdapItem[$sField][0]))
				{
					$sEmail = \trim($aLdapItem[$sField][0]);
					if (!empty($sEmail))
					{
						break;
					}
				}
			}

			foreach ($aNameAttributes as $sField)
			{
				$sField = \strtolower($sField);
				if (!empty($aLdapItem[$sField][0]))
				{
					$sName = \trim($aLdapItem[$sField][0]);
					if (!empty($sName))
					{
						break;
					}
				}
			}

			foreach ($aUidAttributes as $sField)
			{
				$sField = \strtolower($sField);
				if (!empty($aLdapItem[$sField][0]))
				{
					$sUid = \trim($aLdapItem[$sField][0]);
					if (!empty($sUid))
					{
						break;
					}
				}
			}
		}

		return array($sEmail, $sName, $sUid);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sQuery
	 *
	 * @return array
	 */
	private function ldapSearch($oAccount, $sQuery)
	{
		$sSearchEscaped = $this->escape($sQuery);

		$aResult = array();
		$oCon = @\ldap_connect($this->sLdapUri);
		if ($oCon)
		{
			$this->oLogger->Write('ldap_connect: connected', \MailSo\Log\Enumerations\Type::INFO, 'LDAP');

			@\ldap_set_option($oCon, LDAP_OPT_PROTOCOL_VERSION, 3);

			if ($this->bUseStartTLS && !@\ldap_start_tls($oCon))
			{
				$this->logLdapError($oCon, 'ldap_start_tls');
				return $aResult;
			}

			if (!@\ldap_bind($oCon, $this->sBindDn, $this->sBindPassword))
			{
				if (is_null($this->sBindDn))
				{
					$this->logLdapError($oCon, 'ldap_bind (anonymous)');
				}
				else
				{
					$this->logLdapError($oCon, 'ldap_bind');
				}

				return $aResult;
			}

			$sDomain = \MailSo\Base\Utils::GetDomainFromEmail($oAccount->Email());
			$sBaseDn = \strtr($this->sBaseDn, array(
				'{domain}' => $sDomain,
				'{domain:dc}' => 'dc='.\strtr($sDomain, array('.' => ',dc=')),
				'{email}' => $oAccount->Email(),
				'{email:user}' => \MailSo\Base\Utils::GetAccountNameFromEmail($oAccount->Email()),
				'{email:domain}' => $sDomain,
				'{login}' => $oAccount->Login(),
				'{imap:login}' => $oAccount->Login(),
				'{imap:host}' => $oAccount->DomainIncHost(),
				'{imap:port}' => $oAccount->DomainIncPort()
			));

			$aObjectClasses = empty($this->sObjectClasses) ? array() : \explode(',', $this->sObjectClasses);
			$aEmails = empty($this->sEmailAttributes) ? array() : \explode(',', $this->sEmailAttributes);
			$aNames = empty($this->sNameAttributes) ? array() : \explode(',', $this->sNameAttributes);
			$aUIDs = empty($this->sUidAttributes) ? array() : \explode(',', $this->sUidAttributes);

			$aObjectClasses = \array_map('trim', $aObjectClasses);
			$aEmails = \array_map('trim', $aEmails);
			$aNames = \array_map('trim', $aNames);
			$aUIDs = \array_map('trim', $aUIDs);

			$aFields = \array_merge($aEmails, $aNames, $aUIDs);

			$iObjCount = 0;
			$sObjFilter = '';
			foreach ($aObjectClasses as $sItem)
			{
				if (!empty($sItem))
				{
					$iObjCount++;
					$sObjFilter .= '(objectClass='.$sItem.')';
				}
			}


			$aItems = array();
			$sSubFilter = '';
			foreach ($aFields as $sItem)
			{
				if (!empty($sItem))
				{
					$aItems[] = $sItem;
					$sSubFilter .= '('.$sItem.'=*'.$sSearchEscaped.'*)';
				}
			}

			$sFilter = '(&';
			$sFilter .= (1 < $iObjCount ? '(|' : '').$sObjFilter.(1 < $iObjCount ? ')' : '');
			$sFilter .= (1 < count($aItems) ? '(|' : '').$sSubFilter.(1 < count($aItems) ? ')' : '');
			$sFilter .= ')';

			$this->oLogger->Write('ldap_search: start: '.$sBaseDn.' / '.$sFilter, \MailSo\Log\Enumerations\Type::INFO, 'LDAP');
			$oS = @\ldap_search($oCon, $sBaseDn, $sFilter, $aItems, 0, 30, 30);
			if ($oS)
			{
				$aEntries = @\ldap_get_entries($oCon, $oS);
				if (is_array($aEntries))
				{
					if (isset($aEntries['count']))
					{
						unset($aEntries['count']);
					}

					foreach ($aEntries as $aItem)
					{
						if ($aItem)
						{
							$sName = $sEmail = '';
							list ($sEmail, $sName) = $this->findNameAndEmail($aItem, $aEmails, $aNames, $aUIDs);
							if (!empty($sEmail))
							{
								$aResult[] = array($sEmail, $sName);
							}
						}
					}
				}
				else
				{
					$this->logLdapError($oCon, 'ldap_get_entries');
				}
			}
			else
			{
				$this->logLdapError($oCon, 'ldap_search');
			}
		}
		else
		{
			return $aResult;
		}

		return $aResult;
	}

	/**
	 * @param string $sStr
	 *
	 * @return string
	 */
	public function escape($sStr)
	{
		$aNewChars = array();
		$aChars = array('\\', '*', '(', ')', \chr(0));

		foreach ($aChars as $iIndex => $sValue)
		{
			$aNewChars[$iIndex] = '\\'.\str_pad(\dechex(\ord($sValue)), 2, '0');
		}

		return \str_replace($aChars, $aNewChars, $sStr);
	}

	/**
	 * @param mixed $oCon
	 * @param string $sCmd
	 *
	 * @return string
	 */
	public function logLdapError($oCon, $sCmd)
	{
		if ($this->oLogger)
		{
			$sError = $oCon ? @\ldap_error($oCon) : '';
			$iErrno = $oCon ? @\ldap_errno($oCon) : 0;

			$this->oLogger->Write($sCmd.' error: '.$sError.' ('.$iErrno.')',
				\MailSo\Log\Enumerations\Type::WARNING, 'LDAP');
		}
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \LdapContactsSuggestions
	 */
	public function SetLogger($oLogger)
	{
		if ($oLogger instanceof \MailSo\Log\Logger)
		{
			$this->oLogger = $oLogger;
		}

		return $this;
	}
}
