# Hikers' Trail Buddy

## About
Heroku demonstration app forked from [Bear Watch](https://github.com/pozil/bear-watch).
This Hikers' Trail Buddy App is based on trail [Build an Instant Notification App](https://trailhead.salesforce.com/en/projects/workshop-platform-events)
and will work as the end users' app to send messages to a control UI on the Lightning Platform.

Find the Instruction Lightning Platform Control UI App repository here: TBD

## Instructions

### 1. make sure you have the same version of node.js
    $ node --version
    v8.9.1

package.json --> engines --> node

    "engines": {
        "node": "8.9.x"
    }

### 2. Create an Heroku app
    $ heroku create --app your-heroku-app-name

### 3. Create a connected app in your salesforce org, and set the values as per below.
Login to Salesforce --> Setup --> Apps --> App Manager --> New Connected App
- **Connected App Name:** Hiker's Trail Buddy App
- **API Name:** Hikers_Trail_Buddy_App
- **Contact Email:** *your email address*
- **Enable OAuth Settings:** Yes
- **Callback URL:** https://*your-heroku-app-name.herokuapp.com*/auth/callback
- **Selected OAuth Scopes:** Access and manage your data (api)

Click the save button and copy the Callback URL, Consumer Key and the Consumer Secre for later use.

### set a secret key of you choice
server/config.js --> config.server --> sessionSecretKey

    config.server = {
      sessionSecretKey : 'randomcomplicatedstringofcharacters0123456789'
    };

### deploy to Heroku
    $ heroku addons:create heroku-postgresql:hobby-dev
    $ cat db_init.sql | heroku pg:psql --app app_name
    $ heroku config:set domain=https://test.salesforce.com
    $ heroku config:set apiVersion=v42.0
    $ heroku config:set callbackUrl=*your callbackUrl from before*
    $ heroku config:set consumerKey=*your consumerKey from before*
    $ heroku config:set consumerSecret=*your consumerSecret from before*
    $ git add .
    $ git commit -m "initial commit"
    $ git push heroku master
    $ heroku open --app your-heroku-app

# Additional information about the original Bear Watch

## About
Heroku demonstration app for the "Build an Instant Notification App" Trailhead project (an introduction to platform events).

This application uses the following dependencies (non-exhaustive):
- [Salesforce Node client](https://github.com/pozil/salesforce-node-client) a Node library for Force.com OAuth 2.0 authentication and data interactions.
- [Salesforce Lightning Design System](https://www.lightningdesignsystem.com) (SLDS).

## Credits
- Background image source: https://w-dog.net
- Footprint image source: http://icons8.com
