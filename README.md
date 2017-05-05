# FreshMail-JS

Javascript wrapper library for the [FreshMail API](https://freshmail.com/api_section/getting-started-en-en/).

This is a translation from [Dariusz Stępniak](https://github.com/deasek)'s [FreshMail-Python](https://github.com/deasek/freshmail-python) 

## Installation

Via npm
```
npm install freshmail-js
```

Via yarn

```
yarn add freshmail-js
```

## Import

ES2015/ES6:
```js
import FreshMail from 'freshmail-js';

const fm = new FreshMail('API_KEY','API_SECRET');
```

ES5:
```js
const FreshMail = require('freshmail-js');

const fm = new FreshMail('API_KEY','API_SECRET');
```

## Examples
