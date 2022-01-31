# postal-mime

Email parser for browser environments.

PostalMime can be run in the main web thread or from Web Workers.

PostalMime can be bundled using WebPack. In fact the distribution file is also built with WebPack.

## Source

Source code is available from [Github](https://github.com/postalsys/postal-mime).

## Demo

See this [example](https://kreata.ee/postal-mime/example/).

## Usage

### Free, AGPL-licensed version

First install the module from npm:

```
$ npm install postal-mime
```

next import the PostalMime class into your script:

```js
const { PostalMime } = require('postal-mime');
```

or when using as a global

```html
<script src="/path/to/postal-mime.js"></script>
<script>
    const PostalMime = postalMime.default;
</script>
```

### MIT version

MIT-licensed version is available for [Postal Systems subscribers](https://postalsys.com/).

First install the module from Postal Systems private registry:

```
$ npm install @postalsys/postal-mime
```

next import the postal-mime class into your script:

```js
const { PostalMime } = require('@postalsys/postal-mime');
```

If you have already built your application using the free version of postal-mime and do not want to modify require statements in your code, you can install the MIT-licensed version as an alias for "postal-mime".

```
$ npm install postal-mime@npm:@postalsys/postal-mime
```

This way you can keep using the old module name

```js
const { PostalMime } = require('postal-mime');
```

### Promises

All postal-mime methods use Promises, so you need to wait using `await` or wait for the `then()` method to fire until you get the response.

```js
const { PostalMime } = require('postal-mime');
const parser = new PostalMime();
const email = await parser.parse(email);
console.log(email.subject);
console.log(email.html);
```

### Node.js

Even though PostalMime is built for the browser environment you can also use it in Node.js with a few tweaks. Notably you'd need to register a global _Blob_ class that is not available by default in Node.

```js
// Set up global Blob
// $ npm install cross-blob
globalThis.Blob = require('cross-blob');
// Require Node.js version of the library
const PostalMime = require('postal-mime/dist/node').postalMime.default;

// Use PostalMime as you'd normally do
new PostalMime().parse('Subject: test').then(res => console.log(res));
```

#### parser.parse()

```js
parser.parse(email) -> Promise
```

Where

-   **email** is the rfc822 formatted email. Either a string, an ArrayBuffer, a Blob object or a Node.js Buffer

> **NB** you can call `parse()` only once. If you need to parse another message, create a new _PostalMime_ object.

This method parses an email message into a structured object with the following properties:

-   **headers** is an array of headers in the same order as found from the message (topmost headers first).
    -   **headers[].key** is lowercase key of the header line, eg. `"dkim-signature"`
    -   **headers[].value** is the unprocessed value of the header line
-   **from**, **sender**, **replyTo** includes a processed object for the corresponding headers
    -   **from.name** is decoded name (empty string if not set)
    -   **from.address** is the email address
-   **deliveredTo**, **returnPath** is the email address from the corresponding header
-   **to**, **cc**, **bcc** includes an array of processed objects for the corresponding headers
    -   **to[].name** is decoded name (empty string if not set)
    -   **to[].address** is the email address
-   **subject** is the email subject line
-   **messageId**, **inReplyTo**, **references** includes the value as found from the corresponding header without any processing
-   **date** is the email sending time formatted as an ISO date string (unless parsing failed and in this case the original value is used)
-   **html** is the HTML content of the message as a string
-   **text** is the plaintext content of the message as a string
-   **attachments** is an array that includes message attachments
    -   **attachment[].filename** is the file name if provided
    -   **attachment[].mimeType** is the MIME type of the attachment
    -   **attachment[].disposition** is either "attachment", "inline" or `null` if disposition was not provided
    -   **attachment[].related** is a boolean value that indicats if this attachment should be treated as embedded image
    -   **attachment[].contentId** is the ID from Content-ID header
    -   **attachment[].content** is an ArrayBuffer that contains the attachment file

## License

&copy; 2021 Andris Reinman

Licensed under GNU Affero General Public License v3.0 or later.

MIT-licensed version of postal-mime is available for [Postal Systems subscribers](https://postalsys.com/).
