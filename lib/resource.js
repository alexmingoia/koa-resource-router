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
 *   - id  override auto-generated id param in urls
 *
 * @param {String} name omit to define top-level resource
 * @param {Function} actions
 * @param {Object} options
 * @return {Resource}
 * @api private
 */

function Resource(name, actions, options) {
  if (!(this instanceof Resource)) {
    var args = Array.prototype.slice.call(arguments);
    var resource = Object.create(Resource.prototype);
    Resource.apply(resource, args);
    return resource;
  }
  options = options || {};
  this.name = typeof name == 'string' ? name : null;

  this.id = name ? lingo.en.singularize(name) : 'id';
  this.base = this.name ? '/' + this.name : '/';

  var middleware = Array.prototype.slice.call(arguments, this.name ? 1 : 0);

  this.actions = middleware.pop();

  // if last object has `methods` property or `id` property, assume it is `options`
  if (this.actions.methods || this.actions.id) {
    options = this.actions;
    this.actions = middleware.pop();
  }

  this.routes = [];
  this.resources = [];

  this.options = {
    id: options.id,
    methods: defaults(options.methods || {}, {
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

  // Set a custom id param name if one was provided.
  this.id = this.options.id || this.id;

  // create route definition (used for routing) for each resource action
  Object.keys(this.actions).forEach(function(name) {
    var action = this.actions[name];
    var url = this.base;
    var urlTrailing = this.base;
    var params = [];

    if (!this.options.methods[name]) return;

    if (url[url.length-1] != '/') {
      urlTrailing = url + '/';
    }

    if (name == 'new') {
      url = urlTrailing + 'new';
    }
    else if (name == 'edit') {
      url = urlTrailing + ':' + this.id + '/edit';
    }
    else if (name.match(/(show|read|update|remove|destroy)/)) {
      url = urlTrailing + ':' + this.id;
    }

    // compose multiple action middleware
    if (action instanceof Array) {
      this.actions[name] = compose(action);
    }

    // compose resource middleware
    if (middleware.length) {
      this.actions[name] = compose(middleware.concat(Array.isArray(action) ? action : [action]));
    }

    this.routes.push({
      method: this.options.methods[name].toUpperCase(),
      url: url,
      regexp: pathToRegExp(url, params),
      params: params,
      action: this.actions[name]
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
          if (this.params.user !== 'new' || route.url.match(/new$/i)) {
            return yield route.action.call(this, next);
          }
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
