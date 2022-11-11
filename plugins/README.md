PHP
```php
class Plugin extends \RainLoop\Plugins\AbstractPlugin
{
	public function __construct();

	/** Returns static::NAME */
	public function Name(): string;

	/** Returns /README file contents or static::DESCRIPTION */
	public function Description(): string;

	/** When $bLangs is boolean it sets the value, else returns current value */
	public function UseLangs(?bool $bLangs = null): bool;

	/** When true the result is empty string, else the error message */
	public function Supported(): string;

	/** Initialize settings */
	public function Init(): void;

	public function FilterAppDataPluginSection(bool $bAdmin, bool $bAuth, array &$aConfig): void;

	/** Returns array of all plugin Property options for use in Admin -> Extensions -> Plugin cog wheel */
	protected function configMapping(): array;

	/** With this function you hook to an event
	 * $sHookName see chapter "Hooks" below for available names
	 * $sFunctionName the name of a function in this class
	 */
	final protected function addHook(string $sHookName, string $sFunctionName): self;

	final protected function addCss(string $sFile, bool $bAdminScope = false): self;

	final protected function addJs(string $sFile, bool $bAdminScope = false): self;

	final protected function addTemplate(string $sFile, bool $bAdminScope = false): self;

	final protected function addJsonHook(string $sActionName, string $sFunctionName): self;

	/**
	 * You may register your own service actions.
	 * Url is like /?{actionname}/etc.
	 * Predefined actions of \RainLoop\ServiceActions that can't be registered are:
	 * - admin
	 * - AdminAppData
	 * - AppData
	 * - Append
	 * - Backup
	 * - BadBrowser
	 * - CspReport
	 * - Css
	 * - Json
	 * - Lang
	 * - Mailto
	 * - NoCookie
	 * - NoScript
	 * - Ping
	 * - Plugins
	 * - ProxyExternal
	 * - Raw
	 * - Sso
	 * - Upload
	 * - UploadBackground
	 * - UploadContacts
	 */
	final protected function addPartHook(string $sActionName, string $sFunctionName): self

	final public function Config(): \RainLoop\Config\Plugin;
	final public function Manager(): \RainLoop\Plugins\Manager;
	final public function Path(): string;
	final public function ConfigMap(bool $flatten = false): array;

	/**
	 * Returns result of Actions->DefaultResponse($sFunctionName, $mData) or json_encode($mData)
	 */
	final protected function jsonResponse(string $sFunctionName, $mData): mixed;

	final public function jsonParam(string $sKey, $mDefault = null): mixed;

	final public function getUserSettings(): array;

	final public function saveUserSettings(array $aSettings): bool;
}
```

JavaScript
```javascript
class PluginPopupView extends rl.pluginPopupView
{
	// Happens when DOM is created
	onBuild(dom) {}

	// Happens before showModal()
	beforeShow(...params) {}
	// Happens after showModal()
	onShow(...params) {}
	// Happens after showModal() animation transitionend
	afterShow() {}

	// Happens when user hits Escape or Close key
	// return false to prevent closing, use close() manually
	onClose() {}
	// Happens before animation transitionend
	onHide() {}
	// Happens after animation transitionend
	afterHide() {}
}

PluginPopupView.showModal();
```

# Hooks

```php
$Plugin->addHook('hook.name', 'functionName');
```

## Login

### login.credentials.step-1
	params:
		string &$sEmail

### login.credentials.step-2
	params:
		string &$sEmail
		string &$sPassword

### login.credentials
	params:
		string &$sEmail
		string &$sLogin
		string &$sPassword

### login.success
	params:
		\RainLoop\Model\Account $oAccount

## IMAP

### imap.before-connect
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Imap\ImapClient $oImapClient
		\MailSo\Imap\Settings $oSettings

### imap.after-connect
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Imap\ImapClient $oImapClient
		\MailSo\Imap\Settings $oSettings

### imap.before-login
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Imap\ImapClient $oImapClient
		\MailSo\Imap\Settings $oSettings

### imap.after-login
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Imap\ImapClient $oImapClient
		bool $bSuccess
		\MailSo\Imap\Settings $oSettings

## Sieve

### sieve.before-connect
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Sieve\SieveClient $oSieveClient
		\MailSo\Sieve\Settings $oSettings

### sieve.after-connect
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Sieve\SieveClient $oSieveClient
		\MailSo\Sieve\Settings $oSettings

### sieve.before-login
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Sieve\SieveClient $oSieveClient
		\MailSo\Sieve\Settings $oSettings

### sieve.after-login
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Sieve\SieveClient $oSieveClient
		bool $bSuccess
		\MailSo\Sieve\Settings $oSettings

## SMTP

### smtp.before-connect
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Smtp\SmtpClient $oSmtpClient
		\MailSo\Smtp\Settings $oSettings

### smtp.after-connect
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Smtp\SmtpClient $oSmtpClient
		\MailSo\Smtp\Settings $oSettings

### smtp.before-login
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Smtp\SmtpClient $oSmtpClient
		\MailSo\Smtp\Settings $oSettings

### smtp.after-login
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Smtp\SmtpClient $oSmtpClient
		bool $bSuccess
		\MailSo\Smtp\Settings $oSettings

## Folders

### filter.folders-post
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Mail\FolderCollection $oFolderCollection

### filter.folders-complete
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Mail\FolderCollection $oFolderCollection

### filter.folders-system-types
	params:
		\RainLoop\Model\Account $oAccount
		array &$aList

### filter.system-folders-names
	params:
		\RainLoop\Model\Account $oAccount
		array &$aCache

## Others

### filter.account
	params:
		\RainLoop\Model\Account $oAccount

### filter.action-params
	params:
		string $sMethodName
		array &$aCurrentActionParams

### filter.app-data
	params:
		bool $bAdmin
		array &$aAppData

### filter.application-config
	params:
		\RainLoop\Config\Application $oConfig

### filter.build-message
	params:
		\MailSo\Mime\Message $oMessage

	Happens before send/save message

### filter.build-read-receipt-message
	params:
		\MailSo\Mime\Message $oMessage
		\RainLoop\Model\Account $oAccount

### filter.domain
	params:
		\RainLoop\Model\Domain $oDomain

### filter.fabrica
	params:
		string $sName
		mixed &$mResult
		\RainLoop\Model\Account $oAccount

### filter.http-paths
	params:
		array &$aPaths

### filter.json-response
	params:
		string $sAction
		array &$aResponseItem

### filter.message-html
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Mime\Message $oMessage
		string &$sTextConverted

	Happens before send/save message

### filter.message-plain
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Mime\Message $oMessage
		string &$sTextConverted

	Happens before send/save message

### filter.message-rcpt
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Mime\EmailCollection $oRcpt

### filter.read-receipt-message-plain
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Mime\Message $oMessage
		string &$sText

### filter.result-message
	params:
		\MailSo\Mime\Message $oMessage

	Happens when reading message

### filter.save-message
	params:
		\MailSo\Mime\Message $oMessage

	Happens before save message

### filter.send-message
	params:
		\MailSo\Mime\Message $oMessage

	Happens before send message

### filter.send-message-stream
	params:
		\RainLoop\Model\Account $oAccount
		resource &$rMessageStream
		int &$iMessageStreamSize

### filter.send-read-receipt-message
	params:
		\MailSo\Mime\Message $oMessage
		\RainLoop\Model\Account $oAccount

### filter.smtp-from
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Mime\Message $oMessage
		string &$sFrom

### filter.smtp-hidden-rcpt
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Mime\Message $oMessage
		array &$aHiddenRcpt

### filter.smtp-message-stream
	params:
		\RainLoop\Model\Account $oAccount
		resource &$rMessageStream
		int &$iMessageStreamSize

### filter.upload-response
	params:
		array &$aResponseItem

### json.action-post-call
	params:
		string $sAction
		array &$aResponseItem

### json.action-pre-call
	params:
		string $sAction

### json.attachments
	params:
		\SnappyMail\AttachmentsAction $oData

### json.suggestions-input-parameters
	params:
		string &$sQuery
		int &$iLimit
		\RainLoop\Model\Account $oAccount

### json.suggestions-post
	params:
		array &$aResult
		string $sQuery
		\RainLoop\Model\Account $oAccount
		int $iLimit

### json.suggestions-pre
	params:
		array &$aResult
		string $sQuery
		\RainLoop\Model\Account $oAccount
		int $iLimit

### main.content-security-policy
	params:
		\SnappyMail\HTTP\CSP $oCSP

	Allows you to edit the policy, like:
	`$oCSP->script[] = "'strict-dynamic'";`

### main.default-response
	params:
		string $sActionName
		array &$aResponseItem

### main.default-response-data
	params:
		string $sActionName
		mixed &$mResult

### main.default-response-error-data
	params:
		string $sActionName
		int &$iErrorCode
		string &$sErrorMessage

### main.fabrica
	params:
		string $sName
		mixed &$mResult

### service.app-delay-start-begin
	no params

### service.app-delay-start-end
	no params

# JavaScript Events

## mailbox
### mailbox.inbox-unread-count
### mailbox.message-list.selector.go-up
### mailbox.message-list.selector.go-down
### mailbox.message.show
## audio
### audio.start
### audio.stop
### audio.api.stop
## Misc
### idle
### rl-layout

### rl-view-model.create
	event.detail = the ViewModel class
	Happens immediately after the ViewModel constructor

### rl-view-model
	event.detail = the ViewModel class
	Happens after the full build (vm.onBuild()) and contains viewModelDom

### sm-admin-login
	event.detail = FormData
	cancelable using preventDefault()
### sm-admin-login-response
	event.detail = { error: int, data: {JSON response} }
### sm-user-login
	event.detail = FormData
	cancelable using preventDefault()
### sm-user-login-response
	event.detail = { error: int, data: {JSON response} }

### sm-show-screen
	event.detail = 'screenname'
	cancelable using preventDefault()
