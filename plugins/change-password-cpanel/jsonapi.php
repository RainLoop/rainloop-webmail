<?php
/**
 * cPanel XMLAPI Client Class
 *
 * This class allows for easy interaction with cPanel's XML-API allow functions within the XML-API to be called
 * by calling funcions within this class
 *
 * LICENSE:
 *
 * Copyright (c) 2012, cPanel, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided
 * that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this list of conditions and the
 *   following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
 *   following disclaimer in the documentation and/or other materials provided with the distribution.
 * * Neither the name of the cPanel, Inc. nor the names of its contributors may be used to endorse or promote
 *   products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * @category Cpanel
 * @package xmlapi
 * @copyright 2012 cPanel, Inc.
 * @license http://sdk.cpanel.net/license/bsd.html
 * @version Release: 1.0.13
 * @link http://twiki.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/XmlApi
 * @since Class available since release 0.1
 */

namespace cPanel;

class jsonapi
{
	// should debugging statements be printed?
	private bool $debug         = false;

	// The host to connect to
	private string $host        = '127.0.0.1';

	// the port to connect to
	private int $port           = 2087;

	// should be the literal strings http or https
	private string $protocol    = 'https';

	// literal strings hash or password
	private ?string $auth_type  = null;

	// the actual password or hash
	private ?string $auth       = null;

	// username to authenticate as
	private ?string $user       = null;

	// The HTTP Client to use
	private string $http_client = 'curl';

	public function __construct(string $host, ?string $user = null, ?string $password = null )
	{
		if ( ( $user != null ) && ( \strlen( $user ) < 9 ) ) {
			$this->user = $user;
		}

		if ($password != null) {
			$this->set_password($password);
		}

		$this->host = $host;

		// Detemine what the default http client should be.
		if ( \function_exists('curl_setopt') ) {
			$this->http_client = "curl";
		} elseif ( \ini_get('allow_url_fopen') ) {
			$this->http_client = "fopen";
		} else {
			throw new \Exception('allow_url_fopen and curl are neither available in this PHP configuration');
		}

	}

	public function set_debug( bool $debug = true )
	{
		$this->debug = $debug;
	}

	public function set_host( string $host )
	{
		$this->host = $host;
	}

	public function set_port( int $port )
	{
		if ($port < 1 || $port > 65535) {
			throw new \Exception('non integer or negative integer passed to set_port');
		}

		// Account for ports that are non-ssl
		if ($port == '2086' || $port == '2082' || $port == '80' || $port == '2095') {
			$this->set_protocol('http');
		}

		$this->port = $port;
	}

	public function set_protocol( string $proto )
	{
		if ($proto != 'https' && $proto != 'http') {
			throw new \Exception('https and http are the only protocols that can be passed to set_protocol');
		}
		$this->protocol = $proto;
	}

	public function set_password( string $pass )
	{
		$this->auth_type = 'pass';
		$this->auth = $pass;
	}

	public function set_hash( string $hash )
	{
		$this->auth_type = 'hash';
		$this->auth = \preg_replace("/(\n|\r|\s)/", '', $hash);
	}

	public function hash_auth( string $user, string $hash )
	{
		$this->set_hash( $hash );
		$this->user = $user;
	}

	public function password_auth( string $user, string $pass )
	{
		$this->set_password( $pass );
		$this->user = $user;
	}

	public function set_http_client( string $client )
	{
		if ( ( $client != 'curl' ) && ( $client != 'fopen' ) ) {
			throw new \Exception('only curl and fopen and allowed http clients');
		}
		$this->http_client = $client;
	}

	/**
	 * Perform an XML-API Query
	 *
	 * This function will perform an XML-API Query and return the specified output format of the call being made
	 *
	 * @param string $function The XML-API call to execute
	 * @param array $vars An associative array of the parameters to be passed to the XML-API Calls
	 * @return mixed
	 */
	public function jsonapi_query( string $function, array $vars = array() )
	{
		// Check to make sure all the data needed to perform the query is in place
		if (!$function) {
			throw new \Exception('jsonapi_query() requires a function to be passed to it');
		}

		if ($this->user == null) {
			throw new \Exception('no user has been set');
		}

		if ($this->auth ==null) {
			throw new \Exception('no authentication information has been set');
		}

		// Build the query:

		$query_type = '/json-api/';

		$args = \http_build_query($vars, '', '&');
		$url =  $this->protocol . '://' . $this->host . ':' . $this->port . $query_type . $function;

		if ($this->debug) {
			\error_log('URL: ' . $url);
			\error_log('DATA: ' . $args);
		}

		// Set the $auth string

		$authstr = '';
		if ($this->auth_type == 'hash') {
			$authstr = 'Authorization: WHM ' . $this->user . ':' . $this->auth . "\r\n";
		} elseif ($this->auth_type == 'pass') {
			$authstr = 'Authorization: Basic ' . \base64_encode($this->user .':'. $this->auth) . "\r\n";
		} else {
			throw new \Exception('invalid auth_type set');
		}

		if ($this->debug) {
			\error_log("Authentication Header: " . $authstr ."\n");
		}

		// Perform the query (or pass the info to the functions that actually do perform the query)

		$response = '';
		if ($this->http_client == 'curl') {
			$response = $this->curl_query($url, $args, $authstr);
		} elseif ($this->http_client == 'fopen') {
			$response = $this->fopen_query($url, $args, $authstr);
		}

		// fix #1
		$aMatch = array();
		if ($response && false !== stripos($response, '<html>') &&
			\preg_match('/HTTP-EQUIV[\s]?=[\s]?"refresh"/i', $response) &&
			\preg_match('/<meta [^>]+url[\s]?=[\s]?([^">]+)/i', $response, $aMatch) &&
			!empty($aMatch[1]) && 0 === \strpos(\trim($aMatch[1]), 'http'))
		{
			$url = \trim($aMatch[1]) . $query_type . $function;
			if ($this->debug) {
				\error_log('new URL: ' . $url);
			}

			if ($this->http_client == 'curl') {
				$response = $this->curl_query($url, $args, $authstr);
			} elseif ($this->http_client == 'fopen') {
				$response = $this->fopen_query($url, $args, $authstr);
			}
		}
		// ---

		/*
		*	Post-Query Block
		* Handle response, return proper data types, debug, etc
		*/

		// print out the response if debug mode is enabled.
		if ($this->debug) {
			\error_log("RESPONSE:\n " . $response);
		}

		// The only time a response should contain <html> is in the case of authentication error
		// cPanel 11.25 fixes this issue, but if <html> is in the response, we'll error out.

		if (\stristr($response, '<html>') == true) {
			if (\stristr($response, 'Login Attempt Failed') == true) {
				\error_log("Login Attempt Failed");

				return;
			}
			if (\stristr($response, 'action="/login/"') == true) {
				\error_log("Authentication Error");

				return;
			}

			return;
		}

		return $response;
	}

	private function curl_query( $url, $postdata, $authstr )
	{
		$curl = \curl_init();
		\curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, 0);
		// Return contents of transfer on curl_exec
		\curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
		// Allow self-signed certs
		\curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, 0);
		// Set the URL
		\curl_setopt($curl, CURLOPT_URL, $url);
		// Increase buffer size to avoid "funny output" exception
		\curl_setopt($curl, CURLOPT_BUFFERSIZE, 131072);

		// Pass authentication header
		$header[0] =$authstr .
			"Content-Type: application/x-www-form-urlencoded\r\n" .
			"Content-Length: " . strlen($postdata) . "\r\n" . "\r\n" . $postdata;

		\curl_setopt($curl, CURLOPT_HTTPHEADER, $header);

		\curl_setopt($curl, CURLOPT_POST, 1);

		$result = \curl_exec($curl);
		if ($result == false) {
			throw new \Exception("curl_exec threw error \"" . \curl_error($curl) . "\" for " . $url . "?" . $postdata );
		}
		\curl_close($curl);

		return $result;
	}

	private function fopen_query( $url, $postdata, $authstr )
	{
		if ( !(ini_get('allow_url_fopen') ) ) {
			throw new \Exception('fopen_query called on system without allow_url_fopen enabled in php.ini');
		}

		$opts = array(
			'http' => array(
				'allow_self_signed' => true,
				'method' => 'POST',
				'header' => $authstr .
					"Content-Type: application/x-www-form-urlencoded\r\n" .
					"Content-Length: " . strlen($postdata) . "\r\n" .
					"\r\n" . $postdata
			)
		);
		$context = \stream_context_create($opts);

		return \file_get_contents($url, false, $context);
	}

	public function api2_query($user, $module, $function, $args = array())
	{
		if (!isset($user) || !isset($module) || !isset($function) ) {
			\error_log("api2_query requires that a username, module and function are passed to it");

			return false;
		}
		if (!is_array($args)) {
			\error_log("api2_query requires that an array is passed to it as the 4th parameter");

			return false;
		}

		$args['cpanel_jsonapi_user'] = $user;
		$args['cpanel_jsonapi_module'] = $module;
		$args['cpanel_jsonapi_func'] = $function;
		$args['cpanel_jsonapi_apiversion'] = '2';

		return $this->jsonapi_query('cpanel', $args);
	}
}
