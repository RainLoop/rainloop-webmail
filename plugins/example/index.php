<?php

use RainLoop\Model\Account;
use MailSo\Imap\ImapClient;
use MailSo\Imap\Settings as ImapSettings;
use MailSo\Sieve\SieveClient;
use MailSo\Sieve\Settings as SieveSettings;
use MailSo\Smtp\SmtpClient;
use MailSo\Smtp\Settings as SmtpSettings;
use MailSo\Mime\Message as MimeMessage;

class ExamplePlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Example',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '0.0',
		RELEASE  = '2022-03-29',
		REQUIRED = '2.14.0',
		CATEGORY = 'General',
		LICENSE  = 'MIT',
		DESCRIPTION = '';

	public function Init() : void
	{
		$this->addHook('main.fabrica', 'MainFabrica');
/*
		$this->addCss(string $sFile, bool $bAdminScope = false);
		$this->addJs(string $sFile, bool $bAdminScope = false);
		$this->addHook(string $sHookName, string $sFunctionName);

		$this->addJsonHook(string $sActionName, string $sFunctionName);
			$this->aAdditionalJson['DoPlugin'.$sActionName] = $mCallback;
			To have your own callback on a json URI, like '/?/Json/&q[]=/0/Example'

		$this->addPartHook(string $sActionName, string $sFunctionName);
			To use your own service URI, like '/example'

		$this->addTemplate(string $sFile, bool $bAdminScope = false);
		$this->addTemplateHook(string $sName, string $sPlace, string $sLocalTemplateName, bool $bPrepend = false);
*/

/*
		$this->addHook("json.before-{actionname}",          "jsonBefore{actionname}");
		$this->addHook("json.after-{actionname}",           "jsonAfter{actionname}");

		$this->addHook('login.credentials.step-1',          'loginCredentialsStep1');
		$this->addHook('login.credentials.step-2',          'loginCredentialsStep2');
		$this->addHook('login.credentials',                 'loginCredentials');
		$this->addHook('login.success',                     'loginSuccess');
		$this->addHook('imap.before-connect',               'imapBeforeConnect');
		$this->addHook('imap.after-connect',                'imapAfterConnect');
		$this->addHook('imap.before-login',                 'imapBeforeLogin');
		$this->addHook('imap.after-login',                  'imapAfterLogin');
		$this->addHook('imap.message-headers',              'imapMessageHeaders');
		$this->addHook('sieve.before-connect',              'sieveBeforeConnect');
		$this->addHook('sieve.after-connect',               'sieveAfterConnect');
		$this->addHook('sieve.before-login',                'sieveBeforeLogin');
		$this->addHook('sieve.after-login',                 'sieveAfterLogin');
		$this->addHook('smtp.before-connect',               'smtpBeforeConnect');
		$this->addHook('smtp.after-connect',                'smtpAfterConnect');
		$this->addHook('smtp.before-login',                 'smtpBeforeLogin');
		$this->addHook('smtp.after-login',                  'smtpAfterLogin');
		$this->addHook('filter.account',                    'filterAccount');
		$this->addHook('filter.action-params',              'filterActionParams');
		$this->addHook('filter.app-data',                   'filterAppData');
		$this->addHook('filter.application-config',         'filterApplicationConfig');
		$this->addHook('filter.build-message',              'filterBuildMessage');
		$this->addHook('filter.build-read-receipt-message', 'filterBuildReadReceiptMessage');
		$this->addHook('filter.domain',                     'filterDomain');
		$this->addHook('filter.fabrica',                    'filterFabrica');
		$this->addHook('filter.http-paths',                 'filterHttpPaths');
		$this->addHook('filter.language',                   'filterLanguage');
		$this->addHook('filter.message-html',               'filterMessageHtml');
		$this->addHook('filter.message-plain',              'filterMessagePlain');
		$this->addHook('filter.message-rcpt',               'filterMessageRcpt');
		$this->addHook('filter.read-receipt-message-plain', 'filterReadReceiptMessagePlain');
		$this->addHook('filter.result-message',             'filterResultMessage');
		$this->addHook('filter.save-message',               'filterSaveMessage');
		$this->addHook('filter.send-message',               'filterSendMessage');
		$this->addHook('filter.send-message-stream',        'filterSendMessageStream');
		$this->addHook('filter.send-read-receipt-message',  'filterSendReadReceiptMessage');
		$this->addHook('filter.smtp-from',                  'filterSmtpFrom');
		$this->addHook('filter.smtp-hidden-rcpt',           'filterSmtpHiddenRcpt');
		$this->addHook('filter.smtp-message-stream',        'filterSmtpMessageStream');
		$this->addHook('filter.upload-response',            'filterUploadResponse');
		$this->addHook('json.attachments',                  'jsonAttachments');
		$this->addHook('json.suggestions-input-parameters', 'jsonSuggestionsInputParameters');
		$this->addHook('main.content-security-policy',      'mainContentSecurityPolicy');
		$this->addHook('main.fabrica',                      'mainFabrica');
		$this->addHook('service.app-delay-start-begin',     'serviceAppDelayStartBegin');
		$this->addHook('service.app-delay-start-end',       'serviceAppDelayStartEnd');
*/

		$this->UseLangs(true); // start use langs folder

		$this->addJs('example.js'); // add js file
		$this->addJs('example.js', true); // add js file

		// User Settings tab
		$this->addJs('js/ExampleUserSettings.js'); // add js file
		$this->addJsonHook('JsonGetExampleUserData', 'JsonGetExampleUserData');
		$this->addJsonHook('JsonSaveExampleUserData', 'JsonSaveExampleUserData');
		$this->addTemplate('templates/ExampleUserSettingsTab.html');

		// Admin Settings tab
		$this->addJs('js/ExampleAdminSettings.js', true); // add js file
		$this->addJsonHook('JsonAdminGetData', 'JsonAdminGetData', true);
		$this->addTemplate('templates/ExampleAdminSettingsTab.html', true);
	}

	/**
	 * @param mixed $mResult
	 */
	public function MainFabrica(string $sName, &$mResult)
	{
		switch ($sName) {
			case 'files':
			case 'storage':
			case 'storage-local':
			case 'settings':
			case 'settings-local':
			case 'login':
			case 'domain':
			case 'filters':
			case 'address-book':
			case 'identities':
				break;

			case 'suggestions':
				if (!\is_array($mResult)) {
					$mResult = array();
				}
				require_once __DIR__ . '/ContactsSuggestions.php';
				$mResult[] = new \Plugins\Example\ContactSuggestions();
				break;
		}
	}

	public function JsonAdminGetData()
	{
		if (!($this->Manager()->Actions() instanceof \RainLoop\ActionsAdmin)
		 || !$this->Manager()->Actions()->IsAdminLoggined()
		) {
			return $this->jsonResponse(__FUNCTION__, false);
		}
		return $this->jsonResponse(__FUNCTION__, array(
			'PHP' => \phpversion()
		));
	}

	/**
	 * @param string $sEmail
	 * @param string $sLogin
	 * @param string $sPassword
	 *
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function FilterLoginCredentials(&$sEmail, &$sLogin, &$sPassword)
	{
		// Your custom php logic
		// You may change login credentials
		if ('demo@snappymail.eu' === $sEmail)
		{
			$sEmail = 'user@snappymail.eu';
			$sLogin = 'user@snappymail.eu';
			$sPassword = 'super-duper-password';
		}
		else
		{
			// or throw auth exeption
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
			// or
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AccountNotAllowed);
			// or
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DomainNotAllowed);
		}
	}

	/**
	 * @return array
	 */
	public function JsonGetExampleUserData()
	{
		$aSettings = $this->getUserSettings();

		$sUserFacebook = isset($aSettings['UserFacebook']) ? $aSettings['UserFacebook'] : '';
		$sUserSkype = isset($aSettings['UserSkype']) ? $aSettings['UserSkype'] : '';

		// or get user's data from your custom storage ( DB / LDAP / ... ).

		\sleep(1);
		return $this->jsonResponse(__FUNCTION__, array(
			'UserFacebook' => $sUserFacebook,
			'UserSkype' => $sUserSkype
		));
	}

	/**
	 * @return array
	 */
	public function JsonSaveExampleUserData()
	{
		$sUserFacebook = $this->jsonParam('UserFacebook');
		$sUserSkype = $this->jsonParam('UserSkype');

		// or put user's data to your custom storage ( DB / LDAP / ... ).

		\sleep(1);
		return $this->jsonResponse(__FUNCTION__, $this->saveUserSettings(array(
			'UserFacebook' => $sUserFacebook,
			'UserSkype' => $sUserSkype
		)));
	}

/*
	public function jsonBefore{actionname}(){};
	public function jsonAfter{actionname}(array &$aResponse){};

	public function loginCredentialsStep1(string &$sEmail)
	{
	}

	public function loginCredentialsStep2(string &$sEmail, string &$sPassword)
	{
	}

	public function loginCredentials(string &$sEmail, string &$sLogin, string &$sPassword)
	{
	}

	public function loginSuccess(\RainLoop\Model\MainAccount $oAccount)
	{
	}

	public function imapBeforeConnect(Account $oAccount, ImapClient $oImapClient, ImapSettings $oSettings)
	{
	}

	public function imapAfterConnect(Account $oAccount, ImapClient $oImapClient, ImapSettings $oSettings)
	{
	}

	public function imapBeforeLogin(Account $oAccount, ImapClient $oImapClient, ImapSettings $oSettings)
	{
	}

	public function imapAfterLogin(Account $oAccount, ImapClient $oImapClient, bool $bSuccess, ImapSettings $oSettings)
	{
	}

	public function imapMessageHeaders(array &$aHeaders)
	{
	}

	public function sieveBeforeConnect(Account $oAccount, SieveClient $oSieveClient, SieveSettings $oSettings)
	{
	}

	public function sieveAfterConnect(Account $oAccount, SieveClient $oSieveClient, SieveSettings $oSettings)
	{
	}

	public function sieveBeforeLogin(Account $oAccount, SieveClient $oSieveClient, SieveSettings $oSettings)
	{
	}

	public function sieveAfterLogin(Account $oAccount, SieveClient $oSieveClient, bool $bSuccess, SieveSettings $oSettings)
	{
	}

	public function smtpBeforeConnect(Account $oAccount, SmtpClient $oSmtpClient, SmtpSettings $oSettings)
	{
	}

	public function smtpAfterConnect(Account $oAccount, SmtpClient $oSmtpClient, SmtpSettings $oSettings)
	{
	}

	public function smtpBeforeLogin(Account $oAccount, SmtpClient $oSmtpClient, SmtpSettings $oSettings)
	{
	}

	public function smtpAfterLogin(Account $oAccount, SmtpClient $oSmtpClient, bool $bSuccess, SmtpSettings $oSettings)
	{
	}

	public function filterAccount(Account $oAccount)
	{
	}

	public function filterActionParams(string $sMethodName, array &$aCurrentActionParams)
	{
	}

	public function filterAppData(bool $bAdmin, array &$aAppData)
	{
	}

	public function filterApplicationConfig(\RainLoop\Config\Application $oConfig)
	{
	}

	public function filterBuildMessage(MimeMessage $oMessage)
	{
	}

	public function filterBuildReadReceiptMessage(MimeMessage $oMessage, Account $oAccount)
	{
	}

	public function filterDomain(\RainLoop\Model\Domain $oDomain)
	{
	}

	public function filterFabrica(string $sName, mixed &$mResult, Account $oAccount)
	{
	}

	public function filterHttpPaths(array &$aPaths)
	{
	}

	public function filterLanguage(string &$sLanguage, bool $bAdmin)
	{
	}

	public function filterMessageHtml(Account $oAccount, MimeMessage $oMessage, string &$sTextConverted)
	{
	}

	public function filterMessagePlain(Account $oAccount, MimeMessage $oMessage, string &$sTextConverted)
	{
	}

	public function filterMessageRcpt(Account $oAccount, \MailSo\Mime\EmailCollection $oRcpt)
	{
	}

	public function filterReadReceiptMessagePlain(Account $oAccount, MimeMessage $oMessage, string &$sText)
	{
	}

	public function filterResultMessage(MimeMessage $oMessage)
	{
	}

	public function filterSaveMessage(MimeMessage $oMessage)
	{
	}

	public function filterSendMessage(MimeMessage $oMessage)
	{
	}

	public function filterSendMessageStream(Account $oAccount, resource &$rMessageStream, int &$iMessageStreamSize)
	{
	}

	public function filterSendReadReceiptMessage(MimeMessage $oMessage, Account $oAccount)
	{
	}

	public function filterSmtpFrom(Account $oAccount, MimeMessage $oMessage, string &$sFrom)
	{
	}

	public function filterSmtpHiddenRcpt(Account $oAccount, MimeMessage $oMessage, array &$aHiddenRcpt)
	{
	}

	public function filterSmtpMessageStream(Account $oAccount, resource &$rMessageStream, int &$iMessageStreamSize)
	{
	}

	public function filterUploadResponse(array &$aResponse)
	{
	}

	public function jsonAttachments(\SnappyMail\AttachmentsAction $oData)
	{
	}

	public function jsonSuggestionsInputParameters(string &$sQuery, int &$iLimit, Account $oAccount)
	{
	}

	public function mainContentSecurityPolicy(\SnappyMail\HTTP\CSP $oCSP)
	{
	}

	public function mainFabrica(string $sName, mixed &$mResult)
	{
	}

	public function serviceAppDelayStartBegin()
	{
	}

	public function serviceAppDelayStartEnd()
	{
	}

	public function Config() : \RainLoop\Config\Plugin
	public function Description() : string
	public function FilterAppDataPluginSection(bool $bAdmin, bool $bAuth, array &$aConfig) : void
	public function Hash() : string
	public function Manager() : \RainLoop\Plugins\Manager
	public function Name() : string
	public function Path() : string
	public function SetName(string $sName) : self
	public function SetPath(string $sPath) : self
	public function SetPluginConfig(\RainLoop\Config\Plugin $oPluginConfig) : self
	public function SetPluginManager(\RainLoop\Plugins\Manager $oPluginManager) : self
	public function SetVersion(string $sVersion) : self
	public function Supported() : string
	public function UseLangs(?bool $bLangs = null) : bool
	public function getUserSettings() : array
	public function jsonParam(string $sKey, $mDefault = null)
	public function saveUserSettings(array $aSettings) : bool

	protected function configMapping() : array
	protected function jsonResponse(string $sFunctionName, $mData)

	$this->Manager()
	$this->Manager()->Actions()
	$this->Manager()->CreatePluginByName(string $sName) : ?\RainLoop\Plugins\AbstractPlugin
	$this->Manager()->InstalledPlugins() : array
	$this->Manager()->convertPluginFolderNameToClassName(string $sFolderName) : string
	$this->Manager()->loadPluginByName(string $sName) : ?string
	$this->Manager()->Actions() : \RainLoop\Actions
	$this->Manager()->Hash() : string
	$this->Manager()->HaveJs(bool $bAdminScope = false) : bool
	$this->Manager()->CompileCss(bool $bAdminScope = false) : string
	$this->Manager()->CompileJs(bool $bAdminScope = false) : string
	$this->Manager()->CompileTemplate(array &$aList, bool $bAdminScope = false) : void
	$this->Manager()->InitAppData(bool $bAdmin, array &$aAppData, ?Account $oAccount = null) : self
	$this->Manager()->AddHook(string $sHookName, $mCallbak) : self
	$this->Manager()->AddCss(string $sFile, bool $bAdminScope = false) : self
	$this->Manager()->AddJs(string $sFile, bool $bAdminScope = false) : self
	$this->Manager()->AddTemplate(string $sFile, bool $bAdminScope = false) : self
	$this->Manager()->RunHook(string $sHookName, array $aArg = array(), bool $bLogHook = true) : self
	$this->Manager()->AddAdditionalPartAction(string $sActionName, $mCallbak) : self
	$this->Manager()->RunAdditionalPart(string $sActionName, array $aParts = array()) : bool
	$this->Manager()->AddProcessTemplateAction(string $sName, string $sPlace, string $sHtml, bool $bPrepend = false) : self
	$this->Manager()->AddAdditionalJsonAction(string $sActionName, $mCallback) : self
	$this->Manager()->HasAdditionalJson(string $sActionName) : bool
	$this->Manager()->RunAdditionalJson(string $sActionName)
	$this->Manager()->JsonResponseHelper(string $sFunctionName, $mData) : array
	$this->Manager()->GetUserPluginSettings(string $sPluginName) : array
	$this->Manager()->SaveUserPluginSettings(string $sPluginName, array $aSettings) : bool
	$this->Manager()->ReadLang(string $sLang, array &$aLang) : self
	$this->Manager()->IsEnabled() : bool
	$this->Manager()->Count() : int
	$this->Manager()->SetLogger(\MailSo\Log\Logger $oLogger) : self
	$this->Manager()->WriteLog(string $sDesc, int $iType = \LOG_INFO) : void
	$this->Manager()->WriteException(string $sDesc, int $iType = \LOG_INFO) : void
*/
}
