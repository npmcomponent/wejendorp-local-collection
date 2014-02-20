

var Emitter = require('component-emitter');

Emitter(exports);


/**
 * Use the given plugin `fn()`.
 *
 * @param {Function} fn
 * @return {Function} self
 * @api public
 */

exports.use = function(fn) {
  fn(this);
  return this;
};

/**
 * Obtain a collection instance stored as a given id
 *
 *
 * @return {Collection|null}
 */
exports.obtain = function(id, create) {
  var collection = this.collections[id] || null;
  if(collection) return collection;

  var data = this._store.get(this.alias(id) || id);
  if(data && Array.isArray(data))
      return this.collections[id] = new this(data, id);
    // else
      // return null;

  if(create) {
    collection = new this(null, id);
    collection.store();
  }
  return collection;
};

exports.store = function aaStore(collection, id) {
  id = id || collection._id;

  this.collections[id] = collection;
  this._store.set(id, collection);
};


exports.alias = function(key, value) {
  if(typeof value === 'undefined') {
    var alias = this._store(key);
    return typeof alias === 'string' ? alias : undefined;
  }
  this._store(key, value);
};


/**
 * Obtain a model instance under the given id
 * Will return null if no data is found, and create flag is false, or if there
 * is a different datatype stored under the given id.
 *
 * @param {String} id to look up
 * @param {Bool} create this instance if nothing found
 * @return {Model|null}
 */
exports.obtainOne = function(id, create) {
  id = this.alias(id) || id;
  var model = this.models[id] || null;
  if(model) return model;

  var data = this._store.get(id);
  if(data) return this.models[id] = new this.model(data);

  if(create) {
    model = new this.model();
    model.primary(id);

    this.models[id] = model;
    this._store.set(id, model);
  }
  return model;
};

exports.remove = function(model) {
  var id = model;
  if(model instanceof this.model)
    id = model.primary();

  model = this.models[id];
  if(model)
    delete this.models[id];

  this._store.remove(id);
  this._removeKey(id, model);

  return model || null;
};

exports.set = function staticSet(models) {
  var self = this;
  var pk = this.model.primaryKey;

  if(!Array.isArray(models)) models = [models];

  var ret = models.map(function setMap(model) {
    var key;
    // If its a model we _store the instance as the new truth
    if(model instanceof self.model) {
      key = model.primary();
      var exists = self.models[key];

      self.models[key] = model;
      self._store.set(key, model);

      // if(!exists) {
      self._addKey(key, model);
      // }
      return model;
    }


    var data = model;
    // Get any existing data and update model
    key = data[pk];
    model = self.obtain(key);
    if(model) {
      self._addKey(key, model);
      model.set(data);
      self._store.set(data[pk], model);
      return model;
    }

    // No data found, create a model
    model = new self.model(data);
    key = model.primary();

    self.models[key] = model;
    self._store.set(key, model);
    self._addKey(key, model);
    return model;
  });
  return ret;
};

exports._addKey = function staticAddKey(id, model) {
  var total = this._store('keys') || [];

  if(total.indexOf(id) > -1) return;
  total.push(id);
  this._store.set('keys', total);
  this.emit('add', model);
};

exports._removeKey = function(id, model) {
  var total = this._store('keys') || [];
  if(total.indexOf(id) === -1) return;

  total.splice(total.indexOf(id), 1);
  this._store.set('keys', total);
  this.emit('remove', model);
};
