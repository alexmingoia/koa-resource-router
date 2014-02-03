# koa-resource-router

[![Build Status](https://secure.travis-ci.org/alexmingoia/koa-resource-router.png)](http://travis-ci.org/alexmingoia/koa-resource-router) 
[![Dependency Status](https://david-dm.org/alexmingoia/koa-resource-router.png)](http://david-dm.org/alexmingoia/koa-resource-router)
[![NPM version](https://badge.fury.io/js/koa-resource-router.png)](http://badge.fury.io/js/koa-resource-router)

RESTful resource routing for [koa](https://github.com/koajs/koa).

* Rails-like REST resource routing.
* Use multiple middleware for resource actions.
* Responds to `OPTIONS` requests with allowed methods.
* Returns `405 Method Not Allowed` when applicable.

## Installation

Install using [npm](https://npmjs.org):

```sh
npm install koa-resource-router
```

## API

### new Resource(path, actions, options)

```javascript
var Resource = require('koa-resource-router');
var app = require('koa')();

var users = new Resource('users', {
  // GET /users
  index: function *(next) {
  },
  // GET /users/new
  new: function *(next) {
  },
  // POST /users
  create: function *(next) {
  },
  // GET /users/:id
  show: function *(next) {
  },
  // GET /users/:id/edit
  edit: function *(next) {
  },
  // PUT /users/:id
  update: function *(next) {
  },
  // DELETE /users/:id
  destroy: function *(next) {
  }
});

app.use(users.middleware());
```

### Action mapping

Actions are then mapped accordingly:

```javascript
GET     /users             ->  index
GET     /users/new         ->  new
POST    /users             ->  create
GET     /users/:user       ->  show
GET     /users/:user/edit  ->  edit
PUT     /users/:user       ->  update
DELETE  /users/:user       ->  destroy
```

### Overriding action mapping

```javascript
var users = new Resource('users', actions, {
  methods: {
    update: 'PATCH'
  }
});
```

### Top-level resource

Omit the resource name to specify a top-level resource:

```javascript
var root = new Resource(require('./frontpage'));
```

Top-level controller actions are mapped as follows:

```javascript
GET     /          ->  index
GET     /new       ->  new
POST    /          ->  create
GET     /:id       ->  show
GET     /:id/edit  ->  edit
PUT     /:id       ->  update
DELETE  /:id       ->  destroy
```

### Nesting

Resources can be nested using `resource.add()`:

```javascript
var forums = new Resource('forums', require('./forum'));
var threads = new Resource('threads', require('./threads'));

forums.add(threads);
```

### Multiple middleware

Run middleware before resource actions by passing middleware functions before
your actions:

```javascript
var users = new Resource('users', authorize, actions);
```

Run middleware for specific actions by passing an array:

```javascript
var users = new Resource('users', {
  show: [authorize, function *(next) {
    // ...
  }]
});
```

## MIT Licensed
