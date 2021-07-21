PHP

class Plugin extends \RainLoop\Plugins\AbstractPlugin

# Hooks

$Plugin->addHook('hook.name', 'functionName');

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

### imap.credentials
	params:
		\RainLoop\Model\Account $oAccount
		array &$aCredentials

### imap.before-connect
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Mail\MailClient $oMailClient
		array $aCredentials

### imap.after-connect
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Mail\MailClient $oMailClient
		array $aCredentials

### imap.before-login
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Mail\MailClient $oMailClient
		array $aCredentials

### imap.after-login
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Mail\MailClient $oMailClient
		bool $bSuccess
		array $aCredentials

## Sieve

### sieve.credentials
	params:
		\RainLoop\Model\Account $oAccount
		array &$aCredentials

### sieve.before-connect
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Sieve\ManageSieveClient $oSieveClient
		array $aCredentials

### sieve.after-connect
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Sieve\ManageSieveClient $oSieveClient
		array $aCredentials

### sieve.before-login
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Sieve\ManageSieveClient $oSieveClient
		bool $bSuccess
		array $aCredentials

### sieve.after-login
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Sieve\ManageSieveClient $oSieveClient
		array $aCredentials

## SMTP

### smtp.credentials
	params:
		\RainLoop\Model\Account $oAccount
		array &$aCredentials

### smtp.before-connect
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Smtp\SmtpClient $oSmtpClient
		array $aCredentials

### smtp.after-connect
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Smtp\SmtpClient $oSmtpClient
		array $aCredentials

### smtp.before-login
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Smtp\SmtpClient $oSmtpClient
		array $aCredentials

### smtp.after-login
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Smtp\SmtpClient $oSmtpClient
		bool $bSuccess
		array $aCredentials

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

### filter.build-read-receipt-message
	params:
		\MailSo\Mime\Message $oMessage
		\RainLoop\Model\Account $oAccount

### filter.domain
	params:
		\RainLoop\Model\Domain &$oDomain

### filter.fabrica
	params:
		string $sName
		mixed &$mResult
		\RainLoop\Model\Account $oAccount

### filter.http-paths
	params:
		array &$aPaths

### filter.http-query
	params:
		string &$sQuery

### filter.json-response
	params:
		string $sAction
		array &$aResponseItem

### filter.message-html
### filter.message-plain
	params:
		\RainLoop\Model\Account $oAccount
		\MailSo\Mime\Message $oMessage
		string &$sTextConverted

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

### filter.save-message
	params:
		\MailSo\Mime\Message $oMessage

### filter.send-message
	params:
		\MailSo\Mime\Message $oMessage

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

### json.action-post-call
	params:
		string $sAction
		array &$aResponseItem

### json.action-pre-call
	params:
		string $sAction

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

### main.default-response
	params:
		string $sActionName
		array &$aResponseItem

### main.default-response
	params:
		string $sActionName
		array &$aResponseItem

### main.default-response
	params:
		string $sActionName
		array &$aResponseItem

### main.default-response-data
	params:
		string $sActionName
		mixed &$mResult

### main.default-response-data
	params:
		string $sActionName
		mixed &$mResult

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
