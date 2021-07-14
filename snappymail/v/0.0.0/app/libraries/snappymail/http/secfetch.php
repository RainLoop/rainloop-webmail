<?php

namespace SnappyMail\HTTP;

abstract class SecFetch
{
	/**
	 * audio
	 *   The destination is audio data. This might originate from an HTML <audio> tag.
	 * audioworklet
	 *   The destination is data being fetched for use by an audio worklet. This might originate from a call to audioWorklet.addModule().
	 * document
	 *   The destination is a document (HTML or XML), and the request is the result of a user-initiated top-level navigation (e.g. resulting from a user clicking a link).
	 * embed
	 *   The destination is embedded content. This might originate from an HTML <embed> tag.
	 * empty
	 *   The destination is the empty string. This is used for destinations that do not have their own value. For exmaple fetch(), navigator.sendBeacon(), EventSource, XMLHttpRequest, WebSocket, etc.
	 * font
	 *   The destination is a font. This might originate from CSS @font-face.
	 * frame
	 *   The destination is a frame. This might originate from an HTML <frame> tag.
	 * iframe
	 *   The destination is an iframe. This might originate from an HTML <iframe> tag.
	 * image
	 *   The destination is an image. This might originate from an HTML <image>, SVG <image>, CSS background-image, CSS cursor, CSS list-style-image, etc.
	 * manifest
	 *   The destination is a manifest. This might originate from an HTML <link rel=manifest>).
	 * object
	 *   The destination is an object. This might originate from an HTML <object> tag.
	 * paintworklet
	 *   The destination is a paint worklet. This might originate from a call to CSS.PaintWorklet.addModule().
	 * report
	 *   The destination is a report (for exmaple, a content security policy report).
	 * script
	 *   The destination is a script. This might originate from an HTML <script> tag or a call to WorkerGlobalScope.importScripts().
	 * serviceworker
	 *   The destination is a service worker. This might originate from a call to navigator.serviceWorker.register().
	 * sharedworker
	 *   The destination is a shared worker. This might originate from a SharedWorker.
	 * style
	 *   The destination is a style. This might originate from an HTML <link rel=stylesheet> or a CSS @import.
	 * track
	 *   The destination is an HTML text track. This might originate from an HTML <track> tag.
	 * video
	 *   The destination is video data. This might originate from an HTML <video> tag.
	 * worker
	 *   The destination is a Worker.
	 * xslt
	 *   The destination is an XLST transform.
	 */
	public static function dest(string $type) : bool
	{
		return $type === ($_SERVER['HTTP_SEC_FETCH_DEST'] ?? 'document');
	}

	/**
	 * cors
	 *   The request is a CORS protocol request.
	 * navigate
	 *   The request is initiated by navigation between HTML documents.
	 * no-cors
	 *   The request is a no-cors request.
	 * same-origin
	 *   The request is made from the same origin as the resource that is being requested.
	 * websocket
	 *   The request is being made to establish a WebSocket connection.
	 */
	public static function mode(string $type) : bool
	{
		return $type === ($_SERVER['HTTP_SEC_FETCH_MODE'] ?? 'navigate');
	}

	/**
	 * cross-site
	 *   The request initiator and the server hosting the resource have a different
	 *   site (i.e. a request by "potentially-evil.com" for a resource at "example.com").
	 * same-origin
	 *   The request initiator and the server hosting the resource have the same origin (same scheme, host and port).
	 * same-site
	 *   The request initiator and the server hosting the resource have the same scheme,
	 *   domain and/or subdomain, but not necessarily the same port.
	 * none
	 *   This request is a user-originated operation. For example: entering a URL into the address bar,
	 *   opening a bookmark, or dragging-and-dropping a file into the browser window.
	 */
	public static function site(string $type) : bool
	{
		return $type === ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? 'none');
	}

	public static function user() : bool
	{
		return '?1' === ($_SERVER['HTTP_SEC_FETCH_USER'] ?? '');
	}

	public static function isEntering() : bool
	{
		if (!isset($_SERVER['HTTP_SEC_FETCH_SITE'])) {
			return true;
		}

		return static::user()
			&& static::dest('document')
			&& static::mode('navigate')
			&& 'GET' === $_SERVER['REQUEST_METHOD'];
	}

	public static function isSameOrigin() : bool
	{
		return !isset($_SERVER['HTTP_SEC_FETCH_SITE'])
			|| 'same-origin' === $_SERVER['HTTP_SEC_FETCH_SITE'];
	}

}
