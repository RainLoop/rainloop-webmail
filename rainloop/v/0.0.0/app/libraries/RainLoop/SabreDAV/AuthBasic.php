<?php

namespace RainLoop\SabreDAV;

class AuthBasic extends \Sabre\DAV\Auth\Backend\AbstractBasic
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
	 * @param string $sUserName
	 * @param string $sPassword
	 *
     * @return bool
     */
    protected function validateUserPass($sUserName, $sPassword)
	{
		$sHash = '';
		try
		{
			$sHash = $this->oPersonalAddressBook->GetUserHashByEmail($sUserName, true);
		}
		catch (Exception $oException) {}

//		var_dump($sHash);
//		exit();

		if (!empty($sHash) && $sPassword === $sHash)
		{
			$this->currentUser = $sUserName;
			return true;
		}

		return false;
	}
}
