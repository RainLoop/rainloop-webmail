<?php

namespace RainLoop\SabreDAV;

class AuthDigest extends \Sabre\DAV\Auth\Backend\AbstractDigest
{
	/**
	 * @var \RainLoop\Providers\PersonalAddressBook
	 */
    private $oPersonalAddressBook;

    /**
     * @param \RainLoop\Providers\PersonalAddressBook $oPersonalAddressBook
     */
    public function __construct($oPersonalAddressBook)
	{
		$this->oPersonalAddressBook = $oPersonalAddressBook;
	}

    /**
	 * @param string $sRealm
	 * @param string $sUserName
	 *
     * @return string|null
     */
    public function getDigestHash($sRealm, $sUserName)
	{
		$sHash = '';
		try
		{
			$sHash = $this->oPersonalAddressBook->GetUserHashByEmail($sUserName, true);
		}
		catch (Exception $oException) {}

//		var_dump($sHash);
//		exit();

		if (!empty($sHash))
		{
			$this->currentUser = $sUserName;
			return \md5($sUserName.':'.$sRealm.':'.$sHash);
		}

		return null;
	}
}
