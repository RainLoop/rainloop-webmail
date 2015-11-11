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
; Please don\'t add custom parameters here, those will be overwritten',
			defined('APP_ADDITIONAL_CONFIGURATION_NAME') ? APP_ADDITIONAL_CONFIGURATION_NAME : '');
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
			(($sPassword === $sConfigPassword && '12345' === $sConfigPassword) || \md5(APP_SALT.$sPassword.APP_SALT) === $sConfigPassword);
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
				'favicon_url'					=> array('', ''),

				'theme'							=> array('Default', 'Theme used by default'),
				'allow_themes'					=> array(true, 'Allow theme selection on settings screen'),
				'allow_user_background'			=> array(false),

				'language'						=> array('en', 'Language used by default'),
				'language_admin'				=> array('en', 'Admin Panel interface language'),
				'allow_languages_on_settings'	=> array(true, 'Allow language selection on settings screen'),

				'allow_additional_accounts'		=> array(true, ''),
				'allow_additional_identities'	=> array(true, ''),

				'messages_per_page'		=> array(20, ' Number of messages displayed on page by default'),

				'attachment_size_limit'	=> array(25,
					'File size limit (MB) for file upload on compose screen
0 for unlimited.')
			),

			'interface' => array(
				'show_attachment_thumbnail' => array(true, '')
			),

			'branding' => array(
				'login_logo'		=> array(''),
				'login_background'	=> array(''),
				'login_desc'		=> array(''),
				'login_css'			=> array(''),
				'login_powered'		=> array(true),

				'user_css'			=> array(''),
				'user_logo'			=> array(''),
				'user_logo_title'	=> array(''),
				'user_logo_message'	=> array(''),
				'user_iframe_message'	=> array(''),

				'welcome_page_url'		=> array(''),
				'welcome_page_display'	=> array('none')
			),

			'contacts' => array(
				'enable'			=> array(false, 'Enable contacts'),
				'allow_sharing'		=> array(true),
				'allow_sync'		=> array(false),
				'sync_interval'		=> array(20),
				'type'				=> array('sqlite', ''),
				'pdo_dsn'			=> array('mysql:host=127.0.0.1;port=3306;dbname=rainloop', ''),
				'pdo_user'			=> array('root', ''),
				'pdo_password'		=> array('', ''),
				'suggestions_limit' => array(30)
			),

			'security' => array(
				'csrf_protection'	=> array(true,
					'Enable CSRF protection (http://en.wikipedia.org/wiki/Cross-site_request_forgery)'),

				'custom_server_signature'	=> array('RainLoop'),
				'x_frame_options_header'	=> array(''),
				'openpgp'					=> array(false),
				'use_rsa_encryption'		=> array(false),
				'admin_login'				=> array('admin', 'Login and password for web admin panel'),
				'admin_password'			=> array('12345'),
				'allow_admin_panel'			=> array(true, 'Access settings'),
				'allow_two_factor_auth'		=> array(false),
				'force_two_factor_auth'		=> array(false),
				'allow_universal_login'		=> array(false),
				'admin_panel_host'			=> array(''),
				'core_install_access_domain' => array('')
			),

			'ssl' => array(
				'verify_certificate'	=> array(false, 'Require verification of SSL certificate used.'),
				'allow_self_signed'		=> array(true, 'Allow self-signed certificates. Requires verify_certificate.'),
				'cafile'			=> array('', 'Location of Certificate Authority file on local filesystem (/etc/ssl/certs/ca-certificates.crt)'),
				'capath'			=> array('', 'capath must be a correctly hashed certificate directory. (/etc/ssl/certs/)'),
			),

			'capa' => array(
				'folders' => array(true),
				'composer' => array(true),
				'contacts' => array(true),
				'settings' => array(true),
				'quota' => array(true),
				'help' => array(true),
				'reload' => array(true),
				'search' => array(true),
				'search_adv' => array(true),
				'filters' => array(true),
				'x-templates' => array(false),
				'dangerous_actions' => array(true),
				'message_actions' => array(true),
				'messagelist_actions' => array(true),
				'attachments_actions' => array(true)
			),

			'login' => array(

				'default_domain' => array('', ''),

				'allow_languages_on_login' => array(true,
					'Allow language selection on webmail login screen'),

				'determine_user_language' => array(true, ''),
				'determine_user_domain' => array(false, ''),

				'welcome_page' => array(false, ''),

				'forgot_password_link_url' => array('', ''),
				'registration_link_url' => array('', ''),

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

			'defaults' => array(
				'view_editor_type'		=> array('Html', 'Editor mode used by default (Plain, Html, HtmlForced or PlainForced)'),
				'view_layout'			=> array(1, 'layout: 0 - no preview, 1 - side preview, 2 - bottom preview'),
				'view_use_checkboxes'	=> array(true),
				'autologout'			=> array(30),
				'show_images'			=> array(false),
				'contacts_autosave'		=> array(true),
				'mail_use_threads'		=> array(false),
				'mail_reply_same_folder' => array(false)
			),

			'logs' => array(

				'enable' => array(false, 'Enable logging'),

				'write_on_error_only' => array(false, 'Logs entire request only if error occured (php requred)'),
				'write_on_php_error_only' => array(false, 'Logs entire request only if php error occured'),
				'write_on_timeout_only' => array(0, 'Logs entire request only if request timeout (in seconds) occured.'),

				'hide_passwords' => array(true, 'Required for development purposes only.
Disabling this option is not recommended.'),

				'time_offset' => array(0),
				'session_filter' => array(''),

				'filename' => array('log-{date:Y-m-d}.txt',
					'Log filename.
For security reasons, some characters are removed from filename.
Allows for pattern-based folder creation (see examples below).

Patterns:
  {date:Y-m-d}  - Replaced by pattern-based date
                  Detailed info: http://www.php.net/manual/en/function.date.php
  {user:email}  - Replaced by user\'s email address
                  If user is not logged in, value is set to "unknown"
  {user:login}  - Replaced by user\'s login (the user part of an email)
                  If user is not logged in, value is set to "unknown"
  {user:domain} - Replaced by user\'s domain name (the domain part of an email)
                  If user is not logged in, value is set to "unknown"
  {user:uid}    - Replaced by user\'s UID regardless of account currently used

  {user:ip}
  {request:ip}  - Replaced by user\'s IP address

Others:
  {imap:login} {imap:host} {imap:port}
  {smtp:login} {smtp:host} {smtp:port}

Examples:
  filename = "log-{date:Y-m-d}.txt"
  filename = "{date:Y-m-d}/{user:domain}/{user:email}_{user:uid}.log"
  filename = "{user:email}-{date:Y-m-d}.txt"'),

				'auth_logging' => array(false, 'Enable auth logging in a separate file (for fail2ban)'),
				'auth_logging_filename' => array('fail2ban/auth-{date:Y-m-d}.txt'),
				'auth_logging_format' => array('[{date:Y-m-d H:i:s}] Auth failed: ip={request:ip} user={imap:login} host={imap:host} port={imap:port}')
			),

			'debug' => array(
				'enable'	=> array(false, 'Special option required for development purposes')
			),

			'social' => array(
				'google_enable' => array(false, 'Google'),
				'google_enable_auth' => array(false),
				'google_enable_auth_fast' => array(false),
				'google_enable_drive' => array(false),
				'google_enable_preview' => array(false),
				'google_client_id' => array(''),
				'google_client_secret' => array(''),
				'google_api_key' => array(''),

				'fb_enable' => array(false, 'Facebook'),
				'fb_app_id' => array(''),
				'fb_app_secret' => array(''),

				'twitter_enable' => array(false, 'Twitter'),
				'twitter_consumer_key' => array(''),
				'twitter_consumer_secret' => array(''),

				'dropbox_enable' => array(false, 'Dropbox'),
				'dropbox_api_key' => array('')
			),

			'cache' => array(
				'enable' => array(true,
					'The section controls caching of the entire application.

Enables caching in the system'),

				'index' => array('v1', 'Additional caching key. If changed, cache is purged'),

				'fast_cache_driver' => array('files', 'Can be: files, APC, memcache'),
				'fast_cache_index' => array('v1', 'Additional caching key. If changed, fast cache is purged'),

				'http' => array(true, 'Browser-level cache. If enabled, caching is maintainted without using files'),
				'server_uids' => array(true, 'Caching message UIDs when searching and sorting (threading)')
			),

			'labs' => array(
				'ignore_folders_subscription' => array(false,
					'Experimental settings. Handle with care.
'),
				'check_new_password_strength' => array(true),
				'update_channel' => array('stable'),
				'allow_gravatar' => array(true),
				'allow_prefetch' => array(true),
				'allow_smart_html_links' => array(true),
				'cache_system_data' => array(true),
				'date_from_headers' => array(false),
				'autocreate_system_folders' => array(true),
				'allow_message_append' => array(false),
				'disable_iconv_if_mbstring_supported' => array(false),
				'login_fault_delay' => array(1),
				'log_ajax_response_write_limit' => array(300),
				'allow_html_editor_source_button' => array(false),
				'allow_html_editor_biti_buttons' => array(false),
				'allow_ctrl_enter_on_compose' => array(false),
				'try_to_detect_hidden_images' => array(false),
				'hide_dangerous_actions' => array(false),
				'use_app_debug_js' => array(false),
				'use_app_debug_css' => array(false),
				'use_imap_sort' => array(true),
				'use_imap_force_selection' => array(false),
				'use_imap_list_subscribe' => array(true),
				'use_imap_thread' => array(true),
				'use_imap_move' => array(false),
				'use_imap_auth_plain' => array(false),
				'use_imap_expunge_all_on_delete' => array(false),
				'imap_forwarded_flag' => array('$Forwarded'),
				'imap_read_receipt_flag' => array('$ReadReceipt'),
				'imap_body_text_limit' => array(555000),
				'imap_message_list_fast_simple_search' => array(true),
				'imap_message_list_count_limit_trigger' => array(0),
				'imap_message_list_date_filter' => array(0),
				'imap_message_list_permanent_filter' => array(''),
				'imap_message_all_headers' => array(false),
				'imap_large_thread_limit' => array(50),
				'imap_folder_list_limit' => array(200),
				'imap_show_login_alert' => array(true),
				'smtp_show_server_errors' => array(false),
				'sieve_allow_raw_script' => array(false),
				'sieve_utf8_folder_name' => array(true),
				'imap_timeout' => array(300),
				'smtp_timeout' => array(60),
				'sieve_timeout' => array(10),
				'mail_func_clear_headers' => array(true),
				'mail_func_additional_parameters' => array(false),
				'favicon_status' => array(true),
				'folders_spec_limit' => array(50),
				'owncloud_save_folder' => array('Attachments'),
				'curl_proxy' => array(''),
				'curl_proxy_auth' => array(''),
				'in_iframe' => array(false),
				'force_https' => array(false),
				'custom_login_link' => array(''),
				'custom_logout_link' => array(''),
				'allow_external_login' => array(false),
				'allow_external_sso' => array(false),
				'external_sso_key' => array(''),
				'http_client_ip_check_proxy' => array(false),
				'fast_cache_memcache_host' => array('127.0.0.1'),
				'fast_cache_memcache_port' => array(11211),
				'fast_cache_memcache_expire' => array(43200),
				'use_local_proxy_for_external_images' => array(false),
				'cookie_default_path' => array(''),
				'startup_url' => array(''),
				'emogrifier' => array(true),
				'dev_email' => array(''),
				'dev_password' => array('')
			),

			'version' => array(
				'current' => array(''),
				'saved' => array('')
			)
		);
	}
}
