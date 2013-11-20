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
* Version: 1.0.13
* Last updated: 19 November 2012
*
* Changes
*
* 1.0.13:
* Tidy
*
* 1.0.12:
* github#2 - [Bugfix]: typo related to environment variable XMLAPI_USE_SSL
*
* 1.0.11:
* [Feature]: Remove value requirement for park()'s 'topdomain' argument
*  (Case 51116)
*
* 1.0.10:
* github#1 - [Bugfix]: setresellerpackagelimits() does not properly prepare
*  input arguments for query (Case 51076)
*
* 1.0.9:
* added input argument to servicestatus method which allows single service
*  filtering (Case 50804)
*
* 1.0.8:
* correct unpark bug as reported by Randall Kent
*
* 1.0.7:
* Corrected typo for setrellerlimits where xml_query incorrectly called xml-api's setresellerips
*
* 1.0.6:
* Changed 'user' URL parameter for API1/2 calls to 'cpanel_xmlapi_user'/'cpanel_jsonapi_user' to resolve conflicts with API2 functions that use 'user' as a parameter
* Relocated exmaple script to Example subdirectory
* Modified example scripts to take remote server IP and root password from environment variables REMOTE_HOST and REMOTE_PASSWORD, respectively
* Created subdirectory Tests for PHPUnit tests
* Add PHPUnit test BasicParseTest.php
*
* 1.0.5:
* fix bug where api1_query and api2_query would not return JSON data
*
* 1.0.4:
* set_port will now convert non-int values to ints
*
* 1.0.3:
* Fixed issue with set_auth_type using incorrect logic for determining acceptable auth types
* Suppress non-UTF8 encoding when using curl
*
* 1.0.2:
* Increased curl buffer size to 128kb from 16kb
* Fix double encoding issue in terminateresellers()
*
* 1.0.1:
* Fixed use of wrong variable name in curl error checking
* adjust park() to use api2 rather than API1
*
* 1.0
* Added in 11.25 functions
* Changed the constructor to allow for either the "DEFINE" config setting method or using parameters
* Removed used of the gui setting
* Added fopen support
* Added auto detection for fopen or curl (uses curl by default)
* Added ability to return in multiple formats: associative array, simplexml, xml, json
* Added PHP Documentor documentation for all necessary functions
* Changed submission from GET to POST
*
*
* @copyright 2012 cPanel, Inc
* @license http://sdk.cpanel.net/license/bsd.html
* @version 1.0.13
* @link http://twiki.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/XmlApi
* @since File available since release 0.1
**/

/**
* The base XML-API class
*
* The XML-API class allows for easy execution of cPanel XML-API calls.  The goal of this project is to create
* an open source library that can be used for multiple types of applications.  This class relies on PHP5 compiled
* with both curl and simplexml support.
*
* Making Calls with this class are done in the following steps:
*
* 1.) Instaniating the class:
* $xmlapi = new xmlapi($host);
*
* 2.) Setting access credentials within the class via either set_password or set_hash:
* $xmlapi->set_hash("username", $accessHash);
* $xmlapi->set_password("username", "password");
*
* 3.) Execute a function
* $xmlapi->listaccts();
*
* @category Cpanel
* @package xmlapi
* @copyright 2012 cPanel, Inc.
* @license http://sdk.cpanel.net/license/bsd.html
* @version Release: 1.0.13
* @link http://twiki.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/XmlApi
* @since Class available since release 0.1
**/

class xmlapi
{
    // should debugging statements be printed?
    private $debug			= false;

    // The host to connect to
    private $host				=	'127.0.0.1';

    // the port to connect to
    private $port				=	'2087';

    // should be the literal strings http or https
    private $protocol		=	'https';

    // output that should be given by the xml-api
    private $output		=	'simplexml';

    // literal strings hash or password
    private $auth_type 	= null;

    //  the actual password or hash
    private $auth 			= null;

    // username to authenticate as
    private $user				= null;

    // The HTTP Client to use

    private $http_client		= 'curl';

    /**
    * Instantiate the XML-API Object
    * All parameters to this function are optional and can be set via the accessor functions or constants
    * This defaults to password auth, however set_hash can be used to use hash authentication
    *
    * @param string $host The host to perform queries on
    * @param string $user The username to authenticate as
    * @param string $password The password to authenticate with
    * @return Xml_Api object
    */
    public function __construct($host = null, $user = null, $password = null )
    {
        // Check if debugging must be enabled
        if ( (defined('XMLAPI_DEBUG')) && (XMLAPI_DEBUG == '1') ) {
             $this->debug = true;
        }

        // Check if raw xml output must be enabled
        if ( (defined('XMLAPI_RAW_XML')) && (XMLAPI_RAW_XML == '1') ) {
             $this->raw_xml = true;
        }

        /**
        * Authentication
        * This can either be passed at this point or by using the set_hash or set_password functions
        **/

        if ( ( defined('XMLAPI_USER') ) && ( strlen(XMLAPI_USER) > 0 ) ) {
            $this->user = XMLAPI_USER;

            // set the authtype to pass and place the password in $this->pass
            if ( ( defined('XMLAPI_PASS') ) && ( strlen(XMLAPI_PASS) > 0 ) ) {
                $this->auth_type = 'pass';
                $this->auth = XMLAPI_PASS;
            }

            // set the authtype to hash and place the hash in $this->auth
            if ( ( defined('XMLAPI_HASH') ) && ( strlen(XMLAPI_HASH) > 0 ) ) {
                $this->auth_type = 'hash';
                $this->auth = preg_replace("/(\n|\r|\s)/", '', XMLAPI_HASH);
            }

            // Throw warning if XMLAPI_HASH and XMLAPI_PASS are defined
            if ( ( ( defined('XMLAPI_HASH') ) && ( strlen(XMLAPI_HASH) > 0 ) )
                && ( ( defined('XMLAPI_PASS') ) && ( strlen(XMLAPI_PASS) > 0 ) ) ) {
                error_log('warning: both XMLAPI_HASH and XMLAPI_PASS are defined, defaulting to XMLAPI_HASH');
            }


            // Throw a warning if XMLAPI_HASH and XMLAPI_PASS are undefined and XMLAPI_USER is defined
            if ( !(defined('XMLAPI_HASH') ) || !defined('XMLAPI_PASS') ) {
                error_log('warning: XMLAPI_USER set but neither XMLAPI_HASH or XMLAPI_PASS have not been defined');
            }

        }

        if ( ( $user != null ) && ( strlen( $user ) < 9 ) ) {
            $this->user = $user;
        }

        if ($password != null) {
            $this->set_password($password);
        }

        /**
        * Connection
        *
        * $host/XMLAPI_HOST should always be equal to either the IP of the server or it's hostname
        */

        // Set the host, error if not defined
        if ($host == null) {
            if ( (defined('XMLAPI_HOST')) && (strlen(XMLAPI_HOST) > 0) ) {
                $this->host = XMLAPI_HOST;
            } else {
                throw new Exception("No host defined");
            }
        } else {
            $this->host = $host;
        }

        // disabling SSL is probably a bad idea.. just saying.
        if ( defined('XMLAPI_USE_SSL' ) && (XMLAPI_USE_SSL == '0' ) ) {
            $this->protocol = "http";
        }

        // Detemine what the default http client should be.
        if ( function_exists('curl_setopt') ) {
            $this->http_client = "curl";
        } elseif ( ini_get('allow_url_fopen') ) {
            $this->http_client = "fopen";
        } else {
            throw new Exception('allow_url_fopen and curl are neither available in this PHP configuration');
        }

    }

    /**
    * Accessor Functions
    **/
    /**
    * Return whether the debug option is set within the object
    *
    * @return boolean
    * @see set_debug()
    */
    public function get_debug()
    {
        return $this->debug;
    }

    /**
    * Turn on debug mode
    *
    * Enabling this option will cause this script to print debug information such as
    * the queries made, the response XML/JSON and other such pertinent information.
    * Calling this function without any parameters will enable debug mode.
    *
    * @param bool $debug turn on or off debug mode
    * @see get_debug()
    */
    public function set_debug( $debug = 1 )
    {
        $this->debug = $debug;
    }

    /**
    * Get the host being connected to
    *
    * This function will return the host being connected to
    * @return string host
    * @see set_host()
    */
    public function get_host()
    {
        return $this->host;
    }

    /**
    * Set the host to query
    *
    * Setting this will set the host to be queried
    * @param string $host The host to query
    * @see get_host()
    */
    public function set_host( $host )
    {
        $this->host = $host;
    }

    /**
    * Get the port to connect to
    *
    * This will return which port the class is connecting to
    * @return int $port
    * @see set_port()
    */
    public function get_port()
    {
        return $this->port;
    }

    /**
    * Set the port to connect to
    *
    * This will allow a user to define which port needs to be connected to.
    * The default port set within the class is 2087 (WHM-SSL) however other ports are optional
    * this function will automatically set the protocol to http if the port is equal to:
    *    - 2082
    *    - 2086
    *    - 2095
    *    - 80
    * @param int $port the port to connect to
    * @see set_protocol()
    * @see get_port()
    */
    public function set_port( $port )
    {
        if ( !is_int( $port ) ) {
            $port = intval($port);
        }

        if ($port < 1 || $port > 65535) {
            throw new Exception('non integer or negative integer passed to set_port');
        }

        // Account for ports that are non-ssl
        if ($port == '2086' || $port == '2082' || $port == '80' || $port == '2095') {
            $this->set_protocol('http');
        }

        $this->port = $port;
    }

    /**
    * Return the protocol being used to query
    *
    * This will return the protocol being connected to
    * @return string
    * @see set_protocol()
    */
    public function get_protocol()
    {
        return $this->protocol;
    }

    /**
    * Set the protocol to use to query
    *
    * This will allow you to set the protocol to query cpsrvd with.  The only to acceptable values
    * to be passed to this function are 'http' or 'https'.  Anything else will cause the class to throw
    * an Exception.
    * @param string $proto the protocol to use to connect to cpsrvd
    * @see get_protocol()
    */
    public function set_protocol( $proto )
    {
        if ($proto != 'https' && $proto != 'http') {
            throw new Exception('https and http are the only protocols that can be passed to set_protocol');
        }
        $this->protocol = $proto;
    }

    /**
    * Return what format calls with be returned in
    *
    * This function will return the currently set output format
    * @see set_output()
    * @return string
    */
    public function get_output()
    {
        return $this->output;
    }

    /**
    * Set the output format for call functions
    *
    * This class is capable of returning data in numerous formats including:
    *   - json
    *   - xml
    *   - {@link http://php.net/simplexml SimpleXML}
    *   - {@link http://us.php.net/manual/en/language.types.array.php Associative Arrays}
    *
    * These can be set by passing this class any of the following values:
    *   - json - return JSON string
    *   - xml - return XML string
    *   - simplexml - return SimpleXML object
    *   - array - Return an associative array
    *
    * Passing any value other than these to this class will cause an Exception to be thrown.
    * @param string $output the output type to be set
    * @see get_output()
    */
    public function set_output( $output )
    {
        if ($output != 'json' && $output != 'xml' && $output != 'array' && $output != 'simplexml') {
            throw new Exception('json, xml, array and simplexml are the only allowed values for set_output');
        }
        $this->output = $output;
    }

    /**
    * Return the auth_type being used
    *
    * This function will return a string containing the auth type in use
    * @return string auth type
    * @see set_auth_type()
    */
    public function get_auth_type()
    {
        return $this->auth_type;
    }

    /**
    * Set the auth type
    *
    * This class is capable of authenticating with both hash auth and password auth
    * This function will allow you to manually set which auth_type you are using.
    *
    * the only accepted parameters for this function are "hash" and "pass" anything else will cuase
    * an exception to be thrown
    *
    * @see set_password()
    * @see set_hash()
    * @see get_auth_type()
    * @param string auth_type the auth type to be set
    */
    public function set_auth_type( $auth_type )
    {
        if ($auth_type != 'hash' && $auth_type != 'pass') {
            throw new Exception('the only two allowable auth types arehash and path');
        }
        $this->auth_type = $auth_type;
    }

    /**
    * Set the password to be autenticated with
    *
    * This will set the password to be authenticated with, the auth_type will be automatically adjusted
    * when this function is used
    *
    * @param string $pass the password to authenticate with
    * @see set_hash()
    * @see set_auth_type()
    * @see set_user()
    */
    public function set_password( $pass )
    {
        $this->auth_type = 'pass';
        $this->auth = $pass;
    }

    /**
    * Set the hash to authenticate with
    *
    * This will set the hash to authenticate with, the auth_type will automatically be set when this function
    * is used.  This function will automatically strip the newlines from the hash.
    * @param string $hash the hash to autenticate with
    * @see set_password()
    * @see set_auth_type()
    * @see set_user()
    */
    public function set_hash( $hash )
    {
        $this->auth_type = 'hash';
        $this->auth = preg_replace("/(\n|\r|\s)/", '', $hash);
    }

    /**
    * Return the user being used for authtication
    *
    * This will return the username being authenticated against.
    *
    * @return string
    */
    public function get_user()
    {
        return $this->user;
    }

    /**
    * Set the user to authenticate against
    *
    * This will set the user being authenticated against.
    * @param string $user username
    * @see set_password()
    * @see set_hash()
    * @see get_user()
    */
    public function set_user( $user )
    {
        $this->user = $user;
    }

    /**
    * Set the user and hash to be used for authentication
    *
    * This function will allow one to set the user AND hash to be authenticated with
    *
    * @param string $user username
    * @param string $hash WHM Access Hash
    * @see set_hash()
    * @see set_user()
    */
    public function hash_auth( $user, $hash )
    {
        $this->set_hash( $hash );
        $this->set_user( $user );
    }

    /**
    * Set the user and password to be used for authentication
    *
    * This function will allow one to set the user AND password to be authenticated with
    * @param string $user username
    * @param string $pass password
    * @see set_pass()
    * @see set_user()
    */
    public function password_auth( $user, $pass )
    {
        $this->set_password( $pass );
        $this->set_user( $user );
    }

    /**
    * Return XML format
    *
    * this function will cause call functions to return XML format, this is the same as doing:
    *   set_output('xml')
    *
    * @see set_output()
    */
    public function return_xml()
    {
        $this->set_output('xml');
    }

    /**
    * Return simplexml format
    *
    * this function will cause all call functions to return simplexml format, this is the same as doing:
    *   set_output('simplexml')
    *
    * @see set_output()
    */
    public function return_object()
    {
        $this->set_output('simplexml');
    }

    /**
    * Set the HTTP client to use
    *
    * This class is capable of two types of HTTP Clients:
    *   - curl
    *   - fopen
    *
    * When using allow url fopen the class will use get_file_contents to perform the query
    * The only two acceptable parameters for this function are 'curl' and 'fopen'.
    * This will default to fopen, however if allow_url_fopen is disabled inside of php.ini
    * it will switch to curl
    *
     * @param string client The http client to use
    * @see get_http_client()
    */

    public function set_http_client( $client )
    {
        if ( ( $client != 'curl' ) && ( $client != 'fopen' ) ) {
            throw new Exception('only curl and fopen and allowed http clients');
        }
        $this->http_client = $client;
    }

    /**
    * Get the HTTP Client in use
    *
    * This will return a string containing the HTTP client currently in use
    *
    * @see set_http_client()
    * @return string
    */
    public function get_http_client()
    {
        return $this->http_client;
    }

     /*
    *	Query Functions
    *	--
    *	This is where the actual calling of the XML-API, building API1 & API2 calls happens
    */

    /**
    * Perform an XML-API Query
    *
    * This function will perform an XML-API Query and return the specified output format of the call being made
    *
    * @param string $function The XML-API call to execute
    * @param array $vars An associative array of the parameters to be passed to the XML-API Calls
    * @return mixed
    */
    public function xmlapi_query( $function, $vars = array() )
    {
        // Check to make sure all the data needed to perform the query is in place
        if (!$function) {
            throw new Exception('xmlapi_query() requires a function to be passed to it');
        }

        if ($this->user == null) {
            throw new Exception('no user has been set');
        }

        if ($this->auth ==null) {
            throw new Exception('no authentication information has been set');
        }

        // Build the query:

        $query_type = '/xml-api/';

        if ($this->output == 'json') {
            $query_type = '/json-api/';
        }

        $args = http_build_query($vars, '', '&');
        $url =  $this->protocol . '://' . $this->host . ':' . $this->port . $query_type . $function;

        if ($this->debug) {
            error_log('URL: ' . $url);
            error_log('DATA: ' . $args);
        }

        // Set the $auth string

        $authstr;
        if ($this->auth_type == 'hash') {
            $authstr = 'Authorization: WHM ' . $this->user . ':' . $this->auth . "\r\n";
        } elseif ($this->auth_type == 'pass') {
            $authstr = 'Authorization: Basic ' . base64_encode($this->user .':'. $this->auth) . "\r\n";
        } else {
            throw new Exception('invalid auth_type set');
        }

        if ($this->debug) {
            error_log("Authentication Header: " . $authstr ."\n");
        }

        // Perform the query (or pass the info to the functions that actually do perform the query)

        $response;
        if ($this->http_client == 'curl') {
            $response = $this->curl_query($url, $args, $authstr);
        } elseif ($this->http_client == 'fopen') {
            $response = $this->fopen_query($url, $args, $authstr);
        }

        /*
        *	Post-Query Block
        * Handle response, return proper data types, debug, etc
        */

        // print out the response if debug mode is enabled.
        if ($this->debug) {
            error_log("RESPONSE:\n " . $response);
        }

        // The only time a response should contain <html> is in the case of authentication error
        // cPanel 11.25 fixes this issue, but if <html> is in the response, we'll error out.

        if (stristr($response, '<html>') == true) {
            if (stristr($response, 'Login Attempt Failed') == true) {
                error_log("Login Attempt Failed");

                return;
            }
            if (stristr($response, 'action="/login/"') == true) {
                error_log("Authentication Error");

                return;
            }

            return;
        }


        // perform simplexml transformation (array relies on this)
        if ( ($this->output == 'simplexml') || $this->output == 'array') {
            $response = simplexml_load_string($response, null, LIBXML_NOERROR | LIBXML_NOWARNING);
            if (!$response) {
                    error_log("Some error message here");

                    return;
            }
            if ($this->debug) {
                error_log("SimpleXML var_dump:\n" . print_r($response, true));
            }
        }

        // perform array tranformation
        if ($this->output == 'array') {
            $response = $this->unserialize_xml($response);
            if ($this->debug) {
                error_log("Associative Array var_dump:\n" . print_r($response, true));
            }
        }

        return $response;
    }

    private function curl_query( $url, $postdata, $authstr )
    {
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, 0);
        // Return contents of transfer on curl_exec
         curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
        // Allow self-signed certs
        curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, 0);
        // Set the URL
        curl_setopt($curl, CURLOPT_URL, $url);
        // Increase buffer size to avoid "funny output" exception
        curl_setopt($curl, CURLOPT_BUFFERSIZE, 131072);

        // Pass authentication header
        $header[0] =$authstr .
            "Content-Type: application/x-www-form-urlencoded\r\n" .
            "Content-Length: " . strlen($postdata) . "\r\n" . "\r\n" . $postdata;

        curl_setopt($curl, CURLOPT_HTTPHEADER, $header);

        curl_setopt($curl, CURLOPT_POST, 1);

        $result = curl_exec($curl);
        if ($result == false) {
            throw new Exception("curl_exec threw error \"" . curl_error($curl) . "\" for " . $url . "?" . $postdata );
        }
        curl_close($curl);

        return $result;
    }

    private function fopen_query( $url, $postdata, $authstr )
    {
        if ( !(ini_get('allow_url_fopen') ) ) {
            throw new Exception('fopen_query called on system without allow_url_fopen enabled in php.ini');
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
        $context = stream_context_create($opts);

        return file_get_contents($url, false, $context);
    }


    /*
    * Convert simplexml to associative arrays
    *
    * This function will convert simplexml to associative arrays.
    */
    private function unserialize_xml($input, $callback = null, $recurse = false)
    {
        // Get input, loading an xml string with simplexml if its the top level of recursion
        $data = ( (!$recurse) && is_string($input) ) ? simplexml_load_string($input) : $input;
        // Convert SimpleXMLElements to array
        if ($data instanceof SimpleXMLElement) {
            $data = (array) $data;
        }
        // Recurse into arrays
        if (is_array($data)) {
            foreach ($data as &$item) {
                $item = $this->unserialize_xml($item, $callback, true);
            }
        }
        // Run callback and return
        return (!is_array($data) && is_callable($callback)) ? call_user_func($callback, $data) : $data;
    }


    /* TO DO:
      Implement API1 and API2 query functions!!!!!
    */
    /**
    * Call an API1 function
    *
    * This function allows you to call API1 from within the XML-API,  This allowes a user to peform actions
    * such as adding ftp accounts, etc
    *
    * @param string $user The username of the account to perform API1 actions on
    * @param string $module The module of the API1 call to use
    * @param string $function The function of the API1 call
    * @param array $args The arguments for the API1 function, this should be a non-associative array
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/CallingAPIFunctions XML API Call documentation
    * @link http://docs.cpanel.net/twiki/bin/view/DeveloperResources/ApiRef/WebHome API1 & API2 Call documentation
    * @link http://docs.cpanel.net/twiki/bin/view/DeveloperResources/ApiBasics/CallingApiOne API1 Documentation
    */
    public function api1_query($user, $module, $function, $args = array() )
    {
        if ( !isset($module) || !isset($function) || !isset($user) ) {
            error_log("api1_query requires that a module and function are passed to it");

            return false;
        }

        if (!is_array($args)) {
            error_log('api1_query requires that it is passed an array as the 4th parameter');

            return false;
        }

        $cpuser = 'cpanel_xmlapi_user';
        $module_type = 'cpanel_xmlapi_module';
        $func_type = 'cpanel_xmlapi_func';
        $api_type = 'cpanel_xmlapi_apiversion';

        if ( $this->get_output() == 'json' ) {
            $cpuser = 'cpanel_jsonapi_user';
            $module_type = 'cpanel_jsonapi_module';
            $func_type = 'cpanel_jsonapi_func';
            $api_type = 'cpanel_jsonapi_apiversion';
        }

        $call = array(
                $cpuser => $user,
                $module_type => $module,
                $func_type => $function,
                $api_type => '1'
            );
        for ($int = 0; $int < count($args);  $int++) {
            $call['arg-' . $int] = $args[$int];
        }

        return $this->xmlapi_query('cpanel', $call);
    }

    /**
    * Call an API2 Function
    *
    * This function allows you to call an API2 function, this is the modern API for cPanel and should be used in preference over
    * API1 when possible
    *
    * @param string $user The username of the account to perform API2 actions on
    * @param string $module The module of the API2 call to use
    * @param string $function The function of the API2 call
    * @param array $args An associative array containing the arguments for the API2 call
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/CallingAPIFunctions XML API Call documentation
    * @link http://docs.cpanel.net/twiki/bin/view/DeveloperResources/ApiRef/WebHome API1 & API2 Call documentation
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ApiTwo Legacy API2 Documentation
    * @link http://docs.cpanel.net/twiki/bin/view/DeveloperResources/ApiBasics/CallingApiTwo API2 Documentation
    */

    public function api2_query($user, $module, $function, $args = array())
    {
        if (!isset($user) || !isset($module) || !isset($function) ) {
            error_log("api2_query requires that a username, module and function are passed to it");

            return false;
        }
        if (!is_array($args)) {
            error_log("api2_query requires that an array is passed to it as the 4th parameter");

            return false;
        }

        $cpuser = 'cpanel_xmlapi_user';
        $module_type = 'cpanel_xmlapi_module';
        $func_type = 'cpanel_xmlapi_func';
        $api_type = 'cpanel_xmlapi_apiversion';

        if ( $this->get_output() == 'json' ) {
            $cpuser = 'cpanel_jsonapi_user';
            $module_type = 'cpanel_jsonapi_module';
            $func_type = 'cpanel_jsonapi_func';
            $api_type = 'cpanel_jsonapi_apiversion';
        }

        $args[$cpuser] = $user;
        $args[$module_type] = $module;
        $args[$func_type] = $function;
        $args[$api_type] = '2';

        return $this->xmlapi_query('cpanel', $args);
    }

    ####
    #  XML API Functions
    ####

    /**
    * Return a list of available XML-API calls
    *
    * This function will return an array containing all applications available within the XML-API
    *
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ListAvailableCalls XML API Call documentation
    */
    public function applist()
    {
        return $this->xmlapi_query('applist');
    }

    ####
    # Account functions
    ####

    /**
    * Create a cPanel Account
    *
    * This function will allow one to create an account, the $acctconf parameter requires that the follow
    * three associations are defined:
    *	- username
    *	- password
    *	- domain
    *
    * Failure to prive these will cause an error to be logged.  Any other key/value pairs as defined by the createaccount call
    * documentation are allowed parameters for this call.
    *
    * @param array $acctconf
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/CreateAccount XML API Call documentation
    */

    public function createacct($acctconf)
    {
        if (!is_array($acctconf)) {
            error_log("createacct requires that first parameter passed to it is an array");

            return false;
        }
        if (!isset($acctconf['username']) || !isset($acctconf['password']) || !isset($acctconf['domain'])) {
            error_log("createacct requires that username, password & domain elements are in the array passed to it");

            return false;
        }

        return $this->xmlapi_query('createacct', $acctconf);
    }

    /**
    * Change a cPanel Account's Password
    *
    * This function will allow you to change the password of a cpanel account
    *
    * @param string $username The username to change the password of
    * @param string $pass The new password for the cPanel Account
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ChangePassword XML API Call documentation
    */
    public function passwd($username, $pass)
    {
        if (!isset($username) || !isset($pass)) {
            error_log("passwd requires that an username and password are passed to it");

            return false;
        }

        return $this->xmlapi_query('passwd', array('user' => $username, 'pass' => $pass));
    }

    /**
    * Limit an account's monthly bandwidth usage
    *
    * This function will set an account's bandwidth limit.
    *
    * @param string $username The username of the cPanel account to modify
    * @param int $bwlimit The new bandwidth limit in megabytes
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/LimitBandwidth XML API Call documentation
    */
    public function limitbw($username, $bwlimit)
    {
        if (!isset($username) || !isset($bwlimit)) {
            error_log("limitbw requires that an username and bwlimit are passed to it");

            return false;
        }

        return $this->xmlapi_query('limitbw', array('user' => $username, 'bwlimit' => $bwlimit));
    }

    /**
    * List accounts on Server
    *
    * This call will return a list of account on a server, either no parameters or both parameters may be passed to this function.
    *
    * @param string $searchtype Type of account search to use, allowed values: domain, owner, user, ip or package
    * @param string $search the string to search against
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ListAccounts XML API Call documentation
    */
    public function listaccts($searchtype = null, $search = null)
    {
        if ($search) {
            return $this->xmlapi_query('listaccts', array('searchtype' => $searchtype, 'search' => $search ));
        }

        return $this->xmlapi_query('listaccts');
    }

    /**
    * Modify a cPanel account
    *
    * This call will allow you to change limitations and information about an account.  See the XML API call documentation for a list of
    * acceptable values for args.
    *
    * @param string $username The username to modify
    * @param array $args the new values for the modified account (see {@link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ModifyAccount modifyacct documentation})
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ModifyAccount XML API Call documentation
    */
    public function modifyacct($username, $args = array())
    {
        if (!isset($username)) {
            error_log("modifyacct requires that username is passed to it");

            return false;
        }
        $args['user'] = $username;
        if (sizeof($args) < 2) {
            error_log("modifyacct requires that at least one attribute is passed to it");

            return false;
        }

        return $this->xmlapi_query('modifyacct', $args);
    }

    /**
    * Edit a cPanel Account's Quota
    *
    * This call will allow you to change a cPanel account's quota
    *
    * @param string $username The username of the account to modify the quota.
    * @param int $quota the new quota in megabytes
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/EditQuota XML API Call documentation
    */
    public function editquota($username, $quota)
    {
        if (!isset($username) || !isset($quota)) {
            error_log("editquota requires that an username and quota are passed to it");

            return false;
        }

        return $this->xmlapi_query('editquota', array('user' => $username, 'quota' => $quota));
    }

    /**
    * Return a summary of the account's information
    *
    * This call will return a brief report of information about an account, such as:
    *	- Disk Limit
    *	- Disk Used
    *	- Domain
    *	- Account Email
    *	- Theme
    * 	- Start Data
    *
    * Please see the XML API Call documentation for more information on what is returned by this call
    *
    * @param string $username The username to retrieve a summary of
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ShowAccountInformation XML API Call documenation
    */
    public function accountsummary($username)
    {
        if (!isset($username)) {
            error_log("accountsummary requires that an username is passed to it");

            return false;
        }

        return $this->xmlapi_query('accountsummary', array('user' => $username));
    }

    /**
    * Suspend a User's Account
    *
    * This function will suspend the specified cPanel users account.
    * The $reason parameter is optional, but can contain a string of any length
    *
    * @param string $username The username to suspend
    * @param string $reason The reason for the suspension
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/SuspendAccount XML API Call documentation
    */
    public function suspendacct($username, $reason = null)
    {
        if (!isset($username)) {
            error_log("suspendacct requires that an username is passed to it");

            return false;
        }
        if ($reason) {
            return $this->xmlapi_query('suspendacct', array('user' => $username, 'reason' => $reason ));
        }

        return $this->xmlapi_query('suspendacct', array('user' => $username));
    }

    /**
    * List suspended accounts on a server
    *
    * This function will return an array containing all the suspended accounts on a server
    *
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ListSuspended XML API Call documentation
    */
    public function listsuspended()
    {
        return $this->xmlapi_query('listsuspended');
    }

    /**
    * Remove an Account
    *
    * This XML API call will remove an account on the server
    * The $keepdns parameter is optional, when enabled this will leave the DNS zone on the server
    *
    * @param string $username The usename to delete
    * @param bool $keepdns When pass a true value, the DNS zone will be retained
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/TerminateAccount
    */
    public function removeacct($username, $keepdns = false)
    {
        if (!isset($username)) {
            error_log("removeacct requires that a username is passed to it");

            return false;
        }
        if ($keepdns) {
            return $this->xmlapi_query('removeacct', array('user' => $username, 'keepdns' => '1'));
        }

        return $this->xmlapi_query('removeacct', array('user' => $username));
    }

    /**
    * Unsuspend an Account
    *
    * This XML API call will unsuspend an account
    *
    * @param string $username The username to unsuspend
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/UnsuspendAcount XML API Call documentation
     */
    public function unsuspendacct($username)
    {
        if (!isset($username)) {
            error_log("unsuspendacct requires that a username is passed to it");

            return false;
        }

        return $this->xmlapi_query('unsuspendacct', array('user' => $username));
    }

    /**
    * Change an Account's Package
    *
    * This XML API will change the package associated account.
    *
    * @param string $username the username to change the package of
    * @param string $pkg The package to change the account to.
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ChangePackage XML API Call documentation
    */
    public function changepackage($username, $pkg)
    {
        if (!isset($username) || !isset($pkg)) {
            error_log("changepackage requires that username and pkg are passed to it");

            return false;
        }

        return $this->xmlapi_query('changepackage', array('user' => $username, 'pkg' => $pkg));
    }

    /**
    * Return the privileges a reseller has in WHM
    *
    * This will return a list of the privileges that a reseller has to WHM
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ViewPrivileges XML API Call documentation
    */
    public function myprivs()
    {
        return $this->xmlapi_query('myprivs');
    }


    /**
    * Display Data about a Virtual Host
    *
    * This function will return information about a specific domain.  This data is essentially a representation of the data
    * Contained in the httpd.conf VirtualHost for the domain.
    *
    * @return mixed
    * @param string $domain The domain to fetch information for
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/DomainUserData
    */

    public function domainuserdata( $domain )
    {
        if (!isset( $domain ) ) {
            error_log("domainuserdata requires that domain is passed to it");

            return false;
        }

        return $this->xmlapi_query("domainuserdata", array( 'domain' => $domain ) );
    }

    /**
    * Change a site's IP Address
    *
    * This function will allow you to change the IP address that a domain listens on.
    * In order to properly call this function Either $user or $domain parameters must be defined
    * @param string $ip The $ip address to change the account or domain to
    * @param string $user The username to change the IP of
    * @param string $domain The domain to change the IP of
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/SetSiteIp XML API Call documentation
    */
    public function setsiteip ( $ip, $user = null, $domain = null )
    {
        if ( !isset($ip) ) {
            error_log("setsiteip requires that ip is passed to it");

            return false;
        }

        if ($user == null && $domain == null) {
            error_log("setsiteip requires that either domain or user is passed to it");

            return false;
        }

        if ($user == null) {
            return $this->xmlapi_query( "setsiteip", array( "ip" => $ip, "domain" => $domain ) );
        } else {
            return $this->xmlapi_query( "setsiteip", array( "ip" => $ip, "user" => $user ) );
        }
    }

    ####
    # DNS Functions
    ####

    // This API function lets you create a DNS zone.
    /**
    * Add a DNS Zone
    *
    * This XML API function will create a DNS Zone.  This will use the "standard" template when
    * creating the zone.
    *
    * @param string $domain The DNS Domain that you wish to create a zone for
    * @param string $ip The IP you want the domain to resolve to
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/AddDNSZone XML API Call documentation
    */
    public function adddns($domain, $ip)
    {
        if (!isset($domain) || !isset($ip)) {
            error_log("adddns require that domain, ip are passed to it");

            return false;
        }

        return $this->xmlapi_query('adddns', array('domain' => $domain, 'ip' => $ip));
    }

    /**
    * Add a record to a zone
    *
    * This will append a record to a DNS Zone.  The $args argument to this function
    * must be an associative array containing information about the DNS zone, please
    * see the XML API Call documentation for more info
    *
    * @param string $zone The DNS zone that you want to add the record to
    * @param array $args Associative array representing the record to be added
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/AddZoneRecord XML API Call documentation
    */
    public function addzonerecord( $zone, $args )
    {
        if (!is_array($args)) {
            error_log("addzonerecord requires that $args passed to it is an array");

            return;
        }

        $args['zone'] = $zone;

        return $this->xmlapi_query('addzonerecord', $args);
    }

    /**
    * Edit a Zone Record
    *
    * This XML API Function will allow you to edit an existing DNS Zone Record.
    * This works by passing in the line number of the record you wish to edit.
    * Line numbers can be retrieved with dumpzone()
    *
    * @param string $zone The zone to edit
    * @param int $line The line number of the zone to edit
    * @param array $args An associative array representing the zone record
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/EditZoneRecord XML API Call documentation
    * @see dumpzone()
    */

    public function editzonerecord( $zone, $line, $args )
    {
        if (!is_array($args)) {
            error_log("editzone requires that $args passed to it is an array");

            return;
        }

        $args['domain'] = $zone;
        $args['Line'] = $line;

        return $this->xmlapi_query('editzonerecord', $args);
    }

    /**
    * Retrieve a DNS Record
    *
    * This function will return a data structure representing a DNS record, to
    * retrieve all lines see dumpzone.
    * @param string $zone The zone that you want to retrieve a record from
    * @param string $line The line of the zone that you want to retrieve
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/GetZoneRecord XML API Call documentation
    */
    public function getzonerecord( $zone, $line )
    {
        return $this->xmlapi_query('getzonerecord', array( 'domain' => $zone, 'Line' => $line ) );
    }

    /**
    * Remove a DNS Zone
    *
    * This function will remove a DNS Zone from the server
    *
    * @param string $domain The domain to be remove
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/DeleteDNSZone XML API Call documentation
    */
    public function killdns($domain)
    {
        if (!isset($domain)) {
            error_log("killdns requires that domain is passed to it");

            return false;
        }

        return $this->xmlapi_query('killdns', array('domain' => $domain));
    }

    /**
    * Return a List of all DNS Zones on the server
    *
    * This XML API function will return an array containing all the DNS Zones on the server
    *
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ListDNSZone XML API Call documentation
    */
    public function listzones()
    {
        return $this->xmlapi_query('listzones');
    }

    /**
    * Return all records in a zone
    *
    * This function will return all records within a zone.
    * @param string $domain The domain to return the records from.
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ListOneZone XML API Call documentation
    * @see editdnsrecord()
    * @see getdnsrecord()
    */
    public function dumpzone($domain)
    {
        if (!isset($domain)) {
            error_log("dumpzone requires that a domain is passed to it");

            return false;
        }

        return $this->xmlapi_query('dumpzone', array('domain' => $domain));
    }

    /**
    * Return a Nameserver's IP
    *
    * This function will return a nameserver's IP
    *
    * @param string $nameserver The nameserver to lookup
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/LookupIP XML API Call documentation
    */
    public function lookupnsip($nameserver)
    {
        if (!isset($nameserver)) {
            error_log("lookupnsip requres that a nameserver is passed to it");

            return false;
        }

        return $this->xmlapi_query('lookupnsip', array('nameserver' => $nameserver));
    }

    /**
    * Remove a line from a zone
    *
    * This function will remove the specified line from a zone
    * @param string $zone The zone to remove a line from
    * @param int $line The line to remove from the zone
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/RemoveZone XML API Call documentation
    */
    public function removezonerecord($zone, $line)
    {
        if ( !isset($zone) || !isset($line) ) {
            error_log("removezone record requires that a zone and line number is passed to it");

            return false;
        }

        return $this->xmlapi_query('removezonerecord', array('zone' => $zone, 'Line' => $line) );
    }

    /**
    * Reset a zone
    *
    * This function will reset a zone removing all custom records.  Subdomain records will be readded by scanning the userdata datastore.
    * @param string $domain the domain name of the zone to reset
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ResetZone XML API Call documentation
    */
    public function resetzone($domain)
    {
        if ( !isset($domain) ) {
            error_log("resetzone requires that a domain name is passed to it");

            return false;
        }

        return $this->xmlapi_query('resetzone', array('domain' => $domain));
    }

    ####
    # Package Functions
    ####

    /**
    * Add a new package
    *
    * This function will allow you to add a new package
    * This function should be passed an associative array containing elements that define package parameters.
    * These variables map directly to the parameters for the XML-API Call, please refer to the link below for a complete
    * list of possible variable.  The "name" element is required.
    * @param array $pkg an associative array containing package parameters
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/AddPackage XML API Call documentation
    */
    public function addpkg($pkg)
    {
        if (!isset($pkg['name'])) {
            error_log("addpkg requires that name is defined in the array passed to it");

            return false;
        }

        return $this->xmlapi_query('addpkg', $pkg);
    }

    /**
    * Remove a package
    *
    * This function allow you to delete a package
    * @param string $pkgname The package you wish to delete
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/DeletePackage XML API Call documentation
    */
    public function killpkg($pkgname)
    {
        if (!isset($pkgname)) {
            error_log("killpkg requires that the package name is passed to it");

            return false;
        }

        return $this->xmlapi_query('killpkg', array('pkg' => $pkgname));
    }

    /**
    * Edit a package
    *
    * This function allows you to change a package's paremeters.  This is passed an associative array defining
    * the parameters for the package.  The keys within this array map directly to the XML-API call, please see the link
    * below for a list of possible keys within this package.  The name element is required.
    * @param array $pkg An associative array containing new parameters for the package
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/EditPackage XML API Call documentation
    */
    public function editpkg($pkg)
    {
        if (!$isset($pkg['name'])) {
            error_log("editpkg requires that name is defined in the array passed to it");

            return false;
        }

        return $this->xmlapi_query('editpkg', $pkg);
    }

    /**
    * List Packages
    *
    * This function will list all packages available to the user
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ListPackages XML API Call documentation
    */
    public function listpkgs()
    {
        return $this->xmlapi_query('listpkgs');
    }

    ####
    # Reseller functions
    ####

    /**
    * Make a user a reseller
    *
    * This function will allow you to mark an account as having reseller privileges
    * @param string $username The username of the account you wish to add reseller privileges to
    * @param int $makeowner Boolean 1 or 0 defining whether the account should own itself or not
    * @see setacls()
    * @see setresellerlimits()
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/AddResellerPrivileges XML API Call documentation
    */
    public function setupreseller($username, $makeowner = true)
    {
        if (!isset($username)) {
            error_log("setupreseller requires that username is passed to it");

            return false;
        }
        if ($makeowner) {
            return $this->xmlapi_query('setupreseller', array('user' => $username, 'makeowner' => '1'));
        }

        return $this->xmlapi_query('setupreseller', array('user' => $username, 'makeowner' => '0'));
    }

    /**
    * Create a New ACL List
    *
    * This function allows you to create a new privilege set for reseller accounts.  This is passed an
    * Associative Array containing the configuration information for this variable.  Please see the XML API Call documentation
    * For more information.  "acllist" is a required element within this array
    * @param array $acl an associative array describing the parameters for the ACL to be create
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/CreateResellerACLList XML API Call documentation
    */
    public function saveacllist($acl)
    {
        if (!isset($acl['acllist'])) {
            error_log("saveacllist requires that acllist is defined in the array passed to it");

            return false;
        }

        return $this->xmlapi_query('saveacllist', $acl);
    }


    /**
    * List available saved ACLs
    *
    * This function will return a list of Saved ACLs for reseller accounts
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ListCurrentResellerACLLists XML API Call documentation
    */
    public function listacls()
    {
        return $this->xmlapi_query('listacls');
    }

    /**
    * List Resellers
    *
    * This function will return a list of resellers on the server
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ListResellerAccounts XML API Call documentation
    */
    public function listresellers()
    {
        return $this->xmlapi_query('listresellers');
    }

    /**
    * Get a reseller's statistics
    *
    * This function will return general information on a reseller and all it's account individually such as disk usage and bandwidth usage
    *
    * @param string $username The reseller to be checked
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ListResellersAccountsInformation XML API Call documentation
    */
    public function resellerstats($username)
    {
        if (!isset($username)) {
            error_log("resellerstats requires that a username is passed to it");

            return false;
        }

        return $this->xmlapi_query('resellerstats', array('reseller' => $username));
    }

    /**
    * Remove Reseller Privileges
    *
    * This function will remove an account's reseller privileges, this does not remove the account.
    *
    * @param string $username The username to remove reseller privileges from
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/RemoveResellerPrivileges XML API Call documentation
    */
    public function unsetupreseller($username)
    {
        if (!isset($username)) {
            error_log("unsetupreseller requires that a username is passed to it");

            return false;
        }

        return $this->xmlapi_query('unsetupreseller', array('user' => $username));
    }

    /**
    * Set a reseller's privileges
    *
    * This function will allow you to set what parts of WHM a reseller has access to.  This is passed an associative array
    * containing the privleges that this reseller should have access to.  These map directly to the parameters passed to the XML API Call
    * Please view the XML API Call documentation for more information.  "reseller" is the only required element within this array
    * @param array $acl An associative array containing all the ACL information for the reseller
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/SetResellersACLList XML API Call documentation
    */
    public function setacls($acl)
    {
        if (!isset($acl['reseller'])) {
            error_log("setacls requires that reseller is defined in the array passed to it");

            return false;
        }

        return $this->xmlapi_query('setacls', $acl);
    }

    /**
    * Terminate a Reseller's Account
    *
    * This function will terminate a reseller's account and all accounts owned by the reseller
    *
    * @param string $reseller the name of the reseller to terminate
    * @param boolean $terminatereseller Passing this as true will terminate the the reseller's account as well as all the accounts owned by the reseller
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/TerminateResellerandAccounts XML API Call documentation
    *
    **/
    public function terminatereseller($reseller, $terminatereseller = true)
    {
        if (!isset($reseller)) {
            error_log("terminatereseller requires that username is passed to it");

            return false;
        }
        $verify = 'I understand this will irrevocably remove all the accounts owned by the reseller ' . $reseller;
        if ($terminatereseller) {
            return $this->xmlapi_query('terminatereseller', array('reseller' => $reseller, 'terminatereseller' => '1', 'verify' => $verify));
        }

        return $this->xmlapi_query('terminatereseller', array('reseller' => $reseller, 'terminatereseller' => '0', 'verify' => $verify));
    }

    /**
    * Set a reseller's dedicated IP addresses
    *
    * This function will set a reseller's dedicated IP addresses.  If an IP is not passed to this function,
    * it will reset the reseller to use the server's main shared IP address.
    * @param string $user The username of the reseller to change dedicated IPs for
    * @param string $ip The IP to assign to the  reseller, this can be a comma-seperated list of IPs to allow for multiple IP addresses
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/SetResellerIps XML API Call documentation
    */
    public function setresellerips($user, $ip = null)
    {
        if (!isset($user) ) {
            error_log("setresellerips requires that a username is passed to it");

            return false;
        }
        $params = array("user" => $user);
        if ($ip != null) {
            $params['ip'] = $ip;
        }

        return $this->xmlapi_query('setresellerips',$params);
    }

    /**
    * Set Accounting Limits for a reseller account
    *
    * This function allows you to define limits for reseller accounts not included with in access control such as
    * the number of accounts a reseller is allowed to create, the amount of disk space to use.
    * This function is passed an associative array defining these limits, these map directly to the parameters for the XML API
    * Call, please refer to the XML API Call documentation for more information.  The only required parameters is "user"
    *
    * @param array $reseller_cfg An associative array containing configuration information for the specified reseller
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/SetResellerLimits XML API Call documentation
    *
    */
    public function setresellerlimits( $reseller_cfg )
    {
        if ( !isset($reseller_cfg['user'] ) ) {
            error_log("setresellerlimits requires that a user is defined in the array passed to it");

            return false;
        }

        return $this->xmlapi_query('setresellerlimits',$reseller_cfg);
    }

    /**
    * Set a reseller's main IP
    *
    * This function will allow you to set a reseller's main IP.  By default all accounts created by this reseller
    * will be created on this IP
    * @param string $reseller the username of the reseller to change the main IP of
    * @param string $ip The ip you would like this reseller to create accounts on by default
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/SetResellerMainIp XML API Call documentation
    */
    public function setresellermainip($reseller, $ip)
    {
        if ( !isset($reseller) || !isset($ip) ) {
            error_log("setresellermainip requires that an reseller and ip are passed to it");

            return false;
        }

        return $this->xmlapi_query("setresellermainip", array('user' => $reseller, 'ip' => $ip));
    }

    /**
    * Set reseller package limits
    *
    * This function allows you to define which packages a reseller has access to use
    * @param string $user The reseller you wish to define package limits for
    * @param boolean $no_limit Whether or not you wish this reseller to have packages limits
    * @param string $package if $no_limit is false, then the package you wish to modify privileges for
    * @param boolean $allowed if $no_limit is false, then defines if the reseller should have access to the package or not
    * @param int $number if $no_limit is false, then defines the number of account a reseller can create of a specific package
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/SetResellerPkgLimit XML API Call documentation
    */
    public function setresellerpackagelimits($user, $no_limit, $package = null, $allowed = null, $number = null)
    {
        if (!isset($user) || !isset($no_limit) ) {
            error_log("setresellerpackagelimits requires that a username and no_limit are passed to it by default");

            return false;
        }
        if ($no_limit) {
            return $this->xmlapi_query("setresellerpackagelimits", array( 'user' => $user, "no_limit" => '1') );
        } else {
            if ( is_null($package) || is_null($allowed) ) {
                error_log('setresellerpackagelimits requires that package and allowed are passed to it if no_limit eq 0');

                return false;
            }
            $params = array(
                'user' => $user,
                'no_limit' => '0',
                'package' => $package,
            );
            if ($allowed) {
                $params['allowed'] = 1;
            } else {
                $params['allowed'] = 0;
            }
            if ( !is_null($number) ) {
                $params['number'] = $number;
            }

            return $this->xmlapi_query('setresellerpackagelimits', $params);
        }
    }

    /**
    * Suspend a reseller and all accounts owned by a reseller
    *
    * This function, when called will suspend a reseller account and all account owned by said reseller
    * @param string $reseller The reseller account to be suspended
    * @param string $reason (optional) The reason for suspending the reseller account
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/SuspendReseller XML API Call documentation
    */
    public function suspendreseller($reseller, $reason = null)
    {
        if (!isset($reseller) ) {
            error_log("suspendreseller requires that the reseller's username is passed to it");

            return false;
        }
        $params = array("user" => $reseller);
        if ($reason) {
            $params['reason'] = $reason;
        }

        return $this->xmlapi_query('suspendreseller', $params);
    }


    /**
    * Unsuspend a Reseller Account
    *
    * This function will unsuspend a reseller account and all accounts owned by the reseller in question
    * @param string $user The username of the reseller to be unsuspended
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/UnsuspendReseller XML API Call documentation
    */
    public function unsuspendreseller($user)
    {
        if (!isset($user) ) {
            error_log("unsuspendreseller requires that a username is passed to it");

            return false;
        }

        return $this->xmlapi_query('unsuspendreseller', array('user' => $user));
    }

    /**
    * Get the number of accounts owned by a reseller
    *
    * This function will return the number of accounts owned by a reseller account, along with information such as the number of active, suspended and accounting limits
    * @param string $user The username of the reseller to get account information from
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/AcctCounts XML API Call documentation
    */
    public function acctcounts($user)
    {
        if (!isset($user)) {
            error_log('acctcounts requires that a username is passed to it');

            return false;
        }

        return $this->xmlapi_query('acctcounts', array('user' => $user) );
    }

    /**
    * Set a reseller's nameservers
    *
    * This function allows you to change the nameservers that account created by a specific reseller account will use.
    * If this function is not passed a $nameservers parameter, it will reset the nameservers for the reseller to the servers's default
    * @param string $user The username of the reseller account to grab reseller accounts from
    * @param string $nameservers A comma seperate list of nameservers
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/SetResellerNameservers XML API Call documentation
    */
    public function setresellernameservers($user, $nameservers = null)
    {
        if (!isset($user)) {
            error_log("setresellernameservers requires that a username is passed to it");

            return false;
        }
        $params = array('user' => $user);
        if ($nameservers) {
            $params['nameservers'] = $nameservers;
        }

        return $this->xmlapi_query('setresellernameservers', $params);
    }

    ####
    # Server information
    ####

    /**
    * Get a server's hostname
    *
    * This function will return a server's hostname
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/DisplayServerHostname XML API Call documentation
    */
    public function gethostname()
    {
        return $this->xmlapi_query('gethostname');
    }

    /**
    * Get the version of cPanel running on the server
    *
    * This function will return the version of cPanel/WHM running on the remote system
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/DisplaycPanelWHMVersion XML API Call documentation
    */
    public function version()
    {
        return $this->xmlapi_query('version');
    }


    /**
    * Get Load Average
    *
    * This function will return the loadavg of the remote system
    *
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/LoadAvg XML API Call documentation
    */
    public function loadavg()
    {
        return $this->xmlapi_query('loadavg');
    }

    /**
    * Get a list of languages on the remote system
    *
    * This function will return a list of available langauges for the cPanel interface
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/GetLangList XML API Call documentation
    *
    */
    public function getlanglist()
    {
        return $this->xmlapi_query('getlanglist');
    }

    ####
    # Server administration
    ####

    /**
    * Reboot server
    *
    * This function will reboot the server
    * @param boolean $force This will determine if the server should be given a graceful or forceful reboot
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/RebootServer XML API Call documentation
    */
    public function reboot($force = false)
    {
        if ($force) {
            return $this->xmlapi_query('reboot', array('force' => '1'));
        }

        return $this->xmlapi_query('reboot');
    }

    /**
    * Add an IP to a server
    *
    * This function will add an IP alias to your server
    * @param string $ip The IP to be added
    * @param string $netmask The netmask of the IP to be added
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/AddIPAddress XML API Call documentation
    */
    public function addip($ip, $netmask)
    {
        if (!isset($ip) || !isset($netmask)) {
            error_log("addip requires that an IP address and Netmask are passed to it");

            return false;
        }

        return $this->xmlapi_query('addip', array('ip' => $ip, 'netmask' => $netmask));
    }

    // This function allows you to delete an IP address from your server.
    /**
    * Delete an IP from a server
    *
    * Remove an IP from the server
    * @param string $ip The IP to remove
    * @param string $ethernetdev The ethernet device that the IP is bound to
    * @param bool $skipifshutdown Whether the function should remove the IP even if the ethernet interface is down
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/DeleteIPAddress XML API Call documentation
    */
    public function delip($ip, $ethernetdev = null, $skipifshutdown = false)
    {
        $args = array();
        if (!isset($ip)) {
            error_log("delip requires that an IP is defined in the array passed to it");

            return false;
        }
        $args['ip'] = $ip;
        if ($ethernetdev) {
            $args['ethernetdev'] = $ethernetdev;
        }
        $args['skipifshutdown'] = ($skipifshutdown) ? '1' : '0';

        return $this->xmlapi_query('delip', $args);
    }

    /**
    * List IPs
    *
    * This should return a list of IPs on a server
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/DeleteIPAddress XML API Call documentation
    */
    public function listips()
    {
        return $this->xmlapi_query('listips');
    }

    /**
    * Set Hostname
    *
    * This function will allow you to set the hostname of the server
    * @param string $hostname the hostname that should be assigned to the serve
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/SetHostname XML API Call documentation
    */
    public function sethostname($hostname)
    {
        if (!isset($hostname)) {
            error_log("sethostname requires that hostname is passed to it");

            return false;
        }

        return $this->xmlapi_query('sethostname', array('hostname' => $hostname));
    }

    /**
    * Set the resolvers used by the server
    *
    * This function will set the resolvers in /etc/resolv.conf for the server
    * @param string $nameserver1 The IP of the first nameserver to use
    * @param string $nameserver2 The IP of the second namesever to use
    * @param string $nameserver3 The IP of the third nameserver to use
    * @param string $nameserver4 The IP of the forth nameserver to use
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/SetResolvers XML API Call documentation
    */
    public function setresolvers($nameserver1, $nameserver2 = null, $nameserver3 = null)
    {
        $args = array();
        if (!isset($nameserver1)) {
            error_log("setresolvers requires that nameserver1 is defined in the array passed to it");

            return false;
        }
        $args['nameserver1'] = $nameserver1;
        if ($nameserver2) {
            $args['nameserver2'] = $nameserver2;
        }
        if ($nameserver3) {
            $args['nameserver3'] = $nameserver3;
        }

        return $this->xmlapi_query('setresolvers', $args);
    }

    /**
    * Display bandwidth Usage
    *
    * This function will return all bandwidth usage information for the server,
    * The arguments for this can be passed in via an associative array, the elements of this array map directly to the
    * parameters of the call, please see the XML API Call documentation for more information
    * @param array $args The configuration for what bandwidth information to display
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ShowBw XML API Call documentation
    */
    public function showbw($args = null)
    {
        if (is_array($args)) {
            return $this->xmlapi_query('showbw', $args);
        }

        return $this->xmlapi_query('showbw');
    }

    public function nvset($key, $value)
    {
        if (!isset($key) || !isset($value)) {
            error_log("nvset requires that key and value are passed to it");

            return false;
        }

        return $this->xmlapi_query('nvset', array('key' => $key, 'value' => $value));
    }

    // This function allows you to retrieve and view a non-volatile variable's value.
    public function nvget($key)
    {
        if (!isset($key)) {
            error_log("nvget requires that key is passed to it");

            return false;
        }

        return $this->xmlapi_query('nvget', array('key' => $key));
    }

    ####
    # Service functions
    ####

    /**
    * Restart a Service
    *
    * This function allows you to restart a service on the server
    * @param string $service the service that you wish to restart please view the XML API Call documentation for acceptable values to this parameters
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/RestartService XML API Call documentation
    */
    public function restartsrv($service)
    {
        if (!isset($service)) {
            error_log("restartsrv requires that service is passed to it");

            return false;
        }

        return $this->xmlapi_query('restartservice', array('service' => $service));
    }

    /**
    * Service Status
    *
    * This function will return the status of all services on the and whether they are running or not
    * @param string $service A single service to filter for.
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ServiceStatus XML API Call documentation
    */
    public function servicestatus($args=array())
     {
        if (!empty($args) && !is_array($args)) {
            $args = array('service'=>$args);
        } elseif (!is_array($args)) {
            $args = array();
        }

        return $this->xmlapi_query('servicestatus', $args);
     }

    /**
    * Configure A Service
    *
    * This function will allow you to enabled or disable services along with their monitoring by chkservd
    * @param string $service The service to be monitored
    * @param bool $enabled Whether the service should be enabled or not
    * @param bool $monitored Whether the service should be monitored or not
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ConfigureService XML API Call documentation
    */
    public function configureservice($service, $enabled = true, $monitored = true)
    {
        if (!isset($service)) {
            error_log("configure service requires that a service is passed to it");

            return false;
        }
        $params = array('service' => $service);

        if ($enabled) {
            $params['enabled'] = 1;
        } else {
            $params['enabled'] = 0;
        }

        if ($monitored) {
            $params['monitored'] = 1;
        } else {
            $params['monitored'] = 0;
        }

        return $this->xmlapi_query('configureservice', $params);

    }

    ####
    # SSL functions
    ####

    /**
    * Display information on an SSL host
    *
    * This function will return information on an SSL Certificate, CSR, cabundle and SSL key for a specified domain
    * @param array $args Configuration information for the SSL certificate, please see XML API Call documentation for required values
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/FetchSSL XML API Call documentation
    */
    public function fetchsslinfo($args)
    {
        if ( (isset($args['domain']) && isset($args['crtdata'])) || (!isset($args['domain']) && !isset($args['crtdata'])) ) {
            error_log("fetchsslinfo requires domain OR crtdata is passed to it");
        }
        if (isset($args['crtdata'])) {
            // crtdata must be URL-encoded!
            $args['crtdata'] = urlencode(trim($args['crtdata']));
        }

        return $this->xmlapi_query('fetchsslinfo', $args);
    }

    /**
    * Generate an SSL Certificate
    *
    * This function will generate an SSL Certificate, the arguments for this map directly to the call for the XML API call.  Please consult the XML API Call documentation for more information
    * @param array $args the configuration for the SSL Certificate being generated
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/GenerateSSL XML API Call documentation
    */
    public function generatessl($args)
    {
        if (!isset($args['xemail']) || !isset($args['host']) || !isset($args['country']) || !isset($args['state']) || !isset($args['city']) || !isset($args['co']) || !isset($args['cod']) || !isset($args['email']) || !isset($args['pass'])) {
            error_log("generatessl requires that xemail, host, country, state, city, co, cod, email and pass are defined in the array passed to it");

            return false;
        }

        return $this->xmlapi_query('generatessl', $args);
    }

    /**
    * Install an SSL certificate
    *
    * This function will allow you to install an SSL certificate that is uploaded via the $argument parameter to this call.  The arguments for this call map directly to the parameters for the XML API call,
    * please consult the XML API Call documentation for more information.
    * @param array $args The configuration for the SSL certificate
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/InstallSSL XML API Call documentation
    */
    public function installssl($args)
    {
        if (!isset($args['user']) || !isset($args['domain']) || !isset($args['cert']) || !isset($args['key']) || !isset($args['cab']) || !isset($args['ip'])) {
            error_log("installssl requires that user, domain, cert, key, cab and ip are defined in the array passed to it");

            return false;
        }

        return $this->xmlapi_query('installssl', $args);
    }

    /**
    * List SSL Certs
    *
    * This function will list all SSL certificates installed on the server
    * @return mixed
    * @link http://docs.cpanel.net/twiki/bin/view/AllDocumentation/AutomationIntegration/ListSSL XML API Call documentation
    */
    public function listcrts()
    {
        return $this->xmlapi_query('listcrts');
    }

    ####
    # cPanel API1 functions
    # Note: A cPanel account username is required
    # Some cPanel features must be enabled to be able to use some function (f.e. park, unpark)
    ####

    // This API1 function adds a emailaccount for a specific user.
    public function addpop($username, $args)
    {
        if (!isset($username) || !isset($args)) {
            error_log("addpop requires that a user and args are passed to it");

            return false;
        }
        if (is_array($args) && (sizeof($args) < 3)) {
            error_log("addpop requires that args at least contains an email_username, email_password and email_domain");

            return false;
        }

        return $this->api1_query($username, 'Email', 'addpop', $args);
    }

    // This API function displays a list of all parked domains for a specific user.
    public function park($username, $newdomain, $topdomain)
    {
        $args = array();
        if ( (!isset($username)) && (!isset($newdomain)) ) {
            error_log("park requires that a username and new domain are passed to it");

            return false;
        }
        $args['domain'] = $newdomain;
        if ($topdomain) {
            $args['topdomain'] = $topdomain;
        }

        return $this->api2_query($username, 'Park', 'park', $args);
    }

    // This API function displays a list of all parked domains for a specific user.
    public function unpark($username, $domain)
    {
        $args = array();
        if ( (!isset($username)) && (!isset($domain)) ) {
            error_log("unpark requires that a username and domain are passed to it");

            return false;
        }
        $args['domain'] = $domain;

        return $this->api2_query($username, 'Park', 'unpark', $args);
    }

    ####
    # cPanel API2 functions
    # Note: A cPanel account username is required
    # Some cPanel features must be enabled to be able to use some function
    ####

    // This API2 function allows you to view the diskusage of a emailaccount.
    public function getdiskusage($username, $args)
    {
        if (!isset($username) || !isset($args)) {
            error_log("getdiskusage requires that a username and args are passed to it");

            return false;
        }
        if (is_array($args) && (!isset($args['domain']) || !isset($args['login']))) {
            error_log("getdiskusage requires that args at least contains an email_domain and email_username");

            return false;
        }

        return $this->api2_query($username, 'Email', 'getdiskusage', $args);
    }

    // This API2 function allows you to list ftp-users associated with a cPanel account including disk information.
    public function listftpwithdisk($username)
    {
        if (!isset($username)) {
            error_log("listftpwithdisk requires that user is passed to it");

            return false;
        }

        return $this->api2_query($username, 'Ftp', 'listftpwithdisk');
    }

    // This API2 function allows you to list ftp-users associated with a cPanel account.
    public function listftp($username)
    {
        if (!isset($username)) {
            error_log("listftp requires that user is passed to it");

            return false;
        }

        return $this->api2_query($username, 'Ftp', 'listftp');
    }

    // This API function displays a list of all parked domains for a specific user.
    public function listparkeddomains($username, $domain = null)
    {
        $args = array();
        if (!isset($username)) {
            error_log("listparkeddomains requires that a user is passed to it");

            return false;
        }
        if (isset($domain)) {
            $args['regex'] = $domain;

            return $this->api2_query($username, 'Park', 'listparkeddomains', $args);
        }

        return $this->api2_query($username, 'Park', 'listparkeddomains');
    }

    // This API function displays a list of all addon domains for a specific user.
    public function listaddondomains($username, $domain = null)
    {
        $args = array();
        if (!isset($username)) {
            error_log("listaddondomains requires that a user is passed to it");

            return false;
        }
        if (isset($domain)) {
            $args['regex'] = $domain;

            return $this->api2_query($username, 'AddonDomain', 'listaddondomains', $args);
        }

        return $this->api2_query($username, 'Park', 'listaddondomains');
    }

    // This API function displays a list of all selected stats for a specific user.
    public function stat($username, $args = null)
    {
        if ( (!isset($username)) || (!isset($args)) ) {
            error_log("stat requires that a username and options are passed to it");

            return false;
        }
        if (is_array($args)) {
        $display = '';
            foreach ($args as $key => $value) {
                $display .= $value . '|';
            }
            $values['display'] = substr($display, 0, -1);
        } else {
            $values['display'] = substr($args, 0, -1);
        }

        return $this->api2_query($username, 'StatsBar', 'stat', $values);
    }

}
