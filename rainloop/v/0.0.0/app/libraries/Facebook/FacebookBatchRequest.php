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

use ArrayIterator;
use IteratorAggregate;
use ArrayAccess;
use Facebook\Authentication\AccessToken;
use Facebook\Exceptions\FacebookSDKException;

/**
 * Class BatchRequest
 *
 * @package Facebook
 */
class FacebookBatchRequest extends FacebookRequest implements IteratorAggregate, ArrayAccess
{
    /**
     * @var array An array of FacebookRequest entities to send.
     */
    protected $requests;

    /**
     * @var array An array of files to upload.
     */
    protected $attachedFiles;

    /**
     * Creates a new Request entity.
     *
     * @param FacebookApp|null        $app
     * @param array                   $requests
     * @param AccessToken|string|null $accessToken
     * @param string|null             $graphVersion
     */
    public function __construct(FacebookApp $app = null, array $requests = [], $accessToken = null, $graphVersion = null)
    {
        parent::__construct($app, $accessToken, 'POST', '', [], null, $graphVersion);

        $this->add($requests);
    }

    /**
     * A a new request to the array.
     *
     * @param FacebookRequest|array $request
     * @param string|null           $name
     *
     * @return FacebookBatchRequest
     *
     * @throws \InvalidArgumentException
     */
    public function add($request, $name = null)
    {
        if (is_array($request)) {
            foreach ($request as $key => $req) {
                $this->add($req, $key);
            }

            return $this;
        }

        if (!$request instanceof FacebookRequest) {
            throw new \InvalidArgumentException('Argument for add() must be of type array or FacebookRequest.');
        }

        $this->addFallbackDefaults($request);
        $requestToAdd = [
            'name' => $name,
            'request' => $request,
        ];

        // File uploads
        $attachedFiles = $this->extractFileAttachments($request);
        if ($attachedFiles) {
            $requestToAdd['attached_files'] = $attachedFiles;
        }
        $this->requests[] = $requestToAdd;

        return $this;
    }

    /**
     * Ensures that the FacebookApp and access token fall back when missing.
     *
     * @param FacebookRequest $request
     *
     * @throws FacebookSDKException
     */
    public function addFallbackDefaults(FacebookRequest $request)
    {
        if (!$request->getApp()) {
            $app = $this->getApp();
            if (!$app) {
                throw new FacebookSDKException('Missing FacebookApp on FacebookRequest and no fallback detected on FacebookBatchRequest.');
            }
            $request->setApp($app);
        }

        if (!$request->getAccessToken()) {
            $accessToken = $this->getAccessToken();
            if (!$accessToken) {
                throw new FacebookSDKException('Missing access token on FacebookRequest and no fallback detected on FacebookBatchRequest.');
            }
            $request->setAccessToken($accessToken);
        }
    }

    /**
     * Extracts the files from a request.
     *
     * @param FacebookRequest $request
     *
     * @return string|null
     *
     * @throws FacebookSDKException
     */
    public function extractFileAttachments(FacebookRequest $request)
    {
        if (!$request->containsFileUploads()) {
            return null;
        }

        $files = $request->getFiles();
        $fileNames = [];
        foreach ($files as $file) {
            $fileName = uniqid();
            $this->addFile($fileName, $file);
            $fileNames[] = $fileName;
        }

        $request->resetFiles();

        // @TODO Does Graph support multiple uploads on one endpoint?
        return implode(',', $fileNames);
    }

    /**
     * Return the FacebookRequest entities.
     *
     * @return array
     */
    public function getRequests()
    {
        return $this->requests;
    }

    /**
     * Prepares the requests to be sent as a batch request.
     *
     * @return string
     */
    public function prepareRequestsForBatch()
    {
        $this->validateBatchRequestCount();

        $params = [
            'batch' => $this->convertRequestsToJson(),
            'include_headers' => true,
        ];
        $this->setParams($params);
    }

    /**
     * Converts the requests into a JSON(P) string.
     *
     * @return string
     */
    public function convertRequestsToJson()
    {
        $requests = [];
        foreach ($this->requests as $request) {
            $attachedFiles = isset($request['attached_files']) ? $request['attached_files'] : null;
            $requests[] = $this->requestEntityToBatchArray($request['request'], $request['name'], $attachedFiles);
        }

        return json_encode($requests);
    }

    /**
     * Validate the request count before sending them as a batch.
     *
     * @throws FacebookSDKException
     */
    public function validateBatchRequestCount()
    {
        $batchCount = count($this->requests);
        if ($batchCount === 0) {
            throw new FacebookSDKException('There are no batch requests to send.');
        } elseif ($batchCount > 50) {
            // Per: https://developers.facebook.com/docs/graph-api/making-multiple-requests#limits
            throw new FacebookSDKException('You cannot send more than 50 batch requests at a time.');
        }
    }

    /**
     * Converts a Request entity into an array that is batch-friendly.
     *
     * @param FacebookRequest $request       The request entity to convert.
     * @param string|null     $requestName   The name of the request.
     * @param string|null     $attachedFiles Names of files associated with the request.
     *
     * @return array
     */
    public function requestEntityToBatchArray(FacebookRequest $request, $requestName = null, $attachedFiles = null)
    {
        $compiledHeaders = [];
        $headers = $request->getHeaders();
        foreach ($headers as $name => $value) {
            $compiledHeaders[] = $name . ': ' . $value;
        }

        $batch = [
            'headers' => $compiledHeaders,
            'method' => $request->getMethod(),
            'relative_url' => $request->getUrl(),
        ];

        // Since file uploads are moved to the root request of a batch request,
        // the child requests will always be URL-encoded.
        $body = $request->getUrlEncodedBody()->getBody();
        if ($body) {
            $batch['body'] = $body;
        }

        if (isset($requestName)) {
            $batch['name'] = $requestName;
        }

        if (isset($attachedFiles)) {
            $batch['attached_files'] = $attachedFiles;
        }

        // @TODO Add support for "omit_response_on_success"
        // @TODO Add support for "depends_on"
        // @TODO Add support for JSONP with "callback"

        return $batch;
    }

    /**
     * Get an iterator for the items.
     *
     * @return ArrayIterator
     */
    public function getIterator()
    {
        return new ArrayIterator($this->requests);
    }

    /**
     * @inheritdoc
     */
    public function offsetSet($offset, $value)
    {
        $this->add($value, $offset);
    }

    /**
     * @inheritdoc
     */
    public function offsetExists($offset)
    {
        return isset($this->requests[$offset]);
    }

    /**
     * @inheritdoc
     */
    public function offsetUnset($offset)
    {
        unset($this->requests[$offset]);
    }

    /**
     * @inheritdoc
     */
    public function offsetGet($offset)
    {
        return isset($this->requests[$offset]) ? $this->requests[$offset] : null;
    }
}
