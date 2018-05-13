// 3rd party dependencies
var httpClient = require("request"),
  path = require('path'),
  express = require('express'),
  session = require('express-session'),
  pgSession = require('connect-pg-simple')(session),
  SalesforceClient = require('salesforce-node-client');
  bodyParser = require('body-parser')

// App dependencies
var config = require('./config');

// Configure Salesforce client while allowing command line overrides
console.log(process.env);
if (process.env.sfdcAuthConsumerKey)
  config.sfdc.auth.consumerKey = process.env.sfdcAuthConsumerKey;
if (process.env.sfdcAuthConsumerSecret)
  config.sfdc.auth.consumerSecret = process.env.sfdcAuthConsumerSecret;
if (process.env.sfdcAuthCallbackUrl)
  config.sfdc.auth.callbackUrl = process.env.sfdcAuthCallbackUrl;

var sfdc = new SalesforceClient(config.sfdc);

// Prepare command line overrides for server config
if (process.env.isHttps)
  config.server.isHttps = (process.env.isHttps === 'true');
if (process.env.sessionSecretKey)
  config.server.sessionSecretKey = process.env.sessionSecretKey;

// Setup HTTP server
var app = express();
var port = process.env.PORT || 8080;
app.set('port', port);

// Enable server-side sessions
app.use(session({
  store: new pgSession(), // Uses default DATABASE_URL
  secret: config.server.sessionSecretKey,
  cookie: {
    secure: config.server.isHttps,
    maxAge: 60 * 60 * 1000 // 1 hour
  },
  resave: false,
  saveUninitialized: false
}));

// Serve HTML pages under root directory
app.use('/', express.static(path.join(__dirname, '../public')));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

/**
*  Attemps to retrieves the server session.
*  If there is no session, redirects with HTTP 401 and an error message
*/
function getSession(request, response, isRedirectOnMissingSession) {
  var curSession = request.session;
  if (!curSession.sfdcAuth) {
    if (isRedirectOnMissingSession) {
      response.status(401).send('No active session');
    }
    return null;
  }
  return curSession;
}


/**
* Login endpoint
*/
app.get("/auth/login", function(request, response) {
  // Redirect to Salesforce login/authorization page
  var uri = sfdc.auth.getAuthorizationUrl({scope: 'api'});
  return response.redirect(uri);
});


/**
* Login callback endpoint (only called by Force.com)
*/
app.get('/auth/callback', function(request, response) {
    if (!request.query.code) {
      response.status(500).send('Failed to get authorization code from server callback.');
      return;
    }

    // Authenticate with Force.com via OAuth
    sfdc.auth.authenticate({
        'code': request.query.code
    }, function(error, payload) {
        if (error) {
          console.error('Force.com authentication error: '+ JSON.stringify(error));
          response.status(500).json(error);
          return;
        }
        else {
          // Store oauth session data in server (never expose it directly to client)
          var session = request.session;
          session.sfdcAuth = payload;

          // Redirect to app main page
          return response.redirect('/index.html');
        }
    });
});


/**
* Logout endpoint
*/
app.get('/auth/logout', function(request, response) {
  var curSession = getSession(request, response, false);
  if (curSession == null)
    return;

  // Revoke OAuth token
  sfdc.auth.revoke({token: curSession.sfdcAuth.access_token}, function(error) {
    if (error) {
      console.error('Force.com OAuth revoke error: '+ JSON.stringify(error));
      response.status(500).json(error);
      return;
    }

    // Destroy server-side session
    curSession.destroy(function(error) {
      if (error)
        console.error('Force.com session destruction error: '+ JSON.stringify(error));
    });

    // Redirect to app main page
    return response.redirect('/index.html');
  });
});


/**
* Endpoint for retrieving currently connected user
*/
app.get('/auth/whoami', function(request, response) {
  var curSession = getSession(request, response, false);
  if (curSession == null) {
    response.send({"isNotLogged": true});
    return;
  }

  // Request user info from Force.com API
  sfdc.data.getLoggedUser(curSession.sfdcAuth, function (error, userData) {
    if (error) {
      console.log('Force.com identity API error: '+ JSON.stringify(error));
      response.status(500).json(error);
      return;
    }
    // Return user data
    response.send(userData);
    return;
  });
});

/**
* Endpoint for publishing a platform event to the Lightning Platform
* Option 1 is to publish directly to the Lightning Platform
* Option 2 is to publish through Kafka
*/
app.post('/publish', function(request, response) {
  var curSession = getSession(request, response, true);
  if (curSession == null)
    return;

  var useKafka = false;  
  if (process.env.useKafka){
    console.log('Default value for: useKafka='+ useKafka);
    useKafka = (process.env.useKafka === 'true');
    console.log('useKafka from configuration is now set to='+ useKafka);
  }
  
  if (!useKafka){
    console.log('Publishing event directly to Platform Events, not using Kafka!');
    var apiRequestOptions = sfdc.data.createDataRequest(curSession.sfdcAuth, 'sobjects/Notification__e');
    response.setHeader('Content-Type', 'text/plain');
    apiRequestOptions.body = {
      "Message__c"  : request.body.comment,
      "Notifier__c" : request.body.notifier,
      "Email__c"    : request.body.email,
      "SenderId__c" : "HerokuTrailApp"
    };
    apiRequestOptions.json = true;

    httpClient.post(apiRequestOptions, function (error, payload) {
      if (error) {
        console.error('Force.com data API error: '+ JSON.stringify(error));
        response.status(500).json(error);
        return;
      }
      else {
        response.send(payload.body);
        return;
      }
    });
  }else{
    // Publish event to Kafka
    console.log('Publishing event to Kafka!');
    if (process.env.useKafka){
      var kafkaProducerURL;
      var kafkaProducerHost;
      var kafkaProducerPort;
      var kafkaProducerPath;      

      // Validate Kafka configuration attributes

      if (process.env.kafkaProducerHost){
        kafkaProducerHost = process.env.kafkaProducerHost;
      } else {
        console.error('kafkaProducerHost not set!');
        response.status(500).json('kafkaProducerHost not set!');
        return;        
      }

      if (process.env.kafkaProducerPort){
        kafkaProducerPort = process.env.kafkaProducerPort;
      } else {
        console.error('kafkaProducerPort not set!');
        response.status(500).json('kafkaProducerPort not set!');
        return;        
      }   
      
      if (process.env.kafkaProducerPath){
        kafkaProducerPath = process.env.kafkaProducerPath;
      } else {
        console.error('kafkaProducerPath not set!');
        response.status(500).json('kafkaProducerPath not set!');
        return;
      }        

      console.log('Kafka Host + Port + Path='+ kafkaProducerHost+ ':' + kafkaProducerPort + kafkaProducerPath);

      var https = require("https");
      var kafkaPayload = JSON.stringify({
        "Session"     : curSession,
        "Message__c"  : request.body.comment,
        "Notifier__c" : request.body.notifier,
        "Email__c"    : request.body.email,
        "SenderId__c" : "HerokuTrailApp"
      });

      var contentLength = Buffer.byteLength(kafkaPayload, 'utf8');
      console.log('kafkaPayload ' + kafkaPayload);
      console.log('Content-Length: ' + contentLength);

      var headers = {
        'Content-Type': 'application/json',
        'Content-Length': contentLength
      };

      var options = {
        host: kafkaProducerHost,
        port: kafkaProducerPort,
        path: kafkaProducerPath,
        method: 'POST',
        headers: headers
      };

      // Send the Kafka request
      var kafkaReq = https.request(options, function (res) {
        var responseString = "";
        //Handle the response
        console.log("statusCode: ", res.statusCode);
        console.log("headers: " +  JSON.stringify(res.headers));
    
        res.on('data', function(data) {
            responseString += data;
        });
        res.on('end', function(){
          console.info('POST result:');
          console.info(responseString);
          console.info('POST completed');
          response.send(responseString);
          console.info('Response sent!');
          return;
        })
      });
      kafkaReq.write(kafkaPayload);
      kafkaReq.end();
      kafkaReq.on('error', function(err){
        //Handle error
        console.error('Error: ', error);
        response.status(500).json(error);
        return;
      });
      return;
      
    }
    return;
  }
});


app.listen(app.get('port'), function() {
  console.log('Server started: http://localhost:' + app.get('port') + '/');
});
