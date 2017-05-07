import superagent from 'superagent';
import crypto from 'crypto';
import FreshMailError from './errors/FreshMailError';

const HOST = 'https://api.freshmail.com/';
const PREFIX = 'rest/';
const CONTENT_TYPE = 'application/json';

/**
 * subscriber status codes for use with API: (undocumented in API)
 * 1 active
 * 2 activation pending
 * 3 not activated
 * 4 resigned
 * 5 soft bouncing
 * 8 hard bouncing
**/

/**
 * Custom class for Freshmail REST API
 * @author: Dariusz Stepniak <stepniak.dariusz@gmail.com>
 * @author: Philippe Hebert <philippe.hebert.qc@gmail.com>
**/
class FreshMail {
  /**
   * Create class instance, requires api_key and api_secret
   * @param {string} api_key : The API key provided by FreshMail
   * @param {string} api_secret : The API secret provided by FreshMail
   * @return {FreshMail} FreshMail instance
  **/
  constructor(api_key, api_secret) {
    this.api = {
      key: api_key,
      secret: api_secret
    };
    this.http = {
      host: HOST,
      prefix: PREFIX,
      contentType: CONTENT_TYPE
    };
  }

  get contentType() {
    return this.http.contentType;
  }

  get host() {
    return this.http.host;
  }

  get prefix() {
    return this.http.prefix;
  }

  set contentType(contentType) {
    this.http.contentType = contentType;
  }

  set host(host) {
    this.http.host = host;
  }

  set prefix(prefix) {
    this.http.prefix = prefix;
  }

  /**
   * Makes request to REST API. Add payload data for POST request.
   * @param {string} url: API endpoint pathname
   * @param {object} payload: POST data serializable JSON object
  **/
  request(url, payload, method = 'POST') {
    let json_data = payload ? JSON.stringify(payload) : '';
    let full_url = `${this.http.host}${this.http.prefix}${url}`;
    let signature = `${this.api.key}/${this.http.prefix}${url}${json_data}${this.api.secret}`;
    console.log(signature);
    let hash = crypto
                 .createHash('sha1')
                 .update(signature)
                 .digest('hex');
    let headers = {
      'Content-Type': this.http.contentType,
      'X-Rest-ApiKey': this.api.key,
      'X-Rest-ApiSign': hash
    };

    let request;
    if(method === 'POST'){
      request = superagent
                  .post(full_url)
                  .set(headers)
                  .send(payload);
    }else if(method === 'GET'){
      request = superagent
                  .get(full_url)
                  .set(headers)
                  .query(payload);
    }else{
      return Promise.reject(FreshMailError(`FreshMail API only supports GET or POST methods; Got ${method}`));
    }

    return request
      .then((res) => {
        if(res.status !== 200 || res.body.errors){
          let err = new FreshMailError('FreshMail API returned errors. See payload for more details');
          err.payload = res.body.errors;
          return Promise.reject(err);
        }else{
          return Promise.resolve(res.body);
        }
      });
  }

  ping(method = 'GET') {
    return this.request('ping', method === 'POST' ? {ping: true} : undefined, method);
  }

  mail(email, subject, body, isHTML = false) {
    let payload = {
      subscriber: email,
      subject: subject,
      [isHTML ? 'html' : 'text']: body
    };
    return this.request('mail', payload);
  }

  mailText(email, subject, body) {
    return this.mail(email, subject, body, false);
  }

  mailHTML(email, subject, body) {
    return this.mail(email, subject, body, true);
  }

  addSubscriber(email, list_hash, state = 3, confirm = 0, custom_fields) {
    let payload = { email, list: list_hash, state, confirm };

    if(custom_fields && typeof custom_fields === 'object' && Object.keys(custom_fields).length){
      payload.custom_fields = custom_fields;
    }else if(custom_fields){
      return Promise.reject(
        new FreshMailError(`Invalid Argument: custom_fields must be an object. Got a ${typeof custom_fields}`)
      );
    }

    return this.request('subscriber/add', payload);
  }

  deleteSubscriber(email, list_hash) {
    return this.request('subscriber/delete', { email, list: list_hash });
  }

  // TODO: Create subscriber list

  // TODO: Delete subscriber list

  getLists() {
    return this.request('subscribers_list/lists')
      .then((res) => Promise.resolve(res.body.lists));
  }

  getSubscriber(email, list_hash) {
    const url = `subscriber/get/${list_hash}/${email}`;
    return this.request(url, undefined, 'GET');
  }

  findSubscriber(email) {
    return this.getLists()
      .then((lists) => this.findSubscriberInLists(email, lists));
  }

  findSubscriberInLists(email, lists) {
    if(Array.isArray(lists) && lists.length){
      return filter_rejected_promises(
        lists.map(list =>
          this.getSubscriber(email, list.subscriberListHash)
          .then((subscriber) => ({subscriber, list}))
      )).then((results) =>
        Promise.resolve(
          results.map((res) => ({
            list_hash: res.list.subscriberListHash,
            name: res.list.name,
            subscriber: res.subscriber
          })
        )
      )).catch(() => {
        return Promise.resolve([]);
      });
    }else{
      return Promise.reject(new FreshMailError('No lists found'));
    }
  }

  addCustomFieldtoList(list_hash, field_name, tag, type = 0) {
    let payload = { hash: list_hash, name: field_name, type };
    if(tag) payload.tag = tag;
    return this.request('subscribers_list/addField', payload);
  }
}

function filter_rejected_promises(promises) {
  return new Promise((resolve, reject) => {
    let success = [];
    let failure = [];
    let count = 0;
    promises.forEach(p => {
      p.then((res) => {
        count++;
        success.push(res);
        if(count === promises.length){
          if(success.length) resolve(success);
          else reject(failure);
        }
      }).catch((err) => {
        count++;
        failure.push(err);
        if(count === promises.length){
          if(success.length) resolve(success);
          else reject(failure);
        }
      });
    });
  });
}

export default FreshMail;
