<?php
/**
 * Copyright 2014 Facebook, Inc.
 *
 * You are hereby granted a non-exclusive, worldwide, royalty-free license to
 * use, copy, modify, and distribute this software in source code or binary
 * form for use in connection with the web services and APIs provided by
 * Facebook.
 *
 * As with any software that integrates with the Facebook platform, your use
 * of this software is subject to the Facebook Developer Principles and
 * Policies [http://developers.facebook.com/policy/]. This copyright notice
 * shall be included in all copies or substantial portions of the software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */
namespace Facebook;

use Facebook\Authentication\AccessToken;
use Facebook\Url\FacebookUrlManipulator;
use Facebook\FileUpload\FacebookFile;
use Facebook\FileUpload\FacebookVideo;
use Facebook\Http\RequestBodyMultipart;
use Facebook\Http\RequestBodyUrlEncoded;
use Facebook\Exceptions\FacebookSDKException;

/**
 * Class Request
 *
 * @package Facebook
 */
class FacebookRequest
{
    /**
     * @var FacebookApp The Facebook app entity.
     */
    protected $app;

    /**
     * @var string|null The access token to use for this request.
     */
    protected $accessToken;

    /**
     * @var string The HTTP method for this request.
     */
    protected $method;

    /**
     * @var string The Graph endpoint for this request.
     */
    protected $endpoint;

    /**
     * @var array The headers to send with this request.
     */
    protected $headers = [];

    /**
     * @var array The parameters to send with this request.
     */
    protected $params = [];

    /**
     * @var array The files to send with this request.
     */
    protected $files = [];

    /**
     * @var string ETag to send with this request.
     */
    protected $eTag;

    /**
     * @var string Graph version to use for this request.
     */
    protected $graphVersion;

    /**
     * Creates a new Request entity.
     *
     * @param FacebookApp|null        $app
     * @param AccessToken|string|null $accessToken
     * @param string|null             $method
     * @param string|null             $endpoint
     * @param array|null              $params
     * @param string|null             $eTag
     * @param string|null             $graphVersion
     */
    public function __construct(FacebookApp $app = null, $accessToken = null, $method = null, $endpoint = null, array $params = [], $eTag = null, $graphVersion = null)
    {
        $this->setApp($app);
        $this->setAccessToken($accessToken);
        $this->setMethod($method);
        $this->setEndpoint($endpoint);
        $this->setParams($params);
        $this->setETag($eTag);
        $this->graphVersion = $graphVersion ?: Facebook::DEFAULT_GRAPH_VERSION;
    }

    /**
     * Set the access token for this request.
     *
     * @param AccessToken|string
     *
     * @return FacebookRequest
     */
    public function setAccessToken($accessToken)
    {
        $this->accessToken = $accessToken;
        if ($accessToken instanceof AccessToken) {
            $this->accessToken = $accessToken->getValue();
        }

        return $this;
    }

    /**
     * Sets the access token with one harvested from a URL or POST params.
     *
     * @param string $accessToken The access token.
     *
     * @return FacebookRequest
     *
     * @throws FacebookSDKException
     */
    public function setAccessTokenFromParams($accessToken)
    {
        $existingAccessToken = $this->getAccessToken();
        if (!$existingAccessToken) {
            $this->setAccessToken($accessToken);
        } elseif ($accessToken !== $existingAccessToken) {
            throw new FacebookSDKException('Access token mismatch. The access token provided in the FacebookRequest and the one provided in the URL or POST params do not match.');
        }

        return $this;
    }

    /**
     * Return the access token for this request.
     *
     * @return string|null
     */
    public function getAccessToken()
    {
        return $this->accessToken;
    }

    /**
     * Return the access token for this request an an AccessToken entity.
     *
     * @return AccessToken|null
     */
    public function getAccessTokenEntity()
    {
        return $this->accessToken ? new AccessToken($this->accessToken) : null;
    }

    /**
     * Set the FacebookApp entity used for this request.
     *
     * @param FacebookApp|null $app
     */
    public function setApp(FacebookApp $app = null)
    {
        $this->app = $app;
    }

    /**
     * Return the FacebookApp entity used for this request.
     *
     * @return FacebookApp
     */
    public function getApp()
    {
        return $this->app;
    }

    /**
     * Generate an app secret proof to sign this request.
     *
     * @return string|null
     */
    public function getAppSecretProof()
    {
        if (!$accessTokenEntity = $this->getAccessTokenEntity()) {
            return null;
        }

        return $accessTokenEntity->getAppSecretProof($this->app->getSecret());
    }

    /**
     * Validate that an access token exists for this request.
     *
     * @throws FacebookSDKException
     */
    public function validateAccessToken()
    {
        $accessToken = $this->getAccessToken();
        if (!$accessToken) {
            throw new FacebookSDKException('You must provide an access token.');
        }
    }

    /**
     * Set the HTTP method for this request.
     *
     * @param string
     *
     * @return FacebookRequest
     */
    public function setMethod($method)
    {
        $this->method = strtoupper($method);
    }

    /**
     * Return the HTTP method for this request.
     *
     * @return string
     */
    public function getMethod()
    {
        return $this->method;
    }

    /**
     * Validate that the HTTP method is set.
     *
     * @throws FacebookSDKException
     */
    public function validateMethod()
    {
        if (!$this->method) {
            throw new FacebookSDKException('HTTP method not specified.');
        }

        if (!in_array($this->method, ['GET', 'POST', 'DELETE'])) {
            throw new FacebookSDKException('Invalid HTTP method specified.');
        }
    }

    /**
     * Set the endpoint for this request.
     *
     * @param string
     *
     * @return FacebookRequest
     *
     * @throws FacebookSDKException
     */
    public function setEndpoint($endpoint)
    {
        // Harvest the access token from the endpoint to keep things in sync
        $params = FacebookUrlManipulator::getParamsAsArray($endpoint);
        if (isset($params['access_token'])) {
            $this->setAccessTokenFromParams($params['access_token']);
        }

        // Clean the token & app secret proof from the endpoint.
        $filterParams = ['access_token', 'appsecret_proof'];
        $this->endpoint = FacebookUrlManipulator::removeParamsFromUrl($endpoint, $filterParams);

        return $this;
    }

    /**
     * Return the HTTP method for this request.
     *
     * @return string
     */
    public function getEndpoint()
    {
        // For batch requests, this will be empty
        return $this->endpoint;
    }

    /**
     * Generate and return the headers for this request.
     *
     * @return array
     */
    public function getHeaders()
    {
        $headers = static::getDefaultHeaders();

        if ($this->eTag) {
            $headers['If-None-Match'] = $this->eTag;
        }

        return array_merge($this->headers, $headers);
    }

    /**
     * Set the headers for this request.
     *
     * @param array $headers
     */
    public function setHeaders(array $headers)
    {
        $this->headers = array_merge($this->headers, $headers);
    }

    /**
     * Sets the eTag value.
     *
     * @param string $eTag
     */
    public function setETag($eTag)
    {
        $this->eTag = $eTag;
    }

    /**
     * Set the params for this request.
     *
     * @param array $params
     *
     * @return FacebookRequest
     *
     * @throws FacebookSDKException
     */
    public function setParams(array $params = [])
    {
        if (isset($params['access_token'])) {
            $this->setAccessTokenFromParams($params['access_token']);
        }

        // Don't let these buggers slip in.
        unset($params['access_token'], $params['appsecret_proof']);

        // @TODO Refactor code above with this
        //$params = $this->sanitizeAuthenticationParams($params);
        $params = $this->sanitizeFileParams($params);
        $this->dangerouslySetParams($params);

        return $this;
    }

    /**
     * Set the params for this request without filtering them first.
     *
     * @param array $params
     *
     * @return FacebookRequest
     */
    public function dangerouslySetParams(array $params = [])
    {
        $this->params = array_merge($this->params, $params);

        return $this;
    }

    /**
     * Iterate over the params and pull out the file uploads.
     *
     * @param array $params
     *
     * @return array
     */
    public function sanitizeFileParams(array $params)
    {
        foreach ($params as $key => $value) {
            if ($value instanceof FacebookFile) {
                $this->addFile($key, $value);
                unset($params[$key]);
            }
        }

        return $params;
    }

    /**
     * Add a file to be uploaded.
     *
     * @param string       $key
     * @param FacebookFile $file
     */
    public function addFile($key, FacebookFile $file)
    {
        $this->files[$key] = $file;
    }

    /**
     * Removes all the files from the upload queue.
     */
    public function resetFiles()
    {
        $this->files = [];
    }

    /**
     * Get the list of files to be uploaded.
     *
     * @return array
     */
    public function getFiles()
    {
        return $this->files;
    }

    /**
     * Let's us know if there is a file upload with this request.
     *
     * @return boolean
     */
    public function containsFileUploads()
    {
        return !empty($this->files);
    }

    /**
     * Let's us know if there is a video upload with this request.
     *
     * @return boolean
     */
    public function containsVideoUploads()
    {
        foreach ($this->files as $file) {
            if ($file instanceof FacebookVideo) {
                return true;
            }
        }

        return false;
    }

    /**
     * Returns the body of the request as multipart/form-data.
     *
     * @return RequestBodyMultipart
     */
    public function getMultipartBody()
    {
        $params = $this->getPostParams();

        return new RequestBodyMultipart($params, $this->files);
    }

    /**
     * Returns the body of the request as URL-encoded.
     *
     * @return RequestBodyUrlEncoded
     */
    public function getUrlEncodedBody()
    {
        $params = $this->getPostParams();

        return new RequestBodyUrlEncoded($params);
    }

    /**
     * Generate and return the params for this request.
     *
     * @return array
     */
    public function getParams()
    {
        $params = $this->params;

        $accessToken = $this->getAccessToken();
        if ($accessToken) {
            $params['access_token'] = $accessToken;
            $params['appsecret_proof'] = $this->getAppSecretProof();
        }

        return $params;
    }

    /**
     * Only return params on POST requests.
     *
     * @return array
     */
    public function getPostParams()
    {
        if ($this->getMethod() === 'POST') {
            return $this->getParams();
        }

        return [];
    }

    /**
     * The graph version used for this request.
     *
     * @return string
     */
    public function getGraphVersion()
    {
        return $this->graphVersion;
    }

    /**
     * Generate and return the URL for this request.
     *
     * @return string
     */
    public function getUrl()
    {
        $this->validateMethod();

        $graphVersion = FacebookUrlManipulator::forceSlashPrefix($this->graphVersion);
        $endpoint = FacebookUrlManipulator::forceSlashPrefix($this->getEndpoint());

        $url = $graphVersion . $endpoint;

        if ($this->getMethod() !== 'POST') {
            $params = $this->getParams();
            $url = FacebookUrlManipulator::appendParamsToUrl($url, $params);
        }

        return $url;
    }

    /**
     * Return the default headers that every request should use.
     *
     * @return array
     */
    public static function getDefaultHeaders()
    {
        return [
            'User-Agent' => 'fb-php-' . Facebook::VERSION,
            'Accept-Encoding' => '*',
        ];
    }
}
