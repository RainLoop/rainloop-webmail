<?php
/**
 * tmhUtilities
 *
 * Helpful utility and Twitter formatting functions
 *
 * @author themattharris
 * @version 0.5.0
 *
 * 04 September 2012
 */
class tmhUtilities {
  const VERSION = '0.5.0';
  /**
   * Entifies the tweet using the given entities element.
   * Deprecated.
   * You should instead use entify_with_options.
   *
   * @param array $tweet the json converted to normalised array
   * @param array $replacements if specified, the entities and their replacements will be stored to this variable
   * @return the tweet text with entities replaced with hyperlinks
   */
  public static function entify($tweet, &$replacements=array()) {
    return tmhUtilities::entify_with_options($tweet, array(), $replacements);
  }

  /**
   * Entifies the tweet using the given entities element, using the provided
   * options.
   *
   * @param array $tweet the json converted to normalised array
   * @param array $options settings to be used when rendering the entities
   * @param array $replacements if specified, the entities and their replacements will be stored to this variable
   * @return the tweet text with entities replaced with hyperlinks
   */
  public static function entify_with_options($tweet, $options=array(), &$replacements=array()) {
    $default_opts = array(
      'encoding' => 'UTF-8',
      'target'   => '',
    );

    $opts = array_merge($default_opts, $options);

    $encoding = mb_internal_encoding();
    mb_internal_encoding($opts['encoding']);

    $keys = array();
    $is_retweet = false;

    if (isset($tweet['retweeted_status'])) {
      $tweet = $tweet['retweeted_status'];
      $is_retweet = true;
    }

    if (!isset($tweet['entities'])) {
      return $tweet['text'];
    }

    $target = (!empty($opts['target'])) ? ' target="'.$opts['target'].'"' : '';

    // prepare the entities
    foreach ($tweet['entities'] as $type => $things) {
      foreach ($things as $entity => $value) {
        $tweet_link = "<a href=\"https://twitter.com/{$tweet['user']['screen_name']}/statuses/{$tweet['id']}\"{$target}>{$tweet['created_at']}</a>";

        switch ($type) {
          case 'hashtags':
            $href = "<a href=\"https://twitter.com/search?q=%23{$value['text']}\"{$target}>#{$value['text']}</a>";
            break;
          case 'user_mentions':
            $href = "@<a href=\"https://twitter.com/{$value['screen_name']}\" title=\"{$value['name']}\"{$target}>{$value['screen_name']}</a>";
            break;
          case 'urls':
          case 'media':
            $url = empty($value['expanded_url']) ? $value['url'] : $value['expanded_url'];
            $display = isset($value['display_url']) ? $value['display_url'] : str_replace('http://', '', $url);
            // Not all pages are served in UTF-8 so you may need to do this ...
            $display = urldecode(str_replace('%E2%80%A6', '&hellip;', urlencode($display)));
            $href = "<a href=\"{$value['url']}\"{$target}>{$display}</a>";
            break;
        }
        $keys[$value['indices']['0']] = mb_substr(
          $tweet['text'],
          $value['indices']['0'],
          $value['indices']['1'] - $value['indices']['0']
        );
        $replacements[$value['indices']['0']] = $href;
      }
    }

    ksort($replacements);
    $replacements = array_reverse($replacements, true);
    $entified_tweet = $tweet['text'];
    foreach ($replacements as $k => $v) {
      $entified_tweet = mb_substr($entified_tweet, 0, $k).$v.mb_substr($entified_tweet, $k + strlen($keys[$k]));
    }
    $replacements = array(
      'replacements' => $replacements,
      'keys' => $keys
    );

    mb_internal_encoding($encoding);
    return $entified_tweet;
  }

  /**
   * Returns the current URL. This is instead of PHP_SELF which is unsafe
   *
   * @param bool $dropqs whether to drop the querystring or not. Default true
   * @return string the current URL
   */
  public static function php_self($dropqs=true) {
    $protocol = 'http';
    if (isset($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) == 'on') {
      $protocol = 'https';
    } elseif (isset($_SERVER['SERVER_PORT']) && ($_SERVER['SERVER_PORT'] == '443')) {
      $protocol = 'https';
    }

    $url = sprintf('%s://%s%s',
      $protocol,
      $_SERVER['SERVER_NAME'],
      $_SERVER['REQUEST_URI']
    );

    $parts = parse_url($url);

    $port = $_SERVER['SERVER_PORT'];
    $scheme = $parts['scheme'];
    $host = $parts['host'];
    $path = @$parts['path'];
    $qs   = @$parts['query'];

    $port or $port = ($scheme == 'https') ? '443' : '80';

    if (($scheme == 'https' && $port != '443')
        || ($scheme == 'http' && $port != '80')) {
      $host = "$host:$port";
    }
    $url = "$scheme://$host$path";
    if ( ! $dropqs)
      return "{$url}?{$qs}";
    else
      return $url;
  }

  public static function is_cli() {
    return (PHP_SAPI == 'cli' && empty($_SERVER['REMOTE_ADDR']));
  }

  /**
   * Debug function for printing the content of an object
   *
   * @param mixes $obj
   */
  public static function pr($obj) {

    if (!self::is_cli())
      echo '<pre style="word-wrap: break-word">';
    if ( is_object($obj) )
      print_r($obj);
    elseif ( is_array($obj) )
      print_r($obj);
    else
      echo $obj;
    if (!self::is_cli())
      echo '</pre>';
  }

  /**
   * Make an HTTP request using this library. This method is different to 'request'
   * because on a 401 error it will retry the request.
   *
   * When a 401 error is returned it is possible the timestamp of the client is
   * too different to that of the API server. In this situation it is recommended
   * the request is retried with the OAuth timestamp set to the same as the API
   * server. This method will automatically try that technique.
   *
   * This method doesn't return anything. Instead the response should be
   * inspected directly.
   *
   * @param string $method the HTTP method being used. e.g. POST, GET, HEAD etc
   * @param string $url the request URL without query string parameters
   * @param array $params the request parameters as an array of key=value pairs
   * @param string $useauth whether to use authentication when making the request. Default true.
   * @param string $multipart whether this request contains multipart data. Default false
   */
  public static function auto_fix_time_request($tmhOAuth, $method, $url, $params=array(), $useauth=true, $multipart=false) {
    $tmhOAuth->request($method, $url, $params, $useauth, $multipart);

    // if we're not doing auth the timestamp isn't important
    if ( ! $useauth)
      return;

    // some error that isn't a 401
    if ($tmhOAuth->response['code'] != 401)
      return;

    // some error that is a 401 but isn't because the OAuth token and signature are incorrect
    // TODO: this check is horrid but helps avoid requesting twice when the username and password are wrong
    if (stripos($tmhOAuth->response['response'], 'password') !== false)
     return;

    // force the timestamp to be the same as the Twitter servers, and re-request
    $tmhOAuth->auto_fixed_time = true;
    $tmhOAuth->config['force_timestamp'] = true;
    $tmhOAuth->config['timestamp'] = strtotime($tmhOAuth->response['headers']['date']);
    return $tmhOAuth->request($method, $url, $params, $useauth, $multipart);
  }

  /**
   * Asks the user for input and returns the line they enter
   *
   * @param string $prompt the text to display to the user
   * @return the text entered by the user
   */
  public static function read_input($prompt) {
    echo $prompt;
    $handle = fopen("php://stdin","r");
    $data = fgets($handle);
    return trim($data);
  }

  /**
   * Get a password from the shell.
   *
   * This function works on *nix systems only and requires shell_exec and stty.
   *
   * @param  boolean $stars Wether or not to output stars for given characters
   * @return string
   * @url http://www.dasprids.de/blog/2008/08/22/getting-a-password-hidden-from-stdin-with-php-cli
   */
  public static function read_password($prompt, $stars=false) {
    echo $prompt;
    $style = shell_exec('stty -g');

    if ($stars === false) {
      shell_exec('stty -echo');
      $password = rtrim(fgets(STDIN), "\n");
    } else {
      shell_exec('stty -icanon -echo min 1 time 0');
      $password = '';
      while (true) :
        $char = fgetc(STDIN);
        if ($char === "\n") :
          break;
        elseif (ord($char) === 127) :
          if (strlen($password) > 0) {
            fwrite(STDOUT, "\x08 \x08");
            $password = substr($password, 0, -1);
          }
        else
          fwrite(STDOUT, "*");
          $password .= $char;
        endif;
      endwhile;
    }

    // Reset
    shell_exec('stty ' . $style);
    echo PHP_EOL;
    return $password;
  }

  /**
   * Check if one string ends with another
   *
   * @param string $haystack the string to check inside of
   * @param string $needle the string to check $haystack ends with
   * @return true if $haystack ends with $needle, false otherwise
   */
  public static function endswith($haystack, $needle) {
    $haylen  = strlen($haystack);
    $needlelen = strlen($needle);
    if ($needlelen > $haylen)
      return false;

    return substr_compare($haystack, $needle, -$needlelen) === 0;
  }
}