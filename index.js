import fs from 'fs';
import readline from 'readline';
import {google} from 'googleapis';
import googleAuth from 'google-auth-library';

let SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
let TOKEN_DIR = "./secrets/.credentials/";
let TOKEN_PATH = TOKEN_DIR + 'gmail-nodejs-quickstart.json';

function authhorizeToGoogle(callback){
    fs.readFile('./secrets/keys/client_secret.json', function processClientSecrets(err, content) {
        if (err) {
        console.log('Error loagding client secret file: ' + err);
        return;
        }
        authorize(JSON.parse(content), callback);
    });
}

function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function handleAttachment(err, response, filename){
  let data = response.data;
  let buffer = new Buffer(data, 'base64');
  fs.writeFile("./" + filename, buffer,  "binary",(err) => {
    if (err) {
      console.log("Cannot save the data to pdf", err)
      return;
    }
    console.log('The file successfuly downloaded!')
  })
}


function showMessages(auth){
    var gmail = google.gmail('v1');
    gmail.users.messages.list({auth:auth, userId:"me",}, { qs: { q:'from:info@parasha.org has:attachment (subject:לפרשת OR subject:ופרשת) ', maxResults:1}}, (err, response) => {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }

        let messageId = response.messages[0].id;
        gmail.users.messages.get({id:messageId, userId:'me', auth:auth}, (err, response) => {
          let pdf = response.payload.parts.filter(part => part.filename.endsWith('pdf'))[0];
          let pdfName = pdf.filename;
          let pdfId = pdf.body.attachmentId;
          gmail.users.messages.attachments.get({auth:auth, userId:'me', messageId:messageId, id:pdfId}, (err, response) => handleAttachment(err, response, pdfName))
        });
    });
}

authhorizeToGoogle(showMessages);
