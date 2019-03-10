<?php

class RestChangePasswordDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
{
    /**
     * @var string
     */
    private $sUrl = '';

    /**
     * @var string
     */
    private $sKey = '';

    /**
     * @var string
     */
    private $sFieldEmail = '';

    /**
     * @var string
     */
    private $sFieldOldpassword = '';

    /**
     * @var string
     */
    private $sFieldNewpassword = '';

    /**
     * @var string
     */
    private $sAllowedEmails = '';

    /**
     * @var \MailSo\Log\Logger
     */
    private $oLogger = null;

    /**
     * @param string $sHost
     * @param int $iPort
     *
     * @return \RestChangePasswordDriver
     */
    public function SetConfig($sUrl, $sKey)
    {
        $this->sUrl = $sUrl;
        $this->sKey = $sKey;

        return $this;
    }

    $oProvider->SetFieldNames($sFieldEmail, $sFieldOldpassword, $sFieldNewpassword);

    /**
     * @param string $sFieldEmail
     * @param string $sFieldOldpassword
     * @param string $sFieldNewpassword
     *
     * @return \RestChangePasswordDriver
     */
    public function SetFieldNames($sFieldEmail, $sFieldOldpassword, $sFieldNewpassword)
    {
        $this->sFieldEmail       = $sFieldEmail;
        $this->sFieldOldpassword = $sFieldOldpassword;
        $this->sFieldNewpassword = $sFieldNewpassword;
        return $this;
    }

    /**
     * @param string $sAllowedEmails
     *
     * @return \RestChangePasswordDriver
     */
    public function SetAllowedEmails($sAllowedEmails)
    {
        $this->sAllowedEmails = $sAllowedEmails;
        return $this;
    }

    /**
     * @param \MailSo\Log\Logger $oLogger
     *
     * @return \RestChangePasswordDriver
     */
    public function SetLogger($oLogger)
    {
        if ($oLogger instanceof \MailSo\Log\Logger)
        {
            $this->oLogger = $oLogger;
        }

        return $this;
    }

    /**
     * @param \RainLoop\Account $oAccount
     *
     * @return bool
     */
    public function PasswordChangePossibility($oAccount)
    {
        return $oAccount && $oAccount->Email() &&
            \RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $this->sAllowedEmails);
    }

    /**
     * @param \RainLoop\Account $oAccount
     * @param string $sPrevPassword
     * @param string $sNewPassword
     *
     * @return bool
     */
    public function ChangePassword(\RainLoop\Account $oAccount, $sPrevPassword, $sNewPassword)
    {
        if ($this->oLogger)
        {
            $this->oLogger->Write('Rest: Try to change password for '.$oAccount->Email());
        }

        $bResult = false;
        if (!empty($this->sHost) && 0 < $this->iPort && $oAccount)
        {
            $sEmail = \trim(\strtolower($oAccount->Email()));

            # Adding  the REST Api key to the url, try to use always https
            $sUrl = str_replace('://', '://'+$this->sKey+"@", $this->sUrl);

            $iCode = 0;
            $oHttp = \MailSo\Base\Http::SingletonInstance();

            if ($this->oLogger)
            {
                $this->oLogger->Write('Rest[Api Request]:'.$sUrl);
            }

            $mResult = $oHttp->SendPostRequest($sUrl,
                array(
                    $this->sFieldEmail => $sEmail,
                    $this->sFieldOldpassword => $sPrevPassword,
                    $this->sFieldNewpassword => $sNewPassword,
                ), 'MailSo Http User Agent (v1)', $iCode, $this->oLogger);

            if (false !== $mResult && 200 === $iCode)
            {
                $aRes = null;
                @\parse_str($mResult, $aRes);
                if (is_array($aRes) && (!isset($aRes['error']) || (int) $aRes['error'] !== 1))
                {
                    $bResult = true;
                }
                else
                {
                    if ($this->oLogger)
                    {
                        $this->oLogger->Write('Rest[Error]: Response: '.$mResult);
                    }
                }
            }
            else
            {
                if ($this->oLogger)
                {
                    $this->oLogger->Write('Rest[Error]: Empty Response: Code:'.$iCode);
                }
            }
        }

        return $bResult;
    }
}
