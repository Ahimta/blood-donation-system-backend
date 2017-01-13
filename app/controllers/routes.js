const express = require('express')
const geoip = require('geoip-lite')
const Immutable = require('immutable')
const mongoose = require('mongoose')
const srs = require('secure-random-string');

const Donation = mongoose.model('Donation')
const router = express.Router()

const generateToken = () => {
  return new Promise((resolve, reject) => {
    srs({ length: 32 }, (err, sr) => {
      if (err) {
        reject(err)
      } else {
        resolve(sr)
      }
    })
  })
}

const getIp = (req) => {
  const ips = (req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress);

  return ips.split(',')[0];
}

const removeSecretFields = (donation) => {
  return Immutable.Map(donation).merge({ accessToken: '', ip: '' }).toJS();
}

module.exports = function (app, io) {
  app.use('/', router)

  io.on('connection', function (socket) {
    const ip = getIp(socket.request)
    const geo = geoip.lookup(ip)

    if (geo) {
      const {ll: [longitude, latitude]} = geo
      socket.emit('location', { code: 200, data: { longitude, latitude } })
    }

    socket.on('delete-donation', ({accessToken, id}, fn) => {
      Donation.findById(id).then((donation) => {
        if (!donation) {
          fn({ code: 404, data: { accessToken, id } })
        } else if (donation && donation.accessToken !== accessToken) {
          fn({ code: 403, data: { accessToken, id } })
        } else {
          return donation.remove()
        }
      }).then((removedDocument) => {
        io.emit('donation-deleted', { code: 200, data: id })
        fn({ code: 200, data: { accessToken, id } })
      }).catch((reason) => {
        fn({ code: 500, data: {} })
      })
    })

    socket.on('donate', (donation, fn) => {
      const {longitude, latitude} = donation;
      const coordinates = [longitude, latitude];

      generateToken().then((accessToken) => {
        console.log('accessToken', accessToken);
        const newDonation = new Donation(Immutable.Map(donation).merge({ accessToken, coordinates, ip }).toJS())

        newDonation.save().then((createdDonation) => {
          io.emit('donation-added', { code: 200, data: removeSecretFields(createdDonation.toJSON()) })
          fn({ code: 200, data: createdDonation.toJSON() })
        }).catch(({errors, message, name}) => {
          if (name === 'ValidationError') {
            fn({ code: 400, data: errors })
          } else {
            fn({ code: 500, data: {} })
          }
        })
      })
    })

    socket.on('get-nearest-donation', ([longitude, latitude], fn) => {
      Donation.geoNear([longitude, latitude], {num: 1}).then((donations) => {
        const donation = donations[0];

        if (!donation) {
          fn({ code: 404, data: [longitude, latitude] })
        } else {
          fn({ code: 200, data: removeSecretFields(donation.obj.toJSON()) })
        }
      }).catch((reason) => {
        fn({ code: 500, data: {} })
      })
    })

    socket.on('get-donation', ({accessToken, id}, fn) => {
      Donation.findById(id).then((donation) => {
        if (!donation) {
          fn({ code: 404, data: { accessToken, id } })
        } else if (donation.accessToken !== accessToken) {
          fn({ code: 403, data: { accessToken, id } })
        } else {
          fn({ code: 200, data: donation.toJSON() })
        }
      }).catch((reason) => {
        fn({ code: 500, data: {} })
      })
    })

    socket.on('get-donations', (box, fn) => {
      Donation.find({ coordinates: { $geoWithin: { $box: box } } }).then((donations) => {
        const jsonDonations = donations.map((donation) => donation.toJSON()).map(removeSecretFields)
        socket.emit('donations', { code: 200, data: jsonDonations })
        fn({ code: 200, data: jsonDonations })
      }).catch((reason) => {
        socket.emit('donations', { code: 500, data: {} })
        fn({ code: 500, data: {} })
      })
    })

    socket.on('update-donation', (donationFields, fn) => {
      Donation.findById(donationFields._id).then((donation) => {
        if (!donation) {
          fn({ code: 404, data: { accessToken: donationFields.accessToken, id: donationFields._id } })
        } else if (donation && donation.accessToken !== donationFields.accessToken) {
          fn({ code: 403, data: { accessToken: donationFields.accessToken, id: donationFields._id } })
        } else {
          return donation.update(donationFields)
        }
      }).then((updatedDonation) => {
        return Donation.findById(donationFields._id)
      }).then((updatedDonation) => {
        io.emit('donation-updated', { code: 200, data: removeSecretFields(updatedDonation.toJSON()) })
        fn({ code: 200, data: removeSecretFields(updatedDonation.toJSON()) })
      }).catch(({errors, message, name}) => {
        if (name === 'ValidationError') {
          fn({ code: 400, data: errors })
        } else {
          console.log({ errors, message, name })
          fn({ code: 500, data: {} })
        }
      })
    })
  })
}

router.get('/', function (req, res, next) {
  res.render('index', { title: 'Generator-Express MVC' })
})
