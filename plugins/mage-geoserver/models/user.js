var mongoose = require('mongoose')
  , moment = require('moment')
  , log = require('winston');

var Schema = mongoose.Schema;

var UserSchema = new Schema({
  eventId: {type: Number, required: true},
  type: {type: String, required: true},
  geometry: Schema.Types.Mixed,
  properties: Schema.Types.Mixed
},{
  versionKey: false
});

UserSchema.index({geometry: "2dsphere"});

var UserModel = mongoose.model('User', UserSchema);

function getLatestLocation(locations) {
  if (!Array.isArray(locations)) {
    locations = [locations];
  }

  return locations.reduce(function(previous, current) {
    return moment(current.properties.timestamp).isAfter(moment(previous.properties.timestamp)) ? current : previous;
  }, {properties: {timestamp: 0}});
}

exports.createLocations = function(locations, user, event, callback) {
  var location = getLatestLocation(locations);

  var normalized = {
    _id: user._id,
    eventId: event._id,
    type: location.type,
    geometry: {
      type: location.geometry.type,
      coordinates: location.geometry.coordinates
    },
    properties: location.properties
  };

  normalized.properties.user = {
    username: user.username,
    displayName: user.displayName
  };

  normalized.properties.event = {
    _id: event._id,
    name: event.name
  };

  var options= {
    upsert: true,
    new: true
  };

  UserModel.findByIdAndUpdate({_id: user._id, eventId: event._id}, normalized, options, function(err) {
    if (err) {
      console.log('Error updating users latest location', err);
    }

    if (callback) {
      callback(err);
    }
  });
};