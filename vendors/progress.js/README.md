# ProgressJS

> ProgressJs is a JavaScript and CSS3 library which helps developers create and manage progress bars for every object on the page. 

## How To Use

1) Include `progress.js` and `progressjs.css` in the page (use the minified version from `minified` folder for production)

2) Execute the following JavaScript code in the page:

```javascript
//to set progress-bar for whole page
progressJs().start();
//or for specific element
progressJs("#targetElement").start();
```


Use other methods to increase, decrease or set an auto-increase function for your progress-bar. Furthermore, you can change the template using `setOption` method.

## API

Check the API and method usage with example here: https://github.com/usablica/progress.js/wiki/API

## Build

First, you should install `nodejs` and `npm`, then run this command: `npm install` to install all dependencies.

Now you can run this command to minify all the static resources:

    make build

## Roadmap
- Add `example` folder and provide examples
- More browser compatibility + mobile/tablet device support
- Add more templates

## Release History
 * **v0.1.0** - 2014-02-14 
   - First version
   - Increase, decrease and auto-increase functions
   - Ability to design and add templates

## Author
**Afshin Mehrabani**

- [Twitter](https://twitter.com/afshinmeh)
- [Github](https://github.com/afshinm)
- [Personal page](http://afshinm.name/)  

## License
> Copyright (C) 2012 Afshin Mehrabani (afshin.meh@gmail.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated 
documentation files (the "Software"), to deal in the Software without restriction, including without limitation 
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, 
and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions 
of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL 
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS 
IN THE SOFTWARE.
