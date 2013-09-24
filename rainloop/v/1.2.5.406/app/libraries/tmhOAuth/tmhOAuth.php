<?php
/**
 * tmhOAuth
 *
 * An OAuth 1.0A library written in PHP.
 * The library supports file uploading using multipart/form as well as general
 * REST requests. OAuth authentication is sent using the an Authorization Header.
 *
 * @author themattharris
 * @version 0.7.5
 *
 * 20 February 2013
 */
class tmhOAuth {
  const VERSION = '0.7.5';

  var $response = array();

  /**
   * Creates a new tmhOAuth object
   *
   * @param string $config, the configuration to use for this request
   * @return void
   */
  public function __construct($config=array()) {
    $this->params = array();
    $this->headers = array();
    $this->auto_fixed_time = false;
    $this->buffer = null;

    // default configuration options
    $this->config = array_merge(
      array(
        // leave 'user_agent' blank for default, otherwise set this to
        // something that clearly identifies your app
        'user_agent'                 => '',
        // default timezone for requests
        'timezone'                   => 'UTC',

        'use_ssl'                    => true,
        'host'                       => 'api.twitter.com',

        'consumer_key'               => '',
        'consumer_secret'            => '',
        'user_token'                 => '',
        'user_secret'                => '',
        'force_nonce'                => false,
        'nonce'                      => false, // used for checking signatures. leave as false for auto
        'force_timestamp'            => false,
        'timestamp'                  => false, // used for checking signatures. leave as false for auto

        // oauth signing variables that are not dynamic
        'oauth_version'              => '1.0',
        'oauth_signature_method'     => 'HMAC-SHA1',

        // you probably don't want to change any of these curl values
        'curl_connecttimeout'        => 30,
        'curl_timeout'               => 10,

        // for security this should always be set to 2.
        'curl_ssl_verifyhost'        => 2,
        // for security this should always be set to true.
        'curl_ssl_verifypeer'        => true,

        // you can get the latest cacert.pem from here http://curl.haxx.se/ca/cacert.pem
        'curl_cainfo'                => dirname(__FILE__) . DIRECTORY_SEPARATOR . 'cacert.pem',
        'curl_capath'                => dirname(__FILE__),

        'curl_followlocation'        => false, // whether to follow redirects or not

        // support for proxy servers
        'curl_proxy'                 => false, // really you don't want to use this if you are using streaming
        'curl_proxyuserpwd'          => false, // format username:password for proxy, if required
        'curl_encoding'              => '',    // leave blank for all supported formats, else use gzip, deflate, identity

        // streaming API
        'is_streaming'               => false,
        'streaming_eol'              => "\r\n",
        'streaming_metrics_interval' => 60,

        // header or querystring. You should always use header!
        // this is just to help me debug other developers implementations
        'as_header'                  => true,
        'debug'                      => false,
      ),
      $config
    );
    $this->set_user_agent();
    date_default_timezone_set($this->config['timezone']);
  }

  /**
   * Sets the useragent for PHP to use
   * If '$this->config['user_agent']' already has a value it is used instead of one
   * being generated.
   *
   * @return void value is stored to the config array class variable
   */
  private function set_user_agent() {
    if (!empty($this->config['user_agent']))
      return;

    if ($this->config['curl_ssl_verifyhost'] && $this->config['curl_ssl_verifypeer']) {
      $ssl = '+SSL';
    } else {
      $ssl = '-SSL';
    }

    $ua = 'tmhOAuth ' . self::VERSION . $ssl . ' - //github.com/themattharris/tmhOAuth';
    $this->config['user_agent'] = $ua;
  }

  /**
   * Generates a random OAuth nonce.
   * If 'force_nonce' is true a nonce is not generated and the value in the configuration will be retained.
   *
   * @param string $length how many characters the nonce should be before MD5 hashing. default 12
   * @param string $include_time whether to include time at the beginning of the nonce. default true
   * @return void value is stored to the config array class variable
   */
  private function create_nonce($length=12, $include_time=true) {
    if ($this->config['force_nonce'] == false) {
      $sequence = array_merge(range(0,9), range('A','Z'), range('a','z'));
      $length = $length > count($sequence) ? count($sequence) : $length;
      shuffle($sequence);

      $prefix = $include_time ? microtime() : '';
      $this->config['nonce'] = md5(substr($prefix . implode('', $sequence), 0, $length));
    }
  }

  /**
   * Generates a timestamp.
   * If 'force_timestamp' is true a nonce is not generated and the value in the configuration will be retained.
   *
   * @return void value is stored to the config array class variable
   */
  private function create_timestamp() {
    $this->config['timestamp'] = ($this->config['force_timestamp'] == false ? time() : $this->config['timestamp']);
  }

  /**
   * Encodes the string or array passed in a way compatible with OAuth.
   * If an array is passed each array value will will be encoded.
   *
   * @param mixed $data the scalar or array to encode
   * @return $data encoded in a way compatible with OAuth
   */
  private function safe_encode($data) {
    if (is_array($data)) {
      return array_map(array($this, 'safe_encode'), $data);
    } else if (is_scalar($data)) {
      return str_ireplace(
        array('+', '%7E'),
        array(' ', '~'),
        rawurlencode($data)
      );
    } else {
      return '';
    }
  }

  /**
   * Decodes the string or array from it's URL encoded form
   * If an array is passed each array value will will be decoded.
   *
   * @param mixed $data the scalar or array to decode
   * @return string $data decoded from the URL encoded form
   */
  private function safe_decode($data) {
    if (is_array($data)) {
      return array_map(array($this, 'safe_decode'), $data);
    } else if (is_scalar($data)) {
      return rawurldecode($data);
    } else {
      return '';
    }
  }

  /**
   * Returns an array of the standard OAuth parameters.
   *
   * @return array all required OAuth parameters, safely encoded
   */
  private function get_defaults() {
    $defaults = array(
      'oauth_version'          => $this->config['oauth_version'],
      'oauth_nonce'            => $this->config['nonce'],
      'oauth_timestamp'        => $this->config['timestamp'],
      'oauth_consumer_key'     => $this->config['consumer_key'],
      'oauth_signature_method' => $this->config['oauth_signature_method'],
    );

    // include the user token if it exists
    if ( $this->config['user_token'] )
      $defaults['oauth_token'] = $this->config['user_token'];

    // safely encode
    foreach ($defaults as $k => $v) {
      $_defaults[$this->safe_encode($k)] = $this->safe_encode($v);
    }

    return $_defaults;
  }

  /**
   * Extracts and decodes OAuth parameters from the passed string
   *
   * @param string $body the response body from an OAuth flow method
   * @return array the response body safely decoded to an array of key => values
   */
  public function extract_params($body) {
    $kvs = explode('&', $body);
    $decoded = array();
    foreach ($kvs as $kv) {
      $kv = explode('=', $kv, 2);
      $kv[0] = $this->safe_decode($kv[0]);
      $kv[1] = $this->safe_decode($kv[1]);
      $decoded[$kv[0]] = $kv[1];
    }
    return $decoded;
  }

  /**
   * Prepares the HTTP method for use in the base string by converting it to
   * uppercase.
   *
   * @param string $method an HTTP method such as GET or POST
   * @return void value is stored to the class variable 'method'
   */
  private function prepare_method($method) {
    $this->method = strtoupper($method);
  }

  /**
   * Prepares the URL for use in the base string by ripping it apart and
   * reconstructing it.
   *
   * Ref: 3.4.1.2
   *
   * @param string $url the request URL
   * @return void value is stored to the class variable 'url'
   */
  private function prepare_url($url) {
    $parts = parse_url($url);

    $port   = isset($parts['port']) ? $parts['port'] : false;
    $scheme = $parts['scheme'];
    $host   = $parts['host'];
    $path   = isset($parts['path']) ? $parts['path'] : false;

    $port or $port = ($scheme == 'https') ? '443' : '80';

    if (($scheme == 'https' && $port != '443')
        || ($scheme == 'http' && $port != '80')) {
      $host = "$host:$port";
    }

    // the scheme and host MUST be lowercase
    $this->url = strtolower("$scheme://$host");
    // but not the path
    $this->url .= $path;
  }

  /**
   * Prepares all parameters for the base string and request.
   * Multipart parameters are ignored as they are not defined in the specification,
   * all other types of parameter are encoded for compatibility with OAuth.
   *
   * @param array $params the parameters for the request
   * @return void prepared values are stored in the class variable 'signing_params'
   */
  private function prepare_params($params) {
    // do not encode multipart parameters, leave them alone
    if ($this->config['multipart']) {
      $this->request_params = $params;
      $params = array();
    }

    // signing parameters are request parameters + OAuth default parameters
    $this->signing_params = array_merge($this->get_defaults(), (array)$params);

    // Remove oauth_signature if present
    // Ref: Spec: 9.1.1 ("The oauth_signature parameter MUST be excluded.")
    if (isset($this->signing_params['oauth_signature'])) {
      unset($this->signing_params['oauth_signature']);
    }

    // Parameters are sorted by name, using lexicographical byte value ordering.
    // Ref: Spec: 9.1.1 (1)
    uksort($this->signing_params, 'strcmp');

    // encode. Also sort the signed parameters from the POST parameters
    foreach ($this->signing_params as $k => $v) {
      $k = $this->safe_encode($k);

      if (is_array($v))
        $v = implode(',', $v);

      $v = $this->safe_encode($v);
      $_signing_params[$k] = $v;
      $kv[] = "{$k}={$v}";
    }

    // auth params = the default oauth params which are present in our collection of signing params
    $this->auth_params = array_intersect_key($this->get_defaults(), $_signing_params);
    if (isset($_signing_params['oauth_callback'])) {
      $this->auth_params['oauth_callback'] = $_signing_params['oauth_callback'];
      unset($_signing_params['oauth_callback']);
    }

    if (isset($_signing_params['oauth_verifier'])) {
      $this->auth_params['oauth_verifier'] = $_signing_params['oauth_verifier'];
      unset($_signing_params['oauth_verifier']);
    }

    // request_params is already set if we're doing multipart, if not we need to set them now
    if ( ! $this->config['multipart'])
      $this->request_params = array_diff_key($_signing_params, $this->get_defaults());

    // create the parameter part of the base string
    $this->signing_params = implode('&', $kv);
  }

  /**
   * Prepares the OAuth signing key
   *
   * @return void prepared signing key is stored in the class variable 'signing_key'
   */
  private function prepare_signing_key() {
    $this->signing_key = $this->safe_encode($this->config['consumer_secret']) . '&' . $this->safe_encode($this->config['user_secret']);
  }

  /**
   * Prepare the base string.
   * Ref: Spec: 9.1.3 ("Concatenate Request Elements")
   *
   * @return void prepared base string is stored in the class variable 'base_string'
   */
  private function prepare_base_string() {
    $url = $this->url;

    # if the host header is set we need to rewrite the basestring to use
    # that, instead of the request host. otherwise the signature won't match
    # on the server side
    if (!empty($this->custom_headers['Host'])) {
      $url = str_ireplace(
        $this->config['host'],
        $this->custom_headers['Host'],
        $url
      );
    }

    $base = array(
      $this->method,
      $url,
      $this->signing_params
    );
    $this->base_string = implode('&', $this->safe_encode($base));
  }

  /**
   * Prepares the Authorization header
   *
   * @return void prepared authorization header is stored in the class variable headers['Authorization']
   */
  private function prepare_auth_header() {
    unset($this->headers['Authorization']);

    uksort($this->auth_params, 'strcmp');
    if (!$this->config['as_header']) :
      $this->request_params = array_merge($this->request_params, $this->auth_params);
      return;
    endif;

    foreach ($this->auth_params as $k => $v) {
      $kv[] = "{$k}=\"{$v}\"";
    }
    $this->auth_header = 'OAuth ' . implode(', ', $kv);
    $this->headers['Authorization'] = $this->auth_header;
  }

  /**
   * Signs the request and adds the OAuth signature. This runs all the request
   * parameter preparation methods.
   *
   * @param string $method the HTTP method being used. e.g. POST, GET, HEAD etc
   * @param string $url the request URL without query string parameters
   * @param array $params the request parameters as an array of key=value pairs
   * @param string $useauth whether to use authentication when making the request.
   * @return void
   */
  private function sign($method, $url, $params, $useauth) {
    $this->prepare_method($method);
    $this->prepare_url($url);
    $this->prepare_params($params);

    // we don't sign anything is we're not using auth
    if ($useauth) {
      $this->prepare_base_string();
      $this->prepare_signing_key();

      $this->auth_params['oauth_signature'] = $this->safe_encode(
        base64_encode(
          hash_hmac(
            'sha1', $this->base_string, $this->signing_key, true
      )));

      $this->prepare_auth_header();
    }
  }

  /**
   * Make an HTTP request using this library. This method doesn't return anything.
   * Instead the response should be inspected directly.
   *
   * @param string $method the HTTP method being used. e.g. POST, GET, HEAD etc
   * @param string $url the request URL without query string parameters
   * @param array $params the request parameters as an array of key=value pairs. Default empty array
   * @param string $useauth whether to use authentication when making the request. Default true
   * @param string $multipart whether this request contains multipart data. Default false
   * @param array $headers any custom headers to send with the request. Default empty array
   * @return int the http response code for the request. 0 is returned if a connection could not be made
   */
  public function request($method, $url, $params=array(), $useauth=true, $multipart=false, $headers=array()) {
    // reset the request headers (we don't want to reuse them)
    $this->headers = array();
    $this->custom_headers = $headers;

    $this->config['multipart'] = $multipart;

    $this->create_nonce();
    $this->create_timestamp();

    $this->sign($method, $url, $params, $useauth);

    if (!empty($this->custom_headers))
      $this->headers = array_merge((array)$this->headers, (array)$this->custom_headers);

    return $this->curlit();
  }

  /**
   * Make a long poll HTTP request using this library. This method is
   * different to the other request methods as it isn't supposed to disconnect
   *
   * Using this method expects a callback which will receive the streaming
   * responses.
   *
   * @param string $method the HTTP method being used. e.g. POST, GET, HEAD etc
   * @param string $url the request URL without query string parameters
   * @param array $params the request parameters as an array of key=value pairs
   * @param string $callback the callback function to stream the buffer to.
   * @return void
   */
  public function streaming_request($method, $url, $params=array(), $callback='') {
    if ( ! empty($callback) ) {
      if ( ! is_callable($callback) ) {
        return false;
      }
      $this->config['streaming_callback'] = $callback;
    }
    $this->metrics['start']          = time();
    $this->metrics['interval_start'] = $this->metrics['start'];
    $this->metrics['tweets']         = 0;
    $this->metrics['last_tweets']    = 0;
    $this->metrics['bytes']          = 0;
    $this->metrics['last_bytes']     = 0;
    $this->config['is_streaming']    = true;
    $this->request($method, $url, $params);
  }

  /**
   * Handles the updating of the current Streaming API metrics.
   *
   * @return array the metrics for the streaming api connection
   */
  private function update_metrics() {
    $now = time();
    if (($this->metrics['interval_start'] + $this->config['streaming_metrics_interval']) > $now)
      return false;

    $this->metrics['tps'] = round( ($this->metrics['tweets'] - $this->metrics['last_tweets']) / $this->config['streaming_metrics_interval'], 2);
    $this->metrics['bps'] = round( ($this->metrics['bytes'] - $this->metrics['last_bytes']) / $this->config['streaming_metrics_interval'], 2);

    $this->metrics['last_bytes'] = $this->metrics['bytes'];
    $this->metrics['last_tweets'] = $this->metrics['tweets'];
    $this->metrics['interval_start'] = $now;
    return $this->metrics;
  }

  /**
   * Utility function to create the request URL in the requested format
   *
   * @param string $request the API method without extension
   * @param string $format the format of the response. Default json. Set to an empty string to exclude the format
   * @return string the concatenation of the host, API version, API method and format
   */
  public function url($request, $format='json') {
    $format = strlen($format) > 0 ? ".$format" : '';
    $proto  = $this->config['use_ssl'] ? 'https:/' : 'http:/';

    // backwards compatibility with v0.1
    if (isset($this->config['v']))
      $this->config['host'] = $this->config['host'] . '/' . $this->config['v'];

    $request = ltrim($request, '/');

    $pos = strlen($request) - strlen($format);
    if (substr($request, $pos) === $format)
      $request = substr_replace($request, '', $pos);

    return implode('/', array(
      $proto,
      $this->config['host'],
      $request . $format
    ));
  }

  /**
   * Public access to the private safe decode/encode methods
   *
   * @param string $text the text to transform
   * @param string $mode the transformation mode. either encode or decode
   * @return string $text transformed by the given $mode
   */
  public function transformText($text, $mode='encode') {
    return $this->{"safe_$mode"}($text);
  }

  /**
   * Utility function to parse the returned curl headers and store them in the
   * class array variable.
   *
   * @param object $ch curl handle
   * @param string $header the response headers
   * @return string the length of the header
   */
  private function curlHeader($ch, $header) {
    $this->response['raw'] .= $header;

    list($key, $value) = array_pad(explode(':', $header, 2), 2, null);

    $key = trim($key);
    $value = trim($value);

    if ( ! isset($this->response['headers'][$key])) {
      $this->response['headers'][$key] = $value;
    } else {
      if (!is_array($this->response['headers'][$key])) {
        $this->response['headers'][$key] = array($this->response['headers'][$key]);
      }
      $this->response['headers'][$key][] = $value;
    }

    return strlen($header);
  }

  /**
    * Utility function to parse the returned curl buffer and store them until
    * an EOL is found. The buffer for curl is an undefined size so we need
    * to collect the content until an EOL is found.
    *
    * This function calls the previously defined streaming callback method.
    *
    * @param object $ch curl handle
    * @param string $data the current curl buffer
    * @return int the length of the data string processed in this function
    */
  private function curlWrite($ch, $data) {
    $l = strlen($data);
    if (strpos($data, $this->config['streaming_eol']) === false) {
      $this->buffer .= $data;
      return $l;
    }

    $buffered = explode($this->config['streaming_eol'], $data);
    $content = $this->buffer . $buffered[0];

    $this->metrics['tweets']++;
    $this->metrics['bytes'] += strlen($content);

    if ( ! is_callable($this->config['streaming_callback']))
      return 0;

    $metrics = $this->update_metrics();
    $stop = call_user_func(
      $this->config['streaming_callback'],
      $content,
      strlen($content),
      $metrics
    );
    $this->buffer = $buffered[1];
    if ($stop)
      return 0;

    return $l;
  }

  /**
   * Makes a curl request. Takes no parameters as all should have been prepared
   * by the request method
   *
   * the response data is stored in the class variable 'response'
   *
   * @return int the http response code for the request. 0 is returned if a connection could not be made
   */
  private function curlit() {
    $this->response['raw'] = '';

    // method handling
    switch ($this->method) {
      case 'POST':
        break;
      default:
        // GET, DELETE request so convert the parameters to a querystring
        if ( ! empty($this->request_params)) {
          foreach ($this->request_params as $k => $v) {
            // Multipart params haven't been encoded yet.
            // Not sure why you would do a multipart GET but anyway, here's the support for it
            if ($this->config['multipart']) {
              $params[] = $this->safe_encode($k) . '=' . $this->safe_encode($v);
            } else {
              $params[] = $k . '=' . $v;
            }
          }
          $qs = implode('&', $params);
          $this->url = strlen($qs) > 0 ? $this->url . '?' . $qs : $this->url;
          $this->request_params = array();
        }
        break;
    }

    // configure curl
    $c = curl_init();
    curl_setopt_array($c, array(
      CURLOPT_USERAGENT      => $this->config['user_agent'],
      CURLOPT_CONNECTTIMEOUT => $this->config['curl_connecttimeout'],
      CURLOPT_TIMEOUT        => $this->config['curl_timeout'],
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_SSL_VERIFYPEER => $this->config['curl_ssl_verifypeer'],
      CURLOPT_SSL_VERIFYHOST => $this->config['curl_ssl_verifyhost'],

      CURLOPT_FOLLOWLOCATION => $this->config['curl_followlocation'],
      CURLOPT_PROXY          => $this->config['curl_proxy'],
      CURLOPT_ENCODING       => $this->config['curl_encoding'],
      CURLOPT_URL            => $this->url,
      // process the headers
      CURLOPT_HEADERFUNCTION => array($this, 'curlHeader'),
      CURLOPT_HEADER         => false,
      CURLINFO_HEADER_OUT    => true,
    ));

    if ($this->config['curl_cainfo'] !== false)
      curl_setopt($c, CURLOPT_CAINFO, $this->config['curl_cainfo']);

    if ($this->config['curl_capath'] !== false)
      curl_setopt($c, CURLOPT_CAPATH, $this->config['curl_capath']);

    if ($this->config['curl_proxyuserpwd'] !== false)
      curl_setopt($c, CURLOPT_PROXYUSERPWD, $this->config['curl_proxyuserpwd']);

    if ($this->config['is_streaming']) {
      // process the body
      $this->response['content-length'] = 0;
      curl_setopt($c, CURLOPT_TIMEOUT, 0);
      curl_setopt($c, CURLOPT_WRITEFUNCTION, array($this, 'curlWrite'));
    }

    switch ($this->method) {
      case 'GET':
        break;
      case 'POST':
        curl_setopt($c, CURLOPT_POST, true);
        curl_setopt($c, CURLOPT_POSTFIELDS, $this->request_params);
        break;
      default:
        curl_setopt($c, CURLOPT_CUSTOMREQUEST, $this->method);
    }

    if ( ! empty($this->request_params) ) {
      // if not doing multipart we need to implode the parameters
      if ( ! $this->config['multipart'] ) {
        foreach ($this->request_params as $k => $v) {
          $ps[] = "{$k}={$v}";
        }
        $this->request_params = implode('&', $ps);
      }
      curl_setopt($c, CURLOPT_POSTFIELDS, $this->request_params);
    }

    if ( ! empty($this->headers)) {
      foreach ($this->headers as $k => $v) {
        $headers[] = trim($k . ': ' . $v);
      }
      curl_setopt($c, CURLOPT_HTTPHEADER, $headers);
    }

    if (isset($this->config['prevent_request']) && (true == $this->config['prevent_request']))
      return 0;

    // do it!
    $response = curl_exec($c);
    $code = curl_getinfo($c, CURLINFO_HTTP_CODE);
    $info = curl_getinfo($c);
    $error = curl_error($c);
    $errno = curl_errno($c);
    curl_close($c);

    // store the response
    $this->response['code'] = $code;
    $this->response['response'] = $response;
    $this->response['info'] = $info;
    $this->response['error'] = $error;
    $this->response['errno'] = $errno;

    if (!isset($this->response['raw'])) {
      $this->response['raw'] = '';
    }
    $this->response['raw'] .= $response;

    return $code;
  }
}