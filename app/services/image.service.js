'use strict';

const https = require('https');
const q = require('q');
const parseString = require('xml2js').parseString;
const errors = require('../constants/appConstants').errors;
const baseUrlGel = 'https://gelbooru.com/index.php?page=dapi&s=post&q=index&';
const baseUrlSafe = 'https://safebooru.org/index.php?page=dapi&s=post&q=index&';

let ImageService = () => {

  return {
    getByTagName
  };

  function getByTagName(tag, tagf, safe) {
    let deferred = q.defer();
    let formattedTag = tagf || '';
    let tagQuery = 'tags=';
    let pageQuery = 'pid=';
    getPageParam(tag, safe)
      .then(pageNum => {
        let reqUrl = (safe ? baseUrlSafe : baseUrlGel) + tagQuery + tag + '&' + pageQuery + pageNum + '&limit=1';
        https.get(reqUrl, response => {
            let body = '';
            response.on('data', d => {
              body += d;
            });
            response.on('end', () => {
                let result;
                let srcUrl;
                // Check that res can be parsed
                try {
                  parseString(body, (err, json) => {
                    let post = json.posts.post[0].$;
                    result = `${safe ? 'https:' : ''}${post.file_url}`;
                    srcUrl = `https://${safe ? 'safebooru.org' : 'gelbooru.com'}/index.php?page=post&s=view&id=${post.id}`;
                  });
                } catch (err) {
                  console.error(err);
                  return deferred.reject(errors.oops);
                }


                if (result && srcUrl) {
                  return deferred.resolve([result, srcUrl, tag, formattedTag]);
                } else {
                  return deferred.reject(errors.oops);
                }

              })
              .on('error', err => {
                console.error(err);
                return deferred.reject(err);
              });
          })
          .on('error', err => {
            console.error(err);
            return deferred.reject(err);
          });
      })
      .catch(err => {
        if (err === -1) {
          return deferred.reject(errors.oops);
        } else if (err === 0) {
          return deferred.reject('Wan! Looks like there were no results for ' +
            '**' + decodeURIComponent(formattedTag) + '**. Gomennasai, goshujinsama!');
        } else {
          console.error(err);
          return deferred.reject(errors.oops);
        }
      });
    return deferred.promise;
  }

  function getPageParam(tag, safe) {
    let deferred = q.defer();

    https.get((safe ? baseUrlSafe : baseUrlGel) + 'tags=' + tag + '&limit=1', res => {
      let body = '';
      res.on('data', d => {
        body += d;
      });
      res.on('end', () => {

          let count;
          // Check that res can be parsed
          try {
            parseString(body, (err, json) => {
              count = json.posts.$.count;
            });
          } catch (err) {
            console.error(err);
            return deferred.reject(-1);
          }

          // Check that it is what is expected
          if (!count) {
            return deferred.reject(-1);
          } else if (parseInt(count) === 0) {
            // Valid but not populated
            return deferred.reject(0);
          }

          console.info('count: ' + count);
          let pageNum = count > 1 ? Math.round(Math.random() * count) - 1 : 0;
          console.info('chosen num: ' + pageNum);
          return deferred.resolve(pageNum);
        })
        .on('error', e => {
          console.error(e);
          return deferred.reject(e);
        });
    });
    return deferred.promise;
  }
};

module.exports = ImageService;