const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var DonationSchema = new Schema({
  accessToken: {type: String, required: true},
  ip: {type: String, required: true},

  bloodGroup: {type: String, required: true, enum: ['A-', 'A+', 'AB-', 'AB+', 'B-', 'B+', 'O-', 'O+']},
  email: {type: String, required: true, match: /^.+@.+\..+$/},
  firstName: {type: String, required: true},
  lastName: {type: String, required: true},
  phone: {type: String, required: true, match: /^(\+|00)\d{2} \d{3} \d{4} \d{3}$/},

  latitude: {type: Number, required: true},
  longitude: {type: Number, required: true},

  coordinates: {type: [Number], required: true, index: '2d'}
});

mongoose.model('Donation', DonationSchema);
