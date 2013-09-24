# tmhOAuth

An OAuth 1.0A library written in PHP by @themattharris, specifically for use
with the Twitter API.

**Disclaimer**: This project is a work in progress. Please use the issue tracker
to report any enhancements or issues you encounter.

## Goals

- Support OAuth 1.0A
- Use Authorisation headers instead of query string or POST parameters
- Allow uploading of images
- Provide enough information to assist with debugging

## Dependencies

The library has been tested with PHP 5.3+ and relies on CURL and hash_hmac. The
vast majority of hosting providers include these libraries and run with PHP 5.1+.

The code makes use of hash_hmac, which was introduced in PHP 5.1.2. If your version
of PHP is lower than this you should ask your hosting provider for an update.

## A note about security and SSL

Version 0.60 hardened the security of the library and defaulted `curl_ssl_verifypeer` to `true`.
As some hosting providers do not provide the most current certificate root file
it is now included in this repository. If the version is out of date OR you prefer
to download the certificate roots yourself, you can get them
from: http://curl.haxx.se/ca/cacert.pem

Before upgrading the version of tmhOAuth that you use, be sure to verify the SSL
handling works on your server by running the `examples/verify_ssl.php` script.

## Usage

This will be built out later but for the moment review the examples repository
<https://github.com/themattharris/tmhOAuth-examples> for ways the library can be
used. Each example contains instructions on how to use it.

## Notes for users of previous versions

If you previously used version 0.4 be aware the utility functions
have now been broken into their own file. Before you use version 0.5+ in your app
test locally to ensure your code doesn't need tmhUtilities included.

If you used custom HTTP request headers when they were defined as `'key: value'` strings
you should now define them as `'key' => 'value'` pairs.

Versions prior to 0.7.3 collapsed headers with the same value into one
$tmhOAuth->response['headers'] key. Since 0.7.3 headers with the same key will use an array
to store their values.

## Change History
### 0.7.5 - 20 Februrary 2013
- tidying up of composer.json. (Issue #112) Props: ceeram

### 0.7.4 - 19 Februrary 2013
- corrections to composer.json to support packagists requirements. (Issue #110)

### 0.7.3 - 18 Februrary 2013
- add support for making requests with the host header being different to the request host.
- ensure headers with the same key do not overwrite each other in $tmhOAuth->response['headers'].
- removed examples submodule in favor of examples including tmhOAuth, rather than tmhOAuth including examples
- made it so that if param values are sent to $tmhOAuth->request as an array (key -> array()) then $tmhOAuth->prepare_params will now implode them using ','
- fixed composer. (Issue #99). Props: rasa
- fixed PHPDoc. (Issue #47). Props: trante
- instead of void, $tmhOAuth->curlit now returns 0 if 'prevent_request' is set

### 0.7.2 - 01 November 2012
- use DIRECTORY_SEPARATOR for multi-environment support. (Issue #80) Props: whallz
- tidied up the curlHeader function to use explode instead of substr and store the keys in the format they are returned from the API
- removed content-length hack as it isn't needed if CURLOPT_POSTFIELDS is initialized on all POSTs
- removed the expects header hack as Twitter no longer requires it to be there
- introduce composer.json. (Issues #39, #77, #85) Props: akandels, conradkleinespel, dguyon, kud, philsturgeon, willdurand
- added support for specifying custom headers when using $tmhOAuth->request. (Issue #98)

### 0.7.1 - 27 October 2012
- set content-length to 0 explictly to avoid a bug between libcurl and Twitter. (Issue #94)
- allow initialization without a configuration array (default config to array())
- prevent ->url allowing double slashes in paths

### 0.7.0 - 04 September 2012
- changed version numbers to x.y.z format
- stronger method scoping (public and private)
- Typo fix in depenencies. (Issue #42) Props: tantek
- Only lowercase the host and scheme, and not path, in prepare_url. (Issue #56) Props: uzyn
- Fixed a number of PHP warnings by changing some tmhUtilty methods to static. (Issue #52) Props: DrayChou
- Raw headers and response body are now available as `$tmhOAuth->response['raw']`
- Moved the examples to their own repository <https://github.com/themattharris/tmhOAuth-examples>
- Removed the `noexamples` branch as master does not contain examples anymore
- Introduced `$tmhOAuth->config['timezone']` and set `date_default_timezone_set`. (Issue #70) Props: iamctodd

### 0.621 - 12 March 2012
- Ensure `$_SERVER['HTTPS']` isset before checking it's value. Props: kud

### 0.62 - 01 March 2012
- Fix array merging bug. Props: julien-c
- use is_callable instead of function_exists: Props: samwierema
- Allow options to be specified for the entify function. Props: davidcroda
- protocol was not inferred correctly for https when ['HTTPS'] == 'on'. Props: ospector
- Switched to https for twitter.com display URLs
- Improved the search results example

### 0.61 - 16 January 2012
- Removed trailing ?> from tmhOAuth.php and tmhUtilities.php to meet the Zend Framework's coding practices. Props: reedy
- Fixed bug where CURLOPT_SSL_VERIFYHOST was defaulted to true when it should have been defaulted to 2. Props: kevinsmcarthur

### 0.60 - 29 December 2011
- Changed any use of implode to the preferred format of implode($glue, $pieces). Props: reedy
- Moved oauth_verifier to the authorization header as shown in example of RFC 5849. Props: spacenick
- added curl error and error number values to the $tmhOAuth->response object
- added an example script for testing the SSL connection to twitter.com with the new SSL configuration of tmhOAuth
- added a function to generate the useragent depending on whether SSL is on or not
- defaulted CURLOPT_SSL_VERIFYPEER to true
- added CURLOPT_SSL_VERIFYHOST and defaulted it to true
- added the most current cacert.pem file from http://curl.haxx.se/ca/cacert.pem and configured curl to use it

### 0.58 - 29 December 2011
- Rearranged some configuration variables around to make commenting easier
- Standarised on lowercase booleans

### 0.57 - 11 December 2011
- Fixed prevent_request so OAuth Echo requests work again.
- Added a TwitPic OAuth Echo example

### 0.56 - 29 September 2011
- Fixed version reference in the UserAgent
- Updated tmhUtilities::entify with support for media
- Updated tmhUtilities::entify with support for multibyte characters. Props: andersonshatch

### 0.55 - 29 September 2011
- Added support for content encoding. Defaults to whatever localhost supports. Props: yusuke

### 0.54 - 29 September 2011
- User-Agent is now configurable and includes the current version number of the script
- Updated the Streaming examples to use SSL

### 0.53 - 15 July 2011
- Fixed issue where headers were being duplicated if the library was called more than once.
- Updated examples to fit the new location of access tokens and secrets on dev.twitter.com
- Added Photo Tweet example

### 0.52 - 06 July 2011
- Fixed issue where the preference for include_time in create_nonce was being ignored

### 0.51 - 06 July 2011
- Use isset instead of suppress errors. Props: funkatron
- Added example of using the Search API
- Added example of using friends/ids and users/lookup to get details of a users friends
- Added example of the authorize OAuth webflow

### 0.5 - 29 March 2011
- Moved utility functions out of the main class and into the tmhUtilities class.
- Added the ability to send OAuth parameters as part of the querystring or POST body.
- Section 3.4.1.2 says the url must be lowercase so prepare URL now does this.
- Added a convenience method for accessing the safe_encode/decode transforms.
- Updated the examples to use the new utilities library.
- Added examples for sitestreams and userstreams.
- Added a more advanced streaming API example.

### 0.4 - 03 March 2011
- Fixed handling of parameters when using DELETE. Thanks to yusuke for reporting
- Fixed php_self to handle port numbers other than 80/443. Props: yusuke
- Updated function pr to use pre only when not running in CLI mode
- Add support for proxy servers. Props juanchorossi
- Function request now returns the HTTP status code. Props: kronenthaler
- Documentation fixes for xAuth. Props: 140dev
- Some minor code formatting changes

### 0.3 - 28 September 2010
- Moved entities rendering into the library

### 0.2 - 17 September 2010
- Added support for the Streaming API

### 0.14 - 17 September 2010
- Fixed authorisation header for use with OAuth Echo

### 0.13 - 17 September 2010
- Added use_ssl configuration parameter
- Fixed config array typo
- Removed v from the config
- Remove protocol from the host (configured by use_ssl)
- Added include for easier debugging

### 0.12 - 17 September 2010

- Moved curl options to config
- Added the ability for curl to follow redirects, default false

### 0.11 - 17 September 2010

- Fixed a bug in the GET requests

### 0.1 - 26 August 2010

- Initial beta version

## Community

License: Apache 2 (see [included LICENSE file](https://github.com/themattharris/tmhOAuth/blob/master/LICENSE))

Follow [@tmhOAuth](https://twitter.com/intent/follow?screen_name=tmhOAuth) to receive updates on releases, or ask for support
Follow me on Twitter: [@themattharris](https://twitter.com/intent/follow?screen_name=themattharris)
Check out the Twitter Developer Resources: <https://dev.twitter.com>

## To Do

- Add good behavior logic to the Streaming API handler - i.e. on disconnect back off
- Async Curl support