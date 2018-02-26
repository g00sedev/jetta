var express = require('express');
var http = require('http');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'wingmate' });
});

router.get('/dashboard' ,function(req, res, nex) {
  res.render('dashboard');
})

router.post('/', function(req, res, next) {
  console.log("Got post");

  var eventForSend = JSON.stringify({ "attributes": {
      "userId": req.body.userId,
      "contactId": req.body.contactId,
      "at": req.body.at,
      "threshold": req.body.threshold == 'true' ? true : false },
      "quadrant": req.body.quadrant
  });

  sendEventToLambda(eventForSend);
});

var sendEventToLambda = function(eventForSend) {
  console.log(eventForSend);

  // var postData = req.body;
  var postRequest = http.request({
    hostname: 'civic-api-loadbala-6ssfhhokct01-143816739.us-west-2.elb.amazonaws.com',
    port: 80,
    path: '/events',
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(eventForSend)
    }
  }, function(res) {
    console.log("Status: ", res.statusCode);
    console.log("Message: ", res.statusMessage);
    // console.log("Response: ", res);
  });

  postRequest.on('error', function(err){
    console.log("error: ",err);
  })
  // console.log("Sending: ", eventForSend);
  postRequest.write(eventForSend);
  postRequest.end();
}

module.exports = router;
