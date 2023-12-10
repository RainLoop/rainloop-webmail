<?php

class SmtpUseFromAdrAccountPlugin extends \RainLoop\Plugins\AbstractPlugin
{

	const
		NAME = 'Use From-Address-Account for smtp',
		VERSION = '1.0',
		RELEASE = '2023-12-06',
		REQUIRED = '2.23.0',
		CATEGORY = 'Filters',
		DESCRIPTION = 'Set smpt-config and -credentials based on selected from-address-account';

	public $aFromAccount = array();

	public function Init() : void
	{
		$this->addHook('filter.smtp-from', 'FilterDetectFrom');
		$this->addHook('smtp.before-connect', 'FilterSmtpConnect');
		$this->addHook('smtp.before-login', 'FilterSmtpCredentials');
	}

	/**
	 * \RainLoop\Model\Account $oAccount
	 * \MailSo\Mime\Message $oMessage
	 * string &$sFrom
	 */
	public function FilterDetectFrom(\RainLoop\Model\Account $oAccount, \MailSo\Mime\Message $oMessage, string &$sFrom)
	{
		$sWhiteList = \trim($this->Config()->Get('plugin', 'from_adress_pattern', ''));
		$sFoundValue = '';
		if (\strlen($sWhiteList) && \RainLoop\Plugins\Helper::ValidateWildcardValues($sFrom, $sWhiteList, $sFoundValue) && $sFrom != $oAccount->Email()) {
			\SnappyMail\LOG::info(get_class($this) ,'From address different from account recognized: '. $oAccount->Email().' -> '.$sFrom . '(~ '.$sFoundValue.')');
			$oMainAccount;
                        $oFromAccount;
			if ( $oAccount instanceof \RainLoop\Model\MainAccount ) {
				$oMainAccount=$oAccount;
			} else {
				$oMainAccount=$this->Manager()->Actions()->getMainAccountFromToken();
				if ($oMainAccount->Email() == $sFrom) {
					$this->aFromAccount[$oAccount->Email()]=$oMainAccount;
					return;
				}
			}
			$aAccounts=$this->Manager()->Actions()->getAccounts($oMainAccount);
                        foreach ($aAccounts as &$value) {
                                $oValue=\RainLoop\Model\AdditionalAccount::NewInstanceFromTokenArray($this->Manager()->Actions(), $value);
                                if ($oValue->Email()==$sFrom) {
                                        $oFromAccount = $oValue;
                                        break;
                                }
                        }
                        if (is_null($oFromAccount)){
				\SnappyMail\LOG::info(get_class($this),'No Account found for '. $sFrom);
				if ($this->Config()->Get('plugin', 'throw_notfound_exception', true)) {
					throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AccountDoesNotExist);
				}
                                return;
                        }
			$this->aFromAccount[$oAccount->Email()]=$oFromAccount;
		}
	}
	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param \MailSo\Smtp\SmtpClient $oSmtpClient
	 * @param \MailSo\Smtp\Settings $oSettings
	 */
	public function FilterSmtpConnect(\RainLoop\Model\Account $oAccount, \MailSo\Smtp\SmtpClient $oSmtpClient, \MailSo\Smtp\Settings $oSettings)
	{
		if ( isset($this->aFromAccount[$oAccount->Email()]) ) {
			$oFromAccount = $this->aFromAccount[$oAccount->Email()];
			$oSettings->host = $oFromAccount->Domain()->OutHost();
			$oSettings->port = (int) $oFromAccount->Domain()->OutPort();
			$oSettings->type =  $oFromAccount->Domain()-> SmtpSettings()->type;
			\SnappyMail\LOG::info(get_class($this),'Smtp config rewrite: '. $oFromAccount->Domain()->OutHost());
		}
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param \MailSo\Smtp\SmtpClient $oSmtpClient
	 * @param \MailSo\Smtp\Settings $oSettings
	 */
	public function FilterSmtpCredentials(\RainLoop\Model\Account $oAccount, \MailSo\Smtp\SmtpClient $oSmtpClient, \MailSo\Smtp\Settings $oSettings)
	{
		if ( isset($this->aFromAccount[$oAccount->Email()]) ) {
			$oFromAccount = $this->aFromAccount[$oAccount->Email()];
			unset($this->aFromAccount[$oAccount->Email()]);
            		$oSettings->Login =  $oFromAccount-> OutLogin();
            		$oSettings->useAuth =  $oFromAccount->Domain()-> SmtpSettings()->useAuth;
            		$oSettings->Password =  $oFromAccount->IncPassword();
			\SnappyMail\LOG::info(get_class($this),'user/pwd rewrite: '. $oFromAccount->Email());
		}
	}

	/**
	 * @return array
	 */
	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('from_adress_pattern')->SetLabel('From-Address pattern')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('space as delimiter, wildcard supported.')
				->SetDefaultValue('user@example.com *@example2.com'),
			\RainLoop\Plugins\Property::NewInstance('throw_notfound_exception')->SetLabel('Throw Exception, if from-adr is not found as account')
                                ->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
                                ->SetDescription('it is not possible to send eMails in this case, regardless of whether the smtp-server would do it')
                                ->SetDefaultValue(true),

		);
	}

}
