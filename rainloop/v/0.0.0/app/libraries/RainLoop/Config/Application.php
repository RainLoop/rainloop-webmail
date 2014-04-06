<?php

namespace RainLoop\Config;

class Application extends \RainLoop\Config\AbstractConfig
{
	/**
	 * @return void
	 */
	public function __construct()
	{
		parent::__construct('application.ini',
			'; RainLoop Webmail configuration file
; Please don\'t add custom parameters here, those will be overwritten');
	}

	/**
	 * @param string $sPassword
	 *
	 * @return void
	 */
	public function SetPassword($sPassword)
	{
		return $this->Set('security', 'admin_password', \md5(APP_SALT.$sPassword.APP_SALT));
	}

	/**
	 * @param string $sPassword
	 *
	 * @return bool
	 */
	public function ValidatePassword($sPassword)
	{
		$sPassword = (string) $sPassword;
		$sConfigPassword = (string) $this->Get('security', 'admin_password', '');

		return 0 < \strlen($sPassword) &&
			($sPassword === $sConfigPassword || \md5(APP_SALT.$sPassword.APP_SALT) === $sConfigPassword);
	}

	/**
	 * @return bool
	 */
	public function Save()
	{
		$this->Set('version', 'current', APP_VERSION);
		$this->Set('version', 'saved', \gmdate('r'));

		return parent::Save();
	}

	/**
	 * @return array
	 */
	protected function defaultValues()
	{
		return array(
			'webmail' => array(

				'title'							=> array('RainLoop Webmail', 'Text displayed as page title'),
				'loading_description'			=> array('RainLoop', 'Text displayed on startup'),

				'theme'							=> array('Default', 'Theme used by default'),
				'allow_themes'					=> array(true, 'Allow theme selection on settings screen'),
				'allow_custom_theme'			=> array(true, ''),

				'language'						=> array('en', 'Language used by default'),
				'allow_languages_on_settings'	=> array(true, 'Allow language selection on settings screen'),

				'allow_additional_accounts'		=> array(true, ''),
				'allow_identities'				=> array(true, ''),

				'messages_per_page'		=> array(20, ' Number of messages displayed on page by default'),

				'editor_default_type'	=> array('Html', 'Editor mode used by default (Html or Plain)'),

				'attachment_size_limit'	=> array(5,
					'File size limit (MB) for file upload on compose screen
0 for unlimited.')
			),

			'branding' => array(
				'login_logo'		=> array(''),
				'login_desc'		=> array(''),
				'login_css'			=> array(''),
			),

			'contacts' => array(
				'enable'			=> array(false, 'Enable contacts'),
				'allow_sharing'		=> array(true),
				'allow_sync'		=> array(false),
				'suggestions_limit' => array(30),
				'type'				=> array('sqlite', ''),
				'pdo_dsn'			=> array('mysql:host=127.0.0.1;port=3306;dbname=rainloop', ''),
				'pdo_user'			=> array('root', ''),
				'pdo_password'		=> array('', ''),
			),

			'security' => array(
				'csrf_protection'	=> array(true,
					'Enable CSRF protection (http://en.wikipedia.org/wiki/Cross-site_request_forgery)'),

				'custom_server_signature' => array('RainLoop'),
				'openpgp'			=> array(false),
				'admin_login'		=> array('admin', 'Login and password for web admin panel'),
				'admin_password'	=> array('12345'),
				'allow_admin_panel' => array(true, 'Access settings'),
				'allow_two_factor_auth' => array(false),
				'admin_panel_host'	=> array(''),
				'core_install_access_domains' => array('')
			),

			'login' => array(

				'allow_custom_login' => array(false,
					'Enable additional Login field on webmail login screen'),

				'default_domain' => array('', ''),
				
				'allow_languages_on_login' => array(true,
					'Allow language selection on webmail login screen'),

				'sign_me_auto'	=> array(\RainLoop\Enumerations\SignMeType::DEFAILT_OFF,
					'This option allows webmail to remember the logged in user
once they closed the browser window.

Values:
  "DefaultOff" - can be used, disabled by default;
  "DefaultOn"  - can be used, enabled by default;
  "Unused"     - cannot be used')
			),

			'plugins' => array(
				'enable'		=> array(false, 'Enable plugin support'),
				'enabled_list'	=> array('', 'List of enabled plugins'),
			),

			'logs' => array(

				'enable' => array(false, 'Enable logging'),
				
				'write_on_error_only' => array(false, 'Logs entire request only if error occured'),

				'filename' => array('log-{date:Y-m-d}.txt',
					'Log filename.
For security reasons, some characters are removed from filename.
Allows for pattern-based folder creation (see examples below).

Patterns:
  {date:Y-m-d}  - Replaced by pattern-based date
                  Detailed info: http://www.php.net/manual/en/function.date.php
  {user:email}  - Replaced by user\'s email address
                  If user is not logged in, value is set to "unknown"
  {user:login}  - Replaced by user\'s login
                  If user is not logged in, value is set to "unknown"
  {user:domain} - Replaced by user\'s domain name
                  If user is not logged in, value is set to "unknown"
  {user:uid}    - Replaced by user\'s UID regardless of account currently used

Examples:
  filename = "log-{date:Y-m-d}.txt"
  filename = "{date:Y-m-d}/{user:domain}/{user:email}_{user:uid}.log"
  filename = "{user:email}-{date:Y-m-d}.txt"')
			),

			'debug' => array(
				'enable'	=> array(false, 'Special option required for development purposes'),
			),

			'version' => array(
				'current' => array(''),
				'saved' => array('')
			),

			'social' => array(
				'google_enable' => array(false, 'Google'),
				'google_client_id' => array(''),
				'google_client_secret' => array(''),

				'fb_enable' => array(false, 'Facebook'),
				'fb_app_id' => array(''),
				'fb_app_secret' => array(''),

				'twitter_enable' => array(false, 'Twitter'),
				'twitter_consumer_key' => array(''),
				'twitter_consumer_secret' => array(''),

				'dropbox_enable' => array(false, 'Dropbox'),
				'dropbox_api_key' => array(''),
			),

			'cache' => array(
				'enable' => array(true,
					'The section controls caching of the entire application.

Enables caching in the system'),

				'index' => array('v1', 'Additional caching key. If changed, cache is purged'),

				'fast_cache_driver' => array('files', 'Can be: files, APC, memcache'),
				'fast_cache_index' => array('v1', 'Additional caching key. If changed, fast cache is purged'),

				'http' => array(true, 'Browser-level cache. If enabled, caching is maintainted without using files'),
				'server_uids' => array(false, 'Caching message UIDs when searching and sorting (threading)')
			),

			'labs' => array(
				'ignore_folders_subscription' => array(false,
					'Experimental settings. Handle with care.
'),
				'allow_prefetch' => array(true),
				'allow_smart_html_links' => array(true),
				'cache_system_data' => array(true),
				'date_from_headers' => array(false),
				'autocreate_system_folders' => array(true),
				'allow_message_append' => array(false),
				'determine_user_language' => array(true),
				'disable_iconv_if_mbstring_supported' => array(false),
				'login_fault_delay' => array(1),
				'log_ajax_response_write_limit' => array(300),
				'allow_html_editor_source_button' => array(false),
				'sync_dav_digest_auth' => array(true),
				'sync_dav_domain' => array(''),
				'sync_use_dav_browser' => array(true),
				'use_app_debug_js' => array(false),
				'use_app_debug_css' => array(false),
				'use_imap_sort' => array(false),
				'use_imap_force_selection' => array(false),
				'use_imap_list_subscribe' => array(true),
				'use_imap_thread' => array(true),
				'use_imap_move' => array(true),
				'use_imap_auth_plain' => array(false),
				'imap_forwarded_flag' => array('$Forwarded'),
				'imap_read_receipt_flag' => array('$ReadReceipt'),
				'smtp_show_server_errors' => array(false),
				'repo_type' => array('stable'),
				'custom_repo' => array(''),
				'additional_repo' => array(''),
				'cdn_static_domain' => array(''),
				'curl_proxy' => array(''),
				'curl_proxy_auth' => array(''),
				'in_iframe' => array(false),
				'custom_login_link' => array(''),
				'custom_logout_link' => array(''),
				'allow_external_login' => array(false),
				'fast_cache_memcache_host' => array('127.0.0.1'),
				'fast_cache_memcache_port' => array(11211),
				'fast_cache_memcache_expire' => array(43200),
				'dev_email' => array(''),
				'dev_login' => array(''),
				'dev_password' => array('')
			)
		);
	}
}
