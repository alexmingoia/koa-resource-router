/**
 * Dependencies
 */

var compose = require('koa-compose')
  , defaults = require('defaults')
  , lingo = require('lingo')
  , pathToRegExp = require('path-to-regexp');

/**
 * Expose `Resource`
 */

module.exports = Resource;

/**
 * Initialize a new Resource using given `name` and `actions`.
 *
 * `options`
 *   - methods  override map of action names to http method
 *
 * @param {String} name
 * @param {Function} actions
 * @param {Object} options
 * @return {Resource}
 * @api private
 */

function Resource(name, actions, options) {
  if (!(this instanceof Resource)) {
    return new Resource(name, actions, options);
  }

  if (typeof name === 'object') {
    actions = name;
    name = null;
  }

  this.options = {
    methods: defaults((options || {}).methods || {}, {
      'options': 'OPTIONS',
      'new':     'GET',
      'create':  'POST',
      'edit':    'GET',
      'update':  'PUT',
      'index':   'GET',
      'list':    'GET',
      'read':    'GET',
      'show':    'GET',
      'destroy': 'DELETE',
      'remove':  'DELETE'
    })
  };

  this.name = name;
  this.id = name ? lingo.en.singularize(name) : 'id';
  this.base = this.name ? '/' + this.name : '/';
  this.actions = actions;
  this.routes = [];
  this.resources = [];

  // create route definition (used for routing) for each resource action
  Object.keys(actions).forEach(function(name) {
    var url = this.base;
    var urlTrailing = this.base;

    if (url[url.length-1] != '/') {
      urlTrailing = url + '/';
    }

    if (name == 'new') {
      url = urlTrailing + ':' + this.id;
    }
    else if (name == 'edit') {
      url = urlTrailing + ':' + this.id + '/edit';
    }
    else if (name.match(/(show|read|update|remove|destroy)/)) {
      url = urlTrailing + ':' + this.id;
    }

    var action = actions[name];
    if (action instanceof Array) {
      action = compose(actions[name]);
    }

    var params = [];

    this.routes.push({
      method: this.options.methods[name].toUpperCase(),
      url: url,
      regexp: pathToRegExp(url, params),
      params: params,
      action: action
    });
  }, this);
};

Resource.prototype.middleware = function() {
  var resource = this;

  return function *(next) {
    var matched;

    this.params = [];

    if (matched = resource.match(this.path, this.params)) {
      var allowedMethods = [];

      for (var len = matched.length, i=0; i<len; i++) {
        var route = matched[i];

        if (this.method == route.method) {
          return yield route.action.call(this, next);
        }
        else {
          if (!~allowedMethods.indexOf(route.method)) {
            allowedMethods.push(route.method);
          }

        }
      }

      this.status = (this.method == 'OPTIONS' ? 204 : 405);
      this.set('Allow', allowedMethods.join(", "));
    }

    return yield next;
  };
};

Resource.prototype.match = function(path, params) {
  var matched = [];

  for (var len = this.routes.length, i=0; i<len; i++) {
    var route = this.routes[i];

    if (route.regexp.test(path)) {
      var captures = path.match(route.regexp);
      if (captures && captures.length) {
        captures = captures.slice(1);
      }

      if (params && route.params.length) {
        for (var l = captures.length, n=0; n<l; n++) {
          if (route.params[n]) {
            params[route.params[n].name] = captures[n];
          }
        }
      }

      matched.push(route);
    }
  }

  return matched.length ? matched : false;
};

/**
 * Nest given `resource`.
 *
 * @param {Resource} resource
 * @return {Resource}
 * @api public
 */

Resource.prototype.add = function(resource) {
  var base = this.base[this.base.length-1] == '/' ? this.base : this.base + '/';
  this.resources.push(resource);

  // Re-define base path for nested resource
  resource.base = resource.name ? '/' + resource.name : '/';
  resource.base = base + ':' + this.id + resource.base;

  // Re-define route paths for nested resource
  for (var len = resource.routes.length, i=0; i<len; i++) {
    var route = resource.routes[i];
    route.url = base + ':' + this.id + route.url;
    route.params = [];
    route.regexp = pathToRegExp(route.url, route.params);
  }

  return this;
};
